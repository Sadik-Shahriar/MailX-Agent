import React, { useState, useEffect, useRef } from "react";
import { PanelHost } from "../../../content/panel/PanelHost";
import { EmailContext, ExtensionMessage } from "../../../shared/types";
import { AiRuntimeResponse } from "../../../content/panel/PanelHost";
import { Button } from "../../components/Button";
import { ResultView } from "./ResultView";
import { ChatView } from "./ChatView";
import { DraftView } from "./DraftView";
import { SecurityResultView } from "./SecurityResultView";
import type { SecurityPanelData } from "../../../content/panel/PanelController";

export interface AssistantViewProps {
  host: PanelHost;
  emailContext: EmailContext | null;
  externalAction?: { action: string, context: any } | null;
  onExternalActionHandled?: () => void;
  securityResult?: SecurityPanelData | null;
  onSecurityHandled?: () => void;
}

export function AssistantView({ host, emailContext, externalAction, onExternalActionHandled, securityResult, onSecurityHandled }: AssistantViewProps) {
  const [context, setContext] = useState<EmailContext | null>(null);
  const [activeView, setActiveView] = useState<"actions" | "result" | "chat" | "draft" | "security">("actions");
  
  // Pending request info
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [resultPending, setResultPending] = useState(false);
  const [actionResult, setActionResult] = useState<AiRuntimeResponse | undefined>(undefined);
  const [securityData, setSecurityData] = useState<SecurityPanelData | null>(null);
  const contextIdRef = useRef<string | null>(null);
  const requestRef = useRef<{ contextId: string; cancel: () => void } | null>(null);
  const requestVersionRef = useRef(0);
  const actionTriggerRefs = useRef<Partial<Record<string, HTMLDivElement>>>({});
  const returnFocusActionRef = useRef<string | null>(null);

  useEffect(() => {
    const action = returnFocusActionRef.current;
    if (activeView !== "actions" || !action) return;
    actionTriggerRefs.current[action]?.querySelector<HTMLButtonElement>("button")?.focus();
    returnFocusActionRef.current = null;
  }, [activeView]);

  const returnToActions = () => {
    setActiveView("actions");
  };

  function cancelResultRequest() {
    requestVersionRef.current += 1;
    requestRef.current?.cancel();
    requestRef.current = null;
    setResultPending(false);
  }

  useEffect(() => () => {
    requestVersionRef.current += 1;
    requestRef.current?.cancel();
  }, []);

  useEffect(() => {
    const nextContextId = emailContext?.id || null;
    if (contextIdRef.current !== null && contextIdRef.current !== nextContextId) {
      // Clear panel-owned state before the new Gmail message can be acted on.
      cancelResultRequest();
      host.cancelAllAiRequests();
      setActiveView("actions");
      setPendingAction(null);
      setResultPending(false);
      setActionResult(undefined);
    }
    contextIdRef.current = nextContextId;
    setContext(emailContext);
  }, [emailContext, host]);

  useEffect(() => {
    if (externalAction) {
      const actionContext = externalAction.context as EmailContext | null;
      const actionContextId = actionContext?.id || null;
      if (contextIdRef.current !== null && contextIdRef.current !== actionContextId) {
        cancelResultRequest();
        host.cancelAllAiRequests();
      }
      contextIdRef.current = actionContextId;
      setContext(actionContext);
      handleAction(externalAction.action, actionContext);
      if (onExternalActionHandled) onExternalActionHandled();
    }
  }, [externalAction, host]);

  useEffect(() => {
    if (!securityResult) return;
    setSecurityData(securityResult);
    setActiveView("security");
    onSecurityHandled?.();
  }, [securityResult, onSecurityHandled]);

  const handleAction = (action: string, overrideContext?: any) => {
    const activeContext = overrideContext || context;
    if (!activeContext && action !== "draft" && action !== "ask") {
      // should not happen, buttons are disabled
      return;
    }

    returnFocusActionRef.current = action;
    if (action === "ask") {
      setActiveView("chat");
      return;
    }

    if (action === "draft") {
      setActiveView("draft");
      return;
    }

    setActiveView("result");
    setPendingAction(action);
    setResultPending(true);
    setActionResult(undefined);
    
    // Dispatch AI
    const messageType = action === "summarize" ? "SUMMARIZE" :
                        action === "reply" ? "SUGGEST_REPLIES" :
                        action === "extract" ? "EXTRACT_TASKS" : "";
    if (!messageType) return;

    const requestContextId = activeContext!.id;
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    const req = host.sendAiMessage(
      { type: messageType as any, email_context: activeContext! } as ExtensionMessage,
      "explicit",
      "action_panel",
      (res) => {
        if (contextIdRef.current !== requestContextId || requestVersionRef.current !== requestVersion) return;
        requestVersionRef.current += 1;
        requestRef.current = null;
        setActionResult(res);
        setResultPending(false);
      }
    );
    if (requestVersionRef.current === requestVersion) {
      requestRef.current = { contextId: requestContextId, cancel: req.cancel };
    }
  };

  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);

  if (activeView === "result") {
    return <ResultView 
      host={host} 
      action={pendingAction} 
      result={actionResult}
      pending={resultPending}
      onBack={() => { cancelResultRequest(); returnToActions(); }}
      onCancel={() => { cancelResultRequest(); returnToActions(); }}
      onAskQuestion={(question) => {
        cancelResultRequest();
        setChatInitialPrompt(question);
        setActiveView("chat");
      }}
    />;
  }

  if (activeView === "chat") {
    return <ChatView host={host} context={context} onBack={() => { setChatInitialPrompt(undefined); returnToActions(); }} initialPrompt={chatInitialPrompt} />;
  }

  if (activeView === "draft") {
    return <DraftView host={host} context={context} onBack={returnToActions} />;
  }

  if (activeView === "security" && securityData) {
    return <SecurityResultView data={securityData} onBack={() => { setSecurityData(null); returnToActions(); }} />;
  }

  return (
    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0, fontSize: "var(--mx-type-title)" }}>Assistant</h2>
      
      {/* Email Context Header */}
      {context ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: "12px 14px",
            background: "var(--mx-surface-subtle)",
            borderRadius: "var(--mx-radius-md)",
            border: "1px solid var(--mx-control-border)",
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: "rgba(59, 130, 246, 0.15)",
              color: "var(--mx-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            ✉️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              <span style={{ fontSize: "var(--mx-type-xs)", fontWeight: 700, letterSpacing: "0.06em", color: "#10B981", textTransform: "uppercase" }}>Active Email</span>
            </div>
            <div style={{ fontSize: "var(--mx-type-sm)", fontWeight: 600, color: "var(--mx-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {context.sender}
            </div>
            <div style={{ fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {context.subject || "No subject"}
            </div>
          </div>
        </div>
      ) : (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: "14px",
            textAlign: "center",
            color: "var(--mx-text-secondary)",
            fontSize: "var(--mx-type-xs)",
            background: "var(--mx-surface-subtle)",
            borderRadius: "var(--mx-radius-md)",
            border: "1px dashed var(--mx-control-border)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span style={{ fontSize: 18 }}>📫</span>
          <span>Open an email to enable Summary, Suggested reply, and Extract tasks.</span>
        </div>
      )}

      {/* Group 1: Thread Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: "var(--mx-type-xs)", fontWeight: 700, letterSpacing: "0.06em", color: "var(--mx-text-secondary)", textTransform: "uppercase", paddingLeft: 2 }}>
          Thread Actions
        </div>

        <div ref={(element) => { actionTriggerRefs.current.summarize = element || undefined; }}>
          <Button 
            variant="secondary" 
            disabled={!context} 
            onClick={() => handleAction("summarize")}
            style={{ width: "100%", justifyContent: "space-between", padding: "10px 14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(59, 130, 246, 0.15)", color: "#60A5FA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                ⚡
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                <span style={{ fontWeight: 600, fontSize: "var(--mx-type-sm)", color: "var(--mx-text)" }}>Summarize</span>
                <span style={{ fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)", fontWeight: 400 }}>Read faster</span>
              </div>
            </div>
            <span style={{ fontSize: 16, color: "var(--mx-text-secondary)", opacity: 0.5 }}>›</span>
          </Button>
        </div>

        <div ref={(element) => { actionTriggerRefs.current.reply = element || undefined; }}>
          <Button 
            variant="secondary" 
            disabled={!context} 
            onClick={() => handleAction("reply")}
            style={{ width: "100%", justifyContent: "space-between", padding: "10px 14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                💬
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                <span style={{ fontWeight: 600, fontSize: "var(--mx-type-sm)", color: "var(--mx-text)" }}>Suggested reply</span>
                <span style={{ fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)", fontWeight: 400 }}>Draft a response</span>
              </div>
            </div>
            <span style={{ fontSize: 16, color: "var(--mx-text-secondary)", opacity: 0.5 }}>›</span>
          </Button>
        </div>

        <div ref={(element) => { actionTriggerRefs.current.extract = element || undefined; }}>
          <Button 
            variant="secondary" 
            disabled={!context} 
            onClick={() => handleAction("extract")}
            style={{ width: "100%", justifyContent: "space-between", padding: "10px 14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(16, 185, 129, 0.15)", color: "#34D399", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                📋
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                <span style={{ fontWeight: 600, fontSize: "var(--mx-type-sm)", color: "var(--mx-text)" }}>Extract tasks</span>
                <span style={{ fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)", fontWeight: 400 }}>Find action items</span>
              </div>
            </div>
            <span style={{ fontSize: 16, color: "var(--mx-text-secondary)", opacity: 0.5 }}>›</span>
          </Button>
        </div>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--mx-divider)", margin: "4px 0" }} />

      {/* Group 2: AI Composer & Chat */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: "var(--mx-type-xs)", fontWeight: 700, letterSpacing: "0.06em", color: "var(--mx-text-secondary)", textTransform: "uppercase", paddingLeft: 2 }}>
          Compose & Chat
        </div>

        <div ref={(element) => { actionTriggerRefs.current.draft = element || undefined; }}>
          <Button 
            variant="secondary" 
            onClick={() => handleAction("draft")}
            style={{ width: "100%", justifyContent: "space-between", padding: "10px 14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(168, 85, 247, 0.15)", color: "#C084FC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                ✍️
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                <span style={{ fontWeight: 600, fontSize: "var(--mx-type-sm)", color: "var(--mx-text)" }}>Create draft</span>
                <span style={{ fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)", fontWeight: 400 }}>Write a new email</span>
              </div>
            </div>
            <span style={{ fontSize: 16, color: "var(--mx-text-secondary)", opacity: 0.5 }}>›</span>
          </Button>
        </div>

        <div ref={(element) => { actionTriggerRefs.current.ask = element || undefined; }}>
          <Button 
            variant="secondary" 
            disabled={!context} 
            onClick={() => handleAction("ask")}
            style={{ width: "100%", justifyContent: "space-between", padding: "10px 14px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(245, 158, 11, 0.15)", color: "#FBBF24", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                ✨
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                <span style={{ fontWeight: 600, fontSize: "var(--mx-type-sm)", color: "var(--mx-text)" }}>Ask MailX</span>
                <span style={{ fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)", fontWeight: 400 }}>Chat about this email</span>
              </div>
            </div>
            <span style={{ fontSize: 16, color: "var(--mx-text-secondary)", opacity: 0.5 }}>›</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
