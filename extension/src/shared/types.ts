export interface EmailContext {
  id: string;
  sender: string;
  subject: string;
  body: string;
  snippet?: string;
  url?: string;
  hostname?: string;
  heuristics?: string[];
}

export interface UserPreferences {
  reply_tone: "formal" | "casual" | "professional";
  reminder_delay_days: number;
  reminder_notify_before: boolean;
  reminder_notify_due: boolean;
  reminder_notify_overdue: boolean;
  spam_whitelist: string[];
  spam_blacklist: string[];
  phishing_sensitivity: "low" | "default" | "high";
  phishing_allowlist: string[];
  ai_model?: string;
  thinking_mode?: boolean;
  summary_length?: "short" | "medium" | "long";
  custom_priority_rules?: string;
  custom_reply_instructions?: string;
  custom_summary_instructions?: string;
  custom_draft_instructions?: string;
  custom_task_instructions?: string;
}

export type RequestSource = "explicit" | "automatic" | "unknown";

export interface RequestTelemetry {
  request_id: string;
  source: RequestSource;
  caller: string;
  started_at_ms: number;
}

export interface ProviderUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface ResponseTelemetry {
  request_id: string;
  source: RequestSource;
  intent: string;
  model?: string;
  provider_duration_ms?: number;
  backend_duration_ms: number;
  input_characters?: number;
  usage?: ProviderUsage;
  finish_reason?: string;
  retry_count: number;
  retry_reason?: string;
  retry_reasons?: string[];
}

export interface SpamResult {
  verdict: "spam" | "not_spam";
  confidence: number;
  reason: string;
  category: "bulk" | "impersonation" | "newsletter" | "normal" | "transactional";
  source: "rule" | "llm";
}

export interface UrlVerdict {
  url: string;
  hostname: string;
  verdict: "clean" | "suspicious" | "phishing";
  confidence: number;
  reason: string;
  heuristics: string[];
  source: "allowlist" | "heuristic" | "llm";
}

export interface ModelStatusResponse {
  model: string;
  status: "available" | "rate_limited" | "unsupported" | "error";
  latency_ms: number;
  message: string;
}

export interface ChatRequest {
  intent: string;
  email_context?: EmailContext;
  preferences?: Partial<UserPreferences>;
  prompt?: string;
  history?: ChatMessage[];
  telemetry?: RequestTelemetry;
  model?: string;
  thinking_mode?: boolean;
}

export type StructuredAiResult =
  | { kind: "priority"; priority: "high" | "medium" | "low"; category: "action_required" | "fyi" | "scheduling" | "newsletter"; confidence: number }
  | { kind: "tasks"; tasks: Array<{ description: string; assignee: string; due_date: string | null; priority: "high" | "medium" | "low" }> }
  | { kind: "draft"; to: string | null; subject: string; greeting: string; body: string; sign_off: string }
  | { kind: "spam"; verdict: "spam" | "not_spam"; confidence: number; reason: string; category: "bulk" | "impersonation" | "newsletter" | "normal" | "transactional" }
  | { kind: "phishing"; verdict: "clean" | "suspicious" | "phishing"; confidence: number; reason: string };

export interface ChatResponse {
  intent: string;
  response: string | string[];
  result?: StructuredAiResult;
  actions: ActionButton[];
  email_id?: string;
  telemetry?: ResponseTelemetry;
}

export interface ActionButton {
  label: string;
  action: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Task {
  id: string;
  email_id: string;
  description: string;
  assignee: string;
  due_date: string | null;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed" | "dismissed";
  created_at: string | number;
  email_subject?: string;
  email_sender?: string;
}

export type MessageType =
  | "SUMMARIZE"
  | "SUGGEST_REPLIES"
  | "CLASSIFY_PRIORITY"
  | "EXTRACT_TASKS"
  | "GENERATE_DRAFT"
  | "CHAT"
  | "GET_TASKS"
  | "TOGGLE_TASK"
  | "DELETE_TASK"
  | "DELETE_COMPLETED_TASKS"
  | "GET_REMINDERS"
  | "DISMISS_REMINDER"
  | "GET_STATS"
  | "GET_PREFERENCES"
  | "SAVE_PREFERENCES"
  | "CHECK_MODEL_STATUS"
  | "GET_STATUS"
  | "SIGN_IN"
  | "SIGN_OUT"
  | "DEV_SIGN_IN"
  | "CHECK_SPAM"
  | "CHECK_PHISHING_URL"
  | "CANCEL_REQUEST"
  | "FIND_PANEL";

export interface ExtensionMessage {
  type: MessageType;
  email_id?: string;
  email_context?: EmailContext;
  prompt?: string;
  task_id?: string;
  history?: ChatMessage[];
  email?: string;
  reminder_id?: string;
  period?: 7 | 30 | 90;
  refresh?: boolean;
  preferences?: Partial<UserPreferences>;
  model?: string;
  url?: string;
  telemetry?: RequestTelemetry;
  request_id?: string;
}
