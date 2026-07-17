import { describe, expect, test } from "vitest";

import { canonicalizeUrl, responseCacheKey } from "../src/shared/cacheKeys";

describe("response cache keys", () => {
  test("scope results by account, content, and relevant preferences without exposing inputs", async () => {
    const content = { sender: "sender@example.com", subject: "Private subject", body: "Secret body" };
    const first = await responseCacheKey("user-a", "spam", content, { spam_whitelist: [], spam_blacklist: [] });
    const otherUser = await responseCacheKey("user-b", "spam", content, { spam_whitelist: [], spam_blacklist: [] });
    const otherContent = await responseCacheKey("user-a", "spam", { ...content, body: "Changed" }, { spam_whitelist: [], spam_blacklist: [] });
    const otherPreferences = await responseCacheKey("user-a", "spam", content, { spam_whitelist: ["sender@example.com"], spam_blacklist: [] });

    expect(new Set([first, otherUser, otherContent, otherPreferences])).toHaveLength(4);
    expect(first).not.toContain("user-a");
    expect(first).not.toContain("Secret body");
    expect(first).not.toContain("sender@example.com");
  });

  test("canonicalizes equivalent URLs and removes credentials, fragments, and tracking parameters", () => {
    const first = canonicalizeUrl("HTTPS://user:secret@Example.COM:443/path?b=2&utm_source=email&a=1#token");
    const second = canonicalizeUrl("https://example.com/path?a=1&b=2");

    expect(first?.toString()).toBe(second?.toString());
    expect(first?.toString()).toBe("https://example.com/path?a=1&b=2");
    expect(canonicalizeUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalizeUrl("https://example.com/other?a=1&b=2")?.toString()).not.toBe(second?.toString());
  });
});
