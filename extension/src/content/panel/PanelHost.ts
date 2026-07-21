import { ChatResponse, EmailContext, ExtensionMessage, StructuredAiResult } from "../../shared/types";

export type AiErrorResponse = { error: string };
export type AiRuntimeResponse = ChatResponse | AiErrorResponse;
export type StructuredDraft = Extract<StructuredAiResult, { kind: "draft" }>;
export type InsertDraftResult =
  | { ok: true; composer: HTMLElement }
  | { ok: false; reason: "no_composer" };

export interface PanelHost {
  sendAiMessage: (
    message: ExtensionMessage,
    source: "explicit" | "automatic",
    caller: string,
    callback: (response: AiRuntimeResponse | undefined) => void
  ) => { requestId: string; cancel: () => void };
  cancelAllAiRequests: () => void;
  extractEmailContext: () => EmailContext | null;
  getComposeText: () => string;
  insertReply: (text: string, replace: boolean) => Promise<boolean>;
  insertDraft: (draft: StructuredDraft, replace: boolean) => Promise<InsertDraftResult>;
  copyText: (text: string) => Promise<boolean>;
}
