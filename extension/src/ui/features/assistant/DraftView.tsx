import React, { useEffect, useState, useRef } from "react";
import { PanelHost } from "../../../content/panel/PanelHost";
import { EmailContext } from "../../../shared/types";
import { AiRuntimeResponse } from "../../../content/panel/PanelHost";
import { Button } from "../../components/Button";
import { useToast } from "../../components/Feedback";
import { Dialog } from "../../components/Dialog";
import { formatDraft } from "../../../shared/aiPolicy";
import { getAiResponseState, responseText } from "./response";
import ReactMarkdown from "react-markdown";

export interface DraftViewProps {
  host: PanelHost;
  context: EmailContext | null;
  onBack: () => void;
}

export function DraftView({ host, context, onBack }: DraftViewProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiRuntimeResponse | undefined>(undefined);
  const [showConfirm, setShowConfirm] = useState(false);
  const { showToast } = useToast();
  const cancelRef = useRef<(() => void) | null>(null);
  const requestVersionRef = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

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

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResult(undefined);
    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    const req = host.sendAiMessage(
      { type: "GENERATE_DRAFT", email_context: context || { id: "", sender: "", subject: "", body: "" }, prompt: prompt.trim() } as any,
      "explicit",
      "draft_composer",
      (res) => {
        if (requestVersionRef.current !== requestVersion) return;
        requestVersionRef.current += 1;
        setLoading(false);
        cancelRef.current = null;
        setResult(res);
      }
    );
    if (requestVersionRef.current === requestVersion) cancelRef.current = req.cancel;
  };

  const handleBack = () => {
    cancelPending();
    onBack();
  };

  const handleInsert = () => {
    const composeText = host.getComposeText();
    if (composeText && composeText.trim().length > 0) {
      setShowConfirm(true);
    } else {
      performInsert(false);
    }
  };

  const performInsert = async (replace: boolean) => {
    setShowConfirm(false);
    const responseState = getAiResponseState(result);
    if (responseState.state !== "success") return;

    const draft = responseState.response.result?.kind === "draft" ? responseState.response.result : null;
    if (!draft) {
      showToast("MailX did not return a structured draft.", "error");
      return;
    }
    const inserted = await host.insertDraft(draft, replace);
    if (inserted) {
      showToast("Inserted draft in Gmail");
    } else {
      showToast("Could not find a compose box.", "error");
    }
  };

  const handleCopy = async () => {
    const responseState = getAiResponseState(result);
    if (responseState.state !== "success") return;
    const draftText = responseState.response.result?.kind === "draft"
      ? formatDraft(responseState.response.result, true)
      : responseText(responseState.response);
    const success = await host.copyText(draftText);
    if (success) showToast("Copied to clipboard");
    else showToast("Failed to copy", "error");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--mx-divider)", background: "var(--mx-surface-subtle)" }}>
        <button aria-label="Back to Assistant" onClick={handleBack} style={{ background: "transparent", border: "none", cursor: "pointer", marginRight: 8, display: "flex", padding: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 ref={headingRef} tabIndex={-1} style={{ margin: 0, fontSize: 16 }}>Create draft</h2>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        <form onSubmit={handleGenerate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label htmlFor="mailx-draft-prompt" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--mx-text)", marginBottom: 4 }}>
              What should this email be about?
            </label>
            <textarea
              id="mailx-draft-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Follow up on the project proposal, keeping it polite and brief."
              style={{
                width: "100%", padding: "8px 12px", borderRadius: "var(--mx-radius-md)",
                border: "1px solid var(--mx-divider)", fontSize: 13,
                resize: "vertical", minHeight: 80, boxSizing: "border-box"
              }}
              disabled={loading}
            />
          </div>
          {loading ? <Button variant="secondary" type="button" onClick={cancelPending}>Cancel</Button> : (
            <Button variant="primary" type="submit" disabled={!prompt.trim()}>Generate draft</Button>
          )}
        </form>

        {result && (() => {
          const responseState = getAiResponseState(result);
          const draft = responseState.state === "success" && responseState.response.result?.kind === "draft"
            ? responseState.response.result
            : null;
          return (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--mx-divider)", paddingTop: 16 }}>
            {responseState.state === "error" ? (
              <div role="alert" style={{ color: "var(--mx-danger)", fontSize: 13, background: "var(--mx-danger-soft)", padding: 12, borderRadius: 8 }}>
                <strong>Error:</strong> {responseState.message}
              </div>
            ) : (
              <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--mx-text)", background: "var(--mx-surface-subtle)", padding: 12, borderRadius: "var(--mx-radius-md)", border: "1px solid var(--mx-divider)" }}>
                  {draft ? (
                    <dl>
                      <dt>To</dt><dd>{draft.to || "Not provided"}</dd>
                      <dt>Subject</dt><dd>{draft.subject}</dd>
                      <dt>Greeting</dt><dd>{draft.greeting}</dd>
                      <dt>Body</dt><dd>{draft.body}</dd>
                      <dt>Sign-off</dt><dd>{draft.sign_off}</dd>
                    </dl>
                  ) : <ReactMarkdown>{responseState.state === "success" ? responseText(responseState.response) : ""}</ReactMarkdown>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="primary" onClick={handleInsert} style={{ flex: 1 }}>Insert in Gmail</Button>
                  <Button variant="secondary" onClick={handleCopy}>Copy</Button>
                </div>
              </div>
            )}
          </div>
          );
        })()}
      </div>

      {showConfirm && (
        <Dialog 
          isOpen={showConfirm} 
          title="Replace existing text?"
          onClose={() => setShowConfirm(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setShowConfirm(false); showToast("Your existing text was kept."); }}>Keep my text</Button>
              <Button variant="primary" onClick={() => void performInsert(true)}>Replace</Button>
            </>
          }
        >
          <p style={{ fontSize: 13, color: "var(--mx-text-secondary)", margin: 0 }}>The compose box already has text. Replace it with the generated draft?</p>
        </Dialog>
      )}
    </div>
  );
}
