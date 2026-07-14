import { chat } from "./api";
import { getOrSetCache } from "../shared/cache";
import { EmailContext, SpamResult, UserPreferences } from "../shared/types";

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

export async function checkSpam(context: EmailContext, preferences: UserPreferences | Promise<UserPreferences>): Promise<SpamResult> {
  preferences = await preferences;
  if (matchesRule(context.sender, preferences.spam_whitelist)) {
    return { verdict: "not_spam", confidence: 1, reason: "Sender is on your safe list.", category: "normal", source: "rule" };
  }
  if (matchesRule(context.sender, preferences.spam_blacklist)) {
    return { verdict: "spam", confidence: 1, reason: "Sender is on your spam list.", category: "bulk", source: "rule" };
  }
  return getOrSetCache(`spam:${context.id}`, async () => {
    const response = await chat({ intent: "spam", email_context: context, preferences });
    const match = String(response.response).match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Spam classifier returned an invalid result.");
    const parsed = JSON.parse(match[0]);
    if (!['spam', 'not_spam'].includes(parsed.verdict)) throw new Error("Spam classifier returned an invalid verdict.");
    return {
      verdict: parsed.verdict,
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
      reason: String(parsed.reason || "No reason provided."),
      category: ['bulk', 'impersonation', 'newsletter', 'normal', 'transactional'].includes(parsed.category) ? parsed.category : "normal",
      source: "llm",
    } as SpamResult;
  }, 30 * 60 * 1000);
}
