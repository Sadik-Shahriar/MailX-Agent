import { getSession } from "./supabase";
import { abortReason, createDeadlineSignal, RequestTimeoutError } from "../shared/abort";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export class GmailAuthorizationError extends Error {
  constructor() {
    super("Gmail access expired or was revoked. Sign out, then sign in with Google again.");
    this.name = "GmailAuthorizationError";
  }
}

export async function getGmailAccessToken(): Promise<string> {
  const session = await getSession();
  const token = (session as any)?.provider_token;
  if (!token || (session as any)?.user?.id === "dev-user-001") {
    throw new GmailAuthorizationError();
  }
  return token;
}

function retryDelayMs(response: Response): number {
  const value = response.headers.get("Retry-After");
  const seconds = value ? Number(value) : Number.NaN;
  return Number.isFinite(seconds) ? Math.min(5_000, Math.max(0, seconds * 1_000)) : 250;
}

export async function gmailFetch(path: string, parentSignal?: AbortSignal, accessToken?: string): Promise<any> {
  const deadline = createDeadlineSignal(parentSignal, 15_000);
  try {
    if (deadline.signal.aborted) throw abortReason(deadline.signal);
    const token = accessToken || await getGmailAccessToken();
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch(`${GMAIL_API}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: deadline.signal,
      });
      if (response.status === 401) throw new GmailAuthorizationError();
      if (!GMAIL_RETRY_STATUSES.has(response.status) || attempt === 1) break;
      const delay = retryDelayMs(response);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        deadline.signal.addEventListener("abort", () => { clearTimeout(timer); reject(abortReason(deadline.signal)); }, { once: true });
      });
    }
    if (!response?.ok) throw new Error(`Gmail API error ${response?.status || "network"}`);
    const result = await response.json();
    if (deadline.signal.aborted) throw abortReason(deadline.signal);
    return result;
  } catch (error) {
    if (deadline.timedOut()) throw new RequestTimeoutError("The Gmail request timed out. Please try again.");
    if (parentSignal?.aborted) throw abortReason(parentSignal);
    throw error;
  } finally {
    deadline.cleanup();
  }
}

function header(headers: any[] = [], name: string): string {
  return headers.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function countMessages(query: string, signal?: AbortSignal, accessToken?: string, exact = false): Promise<number> {
  if (signal?.aborted) throw abortReason(signal);
  if (!exact) {
    const result = await gmailFetch(`/messages?q=${encodeURIComponent(query)}&maxResults=1`, signal, accessToken);
    return typeof result.resultSizeEstimate === "number" ? result.resultSizeEstimate : 0;
  }

  let count = 0;
  let pageToken = "";
  do {
    const suffix = `?q=${encodeURIComponent(query)}&maxResults=500${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const result = await gmailFetch(`/messages${suffix}`, signal, accessToken);
    count += Array.isArray(result.messages) ? result.messages.length : 0;
    pageToken = result.nextPageToken || "";
  } while (pageToken);
  return count;
}

export interface SentThread {
  id: string;
  subject: string;
  recipient: string;
  sentDate: string;
  hasReply: boolean;
}

export async function getRecentSentThreads(days: number, signal?: AbortSignal, accessToken?: string): Promise<SentThread[]> {
  const token = accessToken || await getGmailAccessToken();
  const after = new Date();
  after.setDate(after.getDate() - Math.max(days + 14, 30));
  const list = await gmailFetch(`/threads?q=${encodeURIComponent(`in:sent after:${after.toISOString().slice(0, 10)}`)}&maxResults=100`, signal, token);
  const threads = await mapWithConcurrency(list.threads || [], 5, async (item: { id: string }) => {
    if (signal?.aborted) throw abortReason(signal);
    const thread = await gmailFetch(`/threads/${item.id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, signal, token);
    const messages = thread.messages || [];
    const last = messages[messages.length - 1];
    const sent = [...messages].reverse().find((message: any) => message.labelIds?.includes("SENT"));
    if (!sent || !last) return null;
    return {
      id: thread.id,
      subject: header(sent.payload.headers, "Subject") || "(no subject)",
      recipient: header(sent.payload.headers, "To") || "recipient",
      sentDate: header(sent.payload.headers, "Date") || new Date(Number(sent.internalDate)).toISOString(),
      hasReply: !last.labelIds?.includes("SENT"),
    };
  });
  return threads.filter((thread): thread is SentThread => thread !== null);
}

export async function mapWithConcurrency<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) results.push(await work(items[cursor++]));
  }));
  return results;
}
