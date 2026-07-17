import type { RequestSource, RequestTelemetry, ResponseTelemetry } from "./types";

export type CacheOutcome = "hit" | "miss" | "coalesced" | "read_error";
const SAFE_INTENTS = new Set(["summarize", "reply", "priority", "tasks", "draft", "spam", "phishing", "chat"]);

function safeIntent(value?: string): string | undefined {
  if (value === undefined) return undefined;
  return SAFE_INTENTS.has(value) ? value : "unknown";
}

function safeProviderLabel(value?: string): string | undefined {
  return value && /^[A-Za-z0-9._:/-]{1,100}$/.test(value) ? value : undefined;
}

export interface SafeTelemetryMetrics {
  intent?: string;
  status?: "success" | "error";
  queue_wait_ms?: number;
  queue_depth?: number;
  active_requests?: number;
  cache_outcome?: CacheOutcome;
  cache_persistence_ms?: number;
  backend_round_trip_ms?: number;
  click_to_result_ms?: number;
  persistence_ms?: number;
  backend?: ResponseTelemetry;
}

export function createRequestTelemetry(source: RequestSource, caller: string): RequestTelemetry {
  return {
    request_id: crypto.randomUUID(),
    source,
    caller,
    started_at_ms: Date.now(),
  };
}

export function ensureRequestTelemetry(value?: RequestTelemetry): RequestTelemetry {
  if (
    value
    && /^[A-Za-z0-9_-]{1,80}$/.test(value.request_id)
    && ["explicit", "automatic", "unknown"].includes(value.source)
    && /^[a-z_]{1,40}$/.test(value.caller)
    && Number.isFinite(value.started_at_ms)
  ) return value;
  return createRequestTelemetry("unknown", "background");
}

export function buildTelemetryEvent(
  event: string,
  request: RequestTelemetry,
  metrics: SafeTelemetryMetrics = {},
): Record<string, unknown> {
  const backend = metrics.backend ? {
    request_id: /^[A-Za-z0-9_-]{1,80}$/.test(metrics.backend.request_id) ? metrics.backend.request_id : request.request_id,
    source: ["explicit", "automatic", "unknown"].includes(metrics.backend.source) ? metrics.backend.source : "unknown",
    intent: safeIntent(metrics.backend.intent),
    model: safeProviderLabel(metrics.backend.model),
    provider_duration_ms: metrics.backend.provider_duration_ms,
    backend_duration_ms: metrics.backend.backend_duration_ms,
    input_characters: metrics.backend.input_characters,
    usage: metrics.backend.usage ? {
      input_tokens: metrics.backend.usage.input_tokens,
      output_tokens: metrics.backend.usage.output_tokens,
      total_tokens: metrics.backend.usage.total_tokens,
    } : undefined,
    finish_reason: safeProviderLabel(metrics.backend.finish_reason),
    retry_count: metrics.backend.retry_count,
    retry_reason: safeProviderLabel(metrics.backend.retry_reason),
    retry_reasons: metrics.backend.retry_reasons?.map(safeProviderLabel).filter((value): value is string => Boolean(value)),
  } : undefined;
  const values: Record<string, unknown> = {
    event,
    request_id: /^[A-Za-z0-9_-]{1,80}$/.test(request.request_id) ? request.request_id : "invalid",
    source: ["explicit", "automatic", "unknown"].includes(request.source) ? request.source : "unknown",
    caller: /^[a-z_]{1,40}$/.test(request.caller) ? request.caller : "unknown",
    intent: safeIntent(metrics.intent),
    status: metrics.status,
    queue_wait_ms: metrics.queue_wait_ms,
    queue_depth: metrics.queue_depth,
    active_requests: metrics.active_requests,
    cache_outcome: metrics.cache_outcome,
    cache_persistence_ms: metrics.cache_persistence_ms,
    backend_round_trip_ms: metrics.backend_round_trip_ms,
    click_to_result_ms: metrics.click_to_result_ms,
    persistence_ms: metrics.persistence_ms,
    backend,
  };
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

export function logTelemetry(
  event: string,
  request: RequestTelemetry,
  metrics: SafeTelemetryMetrics = {},
): void {
  if (!import.meta.env.DEV) return;
  console.debug("[MailX telemetry]", buildTelemetryEvent(event, request, metrics));
}

export function elapsedMs(startedAtMs: number): number {
  return Math.max(0, Math.round((Date.now() - startedAtMs) * 100) / 100);
}
