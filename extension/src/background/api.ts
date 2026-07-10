import { ChatRequest, ChatResponse } from "../shared/types";

const BACKEND_URL = "http://localhost:8000";

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  const resp = await fetch(`${BACKEND_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }

  return resp.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const resp = await fetch(`${BACKEND_URL}/health`, { method: "GET" });
    return resp.ok;
  } catch {
    return false;
  }
}
