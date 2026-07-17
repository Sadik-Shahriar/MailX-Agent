import { ChatMessage, ExtensionMessage, EmailContext, RequestSource, StructuredAiResult } from "../shared/types";
import { createRequestTelemetry, elapsedMs, logTelemetry } from "../shared/telemetry";
import { dispatchRemoteAi } from "../shared/aiPolicy";
import { DebouncedMessageBodies } from "./toolbarObserver";

(function () {
  if (window.location.hostname !== "mail.google.com") return;

  let overlayShadow: ShadowRoot | null = null;
  let actionPanel: HTMLElement | null = null;
  let activeActionButton: HTMLButtonElement | null = null;
  let panelIdleTimer: number | null = null;
  let statusSourceButton: HTMLButtonElement | null = null;
  interface AiRequestHandle {
    requestId: string;
    cancel: () => void;
  }
  interface ConversationState {
    history: ChatTurn[];
    pending: boolean;
    pendingPrompt?: string;
    request?: AiRequestHandle;
  }
  type ChatTurn = ChatMessage & { isReply?: boolean; draft?: DraftData };
  const conversations = new Map<string, ConversationState>();
  const MAX_CONVERSATIONS = 3;
  const MAX_CHAT_MESSAGES = 10;
  const PANEL_COLLAPSED_KEY = "mailx_panel_collapsed";
  const PANEL_IDLE_MS = 45_000;
  const inFlightAiRequests = new Map<string, AiRequestHandle>();
  let currentPanelRequest: AiRequestHandle | undefined;
  let lastNavigationKey = window.location.href;

  function telemetryIntent(type: ExtensionMessage["type"]): string {
    return ({
      SUMMARIZE: "summarize",
      SUGGEST_REPLIES: "reply",
      CLASSIFY_PRIORITY: "priority",
      EXTRACT_TASKS: "tasks",
      GENERATE_DRAFT: "draft",
      CHAT: "chat",
      CHECK_SPAM: "spam",
      CHECK_PHISHING_URL: "phishing",
    } as Partial<Record<ExtensionMessage["type"], string>>)[type] || "unknown";
  }

  function sendAiMessage(
    message: ExtensionMessage,
    source: RequestSource,
    caller: string,
    callback: (response: any) => void,
  ): AiRequestHandle {
    const telemetry = createRequestTelemetry(source, caller);
    const ownsPanel = ["action_panel", "chat_composer", "draft_composer"].includes(caller);
    if (ownsPanel) currentPanelRequest?.cancel();
    let cancelled = false;
    let completed = false;
    let wasDispatched = false;
    const handle: AiRequestHandle = {
      requestId: telemetry.request_id,
      cancel: () => {
        if (cancelled || completed) return;
        cancelled = true;
        inFlightAiRequests.delete(telemetry.request_id);
        if (currentPanelRequest?.requestId === telemetry.request_id) currentPanelRequest = undefined;
        if (wasDispatched) {
          chrome.runtime.sendMessage(
            { type: "CANCEL_REQUEST", request_id: telemetry.request_id } as ExtensionMessage,
            () => void chrome.runtime.lastError,
          );
        }
      },
    };
    const dispatched = dispatchRemoteAi(source, () => {
      wasDispatched = true;
      chrome.runtime.sendMessage({ ...message, telemetry }, (response) => {
        if (cancelled) return;
        completed = true;
        inFlightAiRequests.delete(telemetry.request_id);
        if (currentPanelRequest?.requestId === telemetry.request_id) currentPanelRequest = undefined;
        const status = chrome.runtime.lastError || response?.error ? "error" : "success";
        try {
          callback(response);
        } finally {
          logTelemetry("click_to_result", telemetry, {
            intent: telemetryIntent(message.type),
            status,
            click_to_result_ms: elapsedMs(telemetry.started_at_ms),
          });
        }
      });
    });
    if (dispatched) {
      inFlightAiRequests.set(telemetry.request_id, handle);
      if (ownsPanel) currentPanelRequest = handle;
    }
    else {
      completed = true;
      logTelemetry("automatic_remote_blocked", telemetry, {
        intent: telemetryIntent(message.type),
      });
      callback({ error: "Automatic AI analysis is disabled." });
    }
    return handle;
  }

  function cancelAllAiRequests(): void {
    for (const request of [...inFlightAiRequests.values()]) request.cancel();
    if (activeActionButton) setActionLoading(activeActionButton, false);
    for (const state of conversations.values()) {
      state.request = undefined;
      state.pending = false;
      state.pendingPrompt = undefined;
    }
    overlayShadow?.querySelector("#mailx-result")?.remove();
    actionPanel?.classList.remove("has-result");
  }

  function cancelRequestsAfterNavigation(): void {
    const navigationKey = window.location.href;
    if (navigationKey === lastNavigationKey) return;
    lastNavigationKey = navigationKey;
    cancelAllAiRequests();
  }

  function init(): void {
    const root = document.createElement("div");
    root.id = "mailx-root";
    overlayShadow = root.attachShadow({ mode: "closed" });
    document.body.appendChild(root);

    addPanelStyles();
    addMessageToolbarStyles();
    syncActionPanel();
    window.addEventListener("resize", () => {
      if (actionPanel) clampPanelToViewport(actionPanel);
    });

    window.addEventListener("hashchange", cancelRequestsAfterNavigation);
    setInterval(() => {
      cancelRequestsAfterNavigation();
      syncActionPanel();
    }, 15_000);
    const messageBodies = new DebouncedMessageBodies((bodies) => syncMessageToolbar(bodies));
    const gmailContainer = document.querySelector<HTMLElement>('[role="main"]') || document.body;
    new MutationObserver((records) => {
      for (const record of records) messageBodies.add(record.addedNodes);
    }).observe(gmailContainer, { childList: true, subtree: true });

    chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
      if (msg.type === "RENDER_RESULT") renderResult(msg.data);
      sendResponse({ received: true });
      return true;
    });
  }

  function addPanelStyles(): void {
    if (!overlayShadow) return;

    const style = document.createElement("style");
    style.textContent = `
      #mailx-action-panel {
        --mx-bg: #ffffff;
        --mx-surface: #f8fafc;
        --mx-text: #172033;
        --mx-muted: #5d6b82;
        --mx-border: #d7e1f1;
        --mx-primary: #1a73e8;
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 2147483646;
        box-sizing: border-box;
         width: min(380px, calc(100vw - 24px));
         max-height: min(680px, calc(100dvh - 24px));
         display: flex;
         flex-direction: column;
        overflow: hidden;
         border: 1px solid var(--mx-border);
         border-radius: 12px;
          background: var(--mx-bg);
         box-shadow: 0 4px 10px rgba(30, 64, 115, 0.14), 0 14px 34px rgba(30, 64, 115, 0.22);
          color: var(--mx-text);
         font-family: Arial, sans-serif;
          transition: opacity 160ms ease, transform 180ms ease, border-radius 180ms ease, box-shadow 180ms ease;
      }

      .mailx-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
         padding: 11px 12px;
        background: linear-gradient(135deg, #eff6ff, #f8fbff);
        border-bottom: 1px solid #e6edf8;
        cursor: grab;
        touch-action: none;
        user-select: none;
      }

      .mailx-panel-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .mailx-panel-logo {
        width: 26px;
        height: 26px;
        flex: 0 0 auto;
        object-fit: contain;
      }

      .mailx-panel-copy {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .mailx-panel-title {
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.1px;
      }

      .mailx-panel-subtitle {
        color: #5d6b82;
        font-size: 11px;
      }

      .mailx-minimize {
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: #516078;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }

      .mailx-minimize:hover { background: #e4eefc; }

        .mailx-panel-content {
          min-height: 0;
          flex: 1;
          max-height: min(620px, calc(100dvh - 82px));
          padding: 12px;
          opacity: 1;
          overflow-y: auto;
          overflow-x: hidden;
          transition: max-height 260ms ease, padding 260ms ease, opacity 180ms ease;
        }
        .mailx-actions { min-width: 0; }
        .mailx-email-actions { margin-top: 12px; padding-top: 12px; border-top: 1px solid #e6edf8; }
        #mailx-action-panel.has-result { width: min(380px, calc(100vw - 24px)); max-width: calc(100vw - 24px); }
        #mailx-action-panel.has-result .mailx-panel-content {
          display: block;
          max-height: min(620px, calc(100dvh - 82px));
        }
        #mailx-action-panel.has-result .mailx-actions { display: none; }
        .mailx-action-group-title { margin: 2px 0 6px; color: var(--mx-muted); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        .mailx-general-actions, .mailx-primary-actions, .mailx-secondary-actions { display: grid; gap: 6px; }
        .mailx-primary-actions {
         grid-template-columns: 1fr;
      }

        .mailx-secondary-actions {
         margin-top: 8px;
      }

       .mailx-action {
         display: flex;
         flex-direction: row;
         align-items: center;
        justify-content: center;
         min-height: 44px;
        border: 1px solid #d8e2f0;
         border-radius: 8px;
         background: var(--mx-bg);
        color: #24334d;
        cursor: pointer;
        font: inherit;
        text-align: left;
        transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
      }

      .mailx-action:hover:not(:disabled) {
        border-color: #8ab4f8;
        background: #f5f9ff;
        transform: translateY(-1px);
      }

      .mailx-action:disabled { cursor: wait; opacity: 0.7; }
       .mailx-primary-action { padding: 9px 10px; }
       .mailx-secondary-action {
         min-height: 40px;
         align-items: center;
          padding: 7px 10px;
         font-size: 12px;
        font-weight: 600;
        text-align: center;
       }

       .mailx-action-label { font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
       .mailx-action-description {
         margin: 0 0 0 auto;
        color: #66758c;
        font-size: 10px;
        line-height: 1.3;
      }

       #mailx-action-panel.is-collapsed .mailx-panel-content {
         max-height: 0;
         padding-top: 0;
         padding-bottom: 0;
         opacity: 0;
       }

       .mailx-priority-action {
         position: relative;
         overflow: hidden;
         transition: color 160ms ease, background-color 160ms ease, border-color 160ms ease;
       }
       .mailx-priority-action.mailx-priority-high,
       .mailx-priority-action.mailx-priority-medium,
       .mailx-priority-action.mailx-priority-low {
         color: #ffffff;
         border-color: transparent;
         animation: mailx-priority-slide 340ms cubic-bezier(.22, 1, .36, 1);
       }
       .mailx-priority-action.mailx-priority-high { background: #d93025; }
       .mailx-priority-action.mailx-priority-medium { background: #e37400; }
       .mailx-priority-action.mailx-priority-low { background: #188038; }
       .mailx-status-safe, .mailx-status-warning, .mailx-status-danger {
         color: #ffffff;
         border-color: transparent;
         animation: mailx-priority-slide 340ms cubic-bezier(.22, 1, .36, 1);
       }
       .mailx-status-safe { background: #188038; }
       .mailx-status-warning { background: #e37400; }
       .mailx-status-danger { background: #d93025; }
       @keyframes mailx-priority-slide {
         from { transform: translateX(-18px); opacity: .25; }
         to { transform: translateX(0); opacity: 1; }
       }
       #mailx-action-panel.is-collapsed {
        width: 58px;
        height: 58px;
        border-color: #9fc1f5;
         border-radius: 50%;
         transform: scale(.94);
      }

      #mailx-action-panel.is-collapsed .mailx-panel-header {
        height: 58px;
        padding: 0;
        justify-content: center;
        border-bottom: 0;
      }

      #mailx-action-panel.is-collapsed .mailx-panel-brand { justify-content: center; }
      #mailx-action-panel.is-collapsed .mailx-panel-copy,
      #mailx-action-panel.is-collapsed .mailx-minimize { display: none; }
      #mailx-action-panel.is-collapsed .mailx-panel-logo {
        width: 32px;
        height: 32px;
      }

       #mailx-result { min-width: 0; opacity: 1; transform: translateX(0); animation: mailx-result-in 240ms cubic-bezier(.22, 1, .36, 1); }
       @keyframes mailx-result-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }

      @media (max-width: 700px) {
        #mailx-action-panel {
          right: 12px;
          bottom: 12px;
          width: calc(100vw - 24px);
          max-width: 360px;
        }

          #mailx-action-panel.has-result { width: calc(100vw - 24px); }
         #mailx-action-panel.has-result .mailx-panel-content { grid-template-columns: 1fr; max-height: 620px; }
      }
    `;
    overlayShadow.appendChild(style);
  }

  function syncActionPanel(): void {
    if (!overlayShadow) return;
    if (!actionPanel) actionPanel = createActionPanel();
    const hasOpenEmail = Boolean(document.querySelector(".a3s"));
    actionPanel.style.display = "block";
    const emailActions = actionPanel.querySelector<HTMLElement>(".mailx-email-actions");
    if (emailActions) emailActions.style.display = hasOpenEmail ? "block" : "none";
    const subtitle = actionPanel.querySelector<HTMLElement>(".mailx-panel-subtitle");
    if (subtitle) subtitle.textContent = hasOpenEmail ? "AI tools for this email" : "AI email drafting assistant";
    if (hasOpenEmail) {
      syncMessageToolbar();
    }
  }

  function addMessageToolbarStyles(): void {
    if (document.getElementById("mailx-message-toolbar-styles")) return;
    const style = document.createElement("style");
    style.id = "mailx-message-toolbar-styles";
    style.textContent = `
      .mailx-message-toolbar { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 10px; padding:8px; border:1px solid #d7e1f1; border-radius:8px; background:#f8fbff; }
      .mailx-message-toolbar button { border:1px solid #cbd5e1; border-radius:5px; padding:5px 8px; background:#fff; color:#24334d; cursor:pointer; font:600 11px Arial,sans-serif; transition:transform 160ms ease,background 160ms ease,color 160ms ease; }
      .mailx-message-toolbar button:hover:not(:disabled) { background:#eef5ff; transform:translateY(-1px); }
      .mailx-message-toolbar button:disabled { opacity:1; cursor:default; }
      .mailx-message-toolbar .mailx-status-safe, .mailx-message-toolbar .mailx-status-warning, .mailx-message-toolbar .mailx-status-danger, .mailx-message-toolbar .mailx-status-none, .mailx-message-toolbar .mailx-priority-high, .mailx-message-toolbar .mailx-priority-medium, .mailx-message-toolbar .mailx-priority-low { color:#fff; border-color:transparent; animation:mailx-toolbar-slide 340ms cubic-bezier(.22,1,.36,1); }
      .mailx-message-toolbar .mailx-status-safe, .mailx-message-toolbar .mailx-priority-low { background:#188038; }
      .mailx-message-toolbar .mailx-status-warning, .mailx-message-toolbar .mailx-priority-medium { background:#e37400; }
      .mailx-message-toolbar .mailx-status-danger, .mailx-message-toolbar .mailx-priority-high { background:#d93025; }
      .mailx-message-toolbar .mailx-status-none { background:#64748b; }
      @keyframes mailx-toolbar-slide { from { transform:translateX(-14px); opacity:.3; } to { transform:translateX(0); opacity:1; } }
    `;
    document.head.appendChild(style);
  }

  function syncMessageToolbar(candidates?: Iterable<HTMLElement>): void {
    const bodies = [...(candidates || document.querySelectorAll<HTMLElement>(".a3s"))]
      .filter((body) => body.isConnected && body.offsetParent !== null);
    for (const body of bodies) {
      const card = body.closest<HTMLElement>(".adn.ads, .h7") || body.parentElement;
      const key = messageKey(body);
      if (!card || Array.from(card.querySelectorAll<HTMLElement>(".mailx-message-toolbar"))
        .some((toolbar) => toolbar.dataset.mailxMessage === key)) continue;
      const toolbar = document.createElement("div");
      toolbar.className = "mailx-message-toolbar";
      toolbar.dataset.mailxMessage = key;
      toolbar.setAttribute("aria-label", "MailX message actions");
      for (const [action, label] of [["priority", "Priority"], ["spam", "Spam Check"], ["safety", "Link Safety"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.mailxAction = action;
        button.dataset.label = label;
        button.textContent = label;
        button.addEventListener("click", () => {
          if (action === "priority" && button.textContent?.toLowerCase().includes("unavailable")) {
            retryToolbarPriority(body, toolbar);
            return;
          }
          handleAction(action, button, extractEmailContext(body), body);
        });
        toolbar.appendChild(button);
      }
      body.parentElement?.insertBefore(toolbar, body);
    }
  }

  function messageKey(body: HTMLElement): string {
    if (body.dataset.mailxMessageKey) return body.dataset.mailxMessageKey;
    const card = body.closest<HTMLElement>(".adn.ads, .h7");
    const key = card?.getAttribute("data-message-id") || card?.id || crypto.randomUUID();
    body.dataset.mailxMessageKey = key;
    return key;
  }

  function isCheckableLink(value: string): boolean {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }

  function toolbarButton(toolbar: HTMLElement, action: string): HTMLButtonElement | null {
    return toolbar.querySelector<HTMLButtonElement>(`[data-mailx-action="${action}"]`);
  }

  function setToolbarStatus(toolbar: HTMLElement, action: string, text: string, status?: "safe" | "warning" | "danger" | "none"): void {
    const button = toolbarButton(toolbar, action);
    if (!button) return;
    button.classList.remove("mailx-status-safe", "mailx-status-warning", "mailx-status-danger", "mailx-status-none", "mailx-priority-high", "mailx-priority-medium", "mailx-priority-low");
    if (status) button.classList.add(`mailx-status-${status}`);
    button.textContent = text;
    // Completed verdicts are informational. Only an unavailable result is retryable.
    button.disabled = !text.toLowerCase().includes("unavailable");
  }

  function retryToolbarPriority(body: HTMLElement, toolbar: HTMLElement): void {
    const context = extractEmailContext(body);
    if (!context || !hasSummarizableContent(context.body)) return;
    setToolbarStatus(toolbar, "priority", "Priority: checking...");
    sendAiMessage({ type: "CLASSIFY_PRIORITY", email_context: context }, "explicit", "message_toolbar", (response) => {
      const classification = response?.result?.kind === "priority" ? response.result : null;
      if (!classification || classification.confidence < 0.6) {
        setToolbarStatus(toolbar, "priority", "Priority: unavailable");
        return;
      }
      const button = toolbarButton(toolbar, "priority");
      if (!button) return;
      button.classList.remove("mailx-priority-high", "mailx-priority-medium", "mailx-priority-low");
      void button.offsetWidth;
      button.classList.add(`mailx-priority-${classification.priority}`);
      button.textContent = `Priority: ${classification.priority.toUpperCase()}`;
      button.disabled = true;
    });
  }

  function createActionPanel(): HTMLElement {
    const panel = document.createElement("section");
    panel.id = "mailx-action-panel";
    panel.setAttribute("aria-label", "MailX email assistant");

    const header = document.createElement("div");
    header.className = "mailx-panel-header";
    const brand = document.createElement("div");
    brand.className = "mailx-panel-brand";

    const logo = document.createElement("img");
    logo.className = "mailx-panel-logo";
    logo.src = chrome.runtime.getURL("public/icons/mailx-logo.png");
    logo.alt = "MailX";
    brand.appendChild(logo);

    const copy = document.createElement("div");
    copy.className = "mailx-panel-copy";
    const title = document.createElement("span");
    title.className = "mailx-panel-title";
    title.textContent = "MailX";
    const subtitle = document.createElement("span");
    subtitle.className = "mailx-panel-subtitle";
    subtitle.textContent = "AI tools for this email";
    copy.append(title, subtitle);
    brand.appendChild(copy);
    header.appendChild(brand);

    const minimize = document.createElement("button");
    minimize.className = "mailx-minimize";
    minimize.type = "button";
    minimize.textContent = "-";
    minimize.title = "Minimize MailX";
    minimize.setAttribute("aria-label", "Minimize MailX");
    minimize.addEventListener("click", (event) => {
      event.stopPropagation();
      setPanelCollapsed(panel, minimize, true);
    });
    header.appendChild(minimize);
    panel.appendChild(header);
    // Start compact on first use. A saved expanded state is restored below.
    panel.classList.add("is-collapsed");
    panel.setAttribute("aria-expanded", "false");
    minimize.title = "Expand MailX";
    minimize.setAttribute("aria-label", "Expand MailX");
    makePanelDraggable(panel, header, () => setPanelCollapsed(panel, minimize, false));
    for (const eventName of ["pointerdown", "pointermove", "mouseenter", "focusin", "keydown"]) {
      panel.addEventListener(eventName, () => resetPanelIdleTimer(panel, minimize));
    }

    const content = document.createElement("div");
    content.className = "mailx-panel-content";
    const generalActions = document.createElement("div");
    generalActions.className = "mailx-general-actions";
    const composeLabel = document.createElement("div");
    composeLabel.className = "mailx-action-group-title";
    composeLabel.textContent = "Compose";
    generalActions.append(
      composeLabel,
      createActionButton("draft", "Draft", "Create a new email", true),
      createActionButton("ask", "Ask MailX", "Give instructions for this email", true)
    );

    const emailActions = document.createElement("div");
    emailActions.className = "mailx-email-actions";
    const emailLabel = document.createElement("div");
    emailLabel.className = "mailx-action-group-title";
    emailLabel.textContent = "This email";
    const primaryActions = document.createElement("div");
    primaryActions.className = "mailx-primary-actions";
    primaryActions.append(
      createActionButton("summarize", "Summarize", "Key facts and next steps", true),
      createActionButton("reply", "Smart Reply", "Three ready-to-send options", true)
    );

    const secondaryActions = document.createElement("div");
    secondaryActions.className = "mailx-secondary-actions";
    secondaryActions.append(
      createActionButton("tasks", "Tasks", "", false)
    );

    emailActions.append(emailLabel, primaryActions, secondaryActions);
    const actions = document.createElement("div");
    actions.className = "mailx-actions";
    actions.append(generalActions, emailActions);
     content.appendChild(actions);
    panel.appendChild(content);
    overlayShadow?.appendChild(panel);
    void restorePanelState(panel, minimize);
    resetPanelIdleTimer(panel, minimize);
    return panel;
  }

  function setPanelCollapsed(
    panel: HTMLElement, minimize: HTMLButtonElement, collapsed: boolean
  ): void {
    panel.classList.toggle("is-collapsed", collapsed);
    panel.setAttribute("aria-expanded", String(!collapsed));
    minimize.title = collapsed ? "Expand MailX" : "Minimize MailX";
    minimize.setAttribute("aria-label", minimize.title);
    void chrome.storage.local.set({ [PANEL_COLLAPSED_KEY]: collapsed });
    if (collapsed && panelIdleTimer !== null) {
      window.clearTimeout(panelIdleTimer);
      panelIdleTimer = null;
    }
    if (!collapsed) resetPanelIdleTimer(panel, minimize);
    clampPanelToViewport(panel);
  }

  async function restorePanelState(panel: HTMLElement, minimize: HTMLButtonElement): Promise<void> {
    const stored = await chrome.storage.local.get(PANEL_COLLAPSED_KEY);
    if (stored[PANEL_COLLAPSED_KEY] === false) setPanelCollapsed(panel, minimize, false);
  }

  function resetPanelIdleTimer(panel: HTMLElement, minimize: HTMLButtonElement): void {
    if (panelIdleTimer !== null) window.clearTimeout(panelIdleTimer);
    if (panel.classList.contains("is-collapsed") || panel.classList.contains("has-result")) return;
    panelIdleTimer = window.setTimeout(() => {
      setPanelCollapsed(panel, minimize, true);
      panelIdleTimer = null;
    }, PANEL_IDLE_MS);
  }

  function clampPanelToViewport(panel: HTMLElement): void {
    const bounds = panel.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - bounds.width - 8);
    const maxTop = Math.max(8, window.innerHeight - bounds.height - 8);
    const left = Math.min(Math.max(8, bounds.left), maxLeft);
    const top = Math.min(Math.max(8, bounds.top), maxTop);

    if (Math.abs(bounds.left - left) > 0.5 || Math.abs(bounds.top - top) > 0.5) {
      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    }
  }

  function makePanelDraggable(
    panel: HTMLElement, handle: HTMLElement, onCollapsedPanelClick: () => void
  ): void {
    let pointerId: number | null = null;
    let offsetX = 0;
    let offsetY = 0;
    let moved = false;

    handle.addEventListener("pointerdown", (event) => {
      if (
        (event.pointerType === "mouse" && event.button !== 0) ||
        (event.target instanceof Element && event.target.closest("button"))
      ) return;

      const bounds = panel.getBoundingClientRect();
      pointerId = event.pointerId;
      offsetX = event.clientX - bounds.left;
      offsetY = event.clientY - bounds.top;
      moved = false;
      panel.classList.add("is-dragging");
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) return;

      const bounds = panel.getBoundingClientRect();
      const maxLeft = Math.max(8, window.innerWidth - bounds.width - 8);
      const maxTop = Math.max(8, window.innerHeight - bounds.height - 8);
      const left = Math.min(Math.max(8, event.clientX - offsetX), maxLeft);
      const top = Math.min(Math.max(8, event.clientY - offsetY), maxTop);
      if (Math.abs(event.clientX - offsetX - bounds.left) > 3 ||
          Math.abs(event.clientY - offsetY - bounds.top) > 3) moved = true;

      panel.style.left = `${left}px`;
      panel.style.top = `${top}px`;
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });

    const stopDragging = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;
      const shouldExpand = event.type === "pointerup" &&
        panel.classList.contains("is-collapsed") && !moved;
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      pointerId = null;
      panel.classList.remove("is-dragging");
      if (shouldExpand) onCollapsedPanelClick();
      window.setTimeout(() => { moved = false; }, 0);
    };
    handle.addEventListener("pointerup", stopDragging);
    handle.addEventListener("pointercancel", stopDragging);
  }

  function createActionButton(
    action: string, label: string, description: string, primary: boolean
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `mailx-action ${primary ? "mailx-primary-action" : "mailx-secondary-action"}`;
    button.dataset.label = label;
    button.dataset.action = action;
    button.setAttribute("aria-label", label);

    const labelElement = document.createElement("span");
    labelElement.className = "mailx-action-label";
    labelElement.textContent = label;
    button.appendChild(labelElement);

    if (description) {
      const descriptionElement = document.createElement("span");
      descriptionElement.className = "mailx-action-description";
      descriptionElement.textContent = description;
      button.appendChild(descriptionElement);
    }

    button.addEventListener("click", () => handleAction(action, button));
    return button;
  }

  function handleAction(action: string, button: HTMLButtonElement, contextOverride?: EmailContext | null, bodyElement?: HTMLElement): void {
    if (activeActionButton) return;

    const ctx = contextOverride || extractEmailContext();
    statusSourceButton = button.dataset.mailxAction ? button : null;
    if (action === "draft") {
      renderDraftComposer(ctx || { id: "", sender: "", subject: "", body: "" });
      return;
    }
    if (!ctx) {
      showToast("Open an email with a conversation thread");
      return;
    }
    if (action === "ask") {
      renderChatComposer(ctx);
      return;
    }
    if (action === "summarize" && !hasSummarizableContent(ctx.body)) {
      showToast("MailX could not find email body text to summarize");
      return;
    }

    if (action === "safety") {
      setActionLoading(button, true);
      const links = [...(bodyElement || getLatestVisibleEmailBody())?.querySelectorAll<HTMLAnchorElement>('a[href]') || []]
        .map((link) => link.href).filter(isCheckableLink).filter((url, index, all) => all.indexOf(url) === index).slice(0, 20);
      Promise.all(links.map((url) => new Promise<any>((resolve) => sendAiMessage(
        { type: "CHECK_PHISHING_URL", url }, "explicit", "message_toolbar", resolve
      )))).then((results) => {
        setActionLoading(button, false);
        const toolbar = button.closest<HTMLElement>(".mailx-message-toolbar");
        if (toolbar) {
          if (!links.length) setToolbarStatus(toolbar, "safety", "Links: NO LINK", "none");
          else if (results.some((result) => result?.error || !result?.verdict)) setToolbarStatus(toolbar, "safety", "Links: unavailable");
          else if (results.some((result) => result.verdict.verdict !== "clean")) setToolbarStatus(toolbar, "safety", "Links: HARMFUL", "danger");
          else setToolbarStatus(toolbar, "safety", "Links: SAFE", "safe");
        }
        const flagged = results.map((result) => result?.verdict).filter((verdict) => verdict && verdict.verdict !== "clean");
        if (!button.dataset.mailxAction) {
          renderResult({ text: flagged.length ? flagged.map((item) => `${item.verdict.toUpperCase()}: ${item.hostname} - ${item.reason}`).join("\n") : "No suspicious links found in this email.", intent: "safety" });
        }
      }).catch(() => { setActionLoading(button, false); showToast("MailX could not check these links"); });
      return;
    }

    const prompt = undefined;
    setActionLoading(button, true);

    const typeMap: Record<string, string> = {
      summarize: "SUMMARIZE",
      reply: "SUGGEST_REPLIES",
      draft: "GENERATE_DRAFT",
      priority: "CLASSIFY_PRIORITY",
      tasks: "EXTRACT_TASKS",
      spam: "CHECK_SPAM",
    };

    sendAiMessage(
      { type: typeMap[action], email_context: ctx, prompt } as ExtensionMessage,
      "explicit",
      button.dataset.mailxAction ? "message_toolbar" : "action_panel",
      (response) => {
        setActionLoading(button, false);
        if (chrome.runtime.lastError) {
          showToast(chrome.runtime.lastError.message || "MailX could not complete the request");
          return;
        }
        if (response?.error) {
          showToast(response.error);
          return;
        }
        const text =
          typeof response?.response === "string"
            ? response.response
            : JSON.stringify(response?.response);
        if (action === "priority") setPriorityButton(response?.result);
        const spam = response?.spam;
        if (spam && button.dataset.mailxAction) {
          const toolbar = button.closest<HTMLElement>(".mailx-message-toolbar");
          if (toolbar) setToolbarStatus(toolbar, "spam", spam.verdict === "spam" ? "Spam: SPAM" : "Spam: SAFE", spam.verdict === "spam" ? "danger" : "safe");
        }
        if (button.dataset.mailxAction && ["priority", "spam"].includes(action)) return;
        renderResult({ text: spam ? `${spam.verdict === "spam" ? "Possible spam" : "No spam warning"}: ${spam.reason}` : text, result: response?.result, actions: response?.actions, intent: action, tasks: response?.tasks });
      }
    );
  }

  function setActionLoading(button: HTMLButtonElement, loading: boolean): void {
    button.disabled = loading;
    if (loading) {
      activeActionButton = button;
      if (button.dataset.mailxAction) {
        const toolbar = button.closest<HTMLElement>(".mailx-message-toolbar");
        const labels: Record<string, string> = {
          priority: "Priority: checking...",
          spam: "Spam: checking...",
          safety: "Links: checking...",
        };
        const label = labels[button.dataset.mailxAction];
        if (toolbar && label) {
          setToolbarStatus(toolbar, button.dataset.mailxAction, label);
          return;
        }
      }
      setButtonLabel(button, "Working...");
      return;
    }

    activeActionButton = null;
    setButtonLabel(button, button.dataset.label || "MailX");
  }

  function extractEmailContext(bodyElement = getLatestVisibleEmailBody()): EmailContext | null {
    const hash = window.location.hash;
    const m = hash.match(/#[^/]+\/([a-zA-Z0-9_-]+)/);
    let id = m?.[1] || hash || "current-email";

    let subject = "";
    let sender = "";
    let body = "";

    const h2 = document.querySelector("h2");
    if (h2) subject = h2.textContent || "";

    const latestBody = bodyElement;
    const messageCard = latestBody?.closest<HTMLElement>(".adn.ads, .h7");
    if (latestBody) id = messageKey(latestBody);
    const emailAttr = messageCard?.querySelector("[email]") || document.querySelector("[email]");
    const mailto = messageCard?.querySelector('[href^="mailto:"]') || document.querySelector('[href^="mailto:"]');
    const gD = messageCard?.querySelector(".gD") || document.querySelector(".gD");
    if (emailAttr) sender = emailAttr.getAttribute("email") || "";
    else if (mailto) sender = mailto.getAttribute("href")?.replace("mailto:", "") || "";
    else if (gD) sender = gD.textContent || "";

    body = extractCurrentEmailBody(latestBody);

    return { id, sender, subject, body };
  }

  function setPriorityButton(result: StructuredAiResult | undefined): void {
    const classification = result?.kind === "priority" ? result : null;
    if (!classification || classification.confidence < 0.6) return;
    forEachActionButton("priority", (button) => {
      button.classList.remove("mailx-priority-high", "mailx-priority-medium", "mailx-priority-low");
      void button.offsetWidth;
      button.classList.add(`mailx-priority-${classification.priority}`);
      setButtonLabel(button, `Priority: ${classification.priority.toUpperCase()}`);
      button.title = `${classification.priority[0].toUpperCase()}${classification.priority.slice(1)} priority`;
      button.disabled = true;
    });
  }

  function forEachActionButton(action: string, callback: (button: HTMLButtonElement) => void): void {
    const panelButton = actionPanel?.querySelector<HTMLButtonElement>(`[data-action="${action}"]`);
    if (panelButton) callback(panelButton);
    if (statusSourceButton?.dataset.mailxAction === action) callback(statusSourceButton);
  }

  function setButtonLabel(button: HTMLButtonElement, value: string): void {
    const label = button.querySelector<HTMLElement>(".mailx-action-label");
    if (label) label.textContent = value;
    else button.textContent = value;
  }

  function hasSummarizableContent(body: string): boolean {
    return (body.match(/[A-Za-z0-9\u0080-\uFFFF]/g) || []).length >= 2;
  }

  function getLatestVisibleEmailBody(): HTMLElement | undefined {
    const bodies = Array.from(document.querySelectorAll<HTMLElement>(".a3s"))
      .filter((element) => element.offsetParent !== null);
    // Gmail lays conversation messages vertically. The lowest visible card is
    // the newest expanded message and is the only content sent to MailX.
    return bodies.sort((left, right) => right.getBoundingClientRect().top - left.getBoundingClientRect().top)[0];
  }

  function extractCurrentEmailBody(bodyElement = getLatestVisibleEmailBody()): string {
    if (!bodyElement) return "";

    // Gmail nests prior messages and signatures inside the current email body.
    const body = bodyElement.cloneNode(true) as HTMLElement;
    body.querySelectorAll(
      "blockquote, .gmail_quote, [class*='gmail_quote'], .gmail_signature, [data-smartmail='gmail_signature']"
    ).forEach((element) => element.remove());
    return trimQuotedEmailText(body.textContent || "");
  }

  function trimQuotedEmailText(text: string): string {
    const quoteMarkers = [
      /^\s*On .+ wrote:\s*$/im,
      /^\s*-{2,}\s*Forwarded message\s*-{2,}\s*$/im,
    ];
    let end = text.length;

    for (const marker of quoteMarkers) {
      const match = marker.exec(text);
      if (match?.index !== undefined) end = Math.min(end, match.index);
    }

    const signature = /\n--\s*\n/.exec(text);
    if (signature?.index !== undefined) end = Math.min(end, signature.index);

    return text.slice(0, end).replace(/\n{3,}/g, "\n\n").trim();
  }

  function chatKey(context: EmailContext): string {
    return `${context.id}:${context.sender}:${context.subject}`;
  }

  function conversationFor(context: EmailContext): ConversationState {
    const key = chatKey(context);
    const existing = conversations.get(key);
    if (existing) {
      conversations.delete(key);
      conversations.set(key, existing);
      return existing;
    }
    const state = { history: [], pending: false };
    conversations.set(key, state);
    while (conversations.size > MAX_CONVERSATIONS) conversations.delete(conversations.keys().next().value!);
    return state;
  }

  function renderChatComposer(context: EmailContext, draft = "", error = ""): void {
    if (!overlayShadow || !actionPanel) return;
    overlayShadow.querySelector("#mailx-result")?.remove();
    const state = conversationFor(context);
    const container = document.createElement("div");
    container.id = "mailx-result";
    container.style.cssText = "position:relative;min-width:0;padding:14px;background:#fff;border-radius:9px;color:#172033;font:13px system-ui,sans-serif;";
    const title = document.createElement("strong");
    title.textContent = "Ask MailX";
    const back = document.createElement("button");
    back.textContent = "Back";
    back.style.cssText = "float:right;border:0;background:transparent;color:#1a73e8;cursor:pointer;font-size:12px;";
    back.onclick = () => {
      state.request?.cancel();
      state.request = undefined;
      state.pending = false;
      state.pendingPrompt = undefined;
      container.remove();
      actionPanel?.classList.remove("has-result");
    };
    const subtitle = document.createElement("p");
    subtitle.textContent = "Ask about this message or refine a reply using your own instructions.";
    subtitle.style.cssText = "margin:5px 0 9px;color:#5d6b82;font-size:12px;";
    const transcript = document.createElement("div");
    transcript.style.cssText = "max-height:220px;overflow:auto;margin-bottom:9px;padding-right:2px;";
    for (const message of state.history) {
      const row = document.createElement("div");
      const isUser = message.role === "user";
      row.style.cssText = `margin:7px 0;padding:8px;border-radius:7px;white-space:pre-wrap;border:1px solid ${isUser ? "#93c5fd" : "#c4b5fd"};background:${isUser ? "#dbeafe" : "#ede9fe"};color:${isUser ? "#1e3a8a" : "#4c1d95"};`;
      const speaker = document.createElement("strong");
      speaker.textContent = isUser ? "You" : "MailX";
      speaker.style.cssText = "display:block;margin-bottom:3px;font-size:11px;";
      const text = document.createElement("span");
      appendBoldMarkdown(text, message.content);
      row.append(speaker, text);
      if (message.role === "assistant" && message.draft) {
        const insert = document.createElement("button");
        insert.textContent = "Insert draft into Gmail";
        insert.style.cssText = "display:block;margin-top:7px;padding:4px 7px;border:1px solid #8b5cf6;border-radius:4px;background:#fff;color:#5b21b6;cursor:pointer;font-size:11px;";
        insert.onclick = async () => {
          if (await insertDraftIntoCompose(message.draft!)) {
            insert.textContent = "Inserted";
            insert.disabled = true;
          } else insert.textContent = "Insert failed";
        };
        row.appendChild(insert);
      } else if (message.role === "assistant" && message.isReply) {
        const insert = document.createElement("button");
        insert.textContent = "Insert into Gmail";
        insert.style.cssText = "display:block;margin-top:7px;padding:4px 7px;border:1px solid #8b5cf6;border-radius:4px;background:#fff;color:#5b21b6;cursor:pointer;font-size:11px;";
        insert.onclick = async () => {
          if (await openComposeAndInsert(message.content)) {
            insert.textContent = "Inserted";
            insert.disabled = true;
          } else insert.textContent = "Insert failed";
        };
        row.appendChild(insert);
      }
      transcript.appendChild(row);
    }
    if (state.pendingPrompt) {
      const pendingUser = document.createElement("div");
      pendingUser.style.cssText = "margin:7px 0;padding:8px;border-radius:7px;white-space:pre-wrap;border:1px solid #93c5fd;background:#dbeafe;color:#1e3a8a;";
      const speaker = document.createElement("strong");
      speaker.textContent = "You";
      speaker.style.cssText = "display:block;margin-bottom:3px;font-size:11px;";
      const text = document.createElement("span");
      appendBoldMarkdown(text, state.pendingPrompt);
      pendingUser.append(speaker, text);
      transcript.appendChild(pendingUser);
    }
    if (state.pending) {
      const thinking = document.createElement("div");
      thinking.textContent = "MailX: Thinking...";
      thinking.style.cssText = "padding:8px;color:#64748b;";
      transcript.appendChild(thinking);
    }
    // A re-render after sending should keep the newest answer in view.
    requestAnimationFrame(() => { transcript.scrollTop = transcript.scrollHeight; });
    const chips = document.createElement("div");
    chips.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;";
    const input = document.createElement("textarea");
    input.rows = 3;
    input.placeholder = "Example: Summarize only the deadlines and what I need to do.";
    input.value = draft;
    input.style.cssText = "box-sizing:border-box;width:100%;resize:vertical;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;";
    for (const eventName of ["pointerdown", "mousedown", "keydown", "keypress", "keyup", "input"]) input.addEventListener(eventName, (event) => event.stopPropagation());
    for (const text of ["Summarize this", "What needs action?", "Draft a concise reply"]) {
      const chip = document.createElement("button");
      chip.textContent = text;
      chip.style.cssText = "border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:4px 7px;cursor:pointer;font-size:11px;";
      chip.disabled = state.pending;
      chip.onclick = () => { input.value = text; input.focus(); };
      chips.appendChild(chip);
    }
    const errorLine = document.createElement("div");
    errorLine.textContent = error;
    errorLine.style.cssText = "min-height:16px;margin-top:4px;color:#b91c1c;font-size:11px;";
    const send = document.createElement("button");
    send.textContent = state.pending ? "Thinking..." : "Send";
    send.disabled = state.pending;
    send.style.cssText = "margin-top:8px;padding:6px 10px;border:0;border-radius:5px;background:#1a73e8;color:#fff;cursor:pointer;";
    const clear = document.createElement("button");
    clear.textContent = "New chat";
    clear.style.cssText = "margin:8px 0 0 7px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:5px;background:#fff;cursor:pointer;";
    clear.onclick = () => {
      state.request?.cancel();
      conversations.delete(chatKey(context));
      renderChatComposer(context);
    };
    send.onclick = () => {
      const prompt = input.value.trim();
      if (!prompt || state.pending) return;
      state.pending = true;
      state.pendingPrompt = prompt;
      renderChatComposer(context);
      const isDraft = isDraftInstruction(prompt);
      const request = sendAiMessage({ type: isDraft ? "GENERATE_DRAFT" : "CHAT", email_context: context, prompt, history: state.history }, "explicit", "chat_composer", (response) => {
        if (state.request?.requestId !== request.requestId) return;
        state.request = undefined;
        state.pending = false;
        state.pendingPrompt = undefined;
        if (chrome.runtime.lastError || response?.error) {
          renderChatComposer(context, prompt, response?.error || chrome.runtime.lastError?.message || "MailX could not answer right now.");
          return;
        }
        if (chatKey(extractEmailContext() || context) !== chatKey(context)) return;
        const answer = String(response?.response || "").trim();
        if (!answer) {
          renderChatComposer(context, prompt, "MailX returned an empty response. Please retry.");
          return;
        }
        const draftAnswer = response?.result?.kind === "draft" ? response.result : null;
        state.history.push(
          { role: "user", content: prompt },
          {
            role: "assistant",
            content: draftAnswer ? formatDraft(draftAnswer, true) : answer,
            isReply: isReplyInstruction(prompt),
            draft: draftAnswer || undefined,
          }
        );
        state.history = state.history.slice(-MAX_CHAT_MESSAGES);
        renderChatComposer(context);
      });
      state.request = request;
    };
    container.append(title, back, subtitle, transcript, chips, input, errorLine, send, clear);
    actionPanel.classList.add("has-result");
    actionPanel.querySelector(".mailx-panel-content")?.appendChild(container);
    if (!state.pending) input.focus();
  }

  function appendBoldMarkdown(container: HTMLElement, value: string): void {
    const parts = value.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
      if (part.startsWith("**") && part.endsWith("**")) {
        const bold = document.createElement("strong");
        bold.textContent = part.slice(2, -2);
        container.appendChild(bold);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    }
  }

  function isReplyInstruction(prompt: string): boolean {
    return /\b(reply|draft|respond|response|refine)\b/i.test(prompt);
  }

  function isDraftInstruction(prompt: string): boolean {
    return /\b(draft|compose|new email|write (?:an )?email|generate (?:an )?email)\b/i.test(prompt);
  }

  function renderResult(data: any): void {
    if (!overlayShadow) return;
    const existing = overlayShadow.querySelector("#mailx-result");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "mailx-result";
    Object.assign(container.style, {
      position: "relative",
      width: "auto",
      maxHeight: "400px",
      background: "#ffffff",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      padding: "20px",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      lineHeight: "1.6",
      color: "#1f2937",
      overflowY: "auto",
    });
    const closeResult = () => {
      container.remove();
      actionPanel?.classList.remove("has-result");
    };

    const content = document.createElement("div");
    content.style.whiteSpace = "pre-wrap";
    const text = typeof data === "string" ? data : data?.text || JSON.stringify(data);
    const draft = data?.result?.kind === "draft" ? data.result as DraftData : null;
    content.textContent = draft ? formatDraft(draft, true) : text;
    if (data?.intent === "tasks") {
      content.textContent = data?.tasks?.length
        ? `Tasks found (${data.tasks.length})`
        : "No action items were found in this email.";
      content.style.fontWeight = "700";
    }
    container.appendChild(content);

    if (data?.result?.kind === "priority") {
      const priority = data.result.priority;
      if (priority) {
        content.textContent = `Priority: ${priority.toUpperCase()}`;
        content.style.fontWeight = "700";
        content.style.color = priority === "high" ? "#b91c1c" : priority === "medium" ? "#a16207" : "#15803d";
      }
    }

    if (data?.intent === "reply") {
      const replies = parseReplyOptions(text);
      if (replies.length) {
        content.textContent = "Choose a reply:";
        const replyList = document.createElement("div");
        replyList.style.marginTop = "10px";
        for (const [index, reply] of replies.entries()) {
          const card = document.createElement("div");
          card.style.cssText = "margin-top:8px;padding:9px;border:1px solid #dbe3ee;border-radius:7px;background:#f8fafc;";
          const label = document.createElement("strong");
          label.textContent = `Reply ${index + 1}`;
          label.style.display = "block";
          const replyText = document.createElement("div");
          replyText.textContent = reply;
          replyText.style.cssText = "margin:4px 0 8px;white-space:pre-wrap;";
          const copy = document.createElement("button");
          copy.textContent = "Copy";
          const insert = document.createElement("button");
          insert.textContent = "Insert";
          const refine = document.createElement("button");
          refine.textContent = "Refine";
          for (const button of [copy, insert, refine]) {
            button.style.cssText = "margin-right:6px;padding:4px 9px;border:1px solid #cbd5e1;border-radius:4px;background:white;cursor:pointer;font-size:12px;";
          }
          copy.onclick = async () => {
            const copied = await copyText(reply);
            copy.textContent = copied ? "Copied" : "Copy failed";
          };
          insert.onclick = async () => {
            insert.disabled = true;
            insert.textContent = "Opening...";
            if (await openComposeAndInsert(reply)) closeResult();
            else {
              insert.disabled = false;
              insert.textContent = "Insert";
              showToast("MailX could not open Gmail compose. Please try again.");
            }
          };
          refine.onclick = () => {
            const context = extractEmailContext();
            if (context) renderChatComposer(context, `Refine this selected reply:\n\n${reply}\n\nInstruction: `);
          };
          card.append(label, replyText, copy, insert, refine);
          replyList.appendChild(card);
        }
        container.appendChild(replyList);
      }
    }

    if (data?.tasks?.length) {
      const list = document.createElement("div");
      list.style.marginTop = "12px";
      for (const task of data.tasks) {
        const row = document.createElement("label");
        row.style.display = "block";
        row.style.marginTop = "8px";
        row.style.padding = "8px";
        row.style.border = "1px solid #dbe3ee";
        row.style.borderRadius = "6px";
        row.style.background = "#f8fafc";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.status === "completed";
        checkbox.addEventListener("change", () => chrome.runtime.sendMessage({ type: "TOGGLE_TASK", task_id: task.id }));
        const description = document.createElement("strong");
        description.textContent = ` ${task.description}`;
        const details = document.createElement("span");
        details.style.cssText = "display:block;margin:4px 0 0 20px;color:#64748b;font-size:11px;font-weight:400;";
        details.textContent = [
          task.due_date ? `Due: ${task.due_date}` : "No due date",
          `Priority: ${(task.priority || "medium").toUpperCase()}`,
          task.assignee && task.assignee !== "me" ? `Assigned to: ${task.assignee}` : "Assigned to: me",
        ].join(" | ");
        row.append(checkbox, description, details);
        list.appendChild(row);
      }
      container.appendChild(list);
    }

    if (data?.actions?.length && data?.intent !== "reply") {
      const div = document.createElement("div");
      Object.assign(div.style, {
        marginTop: "14px",
        display: "flex",
        gap: "6px",
        flexWrap: "wrap",
        borderTop: "1px solid #e5e7eb",
        paddingTop: "12px",
      });
      for (const a of data.actions) {
        const btn = document.createElement("button");
        btn.textContent = a.label;
        Object.assign(btn.style, {
          padding: "5px 12px",
          border: "1px solid #d1d5db",
          borderRadius: "5px",
          background: "#f9fafb",
          cursor: "pointer",
          fontSize: "12px",
          color: "#374151",
        });
        btn.onclick = async () => {
          if (a.action === "copy") {
            btn.textContent = await copyText(draft ? formatDraft(draft, true) : text) ? "Copied" : "Copy failed";
          } else if (a.action === "insert") {
            const inserted = insertIntoCompose(extractInsertText(text, data?.intent, data?.result));
            if (inserted) { btn.textContent = "Inserted"; closeResult(); }
            else showToast("Open a Gmail reply or compose box first");
          } else {
            closeResult();
          }
        };
        div.appendChild(btn);
      }
      container.appendChild(div);
    }

    if (data?.intent === "draft") {
      const insert = document.createElement("button");
      insert.textContent = "Insert into Gmail";
      Object.assign(insert.style, { marginTop: "12px", padding: "6px 12px", border: "0", borderRadius: "5px", background: "#1a73e8", color: "white", cursor: "pointer" });
      insert.onclick = async () => {
        if (draft && await insertDraftIntoCompose(draft)) closeResult();
        else showToast("Open a Gmail reply or compose box first");
      };
      container.appendChild(insert);
    }

    const close = document.createElement("button");
    close.textContent = "Back";
    Object.assign(close.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      border: "none",
      background: "none",
      cursor: "pointer",
       fontSize: "12px",
       color: "#1a73e8",
       padding: "4px 7px",
      borderRadius: "4px",
    });
    close.onclick = closeResult;
    container.appendChild(close);

    actionPanel?.classList.add("has-result");
    actionPanel?.querySelector(".mailx-panel-content")?.appendChild(container);
  }

  function renderDraftComposer(ctx: EmailContext): void {
    if (!overlayShadow || !actionPanel) return;
    overlayShadow.querySelector("#mailx-result")?.remove();
    const container = document.createElement("div");
    container.id = "mailx-result";
    container.style.cssText = "position:relative;min-width:0;padding:16px;background:#fff;border-radius:9px;color:#172033;font:13px system-ui,sans-serif;";
    const title = document.createElement("strong");
    title.textContent = "Create an email draft";
    const hint = document.createElement("p");
    hint.textContent = "Describe who you are writing to and what you want to say.";
    hint.style.cssText = "margin:6px 0 10px;color:#5d6b82;font-size:12px;";
    const input = document.createElement("textarea");
    input.placeholder = "Example: Write a polite follow-up to Taha about the project report";
    input.rows = 5;
    input.style.cssText = "box-sizing:border-box;width:100%;resize:vertical;padding:9px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;line-height:1.4;";
    // Gmail installs document-level shortcuts. Keep events inside MailX so it
    // cannot steal typing, Enter, or Backspace from this draft field.
    for (const eventName of ["pointerdown", "mousedown", "keydown", "keypress", "keyup", "input"]) {
      input.addEventListener(eventName, (event) => event.stopPropagation());
    }
    const error = document.createElement("div");
    error.style.cssText = "min-height:18px;margin-top:5px;color:#b91c1c;font-size:11px;";
    const cancel = document.createElement("button");
    cancel.textContent = "Cancel";
    const generate = document.createElement("button");
    let pendingRequest: AiRequestHandle | undefined;
    generate.textContent = "Generate draft";
    for (const button of [cancel, generate]) button.style.cssText = "margin-top:8px;padding:6px 10px;border-radius:5px;cursor:pointer;font-size:12px;";
    cancel.style.cssText += "border:1px solid #cbd5e1;background:#fff;color:#334155;";
    generate.style.cssText += "margin-left:7px;border:1px solid #1a73e8;background:#1a73e8;color:#fff;";
    cancel.onclick = () => {
      pendingRequest?.cancel();
      container.remove();
      actionPanel?.classList.remove("has-result");
    };
    generate.onclick = () => {
      const prompt = input.value.trim();
      if (!prompt) { error.textContent = "Enter what you want to draft first."; input.focus(); return; }
      generate.disabled = true;
      generate.textContent = "Generating...";
      pendingRequest = sendAiMessage({ type: "GENERATE_DRAFT", email_context: ctx, prompt }, "explicit", "draft_composer", (response) => {
        pendingRequest = undefined;
        if (chrome.runtime.lastError || response?.error) {
          error.textContent = response?.error || chrome.runtime.lastError?.message || "Could not generate the draft.";
          generate.disabled = false;
          generate.textContent = "Generate draft";
          return;
        }
        renderResult({ text: response.response, result: response.result, actions: response.actions, intent: "draft" });
      });
    };
    container.append(title, hint, input, error, cancel, generate);
    actionPanel.classList.add("has-result");
    actionPanel.querySelector(".mailx-panel-content")?.appendChild(container);
    input.focus();
  }

  function showToast(msg: string): void {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed",
      bottom: "80px",
      right: "24px",
      padding: "10px 16px",
      background: "#1f2937",
      color: "white",
      borderRadius: "6px",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      zIndex: "999999",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      maxWidth: "300px",
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  const classifiedRows = new WeakSet<Element>();
  const priorityPendingRows = new WeakSet<Element>();
  let priorityScanInProgress = false;
  let lastPriorityScanAt = 0;

  function scanInboxForPriority(): void {
    // One paced request at a time keeps the free provider responsive and stays
    // below the backend rate limit while eventually covering every visible row.
    if (document.querySelector(".a3s") || priorityScanInProgress || Date.now() - lastPriorityScanAt < 2_000 || !document.querySelector('tr.zA')) return;
    priorityScanInProgress = true;
    lastPriorityScanAt = Date.now();
    const rows = Array.from(document.querySelectorAll('tr.zA'))
      .filter((row) => !classifiedRows.has(row) && !priorityPendingRows.has(row)).slice(0, 1);
    Promise.all(rows.map((row) => classifyInboxRow(row))).finally(() => { priorityScanInProgress = false; });
  }

  async function classifyInboxRow(row: Element): Promise<void> {
    priorityPendingRows.add(row);
    const columns = Array.from(row.querySelectorAll<HTMLElement>('td'));
    const sender = row.querySelector<HTMLElement>('[email]')?.getAttribute('email') || columns[4]?.textContent?.trim() || "";
    const subject = row.querySelector<HTMLElement>('.bog')?.textContent?.trim() || "";
    const snippet = row.querySelector<HTMLElement>('.y2')?.textContent?.trim() || "";
    if (!subject && !snippet) {
      classifiedRows.add(row);
      return;
    }
    sendAiMessage({ type: "CLASSIFY_PRIORITY", email_context: {
      id: row.getAttribute('data-legacy-thread-id') || `${sender}:${subject}`, sender, subject, snippet, body: "",
    } }, "automatic", "inbox_scan", (response) => {
        const classification = response?.result?.kind === "priority" ? response.result : null;
      if (!classification) {
        priorityPendingRows.delete(row);
        return;
      }
      classifiedRows.add(row);
      if (classification.confidence < 0.6 || !row.isConnected) return;
      const badge = document.createElement('span');
      badge.textContent = classification.priority.toUpperCase();
      badge.style.cssText = `margin-left:8px;padding:2px 5px;border-radius:9px;font:600 9px Arial;color:#fff;background:${classification.priority === "high" ? "#d93025" : classification.priority === "medium" ? "#f29900" : "#188038"};`;
      const target = row.querySelector('.bog') || row.querySelector('td');
      if (target) target.appendChild(badge);
    });
  }

  function extractInsertText(text: string, intent: string, result?: StructuredAiResult): string {
    if (intent !== "draft") return text.replace(/^R\d\s*[:.-]\s*/gim, "").trim();
    return result?.kind === "draft" ? [result.greeting, result.body, result.sign_off].join("\n\n") : text;
  }

  type DraftData = Extract<StructuredAiResult, { kind: "draft" }>;

  function formatDraft(draft: DraftData, includeSubject: boolean): string {
    return [
      includeSubject && draft.to ? `To: ${draft.to}` : "",
      includeSubject && draft.subject ? `Subject: ${draft.subject}` : "",
      draft.greeting || "",
      draft.body || "",
      draft.sign_off || "",
    ].filter(Boolean).join("\n\n");
  }

  function parseReplyOptions(text: string): string[] {
    const pattern = /(?:^|\n)\s*(?:[-*]\s*)?(?:\*{1,2}\s*)?R([1-3])(?:\s*\([^\n)]*\))?(?:\s*\*{1,2})?\s*[:.-]\s*/gi;
    const matches = [...text.matchAll(pattern)];
    const replies = new Map<string, string>();
    for (const [index, match] of matches.entries()) {
      const start = (match.index || 0) + match[0].length;
      const end = index < matches.length - 1 ? matches[index + 1].index || text.length : text.length;
      const reply = text.slice(start, end).trim();
      if (reply) replies.set(match[1], `${replies.get(match[1]) ? `${replies.get(match[1])}\n\n` : ""}${reply}`);
    }
    const markedReplies = ["1", "2", "3"].map((id) => replies.get(id)).filter((reply): reply is string => Boolean(reply));
    if (markedReplies.length) return markedReplies.slice(0, 1);

    const candidate = text.trim();
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        const first = parsed.find((item): item is string => typeof item === "string" && Boolean(item.trim()));
        if (first) return [first.trim()];
      }
      if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
    } catch {
      const firstItem = candidate.match(/^\s*\[\s*("(?:\\.|[^"\\])*")/s);
      if (firstItem) {
        try {
          const first = JSON.parse(firstItem[1]);
          if (typeof first === "string" && first.trim()) return [first.trim()];
        } catch {
          // Fall through to displaying the plain response.
        }
      }
    }
    return candidate ? [candidate] : [];
  }

  function getComposeBox(): HTMLElement | undefined {
    return Array.from(document.querySelectorAll<HTMLElement>('[contenteditable="true"][role="textbox"]'))
      .filter((element) => element.offsetParent !== null).pop();
  }

  function insertIntoCompose(text: string, composer = getComposeBox()): boolean {
    if (!composer) return false;
    composer.focus();
    document.execCommand("insertText", false, text);
    composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
    return true;
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  }

  async function openComposeAndInsert(text: string): Promise<boolean> {
    let composer = getComposeBox();
    if (composer) return replaceAndInsert(composer, text);
    const replyButton = Array.from(document.querySelectorAll<HTMLElement>('[data-tooltip="Reply"], [aria-label="Reply"]'))
      .filter((button) => button.offsetParent !== null).pop();
    const actionButton = replyButton || document.querySelector<HTMLElement>('[gh="cm"], div[role="button"][data-tooltip^="Compose"]');
    if (!actionButton) return false;
    actionButton.click();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
      composer = getComposeBox();
      if (composer) return replaceAndInsert(composer, text);
    }
    return false;
  }

  async function insertDraftIntoCompose(draft: DraftData): Promise<boolean> {
    let composer = getComposeBox();
    if (!composer) {
      const composeButton = document.querySelector<HTMLElement>('[gh="cm"], div[role="button"][data-tooltip^="Compose"]');
      if (!composeButton) return false;
      composeButton.click();
      for (let attempt = 0; attempt < 20; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 150));
        composer = getComposeBox();
        if (composer) break;
      }
    }
    if (!composer) return false;
    if (draft.to && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.to)) {
      if (!await insertRecipient(draft.to, composer)) return false;
    }
    if (!await replaceAndInsert(composer, formatDraft(draft, false))) return false;
    const composeRoot = composer.closest<HTMLElement>('[role="dialog"], .M9') || document.body;
    const subject = Array.from(composeRoot.querySelectorAll<HTMLInputElement>('input[name="subjectbox"]'))
      .filter((input) => input.offsetParent !== null).pop();
    if (subject && draft.subject) {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setValue?.call(subject, draft.subject);
      subject.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: draft.subject }));
    }
    return true;
  }

  async function insertRecipient(address: string, composer: HTMLElement): Promise<boolean> {
    const composeRoot = composer.closest<HTMLElement>('[role="dialog"], .M9') || document.body;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const recipient = Array.from(composeRoot.querySelectorAll<HTMLElement>(
        'input[peoplekit-id], input[name="to"], input[role="combobox"], [contenteditable="true"][role="combobox"]'
      )).filter((element) => element.offsetParent !== null).pop();
      if (recipient) {
        recipient.focus();
        if (recipient instanceof HTMLInputElement) {
          const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
          setValue?.call(recipient, address);
        } else {
          document.execCommand("insertText", false, address);
        }
        recipient.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: address }));
        for (const eventName of ["keydown", "keypress", "keyup"]) {
          recipient.dispatchEvent(new KeyboardEvent(eventName, { bubbles: true, key: "Enter", code: "Enter" }));
        }
        return true;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return false;
  }

  async function replaceAndInsert(composer: HTMLElement, text: string): Promise<boolean> {
    if (composer.textContent?.trim() && !await confirmReplaceDraft()) return false;
    if (composer.textContent?.trim()) {
      composer.focus();
      document.execCommand("selectAll", false);
      document.execCommand("delete", false);
      composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
    }
    return insertIntoCompose(text, composer);
  }

  function confirmReplaceDraft(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!overlayShadow) return resolve(false);
      const backdrop = document.createElement("div");
      backdrop.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.35);display:grid;place-items:center;font-family:Arial,sans-serif;";
      const modal = document.createElement("div");
      modal.style.cssText = "width:min(330px,calc(100vw - 32px));padding:20px;border-radius:12px;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,.28);color:#172033;";
      const title = document.createElement("strong");
      title.textContent = "Replace existing reply?";
      const message = document.createElement("p");
      message.textContent = "This reply box already has text. Replace it with the selected MailX reply?";
      message.style.cssText = "margin:9px 0 16px;color:#52627a;font-size:13px;line-height:1.45;";
      const cancel = document.createElement("button");
      cancel.textContent = "Keep my text";
      const replace = document.createElement("button");
      replace.textContent = "Replace";
      for (const button of [cancel, replace]) button.style.cssText = "padding:7px 11px;border-radius:5px;cursor:pointer;font-size:12px;";
      cancel.style.cssText += "border:1px solid #cbd5e1;background:#fff;color:#334155;";
      replace.style.cssText += "margin-left:8px;border:1px solid #1a73e8;background:#1a73e8;color:#fff;";
      const finish = (answer: boolean) => { backdrop.remove(); resolve(answer); };
      cancel.onclick = () => finish(false);
      replace.onclick = () => finish(true);
      backdrop.onclick = (event) => { if (event.target === backdrop) finish(false); };
      modal.append(title, message, cancel, replace);
      backdrop.appendChild(modal);
      overlayShadow.appendChild(backdrop);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
