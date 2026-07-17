import type { EmailContext, UserPreferences } from "./types";

const CACHE_SCHEMA_VERSION = "v2";
const MODEL_NAMESPACE = "mimo-v2.5-free";

const PROMPT_VERSIONS: Record<string, string> = {
  summarize: "1",
  priority: "1",
  spam: "1",
  phishing: "1",
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]));
  }
  return value;
}

export async function sha256(value: unknown): Promise<string> {
  const serialized = typeof value === "string" ? value : JSON.stringify(stableValue(value));
  const bytes = new TextEncoder().encode(serialized);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function canonicalizeUrl(rawUrl: string): URL | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    url.username = "";
    url.password = "";
    if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
    const values = [...url.searchParams.entries()]
      .filter(([key]) => !/^utm_/i.test(key) && !["fbclid", "gclid", "msclkid"].includes(key.toLowerCase()))
      .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
    url.search = "";
    for (const [key, value] of values) url.searchParams.append(key, value);
    return url;
  } catch {
    return null;
  }
}

export async function responseCacheKey(
  owner: string,
  intent: "summarize" | "priority" | "spam" | "phishing",
  content: EmailContext | string | Record<string, unknown>,
  preferences?: Partial<UserPreferences>,
): Promise<string> {
  const digest = await sha256({
    schema: CACHE_SCHEMA_VERSION,
    owner,
    intent,
    content,
    preferences: preferences || {},
    model: MODEL_NAMESPACE,
    prompt: PROMPT_VERSIONS[intent],
  });
  return `response:${intent}:${digest}`;
}
