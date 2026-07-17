import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("../src/background/supabase", () => ({ getSession: mocks.getSession }));

import { countMessages, gmailFetch, mapWithConcurrency } from "../src/background/gmail";
import manifest from "../manifest.json";

describe("Gmail API client", () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      provider_token: "test-provider-token",
      user: { id: "user-1" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("adds authorization and a deadline signal to every request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messages: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(gmailFetch("/messages")).resolves.toEqual({ messages: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages",
      {
        headers: { Authorization: "Bearer test-provider-token" },
        signal: expect.any(AbortSignal),
      },
    );
  });

  test("uses Gmail's result size estimate without pagination for dashboard counts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      messages: [{ id: "one" }], resultSizeEstimate: 731, nextPageToken: "next",
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(countMessages("in:inbox")).resolves.toBe(731);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("maxResults=1");
    expect(fetchMock.mock.calls[0][0]).not.toContain("pageToken");
  });

  test("can count Gmail messages exactly across pages", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "one" }, { id: "two" }], nextPageToken: "next" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "three" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(countMessages("in:sent", undefined, undefined, true)).resolves.toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("pageToken=next");
  });

  test("aborts a stuck Gmail request at its deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })));

    const request = gmailFetch("/messages");
    const timeoutResult = expect(request).rejects.toThrow("The Gmail request timed out");
    await vi.advanceTimersByTimeAsync(15_000);

    await timeoutResult;
  });

  test("retries a rate-limited Gmail request once", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429, headers: { "Retry-After": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(gmailFetch("/messages")).resolves.toEqual({ messages: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("returns a reauthorization error for an expired Gmail token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("expired", { status: 401 })));

    await expect(gmailFetch("/messages")).rejects.toThrow("Gmail access expired or was revoked");
  });

  test("requests only Gmail read access and permits the Gmail API host", () => {
    expect(manifest.host_permissions).toContain("https://gmail.googleapis.com/*");
  });

  test("bounds Gmail metadata work to the configured concurrency", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 5, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return value;
    });
    expect(peak).toBeLessThanOrEqual(5);
    expect(results).toHaveLength(7);
  });
});
