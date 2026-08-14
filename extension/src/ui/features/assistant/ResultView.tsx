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
  onAskQuestion?: (question: string) => void;
}

export function parseSummaryBullets(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const rawBullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Handle cases where multiple bullets were packed into one line with • or - or *
    const parts = trimmed.split(/(?<=\S)\s+[•*-]\s+/);
    for (const part of parts) {
      const cleaned = part.replace(/^[\s•*-]+|^\d+[\.\)]\s*/, "").trim();
      if (cleaned) {
        rawBullets.push(cleaned);
      }
    }
  }

  return rawBullets.length > 0 ? rawBullets : [text.trim()];
}

export function ResultView({ host, action, result, pending, onBack, onCancel, onAskQuestion }: ResultViewProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [insertPending, setInsertPending] = useState(false);
  const [followUpInput, setFollowUpInput] = useState("");
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

  const rawText = responseState.state === "success" ? responseText(responseState.response) : "";
  const summaryBullets = action === "summarize" ? parseSummaryBullets(rawText) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: "1px solid var(--mx-divider)",
        background: "var(--mx-surface-subtle)",
      }}>
        <button
          aria-label="Back to Assistant"
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            marginRight: 8,
            display: "flex",
            padding: 4,
            borderRadius: "var(--mx-radius-sm)",
            color: "var(--mx-text-secondary)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0, fontSize: "var(--mx-type-title)", fontWeight: 600, color: "var(--mx-text)" }}>{title}</h2>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
        {pending ? (
          <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 160, color: "var(--mx-text-secondary)", gap: 14 }}>
            <Spinner />
            <span style={{ fontSize: "var(--mx-type-sm)", fontWeight: 500 }}>{action === "summarize" ? "Analyzing email and creating summary..." : "Generating..."}</span>
            <Button variant="secondary" onClick={onCancel || onBack}>Cancel</Button>
          </div>
        ) : responseState.state === "error" ? (
          <div role="alert" style={{ color: "var(--mx-danger)", fontSize: "var(--mx-type-sm)", background: "var(--mx-danger-soft)", padding: 14, borderRadius: "var(--mx-radius-md)", border: "1px solid var(--mx-divider)", lineHeight: 1.5 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>Error occurred</strong>
            {responseState.message}
          </div>
        ) : responseState.state === "success" && action === "summarize" ? (
          /* Enhanced Modern Summary View */
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "var(--mx-primary-soft)",
              borderRadius: "var(--mx-radius-md)",
              border: "1px solid var(--mx-divider)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mx-primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ fontSize: "var(--mx-type-xs)", fontWeight: 700, color: "var(--mx-on-primary-soft)", letterSpacing: "0.04em" }}>
                  KEY TAKEAWAYS
                </span>
              </div>
              <span style={{
                fontSize: "var(--mx-type-xs)",
                fontWeight: 600,
                color: "var(--mx-text-secondary)",
                background: "var(--mx-surface)",
                padding: "2px 8px",
                borderRadius: "var(--mx-radius-pill)",
                border: "1px solid var(--mx-divider)",
              }}>
                {summaryBullets.length} {summaryBullets.length === 1 ? "point" : "points"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {summaryBullets.map((bullet, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 14px",
                    background: "var(--mx-surface-raised)",
                    border: "1px solid var(--mx-divider)",
                    borderRadius: "var(--mx-radius-md)",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    transition: "transform var(--mx-duration-fast) var(--mx-ease-out), box-shadow var(--mx-duration-fast) var(--mx-ease-out)",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 22,
                    height: 22,
                    borderRadius: "var(--mx-radius-pill)",
                    background: "var(--mx-primary-soft)",
                    color: "var(--mx-on-primary-soft)",
                    fontSize: "var(--mx-type-xs)",
                    fontWeight: 700,
                    marginTop: 1,
                  }}>
                    {index + 1}
                  </div>
                  <div style={{
                    flex: 1,
                    fontSize: "var(--mx-type-sm)",
                    lineHeight: "var(--mx-lh-body)",
                    color: "var(--mx-text)",
                    letterSpacing: "-0.01em",
                  }}>
                    {bullet}
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Ask Follow-up Section */}
            {onAskQuestion && (
              <div style={{
                marginTop: 8,
                padding: "12px 14px",
                background: "var(--mx-surface-subtle)",
                borderRadius: "var(--mx-radius-md)",
                border: "1px solid var(--mx-divider)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span style={{ fontSize: "var(--mx-type-xs)", fontWeight: 700, color: "var(--mx-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Ask about this email
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    "Explain simply",
                    "What action is needed?",
                    "Are there any deadlines?",
                    "Draft a polite decline",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => onAskQuestion(suggestion)}
                      style={{
                        padding: "4px 9px",
                        fontSize: "var(--mx-type-xs)",
                        fontWeight: 500,
                        color: "var(--mx-primary)",
                        background: "var(--mx-surface)",
                        border: "1px solid var(--mx-divider)",
                        borderRadius: "var(--mx-radius-pill)",
                        cursor: "pointer",
                        transition: "all var(--mx-duration-fast) var(--mx-ease-out)",
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (followUpInput.trim()) {
                      onAskQuestion(followUpInput.trim());
                      setFollowUpInput("");
                    }
                  }}
                  style={{ display: "flex", gap: 6 }}
                >
                  <input
                    type="text"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    placeholder="Ask anything about this email..."
                    style={{
                      flex: 1,
                      padding: "7px 10px",
                      fontSize: "var(--mx-type-sm)",
                      borderRadius: "var(--mx-radius-sm)",
                      border: "1px solid var(--mx-control-border)",
                      background: "var(--mx-surface)",
                      color: "var(--mx-text)",
                      outline: "none",
                    }}
                  />
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={!followUpInput.trim()}
                    style={{ padding: "0 14px", height: 32 }}
                  >
                    Ask
                  </Button>
                </form>
              </div>
            )}
          </div>
        ) : responseState.state === "success" && (responseState.response.result?.kind === "tasks" || action === "extract") ? (
          /* Enhanced Tasks View */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {responseState.response.result?.kind === "tasks" && responseState.response.result.tasks.length > 0 ? (
              <>
                <div style={{ fontSize: "var(--mx-type-xs)", fontWeight: 700, color: "var(--mx-text-secondary)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 2 }}>
                  Actionable Tasks ({responseState.response.result.tasks.length})
                </div>
                {responseState.response.result.tasks.map((task, index) => {
                  const badgeBg = task.priority === "high" ? "var(--mx-danger-soft)" : task.priority === "medium" ? "var(--mx-warning-soft)" : "var(--mx-success-soft)";
                  const badgeColor = task.priority === "high" ? "var(--mx-danger)" : task.priority === "medium" ? "var(--mx-warning)" : "var(--mx-success)";
                  return (
                    <div
                      key={`${task.description}-${index}`}
                      style={{
                        padding: "12px 14px",
                        background: "var(--mx-surface-raised)",
                        border: "1px solid var(--mx-divider)",
                        borderRadius: "var(--mx-radius-md)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: "var(--mx-type-sm)", fontWeight: 600, color: "var(--mx-text)", lineHeight: 1.4 }}>
                          {task.description}
                        </span>
                        <span style={{
                          fontSize: "var(--mx-type-xs)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: "var(--mx-radius-pill)",
                          background: badgeBg,
                          color: badgeColor,
                          whiteSpace: "nowrap",
                        }}>
                          {task.priority}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "var(--mx-type-xs)", color: "var(--mx-text-secondary)" }}>
                        <span>👤 {task.assignee}</span>
                        {task.due_date && <span>📅 Due {task.due_date}</span>}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "var(--mx-text-secondary)",
                fontSize: "var(--mx-type-sm)",
                background: "var(--mx-surface-subtle)",
                borderRadius: "var(--mx-radius-md)",
                border: "1px solid var(--mx-divider)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}>
                <span style={{ fontSize: 24 }}>📋</span>
                <span style={{ fontWeight: 600, color: "var(--mx-text)" }}>No tasks found in this email</span>
                <span style={{ fontSize: "var(--mx-type-xs)" }}>MailX scanned the email and found no actionable tasks or deadlines.</span>
              </div>
            )}
          </div>
        ) : responseState.state === "success" && action === "reply" ? (
          /* Enhanced Suggested Reply View */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              background: "var(--mx-primary-soft)",
              borderRadius: "var(--mx-radius-sm)",
              width: "fit-content",
            }}>
              <span style={{ fontSize: "var(--mx-type-xs)", fontWeight: 700, color: "var(--mx-on-primary-soft)", letterSpacing: "0.02em" }}>
                SUGGESTED REPLY
              </span>
            </div>
            <div style={{
              padding: "14px 16px",
              background: "var(--mx-surface-raised)",
              border: "1px solid var(--mx-divider)",
              borderLeft: "4px solid var(--mx-primary)",
              borderRadius: "var(--mx-radius-md)",
              fontSize: "var(--mx-type-sm)",
              lineHeight: "var(--mx-lh-body)",
              color: "var(--mx-text)",
              whiteSpace: "pre-wrap",
            }}>
              {parseReplyOptions(rawText)[0] || rawText}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "var(--mx-type-sm)", lineHeight: "var(--mx-lh-body)", color: "var(--mx-text)" }}>
            <ReactMarkdown>{rawText}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Action Footer */}
      {responseState.state === "success" && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--mx-divider)", background: "var(--mx-surface-subtle)", display: "flex", gap: 10 }}>
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
          <p style={{ fontSize: "var(--mx-type-sm)", color: "var(--mx-text-secondary)", margin: 0 }}>This reply box already has text. Replace it with the selected MailX reply?</p>
        </Dialog>
      )}
    </div>
  );
}
