import { beforeEach, describe, expect, test, vi } from "vitest";

const { chat } = vi.hoisted(() => ({
  chat: vi.fn(async () => ({
    intent: "spam",
    response: "spam: Bulk offer",
    result: { kind: "spam", verdict: "spam", confidence: 0.9, reason: "Bulk offer", category: "bulk" },
    actions: [],
  })),
}));

vi.mock("../src/background/api", () => ({ chat }));

import { checkSpam } from "../src/background/spam";
import type { RequestTelemetry, UserPreferences } from "../src/shared/types";

const preferences: UserPreferences = {
  reply_tone: "professional",
  reminder_delay_days: 3,
  reminder_notify_before: true,
  reminder_notify_due: true,
  reminder_notify_overdue: false,
  spam_whitelist: [],
  spam_blacklist: [],
  phishing_sensitivity: "default",
  phishing_allowlist: [],
};

const telemetry: RequestTelemetry = {
  request_id: "request-1",
  source: "explicit",
  caller: "test",
  started_at_ms: 1,
};

describe("preference-dependent classifier cache", () => {
  const stored = new Map<string, unknown>();

  beforeEach(() => {
    stored.clear();
    chat.mockClear();
    vi.stubGlobal("chrome", {
      storage: {
        session: {
          get: vi.fn(async (key: string | string[] | null) => {
            if (key === null) return Object.fromEntries(stored);
            if (Array.isArray(key)) return Object.fromEntries(key.map((item) => [item, stored.get(item)]));
            return { [key]: stored.get(key) };
          }),
          set: vi.fn(async (items: Record<string, unknown>) => Object.entries(items).forEach(([key, value]) => stored.set(key, value))),
          remove: vi.fn(async (keys: string | string[]) => (Array.isArray(keys) ? keys : [keys]).forEach((key) => stored.delete(key))),
        },
      },
    });
  });

  test("serves a hit without querying preferences and coalesces the provider miss", async () => {
    const context = { id: "message-1", sender: "offer@example.com", subject: "Offer", body: "Buy now" };
    const firstPreferences = vi.fn(async () => preferences);

    const [first, concurrent] = await Promise.all([
      checkSpam(context, firstPreferences, "user-a", telemetry),
      checkSpam(context, firstPreferences, "user-a", telemetry),
    ]);
    const forbiddenPreferenceQuery = vi.fn(async () => { throw new Error("preferences should not be queried"); });
    const cached = await checkSpam(context, forbiddenPreferenceQuery, "user-a", telemetry);

    expect(first).toEqual(concurrent);
    expect(cached).toEqual(first);
    expect(chat).toHaveBeenCalledTimes(1);
    expect(firstPreferences).toHaveBeenCalledTimes(2);
    expect(forbiddenPreferenceQuery).not.toHaveBeenCalled();
  });
});
