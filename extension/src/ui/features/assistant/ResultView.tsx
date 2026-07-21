import React, { useEffect, useRef, useState } from "react";
import { PanelHost } from "../../../content/panel/PanelHost";
import { Spinner, useToast } from "../../components/Feedback";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { parseReplyOptions } from "../../../shared/aiPolicy";
import { getAiResponseState, responseText } from "./response";
import ReactMarkdown from "react-markdown";

export interface ResultViewProps {
  host: PanelHost;
  action: string | null;
  result: unknown;
  pending: boolean;
  onBack: () => void;
  onCancel?: () => void;
}

export function ResultView({ host, action, result, pending, onBack, onCancel }: ResultViewProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [insertPending, setInsertPending] = useState(false);
  const { showToast } = useToast();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const handleCopy = async (text: string) => {
    const success = await host.copyText(text);
    if (success) {
      showToast("Copied to clipboard");
    } else {
      showToast("Failed to copy", "error");
    }
  };

  const handleInsert = () => {
    const composeText = host.getComposeText();
    if (composeText && composeText.trim().length > 0) {
      setShowConfirm(true);
    } else {
      performInsert(false);
    }
  };

  const responseState = getAiResponseState(result);

  function getCopyText(): string {
    if (responseState.state !== "success") return "";
    if (responseState.response.result?.kind === "tasks") {
      return responseState.response.result.tasks.map((task) =>
        `${task.description}\n${task.assignee}${task.due_date ? `, due ${task.due_date}` : ""} (${task.priority})`
      ).join("\n\n");
    }
    return responseText(responseState.response);
  }

  const performInsert = async (replace: boolean) => {
    setShowConfirm(false);
    if (responseState.state !== "success") return;
    
    // For suggested replies, we insert the text.
    let textToInsert = "";
    const text = responseText(responseState.response);
    const replies = parseReplyOptions(text);
    textToInsert = replies[0] || text;

    setInsertPending(true);
    const inserted = await host.insertReply(textToInsert, replace);
    setInsertPending(false);
    if (inserted) {
      showToast("Inserted in Gmail");
    } else {
      showToast("Could not find a reply box. Try opening one first.", "error");
    }
  };

  let title = "Result";
  if (action === "summarize") title = "Summary";
  if (action === "reply") title = "Suggested reply";
  if (action === "extract") title = "Extracted tasks";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--mx-divider)", background: "var(--mx-surface-subtle)" }}>
        <button aria-label="Back to Assistant" onClick={onBack} style={{ background: "transparent", border: "none", cursor: "pointer", marginRight: 8, display: "flex", padding: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0, fontSize: 16 }}>{title}</h2>
      </div>

      <div style={{ padding: 16 }}>
        {pending ? (
          <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 100, color: "var(--mx-text-secondary)", gap: 12 }}>
            <Spinner />
            <span style={{ fontSize: 13 }}>{action === "summarize" ? "Summarizing..." : "Generating..."}</span>
            <Button variant="secondary" onClick={onCancel || onBack}>Cancel</Button>
          </div>
        ) : responseState.state === "error" ? (
          <div role="alert" style={{ color: "var(--mx-danger)", fontSize: 13, background: "var(--mx-danger-soft)", padding: 12, borderRadius: 8 }}>
            <strong>Error:</strong> {responseState.message}
          </div>
        ) : responseState.state === "success" && responseState.response.result?.kind === "tasks" ? (
          <ul aria-label="Extracted tasks" style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {responseState.response.result.tasks.map((task, index) => (
              <li key={`${task.description}-${index}`}>
                <strong>{task.description}</strong>
                <div>{task.assignee}{task.due_date ? `, due ${task.due_date}` : ""} ({task.priority})</div>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--mx-text)" }}>
            <ReactMarkdown>{responseState.state === "success" ? responseText(responseState.response) : ""}</ReactMarkdown>
          </div>
        )}
      </div>

      {responseState.state === "success" && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--mx-divider)", background: "var(--mx-surface-subtle)", display: "flex", gap: 8 }}>
          {action === "reply" && (
            <Button variant="primary" onClick={handleInsert} style={{ flex: 1 }}>Insert in Gmail</Button>
          )}
          <Button variant="secondary" onClick={() => handleCopy(getCopyText())} style={{ flex: action === "summarize" ? 1 : undefined }}>Copy</Button>
        </div>
      )}

      {showConfirm && (
        <Dialog 
          isOpen={showConfirm} 
          title="Replace existing reply?"
          onClose={() => setShowConfirm(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowConfirm(false); showToast("Your existing text was kept."); }}>Keep my text</Button>
              <Button variant="primary" onClick={() => void performInsert(true)} disabled={insertPending}>Replace</Button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: "var(--mx-text-secondary)", margin: 0 }}>This reply box already has text. Replace it with the selected MailX reply?</p>
        </Dialog>
      )}
    </div>
  );
}
