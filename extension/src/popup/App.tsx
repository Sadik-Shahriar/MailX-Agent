import React, { useState, useEffect } from "react";

type Tab = "inbox" | "stats" | "followups";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    setLoading(true);
    try {
      chrome.runtime.sendMessage({ type: "GET_STATUS" }, (res) => {
        if (res?.loggedIn) {
          setIsLoggedIn(true);
          setUserEmail(res.email || "");
        }
        setLoading(false);
      });
    } catch {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setAuthError("");
    chrome.runtime.sendMessage({ type: "SIGN_IN" }, (res) => {
      if (res?.loggedIn) {
        setIsLoggedIn(true);
        setUserEmail(res.email);
      } else if (res?.error) {
        setAuthError(res.error);
      }
    });
  }

  async function handleDevSignIn() {
    setAuthError("");
    chrome.runtime.sendMessage({ type: "DEV_SIGN_IN" }, (res) => {
      if (res?.loggedIn) {
        setIsLoggedIn(true);
        setUserEmail(res.email);
      } else if (res?.error) {
        setAuthError(res.error);
      }
    });
  }

  async function handleSignOut() {
    chrome.runtime.sendMessage({ type: "SIGN_OUT" }, () => {
      setIsLoggedIn(false);
      setUserEmail("");
    });
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
        Loading...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>MailX</h1>
        <p style={{ color: "#6b7280", marginBottom: 4, fontSize: 13 }}>
          AI-powered Gmail assistant
        </p>
        <p style={{ color: "#9ca3af", marginBottom: 16, fontSize: 12 }}>
          Summarize &bull; Reply &bull; Draft &bull; Prioritize &bull; Tasks
        </p>
        {authError && (
          <p style={{ color: "#dc2626", marginBottom: 12, fontSize: 12 }}>
            {authError}
          </p>
        )}
        <button
          onClick={handleSignIn}
          style={{
            padding: "10px 24px",
            background: "#1f2937",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            display: "block",
            margin: "0 auto 8px",
          }}
        >
          Sign in with Google
        </button>
        <button
          onClick={handleDevSignIn}
          style={{
            border: "1px dashed #9ca3af",
            background: "transparent",
            padding: "6px 16px",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            color: "#9ca3af",
          }}
        >
          Dev Login (bypass OAuth)
        </button>
      </div>
    );
  }

  return (
    <div>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div style={{ padding: 16, fontSize: 13 }}>
        {activeTab === "inbox" && (
          <div>
            <p style={{ color: "#6b7280", marginBottom: 12 }}>
              Signed in as <strong>{userEmail}</strong>
            </p>
            <p style={{ color: "#374151", marginBottom: 8 }}>
              Open an email in Gmail and use the MailX toolbar buttons:
            </p>
            <ul style={{ paddingLeft: 20, color: "#6b7280", lineHeight: 1.8 }}>
              <li><strong>Summarize</strong> &mdash; AI summary of the email</li>
              <li><strong>Reply</strong> &mdash; Smart reply suggestions</li>
              <li><strong>Draft</strong> &mdash; AI-generated draft reply</li>
              <li><strong>Priority</strong> &mdash; Detect priority level</li>
              <li><strong>Tasks</strong> &mdash; Extract tasks & deadlines</li>
            </ul>
          </div>
        )}
        {activeTab === "stats" && (
          <div>
            <p style={{ color: "#6b7280" }}>Mail statistics dashboard</p>
            <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
              Coming soon &mdash; sender scores, reply rates, email volume
            </p>
          </div>
        )}
        {activeTab === "followups" && (
          <div>
            <p style={{ color: "#6b7280" }}>Follow-up reminders</p>
            <p style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
              Coming soon &mdash; auto-reminders for emails needing replies
            </p>
          </div>
        )}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={handleSignOut}
            style={{
              border: "1px solid #d1d5db",
              background: "white",
              padding: "6px 16px",
              borderRadius: 4,
              cursor: "pointer",
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function TabBar({ activeTab, onTabChange }: {
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const tabs: { id: Tab; label: string }[] = [
    { id: "inbox", label: "Inbox" },
    { id: "stats", label: "Stats" },
    { id: "followups", label: "Follow-Ups" },
  ];

  return (
    <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            padding: "10px 0",
            border: "none",
            background: activeTab === tab.id ? "#f3f4f6" : "transparent",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: activeTab === tab.id ? 600 : 400,
            color: activeTab === tab.id ? "#1f2937" : "#6b7280",
            borderBottom: activeTab === tab.id ? "2px solid #1f2937" : "2px solid transparent",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
