import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getCache, getOrSetCache, invalidateUserCache, setCache } from "../src/shared/cache";
import type { CacheTelemetryEvent } from "../src/shared/cache";

describe("session cache", () => {
  const stored = new Map<string, unknown>();

  beforeEach(() => {
    stored.clear();
    vi.stubGlobal("chrome", {
      storage: {
        session: {
          get: vi.fn(async (key: string | string[] | null) => {
            if (key === null) return Object.fromEntries(stored);
            if (Array.isArray(key)) return Object.fromEntries(key.map((item) => [item, stored.get(item)]));
            return { [key]: stored.get(key) };
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            for (const [key, value] of Object.entries(items)) stored.set(key, value);
          }),
          remove: vi.fn(async (keys: string | string[]) => {
            for (const key of Array.isArray(keys) ? keys : [keys]) stored.delete(key);
          }),
        },
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("reuses a stored value instead of fetching it again", async () => {
    const fetchValue = vi.fn(async () => ({ summary: "Cached summary" }));
    const telemetry: CacheTelemetryEvent[] = [];

    const first = await getOrSetCache("summary:message-1", fetchValue, 60_000, (event) => telemetry.push(event));
    const second = await getOrSetCache("summary:message-1", fetchValue, 60_000, (event) => telemetry.push(event));

    expect(first).toEqual({ summary: "Cached summary" });
    expect(second).toEqual(first);
    expect(fetchValue).toHaveBeenCalledTimes(1);
    expect(telemetry.map((event) => event.outcome)).toEqual(["miss", "persisted", "hit"]);
  });

  test("distinguishes a storage read error from a cache miss", async () => {
    vi.mocked(chrome.storage.session.get).mockRejectedValueOnce(new Error("storage unavailable"));
    const telemetry: CacheTelemetryEvent[] = [];

    await getOrSetCache("summary:message-2", async () => "fresh", 60_000, (event) => telemetry.push(event));

    expect(telemetry.map((event) => event.outcome)).toEqual(["read_error", "persisted"]);
  });

  test("coalesces concurrent misses into one fetch", async () => {
    let resolveFetch!: (value: string) => void;
    const fetchValue = vi.fn(() => new Promise<string>((resolve) => { resolveFetch = resolve; }));
    const firstTelemetry: CacheTelemetryEvent[] = [];
    const secondTelemetry: CacheTelemetryEvent[] = [];

    const first = getOrSetCache("summary:shared", fetchValue, 60_000, (event) => firstTelemetry.push(event));
    const second = getOrSetCache("summary:shared", fetchValue, 60_000, (event) => secondTelemetry.push(event));
    await vi.waitFor(() => expect(fetchValue).toHaveBeenCalledTimes(1));
    resolveFetch("one provider response");

    await expect(Promise.all([first, second])).resolves.toEqual(["one provider response", "one provider response"]);
    expect(secondTelemetry.map((event) => event.outcome)).toEqual(["coalesced"]);
  });

  test("returns a fetched value when persistence fails", async () => {
    vi.mocked(chrome.storage.session.set).mockRejectedValueOnce(new Error("quota exceeded"));
    const telemetry: CacheTelemetryEvent[] = [];

    await expect(getOrSetCache("summary:write-failure", async () => "fresh", 60_000, (event) => telemetry.push(event)))
      .resolves.toBe("fresh");
    expect(telemetry.map((event) => event.outcome)).toEqual(["miss", "write_error"]);
  });

  test("removes expired entries and caps cache growth", async () => {
    stored.set("mailx_cache_v2_expired", { value: "old", expires: Date.now() - 1, createdAt: 1 });
    await expect(getCache("expired")).resolves.toBeNull();
    await vi.waitFor(() => expect(stored.has("mailx_cache_v2_expired")).toBe(false));

    for (let index = 0; index < 205; index += 1) await setCache(`item:${index}`, index, 60_000);
    expect([...stored.keys()].filter((key) => key.startsWith("mailx_cache_v2_")).length).toBeLessThanOrEqual(200);
  });

  test("invalidating an owner removes entries and blocks late persistence", async () => {
    await setCache("owned", "cached", 60_000, { owner: "user-a" });
    await invalidateUserCache("user-a");
    await expect(getCache("owned")).resolves.toBeNull();

    let resolveFetch!: (value: string) => void;
    const pending = getOrSetCache("late", () => new Promise<string>((resolve) => { resolveFetch = resolve; }), 60_000, undefined, { owner: "user-a" });
    await vi.waitFor(() => expect(resolveFetch).toBeTypeOf("function"));
    await invalidateUserCache("user-a");
    resolveFetch("result");
    await expect(pending).resolves.toBe("result");
    await expect(getCache("late")).resolves.toBeNull();
  });
});
