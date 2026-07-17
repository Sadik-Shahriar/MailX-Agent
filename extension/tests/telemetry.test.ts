import { describe, expect, test } from "vitest";

import { buildTelemetryEvent, createRequestTelemetry } from "../src/shared/telemetry";

describe("privacy-safe telemetry", () => {
  test("creates traceable events from an allowlisted metric set", () => {
    const request = createRequestTelemetry("automatic", "inbox_scan");
    const event = buildTelemetryEvent("queue_started", request, {
      intent: "priority",
      queue_wait_ms: 12.5,
      queue_depth: 3,
      active_requests: 2,
    });

    expect(request.request_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(event).toEqual({
      event: "queue_started",
      request_id: request.request_id,
      source: "automatic",
      caller: "inbox_scan",
      intent: "priority",
      queue_wait_ms: 12.5,
      queue_depth: 3,
      active_requests: 2,
    });
    expect(Object.keys(event)).not.toContain("prompt");
    expect(Object.keys(event)).not.toContain("email_context");
  });

  test("strips unexpected backend fields before logging", () => {
    const request = createRequestTelemetry("explicit", "action_panel");
    const event = buildTelemetryEvent("backend_response", request, {
      backend: {
        request_id: request.request_id,
        source: "explicit",
        intent: "summarize",
        backend_duration_ms: 20,
        retry_count: 0,
        prompt: "must not be logged",
      } as never,
    });

    expect(JSON.stringify(event)).not.toContain("must not be logged");
    expect(event.backend).toEqual({
      request_id: request.request_id,
      source: "explicit",
      intent: "summarize",
      model: undefined,
      provider_duration_ms: undefined,
      backend_duration_ms: 20,
      input_characters: undefined,
      usage: undefined,
      finish_reason: undefined,
      retry_count: 0,
      retry_reason: undefined,
      retry_reasons: undefined,
    });
  });
});
