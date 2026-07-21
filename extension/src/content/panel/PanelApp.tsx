import React, { useState, useEffect, useRef } from "react";
import { ToastProvider, Spinner, useToast } from "../../ui/components/Feedback";
import { Tabs } from "../../ui/components/Tabs";
import { AuthView } from "../../ui/features/auth/AuthView";
import { TasksView } from "../../ui/features/tasks/TasksView";
import { InsightsView } from "../../ui/features/insights/InsightsView";
import { SettingsView } from "../../popup/views/SettingsView";
import { PanelController } from "./PanelController";
import { PanelHost } from "./PanelHost";
import { AssistantView } from "../../ui/features/assistant/AssistantView";
import { EmailContext } from "../../shared/types";
import type { SecurityPanelData } from "./PanelController";

type TabId = "assistant" | "tasks" | "stats" | "settings";

function ToastListener({ controller }: { controller: PanelController }) {
  const { showToast } = useToast();
  useEffect(() => {
    const unsubscribe = controller.subscribe({
      onToastRequested: (msg, type) => showToast(msg, type)
    });
    return unsubscribe;
  }, [controller, showToast]);
  return null;
}

export interface PanelAppProps {
  controller: PanelController;
  host: PanelHost;
}

export function PanelApp({ controller, host }: PanelAppProps) {
  const [activeTab, setActiveTab] = useState<TabId>("assistant");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [authRecovery, setAuthRecovery] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [hasOpenEmail, setHasOpenEmail] = useState(false);
  const [emailContext, setEmailContext] = useState<EmailContext | null>(null);
  const [externalAction, setExternalAction] = useState<{ action: string, context: any } | null>(null);
  const [securityResult, setSecurityResult] = useState<SecurityPanelData | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelHeadingRef = useRef<HTMLHeadingElement>(null);
  const isLoggedInRef = useRef(false);

  // For dragging
  const dragRef = useRef<{ isDragging: boolean; startX: number; startY: number; initialLeft: number; initialTop: number }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0
  });

  useEffect(() => {
    // Load persisted state
    chrome.storage.local.get(["mailx_panel_collapsed", "mailx_panel_pos"], (data) => {
      if (data.mailx_panel_collapsed) setCollapsed(true);
      if (data.mailx_panel_pos) {
        setPanelPosition(Number.parseFloat(data.mailx_panel_pos.left), Number.parseFloat(data.mailx_panel_pos.top));
      }
    });

    const unsubscribe = controller.subscribe({
      onEmailContextChanged: (context) => {
        setEmailContext(context);
        setHasOpenEmail(Boolean(context));
      },
      onPanelFind: () => {
        setCollapsed(false);
        requestAnimationFrame(() => {
          centerPanel(true);
          panelHeadingRef.current?.focus();
        });
      },
      onActionRequested: (action, ctx) => {
        setActiveTab("assistant");
        setExternalAction({ action, context: ctx });
        setCollapsed(false);
      },
      onSecurityRequested: (data) => {
        setActiveTab("assistant");
        setSecurityResult(data);
        setCollapsed(false);
      }
    });

    checkAuth();

    // Listen for auth changes from popup
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === "local" && changes.mailx_auth_sync) {
        checkAuth(changes.mailx_auth_sync.newValue?.signedOut === true);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    window.addEventListener("resize", clampPanelPosition);

    return () => {
      unsubscribe();
      chrome.storage.onChanged.removeListener(handleStorageChange);
      window.removeEventListener("resize", clampPanelPosition);
    };
  }, [controller]);

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
      const res = await new Promise<any>((resolve, reject) => chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(response);
      }));
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
      if (isLoggedInRef.current) setAuthRecovery(true);
      setStatusError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    try {
      await new Promise<any>((resolve) => chrome.runtime.sendMessage({ type: "SIGN_OUT" }, resolve));
      setSignedOut();
      syncAuth(true);
    } catch {
      // ignore
    }
  }

  const handleTabChange = (id: string) => {
    if (id !== activeTab) host.cancelAllAiRequests();
    setActiveTab(id as TabId);
  };

  function setPanelPosition(left: number, top: number) {
    const panel = panelRef.current;
    if (!panel || !Number.isFinite(left) || !Number.isFinite(top)) return;
    const maxLeft = Math.max(0, window.innerWidth - (panel.offsetWidth || 380));
    const maxTop = Math.max(0, window.innerHeight - (panel.offsetHeight || 680));
    panel.style.left = `${Math.min(maxLeft, Math.max(0, left))}px`;
    panel.style.top = `${Math.min(maxTop, Math.max(0, top))}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function clampPanelPosition() {
    const panel = panelRef.current;
    if (!panel || !panel.style.left || !panel.style.top) return;
    setPanelPosition(Number.parseFloat(panel.style.left), Number.parseFloat(panel.style.top));
  }

  function centerPanel(persist = false) {
    const panel = panelRef.current;
    if (!panel) return;
    const width = panel.offsetWidth || 380;
    const height = panel.offsetHeight || 680;
    setPanelPosition((window.innerWidth - width) / 2, (window.innerHeight - height) / 2);
    if (persist) {
      chrome.storage.local.set({
        mailx_panel_pos: { left: panel.style.left, top: panel.style.top },
        mailx_panel_collapsed: false,
      });
    }
  }

  const dragThreshold = 5;
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!collapsed && (e.target as HTMLElement).closest("button")) return;
    const panel = panelRef.current;
    if (!panel) return;
    
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = panel.getBoundingClientRect();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    const panel = panelRef.current;
    if (!panel) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    // Clamp to viewport
    const maxLeft = window.innerWidth - panel.offsetWidth;
    const maxTop = window.innerHeight - panel.offsetHeight;
    let newLeft = Math.max(0, Math.min(dragRef.current.initialLeft + dx, maxLeft));
    let newTop = Math.max(0, Math.min(dragRef.current.initialTop + dy, maxTop));

    panel.style.left = `${newLeft}px`;
    panel.style.top = `${newTop}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging) return;
    const dx = Math.abs(e.clientX - dragRef.current.startX);
    const dy = Math.abs(e.clientY - dragRef.current.startY);
    const wasClick = dx < dragThreshold && dy < dragThreshold;
    dragRef.current.isDragging = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (wasClick && collapsed) {
      toggleCollapse();
      return;
    }
    
    if (panelRef.current) {
      chrome.storage.local.set({ 
        mailx_panel_pos: { left: panelRef.current.style.left, top: panelRef.current.style.top } 
      });
    }
  };

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    chrome.storage.local.set({ mailx_panel_collapsed: newState });
  };

  const resetPanelPosition = () => centerPanel(true);

  return (
    <ToastProvider>
      <ToastListener controller={controller} />
      <div 
        id="mailx-action-panel" 
        ref={panelRef} 
        className={collapsed ? "mailx-collapsed" : ""}
      >
        {collapsed ? (
          <div
            className="mailx-panel-launcher"
            role="button"
            tabIndex={0}
            aria-label="Open MailX"
            aria-expanded="false"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img src={chrome.runtime.getURL("public/icons/mailx-logo.png")} alt="" />
          </div>
        ) : (
          <>
            <div 
              className="mailx-panel-header"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src={chrome.runtime.getURL("public/icons/mailx-logo.png")} alt="" style={{ width: 24, height: 24 }} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <h1 ref={panelHeadingRef} tabIndex={-1} style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>MailX</h1>
                  <span style={{ fontSize: 12, color: "var(--mx-text-secondary)" }}>
                    {hasOpenEmail ? "AI tools for this email" : "AI email drafting assistant"}
                  </span>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleCollapse(); }}
                style={{ 
                  background: "transparent", border: "none", cursor: "pointer", 
                  width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "50%"
                }}
                aria-label="Collapse panel"
              >
                <svg width="14" height="2" fill="var(--mx-text-secondary)" viewBox="0 0 14 2">
                  <path d="M0 0h14v2H0z"/>
                </svg>
              </button>
              <button type="button" onClick={resetPanelPosition} aria-label="Reset panel position" style={{ background: "transparent", border: "none", cursor: "pointer", width: 40, height: 40 }}>
                Reset
              </button>
            </div>

            {loading ? (
              <div role="status" aria-live="polite" aria-busy="true" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 200, color: "var(--mx-text-secondary)" }}>
                <Spinner />
                <span style={{ marginLeft: 8 }}>Checking your MailX connection...</span>
              </div>
            ) : !isLoggedIn ? (
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
            ) : (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
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
                <Tabs
                  activeTab={activeTab}
                  onChange={handleTabChange}
                  tabs={[
                    { id: "assistant", label: "Assistant" },
                    { id: "tasks", label: "Tasks" },
                    { id: "stats", label: "Insights" },
                    { id: "settings", label: "Settings" }
                  ]}
                />
                <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
                  {activeTab === "assistant" && (
                    <AssistantView host={host} emailContext={emailContext} externalAction={externalAction} onExternalActionHandled={() => setExternalAction(null)} securityResult={securityResult} onSecurityHandled={() => setSecurityResult(null)} />
                  )}
                  {activeTab === "tasks" && <TasksView />}
                  {activeTab === "stats" && <InsightsView />}
                  {activeTab === "settings" && <SettingsView userEmail={userEmail} onSignOut={handleSignOut} />}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToastProvider>
  );
}
