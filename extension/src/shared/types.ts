export interface EmailContext {
  id: string;
  sender: string;
  subject: string;
  body: string;
  snippet?: string;
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

export interface ChatRequest {
  intent: string;
  email_context?: EmailContext;
  preferences?: Partial<UserPreferences>;
  prompt?: string;
  conversation_id?: string;
  history?: ChatMessage[];
}

export interface ChatResponse {
  intent: string;
  response: string | string[];
  actions: ActionButton[];
  email_id?: string;
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

export interface SenderScore {
  sender_email: string;
  score: number;
  reply_count: number;
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
  | "GET_REMINDERS"
  | "DISMISS_REMINDER"
  | "GET_STATS"
  | "GET_PREFERENCES"
  | "SAVE_PREFERENCES"
  | "GET_STATUS"
  | "SIGN_IN"
  | "SIGN_OUT"
  | "DEV_SIGN_IN"
  | "CHECK_SPAM"
  | "CHECK_PHISHING_URL";

export interface ExtensionMessage {
  type: MessageType;
  email_id?: string;
  email_context?: EmailContext;
  prompt?: string;
  task_id?: string;
  conversation_id?: string;
  history?: ChatMessage[];
  email?: string;
  reminder_id?: string;
  period?: 7 | 30 | 90;
  preferences?: Partial<UserPreferences>;
  url?: string;
}
