import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { chat } from "../src/background/api";
import { RequestCancelledError } from "../src/shared/abort";
import type { ChatRequest, ChatResponse } from "../src/shared/types";

describe("backend API client", () => {
  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("posts chat requests and returns the JSON response", async () => {
    const telemetry = {
      request_id: "request-1",
      source: "explicit" as const,
      caller: "action_panel",
      started_at_ms: Date.now(),
    };
    const request: ChatRequest = { intent: "summarize", prompt: "Summarize this", telemetry };
    const response: ChatResponse = {
      intent: "summarize",
      response: "A short summary",
      actions: [],
      telemetry: {
        request_id: "request-1",
        source: "explicit",
        intent: "summarize",
        backend_duration_ms: 25,
        retry_count: 0,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(chat(request, undefined, "test-access-token")).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test-access-token" },
      body: JSON.stringify(request),
      signal: expect.any(AbortSignal),
    });
  });

  test("maps provider rate limits to a user-facing error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("LLM API error: 429", {
      status: 502,
    })));

    await expect(chat({ intent: "reply" }, undefined, "test-access-token")).rejects.toThrow(
      "The AI service is busy. Please try again shortly.",
    );
  });

  test("does not send an AI request without a Supabase access token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(chat({ intent: "summarize" })).rejects.toThrow("Sign in before using MailX AI tools.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("records a failed backend transport without exposing request content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network failed")));

    await expect(chat({ intent: "chat", prompt: "private prompt" }, undefined, "test-access-token")).rejects.toThrow("network failed");
    expect(console.debug).toHaveBeenCalledWith(
      "[MailX telemetry]",
      expect.objectContaining({ event: "backend_response", intent: "chat", status: "error" }),
    );
    expect(JSON.stringify(vi.mocked(console.debug).mock.calls)).not.toContain("private prompt");
  });

  test("aborts a classifier at its total deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })));

    const request = chat({ intent: "priority" }, undefined, "test-access-token");
    const timeoutResult = expect(request).rejects.toThrow("The AI request timed out");
    await vi.advanceTimersByTimeAsync(15_000);

    await timeoutResult;
  });

  test("propagates caller cancellation before the deadline", async () => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })));

    const request = chat({ intent: "draft" }, controller.signal, "test-access-token");
    const cancellationResult = expect(request).rejects.toThrow("Draft cancelled.");
    controller.abort(new RequestCancelledError("Draft cancelled."));

    await cancellationResult;
  });
});
