import { chat } from "./api";
import { getCache, getOrSetCache, setCache } from "../shared/cache";
import { EmailContext, RequestTelemetry, SpamResult, UserPreferences } from "../shared/types";
import { logTelemetry } from "../shared/telemetry";
import { responseCacheKey } from "../shared/cacheKeys";

function senderAddress(sender: string): string {
  return (sender.match(/<([^>]+)>/)?.[1] || sender).trim().toLowerCase();
}

function matchesRule(sender: string, rules: string[]): boolean {
  const address = senderAddress(sender);
  const domain = address.split("@")[1] || "";
  return rules.some((rule) => {
    const value = rule.trim().toLowerCase();
    return value === address || value === domain || (value.startsWith("@") && value.slice(1) === domain);
  });
}

export async function checkSpam(
  context: EmailContext,
  loadPreferences: () => Promise<UserPreferences>,
  owner: string,
  telemetry: RequestTelemetry,
  signal?: AbortSignal,
  accessToken?: string,
): Promise<SpamResult> {
  const content = {
    sender: context.sender,
    subject: context.subject,
    body: context.body,
  };
  const baseKey = await responseCacheKey(owner, "spam", content);
  const aliasKey = `alias:${baseKey}`;
  const aliasedKey = await getCache<string>(aliasKey);
  if (aliasedKey) {
    const cached = await getCache<SpamResult>(aliasedKey);
    if (cached) {
      logTelemetry("cache_lookup", telemetry, { intent: "spam", cache_outcome: "hit" });
      return cached;
    }
  }
  const preferences = await loadPreferences();
  if (matchesRule(context.sender, preferences.spam_whitelist)) {
    return { verdict: "not_spam", confidence: 1, reason: "Sender is on your safe list.", category: "normal", source: "rule" };
  }
  if (matchesRule(context.sender, preferences.spam_blacklist)) {
    return { verdict: "spam", confidence: 1, reason: "Sender is on your spam list.", category: "bulk", source: "rule" };
  }
  const cacheKey = await responseCacheKey(owner, "spam", content, {
    spam_whitelist: preferences.spam_whitelist,
    spam_blacklist: preferences.spam_blacklist,
  });
  const result = await getOrSetCache(cacheKey, async () => {
    const response = await chat({ intent: "spam", email_context: context, preferences, telemetry }, signal, accessToken);
    if (response.result?.kind !== "spam") throw new Error("Spam classifier returned an invalid result.");
    return { ...response.result, source: "llm" as const };
  }, 30 * 60 * 1000, (event) => {
    if (event.outcome === "hit" || event.outcome === "miss" || event.outcome === "coalesced" || event.outcome === "read_error") {
      logTelemetry("cache_lookup", telemetry, { intent: "spam", cache_outcome: event.outcome });
    } else if ("persistence_ms" in event) {
      logTelemetry("cache_persistence", telemetry, {
        intent: "spam",
        status: event.outcome === "persisted" ? "success" : "error",
        cache_persistence_ms: event.persistence_ms,
      });
    }
  }, { owner });
  try { await setCache(aliasKey, cacheKey, 30 * 60 * 1000, { owner }); } catch { /* The fetched verdict remains usable. */ }
  return result;
}
