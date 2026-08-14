import type { ChatMessage } from "../../../shared/types";

export interface ConversationMessage extends ChatMessage {
  id: string;
  result?: unknown;
  isInsertable?: boolean;
}

const MAX_CONVERSATIONS = 3;
const MAX_MESSAGES = 10;
const conversations = new Map<string, ConversationMessage[]>();

function keyForEmail(id: string, sender: string, subject: string): string {
  return `${id}:${sender}:${subject}`;
}

export function getConversation(id: string, sender: string, subject: string): ConversationMessage[] {
  const key = keyForEmail(id, sender, subject);
  const messages = conversations.get(key) || [];
  if (conversations.has(key)) conversations.delete(key);
  conversations.set(key, messages);
  while (conversations.size > MAX_CONVERSATIONS) conversations.delete(conversations.keys().next().value!);
  return messages;
}

export function appendConversationMessage(
  id: string,
  sender: string,
  subject: string,
  message: ConversationMessage,
): ConversationMessage[] {
  const messages = [...getConversation(id, sender, subject), message].slice(-MAX_MESSAGES);
  conversations.set(keyForEmail(id, sender, subject), messages);
  return messages;
}

export function clearConversation(id: string, sender: string, subject: string): void {
  conversations.set(keyForEmail(id, sender, subject), []);
}

export function conversationHistory(messages: ConversationMessage[]): ChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

export function isDraftPrompt(prompt: string): boolean {
  return /\b(draft|compose|new email|write (?:an )?email|generate (?:an )?email)\b/i.test(prompt);
}

export function isMailSendingPrompt(prompt: string): boolean {
  return /\b(draft|compose|reply|replies|response|respond|write (?:an? )?(?:email|reply|response|mail|message)|generate (?:an? )?(?:email|reply|response|mail|draft)|suggest (?:a )?reply|send (?:an? )?(?:email|reply|mail|message|follow-?up)|create (?:an? )?(?:email|reply|response|draft))\b/i.test(prompt);
}

export function resetConversationsForTests(): void {
  conversations.clear();
}
