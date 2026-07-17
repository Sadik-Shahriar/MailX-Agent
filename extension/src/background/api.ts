import { ChatRequest, ChatResponse } from "../shared/types";
import { elapsedMs, ensureRequestTelemetry, logTelemetry } from "../shared/telemetry";
import { abortReason, createDeadlineSignal, RequestTimeoutError } from "../shared/abort";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "http://localhost:8001" : "")).replace(/\/$/, "");

function requireBackendUrl(): string {
  if (!BACKEND_URL) throw new Error("MailX backend URL is not configured.");
  return BACKEND_URL;
}

export function backendDeadlineMs(intent: string): number {
  if (["priority", "spam", "phishing"].includes(intent)) return 15_000;
  if (["summary", "reply", "tasks"].includes(intent)) return 25_000;
  return 40_000;
}

export async function chat(req: ChatRequest, parentSignal?: AbortSignal, accessToken?: string): Promise<ChatResponse> {
  if (!accessToken) throw new Error("Sign in before using MailX AI tools.");
  const telemetry = ensureRequestTelemetry(req.telemetry);
  req = { ...req, telemetry };
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
      if (text.includes("LLM API error: 429")) {
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
