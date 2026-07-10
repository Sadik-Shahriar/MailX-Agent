import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br"],
    ALLOWED_ATTR: ["href", "target"],
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function daysSince(epochMs: number): number {
  return Math.floor((Date.now() - epochMs) / 86400000);
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
