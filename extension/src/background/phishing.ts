import { chat } from "./api";
import { getOrSetCache } from "../shared/cache";
import { UrlVerdict, UserPreferences } from "../shared/types";

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

export async function checkUrl(rawUrl: string, preferences: UserPreferences | Promise<UserPreferences>): Promise<UrlVerdict | null> {
  preferences = await preferences;
  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return null; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
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
  return getOrSetCache(`url:${rawUrl}`, async () => {
    const response = await chat({ intent: "phishing", email_context: { id: rawUrl, sender: "", subject: "", body: "", url: rawUrl, hostname, heuristics: signals } as any, preferences });
    const match = String(response.response).match(/\{[\s\S]*\}/);
    if (!match) return { url: rawUrl, hostname, verdict: "suspicious", confidence: 0.5, reason: "Local signals need caution.", heuristics: signals, source: "heuristic" };
    const value = JSON.parse(match[0]);
    return { url: rawUrl, hostname, verdict: ['clean', 'suspicious', 'phishing'].includes(value.verdict) ? value.verdict : "suspicious", confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0.5)), reason: String(value.reason || "Local signals need caution."), heuristics: signals, source: "llm" } as UrlVerdict;
  }, 24 * 60 * 60 * 1000);
}
