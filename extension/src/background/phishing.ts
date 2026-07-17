import { chat } from "./api";
import { getCache, getOrSetCache, setCache } from "../shared/cache";
import { RequestTelemetry, UrlVerdict, UserPreferences } from "../shared/types";
import { logTelemetry } from "../shared/telemetry";
import { canonicalizeUrl, responseCacheKey } from "../shared/cacheKeys";

const SHORTENERS = new Set(["bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "is.gd"]);
const RISKY_TLDS = new Set(["zip", "mov", "top", "xyz", "click", "gq"]);
const BRANDS = ["amazon", "apple", "google", "microsoft", "netflix", "paypal", "facebook", "instagram", "linkedin", "dropbox"];

function distance(left: string, right: string): number {
  const rows = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = rows[0];
    rows[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const current = rows[j];
      rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + Number(left[i - 1] !== right[j - 1]));
      previous = current;
    }
  }
  return rows[right.length];
}

export async function checkUrl(
  rawUrl: string,
  loadPreferences: () => Promise<UserPreferences>,
  owner: string,
  telemetry: RequestTelemetry,
  signal?: AbortSignal,
  accessToken?: string,
): Promise<UrlVerdict | null> {
  const parsed = canonicalizeUrl(rawUrl);
  if (!parsed) return null;
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const canonicalUrl = parsed.toString();
  const baseKey = await responseCacheKey(owner, "phishing", canonicalUrl);
  const aliasKey = `alias:${baseKey}`;
  const aliasedKey = await getCache<string>(aliasKey);
  if (aliasedKey) {
    const cached = await getCache<UrlVerdict>(aliasedKey);
    if (cached) {
      logTelemetry("cache_lookup", telemetry, { intent: "phishing", cache_outcome: "hit" });
      return { ...cached, url: rawUrl };
    }
  }
  const preferences = await loadPreferences();
  if (preferences.phishing_allowlist.includes(hostname)) {
    return { url: rawUrl, hostname, verdict: "clean", confidence: 1, reason: "Domain is on your safe list.", heuristics: [], source: "allowlist" };
  }
  const signals: string[] = [];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) signals.push("IP-address hostname");
  if (/[^\x00-\x7F]/.test(hostname) || hostname.includes("xn--")) signals.push("internationalized hostname");
  if (hostname.split(".").length > 4) signals.push("excessive subdomains");
  if (SHORTENERS.has(hostname)) signals.push("URL shortener");
  if (RISKY_TLDS.has(hostname.split(".").pop() || "")) signals.push("high-risk top-level domain");
  const label = hostname.split(".")[0];
  const brand = BRANDS.find((item) => distance(label, item) > 0 && distance(label, item) <= 1);
  if (brand) signals.push(`possible ${brand} typosquat`);
  if (!signals.length) return { url: rawUrl, hostname, verdict: "clean", confidence: 0.7, reason: "No local phishing signals found.", heuristics: [], source: "heuristic" };
  const cacheKey = await responseCacheKey(owner, "phishing", canonicalUrl, {
    phishing_allowlist: preferences.phishing_allowlist,
    phishing_sensitivity: preferences.phishing_sensitivity,
  });
  const verdict = await getOrSetCache<UrlVerdict>(cacheKey, async () => {
    const response = await chat({ intent: "phishing", email_context: { id: canonicalUrl, sender: "", subject: "", body: "", url: canonicalUrl, hostname, heuristics: signals }, telemetry }, signal, accessToken);
    if (response.result?.kind !== "phishing") throw new Error("Phishing classifier returned an invalid result.");
    return { url: rawUrl, hostname, ...response.result, heuristics: signals, source: "llm" };
  }, 24 * 60 * 60 * 1000, (event) => {
    if (event.outcome === "hit" || event.outcome === "miss" || event.outcome === "coalesced" || event.outcome === "read_error") {
      logTelemetry("cache_lookup", telemetry, { intent: "phishing", cache_outcome: event.outcome });
    } else if ("persistence_ms" in event) {
      logTelemetry("cache_persistence", telemetry, {
        intent: "phishing",
        status: event.outcome === "persisted" ? "success" : "error",
        cache_persistence_ms: event.persistence_ms,
      });
    }
  }, { owner });
  try { await setCache(aliasKey, cacheKey, 24 * 60 * 60 * 1000, { owner }); } catch { /* The fetched verdict remains usable. */ }
  return { ...verdict, url: rawUrl };
}
