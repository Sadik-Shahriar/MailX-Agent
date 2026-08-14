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
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 16 }}>Assistant</h2>
      {context ? (
        <div role="status" aria-live="polite" style={{ padding: 12, background: "var(--mx-surface-subtle)", borderRadius: "var(--mx-radius-md)", border: "1px solid var(--mx-divider)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mx-text)" }}>{context.sender}</div>
          <div style={{ fontSize: 12, color: "var(--mx-text-secondary)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {context.subject}
          </div>
        </div>
      ) : (
        <div role="status" aria-live="polite" style={{ padding: 16, textAlign: "center", color: "var(--mx-text-secondary)", fontSize: 13, background: "var(--mx-surface-subtle)", borderRadius: "var(--mx-radius-md)" }}>
          Open an email to enable Summary, Suggested reply, and Extract tasks.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div ref={(element) => { actionTriggerRefs.current.summarize = element || undefined; }}>
        <Button 
          variant="secondary" 
          disabled={!context} 
          onClick={() => handleAction("summarize")}
          style={{ justifyContent: "flex-start", padding: "12px 16px" }}
        >
          <span style={{ fontWeight: 600, display: "block" }}>Summarize</span>
          <span style={{ fontSize: 12, color: "var(--mx-text-secondary)", fontWeight: 400, marginLeft: 8 }}>Read faster</span>
        </Button>
        </div>
        <div ref={(element) => { actionTriggerRefs.current.reply = element || undefined; }}>
        <Button 
          variant="secondary" 
          disabled={!context} 
          onClick={() => handleAction("reply")}
          style={{ justifyContent: "flex-start", padding: "12px 16px" }}
        >
          <span style={{ fontWeight: 600, display: "block" }}>Suggested reply</span>
          <span style={{ fontSize: 12, color: "var(--mx-text-secondary)", fontWeight: 400, marginLeft: 8 }}>Draft a response</span>
        </Button>
        </div>
        <div ref={(element) => { actionTriggerRefs.current.extract = element || undefined; }}>
        <Button 
          variant="secondary" 
          disabled={!context} 
          onClick={() => handleAction("extract")}
          style={{ justifyContent: "flex-start", padding: "12px 16px" }}
        >
          <span style={{ fontWeight: 600, display: "block" }}>Extract tasks</span>
          <span style={{ fontSize: 12, color: "var(--mx-text-secondary)", fontWeight: 400, marginLeft: 8 }}>Find action items</span>
        </Button>
        </div>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--mx-divider)", margin: "8px 0" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div ref={(element) => { actionTriggerRefs.current.draft = element || undefined; }}>
        <Button 
          variant="secondary" 
          onClick={() => handleAction("draft")}
          style={{ justifyContent: "flex-start", padding: "12px 16px" }}
        >
          <span style={{ fontWeight: 600, display: "block" }}>Create draft</span>
          <span style={{ fontSize: 12, color: "var(--mx-text-secondary)", fontWeight: 400, marginLeft: 8 }}>Write a new email</span>
        </Button>
        </div>
        <div ref={(element) => { actionTriggerRefs.current.ask = element || undefined; }}>
        <Button 
          variant="secondary" 
          disabled={!context} 
          onClick={() => handleAction("ask")}
          style={{ justifyContent: "flex-start", padding: "12px 16px" }}
        >
          <span style={{ fontWeight: 600, display: "block" }}>Ask MailX</span>
          <span style={{ fontSize: 12, color: "var(--mx-text-secondary)", fontWeight: 400, marginLeft: 8 }}>Chat about this email</span>
        </Button>
        </div>
      </div>
    </div>
  );
}
