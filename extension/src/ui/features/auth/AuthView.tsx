import React, { useState } from "react";
import { Button } from "../../components/Button";
import { Stack, Section } from "../../components/Layout";
import { InlineAlert } from "../../components/Feedback";
import { sendMessage } from "../../runtime/sendMessage";

export interface AuthViewProps {
  onSuccess: (email: string) => void;
  reconnect?: boolean;
  statusError?: string;
  onRetryStatus?: () => void;
}

export function AuthView({ onSuccess, reconnect = false, statusError = "", onRetryStatus }: AuthViewProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const showDevLogin = import.meta.env.DEV;

  async function handleSignIn(type: "SIGN_IN" | "DEV_SIGN_IN") {
    setError("");
    setLoading(true);
    try {
      const res = await sendMessage({ type });
      if (res?.loggedIn && res.email) {
        onSuccess(res.email);
      } else {
        setError(res?.error || "Failed to sign in.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, textAlign: "center" }} aria-busy={loading} aria-describedby={loading ? "mailx-auth-progress" : undefined}>
      <Stack gap={3}>
        <div>
          <h1 style={{ fontSize: 20, margin: "0 0 4px", color: "var(--mx-text)" }}>{reconnect ? "Reconnect MailX" : "Sign in to MailX"}</h1>
          <p style={{ color: "var(--mx-text-secondary)", margin: "0 0 4px", fontSize: 13 }}>
            {reconnect ? "Your session is no longer available. Reconnect to continue using MailX." : "MailX is your AI-powered Gmail assistant."}
          </p>
          <p style={{ color: "var(--mx-text-tertiary)", margin: 0, fontSize: 12 }}>
            Your Google account is used only to connect MailX. MailX does not automatically analyze your email.
          </p>
        </div>

        {(error || statusError) && (
          <InlineAlert
            variant="error"
            title="Authentication Error"
            action={onRetryStatus && <Button variant="quiet" onClick={onRetryStatus}>Retry connection</Button>}
          >
            {error || statusError}
          </InlineAlert>
        )}

        {loading && <div id="mailx-auth-progress" role="status" aria-live="polite">Opening secure Google sign-in...</div>}

        <div style={{ marginTop: 8 }}>
          <Button
            variant="primary"
            onClick={() => handleSignIn("SIGN_IN")}
            disabled={loading}
            isLoading={loading}
            loadingText="Signing in..."
            style={{ width: "100%" }}
          >
            {reconnect ? "Reconnect with Google" : "Sign in with Google"}
          </Button>

          {showDevLogin && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "var(--mx-text-tertiary)", marginBottom: 4 }}>Development only</div>
              <Button
                variant="quiet"
                onClick={() => handleSignIn("DEV_SIGN_IN")}
                disabled={loading}
                style={{ width: "100%", fontSize: 12 }}
              >
                Dev Login (bypass OAuth)
              </Button>
            </div>
          )}
        </div>
      </Stack>
    </div>
  );
}
