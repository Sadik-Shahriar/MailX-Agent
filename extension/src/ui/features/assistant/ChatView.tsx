import React, { useState, useRef, useEffect } from "react";
import { PanelHost } from "../../../content/panel/PanelHost";
import { ChatResponse, EmailContext } from "../../../shared/types";
import { Button } from "../../components/Button";
import { Spinner } from "../../components/Feedback";
import { Dialog } from "../../components/Dialog";
import ReactMarkdown from "react-markdown";
import { getAiResponseState, responseText } from "./response";
import {
  appendConversationMessage,
  clearConversation,
  conversationHistory,
  ConversationMessage,
  getConversation,
  isDraftPrompt,
} from "./conversation";

export interface ChatViewProps {
  host: PanelHost;
  context: EmailContext | null;
  onBack: () => void;
}

export function ChatView({ host, context, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>(() => context ? getConversation(context.id, context.sender, context.subject) : []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const messageIdRef = useRef(0);
  const requestVersionRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const nextMessageId = () => `${Date.now()}-${++messageIdRef.current}`;

  useEffect(() => {
    setMessages(context ? getConversation(context.id, context.sender, context.subject) : []);
    setInput("");
  }, [context?.id, context?.sender, context?.subject]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, loading]);

  function cancelPending() {
    requestVersionRef.current += 1;
    cancelRef.current?.();
    cancelRef.current = null;
    setLoading(false);
  }

  useEffect(() => () => {
    requestVersionRef.current += 1;
    cancelRef.current?.();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || !context) return;
    
    const prompt = input.trim();
    const history = conversationHistory(messages);
    const userMessage: ConversationMessage = { id: nextMessageId(), role: "user", content: prompt };
    setMessages(appendConversationMessage(context.id, context.sender, context.subject, userMessage));
    setInput("");
    setLoading(true);
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    const type = isDraftPrompt(prompt) ? "GENERATE_DRAFT" : "CHAT";
    const req = host.sendAiMessage(
      { type, email_context: context, prompt, ...(type === "CHAT" ? { history } : {}) } as any,
      "explicit",
      "chat_composer",
      (res) => {
        if (requestVersionRef.current !== requestVersion) return;
        requestVersionRef.current += 1;
        setLoading(false);
        cancelRef.current = null;
        const responseState = getAiResponseState(res);
        const text = responseState.state === "error"
          ? `**Error:** ${responseState.message}`
          : responseState.state === "success"
            ? responseText(responseState.response)
            : "**Error:** MailX did not return a response. Please try again.";
        setMessages(appendConversationMessage(context.id, context.sender, context.subject, {
          id: nextMessageId(), role: "assistant", content: text,
          result: responseState.state === "success" ? responseState.response : undefined,
        }));
      }
    );
    if (requestVersionRef.current === requestVersion) cancelRef.current = req.cancel;
  };

  const handleBack = () => {
    cancelPending();
    onBack();
  };

  const confirmNewChat = () => {
    cancelPending();
    if (context) {
      clearConversation(context.id, context.sender, context.subject);
      setMessages([]);
    }
    setShowNewChatConfirm(false);
  };

  const handleNewChat = () => {
    if (!messages.length) return;
    setShowNewChatConfirm(true);
  };

  const handleInsert = async (message: ConversationMessage) => {
    const response = message.result as ChatResponse | undefined;
    if (!response) return;
    if (response.result?.kind === "draft") {
      await host.insertDraft(response.result, false);
    } else {
      await host.insertReply(message.content, false);
    }
  };

  const stopGmailShortcuts = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--mx-divider)", background: "var(--mx-surface-subtle)" }}>
        <button aria-label="Back to Assistant" onClick={handleBack} style={{ background: "transparent", border: "none", cursor: "pointer", marginRight: 8, display: "flex", padding: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0, fontSize: 16 }}>Ask MailX</h2>
          {context && <span style={{ fontSize: 12, color: "var(--mx-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 250 }}>{context.subject}</span>}
        </div>
        <Button variant="secondary" type="button" onClick={handleNewChat} disabled={!messages.length} style={{ marginLeft: "auto" }}>New chat</Button>
      </div>

      <div ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--mx-text-secondary)", fontSize: 13, marginTop: 40 }}>
            Ask questions about this email thread.
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ alignSelf: msg.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}>
              <div style={{ fontSize: 12, color: "var(--mx-text-secondary)", marginBottom: 4, textAlign: msg.role === "user" ? "right" : "left" }}>
                {msg.role === "user" ? "You" : "MailX"}
              </div>
              <div style={{ 
                background: msg.role === "user" ? "var(--mx-primary)" : "var(--mx-surface-subtle)", 
                color: msg.role === "user" ? "var(--mx-on-primary)" : "var(--mx-text)",
                padding: "8px 12px", 
                borderRadius: "var(--mx-radius-lg)",
                border: msg.role === "assistant" ? "1px solid var(--mx-divider)" : "none",
                fontSize: 13, lineHeight: 1.4
              }}>
                {msg.role === "user" ? msg.content : <ReactMarkdown>{msg.content}</ReactMarkdown>}
              </div>
              {msg.role === "assistant" && (msg.result as ChatResponse | undefined)?.intent === "reply" && (
                <Button variant="secondary" type="button" onClick={() => void handleInsert(msg)} style={{ marginTop: 8 }}>Insert reply</Button>
              )}
              {msg.role === "assistant" && (msg.result as ChatResponse | undefined)?.result?.kind === "draft" && (
                <Button variant="secondary" type="button" onClick={() => void handleInsert(msg)} style={{ marginTop: 8 }}>Insert draft</Button>
              )}
            </div>
          ))
        )}
        {loading && (
          <div role="status" style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, color: "var(--mx-text-secondary)", fontSize: 12 }}>
            <Spinner />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      <div style={{ padding: 16, borderTop: "1px solid var(--mx-divider)", background: "var(--mx-surface-subtle)" }}>
        <label htmlFor="mailx-chat-input" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Ask MailX about this email</label>
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            id="mailx-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={stopGmailShortcuts}
            onKeyUp={stopGmailShortcuts}
            onKeyPress={stopGmailShortcuts}
            placeholder="Ask a question..."
            style={{ 
              flex: 1, padding: "8px 12px", borderRadius: "var(--mx-radius-md)", 
                border: "1px solid var(--mx-divider)", fontSize: 13
            }}
            disabled={loading}
          />
          {loading ? <Button variant="secondary" type="button" onClick={cancelPending}>Cancel</Button> : (
            <Button variant="primary" type="submit" disabled={!input.trim()}>Send</Button>
          )}
        </form>
      </div>
      <Dialog
        isOpen={showNewChatConfirm}
        title="Start a new chat?"
        onClose={() => setShowNewChatConfirm(false)}
        footer={<><Button variant="secondary" onClick={() => setShowNewChatConfirm(false)}>Cancel</Button><Button variant="primary" onClick={confirmNewChat}>New chat</Button></>}
      >
        <p style={{ margin: 0 }}>This clears the conversation for this email.</p>
      </Dialog>
    </div>
  );
}
