import type { RequestSource } from "./types";

export function canSendRemoteAi(source: RequestSource): boolean {
  return source === "explicit";
}

export function dispatchRemoteAi(source: RequestSource, dispatch: () => void): boolean {
  if (!canSendRemoteAi(source)) return false;
  dispatch();
  return true;
}

export type DraftData = {
  kind: 'draft';
  to?: string | null;
  subject?: string;
  greeting?: string;
  body?: string;
  sign_off?: string;
};

export function extractInsertText(text: string, intent: string, result?: any): string {
  if (intent !== 'draft') return text.replace(/^R\d\s*[:.-]\s*/gim, '').trim();
  return result?.kind === 'draft' ? [result.greeting, result.body, result.sign_off].join('\n\n') : text;
}

export function formatDraft(draft: DraftData, includeSubject: boolean): string {
  return [
    includeSubject && draft.to ? 'To: ' + draft.to : '',
    includeSubject && draft.subject ? 'Subject: ' + draft.subject : '',
    draft.greeting || '',
    draft.body || '',
    draft.sign_off || '',
  ].filter(Boolean).join('\n\n');
}

export function parseReplyOptions(text: string): string[] {
  const pattern = /(?:^|\n)\s*(?:[-*]\s*)?(?:\*{1,2}\s*)?R([1-3])(?:\s*\([^\n)]*\))?(?:\s*\*{1,2})?\s*[:.-]\s*/gi;
  const matches = [...text.matchAll(pattern)];
  const replies = new Map<string, string>();
  for (const [index, match] of matches.entries()) {
    const start = (match.index || 0) + match[0].length;
    const end = index < matches.length - 1 ? matches[index + 1].index || text.length : text.length;
    const reply = text.slice(start, end).trim();
    if (reply) replies.set(match[1], replies.get(match[1]) ? replies.get(match[1]) + '\n\n' + reply : reply);
  }
  const markedReplies = ['1', '2', '3'].map((id) => replies.get(id)).filter((reply): reply is string => Boolean(reply));
  if (markedReplies.length) return markedReplies.slice(0, 1);

  const candidate = text.trim();
  return candidate ? [candidate] : [];
}
