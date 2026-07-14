import { EmailContext } from "../shared/types";
import { getSession } from "./supabase";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

async function gmailFetch(path: string): Promise<any> {
  const session = await getSession();
  const token = (session as any)?.provider_token;
  if (!token || (session as any)?.user?.id === "dev-user-001") {
    throw new Error("Sign in with Google to grant Gmail access. Dev Login cannot read Gmail.");
  }
  const response = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Gmail API error ${response.status}`);
  return response.json();
}

function decodeBase64Url(value = ""): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function bodyFromPayload(payload: any): string {
  if (payload?.body?.data) return decodeBase64Url(payload.body.data);
  for (const part of payload?.parts || []) {
    const body = bodyFromPayload(part);
    if (body) return body;
  }
  return "";
}

function header(headers: any[] = [], name: string): string {
  return headers.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function getMessageContext(id: string): Promise<EmailContext> {
  const message = await gmailFetch(`/messages/${encodeURIComponent(id)}?format=full`);
  return {
    id: message.id,
    sender: header(message.payload.headers, "From"),
    subject: header(message.payload.headers, "Subject"),
    snippet: message.snippet || "",
    body: bodyFromPayload(message.payload).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
  };
}

export async function countMessages(query: string): Promise<number> {
  let count = 0;
  let pageToken = "";
  do {
    const suffix = `?q=${encodeURIComponent(query)}&maxResults=500${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const result = await gmailFetch(`/messages${suffix}`);
    count += result.messages?.length || 0;
    pageToken = result.nextPageToken || "";
  } while (pageToken);
  return count;
}

export interface SentThread {
  id: string;
  subject: string;
  recipient: string;
  sentDate: string;
}

export async function getSentThreadsWithoutReply(days: number): Promise<SentThread[]> {
  const after = new Date();
  after.setDate(after.getDate() - Math.max(days + 14, 30));
  const list = await gmailFetch(`/threads?q=${encodeURIComponent(`in:sent after:${after.toISOString().slice(0, 10)}`)}&maxResults=100`);
  const threads: SentThread[] = [];
  for (const item of list.threads || []) {
    const thread = await gmailFetch(`/threads/${item.id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`);
    const messages = thread.messages || [];
    const last = messages[messages.length - 1];
    if (!last || last.labelIds?.includes("SENT")) {
      const sent = [...messages].reverse().find((message: any) => message.labelIds?.includes("SENT"));
      if (!sent) continue;
      threads.push({
        id: thread.id,
        subject: header(sent.payload.headers, "Subject") || "(no subject)",
        recipient: header(sent.payload.headers, "To") || "recipient",
        sentDate: header(sent.payload.headers, "Date") || new Date(Number(sent.internalDate)).toISOString(),
      });
    }
  }
  return threads;
}
