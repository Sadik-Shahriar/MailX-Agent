import { ChatRequest, ChatResponse, ModelStatusResponse } from "../shared/types";
import { elapsedMs, ensureRequestTelemetry, logTelemetry } from "../shared/telemetry";
import { abortReason, createDeadlineSignal, RequestTimeoutError } from "../shared/abort";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:8001").replace(/\/$/, "");

function requireBackendUrl(): string {
  if (!BACKEND_URL) throw new Error("MailX backend URL is not configured.");
  return BACKEND_URL;
}

export function backendDeadlineMs(intent: string): number {
  if (["priority", "spam", "phishing"].includes(intent)) return 50_000;
  if (intent === "reply") return 65_000;
  if (["summary", "summarize", "tasks"].includes(intent)) return 80_000;
  return 85_000;
}

export async function checkModelStatus(model: string, accessToken?: string): Promise<ModelStatusResponse> {
  if (!accessToken) throw new Error("Sign in before checking model status.");
  const url = new URL(`${requireBackendUrl()}/models/status`);
  if (model) url.searchParams.set("model", model);
  const resp = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }
  return await resp.json() as ModelStatusResponse;
}

export async function chat(req: ChatRequest, parentSignal?: AbortSignal, accessToken?: string): Promise<ChatResponse> {
  if (!accessToken) throw new Error("Sign in before using MailX AI tools.");
  const telemetry = ensureRequestTelemetry(req.telemetry);
  const model = req.model || req.preferences?.ai_model;
  const thinking_mode = req.thinking_mode ?? req.preferences?.thinking_mode;
  req = { ...req, telemetry, model, thinking_mode };
  const startedAt = Date.now();
  const deadline = createDeadlineSignal(parentSignal, backendDeadlineMs(req.intent));
  let resp: Response;
  let errorLogged = false;
  try {
    resp = await fetch(`${requireBackendUrl()}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(req),
      signal: deadline.signal,
    });
  } catch (error) {
    logTelemetry("backend_response", telemetry, {
      intent: req.intent,
      status: "error",
      backend_round_trip_ms: elapsedMs(startedAt),
    });
    deadline.cleanup();
    if (deadline.timedOut()) throw new RequestTimeoutError("The AI request timed out. Please try again.");
    if (parentSignal?.aborted) throw abortReason(parentSignal);
    throw error;
  }

  try {
    if (!resp.ok) {
      const text = await resp.text();
      logTelemetry("backend_response", telemetry, {
        intent: req.intent,
        status: "error",
        backend_round_trip_ms: elapsedMs(startedAt),
      });
      errorLogged = true;
      if (text.includes("LLM API error: 429") || resp.status === 429) {
        throw new Error("The AI service is busy. Please try again shortly.");
      }
      throw new Error(`API error ${resp.status}: ${text}`);
    }

    const response = await resp.json() as ChatResponse;
    logTelemetry("backend_response", telemetry, {
      intent: req.intent,
      status: "success",
      backend_round_trip_ms: elapsedMs(startedAt),
      backend: response.telemetry,
    });
    return response;
  } catch (error) {
    if (!errorLogged) logTelemetry("backend_response", telemetry, {
        intent: req.intent,
        status: "error",
        backend_round_trip_ms: elapsedMs(startedAt),
      });
    if (deadline.timedOut()) throw new RequestTimeoutError("The AI request timed out. Please try again.");
    if (parentSignal?.aborted) throw abortReason(parentSignal);
    throw error;
  } finally {
    deadline.cleanup();
  }
}
