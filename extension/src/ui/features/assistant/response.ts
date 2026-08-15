import type { ChatResponse, StructuredAiResult } from "../../../shared/types";
import type { AiErrorResponse, AiRuntimeResponse } from "../../../content/panel/PanelHost";

export type AiResponseState =
  | { state: "error"; message: string }
  | { state: "success"; response: ChatResponse };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStructuredResult(value: unknown): value is StructuredAiResult {
  if (!isRecord(value) || typeof value.kind !== "string") return false;

  switch (value.kind) {
    case "priority":
      return typeof value.priority === "string" && typeof value.category === "string" && typeof value.confidence === "number";
    case "tasks":
      return Array.isArray(value.tasks) && value.tasks.every((task) =>
        isRecord(task) && typeof task.description === "string" &&
        (typeof task.assignee === "string" || task.assignee === null || task.assignee === undefined) &&
        (typeof task.due_date === "string" || task.due_date === null || task.due_date === undefined) &&
        (typeof task.priority === "string" || task.priority === undefined),
      );
    case "draft":
      return (typeof value.to === "string" || value.to === null || value.to === undefined) && typeof value.subject === "string" &&
        typeof value.greeting === "string" && typeof value.body === "string" && typeof value.sign_off === "string";
    case "spam":
      return typeof value.verdict === "string" && typeof value.confidence === "number" && typeof value.reason === "string" &&
        typeof value.category === "string";
    case "phishing":
      return typeof value.verdict === "string" && typeof value.confidence === "number" && typeof value.reason === "string";
    default:
      return false;
  }
}

function isChatResponse(value: unknown): value is ChatResponse {
  if (!isRecord(value) || typeof value.intent !== "string" || !Array.isArray(value.actions)) return false;
  if (typeof value.response !== "string" && (!Array.isArray(value.response) || !value.response.every((item) => typeof item === "string"))) {
    return false;
  }
  if (!value.actions.every((action) => isRecord(action) && typeof action.label === "string" && typeof action.action === "string")) {
    return false;
  }
  return value.result == null || isStructuredResult(value.result);
}

function isErrorResponse(value: unknown): value is AiErrorResponse {
  return isRecord(value) && typeof value.error === "string";
}

export function getAiResponseState(value: AiRuntimeResponse | unknown | undefined): AiResponseState {
  if (value === undefined || value === null) {
    return { state: "error", message: "MailX did not return a response. Please try again." };
  }
  if (isErrorResponse(value)) return { state: "error", message: value.error };
  if (isChatResponse(value)) return { state: "success", response: value };
  return { state: "error", message: "MailX received an unexpected response. Please try again." };
}

export function responseText(response: ChatResponse): string {
  return Array.isArray(response.response) ? response.response.filter(Boolean).join("\n\n") : response.response;
}
