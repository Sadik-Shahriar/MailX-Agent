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
  | "DEV_SIGN_IN";

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
}
