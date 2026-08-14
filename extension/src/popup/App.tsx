import React, { useState, useEffect, useContext, useRef } from "react";
import { ToastProvider, Spinner, ToastContext } from "../ui/components/Feedback";
import { Tabs } from "../ui/components/Tabs";
import { AuthView } from "../ui/features/auth/AuthView";
import { HomeView } from "./views/HomeView";
import { TasksView } from "../ui/features/tasks/TasksView";
import { InsightsView } from "../ui/features/insights/InsightsView";
import { SettingsView } from "./views/SettingsView";
import { sendMessage } from "../ui/runtime/sendMessage";

type TabId = "inbox" | "tasks" | "stats" | "settings";

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("inbox");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [authRecovery, setAuthRecovery] = useState(false);
  const [statusError, setStatusError] = useState("");
  const isLoggedInRef = useRef(false);

  const toastContext = useContext(ToastContext);
  const showToast = toastContext?.showToast || (() => {});

  useEffect(() => {
    checkAuth();
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "local" && changes.mailx_auth_sync) {
        checkAuth(changes.mailx_auth_sync.newValue?.signedOut === true);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  function setSignedOut() {
    isLoggedInRef.current = false;
    setIsLoggedIn(false);
    setUserEmail("");
    setAuthRecovery(false);
  }

  function syncAuth(signedOut: boolean) {
    chrome.storage.local.set({ mailx_auth_sync: { changedAt: Date.now(), signedOut } });
  }

  async function checkAuth(signedOut = false) {
    setLoading(true);
    setStatusError("");
    try {
      const res = await sendMessage({ type: "GET_STATUS" });
      if (res?.loggedIn) {
        isLoggedInRef.current = true;
        setIsLoggedIn(true);
        setUserEmail(res.email || "");
        setAuthRecovery(false);
      } else if (signedOut || !isLoggedInRef.current) {
        setSignedOut();
      } else {
        setAuthRecovery(true);
      }
    } catch (err: any) {
      const message = err.message || "We could not confirm your account connection. Check your connection and try again.";
      if (isLoggedInRef.current) {
        setAuthRecovery(true);
        setStatusError(message);
      } else {
        setStatusError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await sendMessage({ type: "SIGN_OUT" });
      setSignedOut();
      syncAuth(true);
      showToast("Signed out successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to sign out", "error");
    }
  }

  async function handleFindPanel() {
    chrome.tabs.query({ url: "*://mail.google.com/*" }, async (tabs) => {
      if (!tabs.length) {
        chrome.tabs.create({ url: "https://mail.google.com" });
        return;
      }
      try {
        await sendMessage({ type: "FIND_PANEL" });
      } catch (err: any) {
        showToast(err.message || "Failed to find panel", "error");
      }
    });
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading MailX" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: "var(--mx-text-secondary)" }}>
        <Spinner />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <AuthView
        statusError={statusError}
        onRetryStatus={() => checkAuth()}
        onSuccess={(email) => {
          isLoggedInRef.current = true;
          setIsLoggedIn(true);
          setUserEmail(email);
          setAuthRecovery(false);
          setStatusError("");
          syncAuth(false);
        }}
      />
    );
  }

  return (
    <div className="mx-popup-shell">
      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
        tabs={[
          { id: "inbox", label: "Home" },
          { id: "tasks", label: "Tasks" },
          { id: "stats", label: "Insights" },
          { id: "settings", label: "Settings" }
        ]}
      />
      <div className="mx-popup-main">
        {authRecovery && (
          <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "var(--mx-surface)", overflowY: "auto" }}>
            <AuthView
              reconnect
              statusError={statusError}
              onRetryStatus={() => checkAuth()}
              onSuccess={(email) => {
                isLoggedInRef.current = true;
                setIsLoggedIn(true);
                setUserEmail(email);
                setAuthRecovery(false);
                setStatusError("");
                syncAuth(false);
              }}
            />
          </div>
        )}
        <div role="tabpanel" id="panel-inbox" aria-labelledby="tab-inbox" hidden={activeTab !== "inbox"}>
          {activeTab === "inbox" && <HomeView userEmail={userEmail} onFindPanel={handleFindPanel} onNavigateTab={(tab) => setActiveTab(tab)} />}
        </div>
        <div role="tabpanel" id="panel-tasks" aria-labelledby="tab-tasks" hidden={activeTab !== "tasks"}>
          {activeTab === "tasks" && <TasksView />}
        </div>
        <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats" hidden={activeTab !== "stats"}>
          {activeTab === "stats" && <InsightsView />}
        </div>
        <div role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" hidden={activeTab !== "settings"}>
          {activeTab === "settings" && <SettingsView userEmail={userEmail} onSignOut={handleSignOut} />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
