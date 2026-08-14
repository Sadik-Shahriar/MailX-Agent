import { ChatMessage, ExtensionMessage, EmailContext, RequestSource, SpamResult, StructuredAiResult, UrlVerdict } from "../shared/types";
import { createRequestTelemetry, elapsedMs, logTelemetry } from "../shared/telemetry";
import { dispatchRemoteAi } from "../shared/aiPolicy";
import { DebouncedMessageBodies } from "./toolbarObserver";
import { mountPanel } from "./panel/mountPanel";
import { PanelController, SecurityPanelData } from "./panel/PanelController";
import { getComposeText, insertDraftIntoGmail, insertReplyIntoGmail } from "./gmail/insertion";

import toolbarCss from "./toolbar.css?inline";
import tokensCss from "../ui/styles/tokens.css?inline";

(function () {
  if (window.location.hostname !== "mail.google.com") return;

  let overlayRoot: HTMLElement | null = null;
  let actionPanel: HTMLElement | null = null;
  let activeActionButton: HTMLButtonElement | null = null;
  let panelController: PanelController | null = null;
  let statusSourceButton: HTMLButtonElement | null = null;
  const securityResults = new WeakMap<HTMLElement, SecurityPanelData>();
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
  let currentEmailIdentity: string | null = null;
  let awaitingNavigatedEmail = false;
  let lastEmailContext: EmailContext | null = null;

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
    overlayRoot?.querySelector("#mailx-result")?.remove();
    actionPanel?.classList.remove("has-result");
  }

  function navigatedAway(): boolean {
    return window.location.href !== lastNavigationKey;
  }

  function cancelRequestsAfterNavigation(): void {
    const navigationKey = window.location.href;
    if (navigationKey === lastNavigationKey) return;
    lastNavigationKey = navigationKey;
    // Gmail changes its route before it always replaces the old message DOM. Keep the
    // panel context empty until a new message identity is observed.
    awaitingNavigatedEmail = true;
    cancelAllAiRequests();
    panelController?.setEmailContext(null);
  }

  function init(): void {
    const root = document.createElement("div");
    root.id = "mailx-root";
    root.style.cssText = "all:initial;display:block;position:relative;";
    overlayRoot = root;

    document.body.appendChild(root);

    addMessageToolbarStyles();
    syncActionPanel();

    window.addEventListener("hashchange", cancelRequestsAfterNavigation);
    setInterval(() => {
      cancelRequestsAfterNavigation();
      syncActionPanel();
    }, 15_000);
    const messageBodies = new DebouncedMessageBodies((bodies) => syncMessageToolbar(bodies));
    const gmailContainer = document.querySelector<HTMLElement>('[role="main"]') || document.body;
    new MutationObserver((records) => {
      for (const record of records) messageBodies.add(record.addedNodes);
      // Gmail may replace an open message without changing the hash again. Re-read the
      // current message identity after its DOM is available so the panel never retains it.
      syncActionPanel();
    }).observe(gmailContainer, { childList: true, subtree: true });

    chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
      if (msg.type === "FIND_PANEL") {
        panelController?.findPanel();
      }
      sendResponse({ received: true });
      return true;
    });
  }


  function syncActionPanel(): void {
    if (!overlayRoot) return;
    if (!actionPanel) {
      actionPanel = document.createElement("div");
      overlayRoot.appendChild(actionPanel);

      const host = {
        sendAiMessage,
        cancelAllAiRequests,
        extractEmailContext,
        getComposeText,
        insertReply: insertReplyIntoGmail,
        insertDraft: insertDraftIntoGmail,
        copyText
      };

      panelController = mountPanel(actionPanel, host);
    }
    const hasOpenEmail = Boolean(document.querySelector(".a3s"));
    const context = hasOpenEmail ? extractEmailContext() : null;
    if (panelController) {
      if (awaitingNavigatedEmail && context?.id === currentEmailIdentity) {
        awaitingNavigatedEmail = false;
      }
      awaitingNavigatedEmail = false;
      if (context) {
        lastEmailContext = context;
        currentEmailIdentity = context.id;
        panelController.setEmailContext(context);
      } else if (currentEmailIdentity && !navigatedAway()) {
        panelController.setEmailContext(lastEmailContext);
      } else {
        currentEmailIdentity = null;
        lastEmailContext = null;
        panelController.setEmailContext(null);
      }
    }
    if (hasOpenEmail) {
      syncMessageToolbar();
    }
  }



  function addMessageToolbarStyles(): void {
    if (document.getElementById("mailx-message-toolbar-styles")) return;
    const style = document.createElement("style");
    style.id = "mailx-message-toolbar-styles";
    style.textContent = tokensCss + "\n" + toolbarCss;
    document.head.appendChild(style);
  }

  function syncMessageToolbar(candidates?: Iterable<HTMLElement>): void {
    const bodies = [...(candidates || document.querySelectorAll<HTMLElement>(".a3s"))]
      .filter((body) => body.isConnected && body.offsetParent !== null);
    for (const body of bodies) {
      const card = body.closest<HTMLElement>(".adn.ads, .h7") || body.parentElement;
      const key = messageKey(body);
      if (!card) continue;
      const existing = Array.from(card.querySelectorAll<HTMLElement>(".mailx-message-toolbar"))
        .find((toolbar) => toolbar.dataset.mailxMessage === key);
      if (existing) {
        applyGmailTheme(existing);
        continue;
      }
      const toolbar = document.createElement("div");
      toolbar.className = "mailx-message-toolbar";
      applyGmailTheme(toolbar);
      toolbar.dataset.mailxMessage = key;
      toolbar.setAttribute("role", "toolbar");
      toolbar.setAttribute("aria-label", "MailX message actions");

      const brand = document.createElement("span");
      brand.className = "mailx-toolbar-brand";
      brand.setAttribute("aria-hidden", "true");
      const brandLogo = document.createElement("img");
      brandLogo.src = chrome.runtime.getURL("public/icons/mailx-logo.png");
      brandLogo.alt = "";
      brand.appendChild(brandLogo);
      const brandText = document.createElement("span");
      brandText.textContent = "MailX";
      brand.appendChild(brandText);
      toolbar.appendChild(brand);

      for (const [action, label] of [["priority", "Priority"], ["spam", "Spam Check"], ["safety", "Link Safety"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.mailxAction = action;
        button.dataset.label = label;
        button.textContent = label;
        button.addEventListener("click", () => {
          const securityResult = securityResults.get(toolbar);
          if (securityResult && securityResult.type === (action === "safety" ? "links" : action)) {
            panelController?.requestSecurity(securityResult);
            return;
          }
          handleAction(action, button, extractEmailContext(body), body);
        });
        toolbar.appendChild(button);
      }
      body.parentElement?.insertBefore(toolbar, body);
    }
  }

  function applyGmailTheme(toolbar: HTMLElement): void {
    const surfaces = [document.querySelector<HTMLElement>("[role='main']"), document.body, document.documentElement];
    const background = surfaces.map((surface) => surface && getComputedStyle(surface).backgroundColor)
      .find((color): color is string => Boolean(color && color !== "transparent" && color !== "rgba(0, 0, 0, 0)"));
    const rgb = background?.match(/\d+(?:\.\d+)?/g)?.slice(0, 3).map(Number);
    const isDark = rgb ? (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) < 128
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
    toolbar.dataset.theme = isDark ? "dark" : "light";
    toolbar.style.colorScheme = isDark ? "dark" : "light";
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
    if (text.toLowerCase().includes("unavailable")) {
      button.setAttribute("aria-invalid", "true");
    } else {
      button.removeAttribute("aria-invalid");
    }
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






  function escHtml(str: string): string {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function handleAction(action: string, button: HTMLButtonElement, contextOverride?: EmailContext | null, bodyElement?: HTMLElement): void {
    const ctx = contextOverride || extractEmailContext();
    if (!ctx) return;
    statusSourceButton = button.dataset.mailxAction ? button : null;

    // Safety is not moved to React since it is a toolbar-only inline check
    if (action === "safety") {
      if (activeActionButton) return;
      setActionLoading(button, true);
      const links = [...(bodyElement || getLatestVisibleEmailBody())?.querySelectorAll<HTMLAnchorElement>('a[href]') || []]
        .map((link) => link.href).filter(isCheckableLink).filter((url, index, all) => all.indexOf(url) === index).slice(0, 20);
      Promise.all(links.map((url) => new Promise<any>((resolve) => sendAiMessage(
        { type: "CHECK_PHISHING_URL", url } as ExtensionMessage, "explicit", "message_toolbar", resolve
      )))).then((results) => {
        setActionLoading(button, false);
        const toolbar = button.closest<HTMLElement>(".mailx-message-toolbar");
        if (toolbar) {
          if (!links.length) setToolbarStatus(toolbar, "safety", "Links: NO LINK", "none");
          else if (results.some((result) => result?.error || !result?.verdict)) {
            setToolbarStatus(toolbar, "safety", "Links: unavailable");
            securityResults.set(toolbar, { type: "links", context: ctx, status: "unavailable", message: "MailX could not check every link.", retry: () => handleAction("safety", button, ctx, bodyElement) });
          }
          else if (results.some((result) => result.verdict.verdict !== "clean")) {
            setToolbarStatus(toolbar, "safety", "Links: HARMFUL", "danger");
          }
          else setToolbarStatus(toolbar, "safety", "Links: SAFE", "safe");
          if (!links.length) securityResults.set(toolbar, { type: "links", context: ctx, status: "none", results: [], checkedCount: 0, retry: () => handleAction("safety", button, ctx, bodyElement) });
          else {
            const verdicts = results.map((result) => result?.verdict).filter((verdict): verdict is UrlVerdict => Boolean(verdict));
            if (verdicts.length === links.length) securityResults.set(toolbar, { type: "links", context: ctx, status: "result", results: verdicts, checkedCount: links.length, retry: () => handleAction("safety", button, ctx, bodyElement) });
          }
        }
      }).catch(() => { setActionLoading(button, false); showToast("MailX could not check these links"); });
      return;
    }

    if (action === "spam") {
      if (activeActionButton) return;
      const bodyContent = ctx?.body?.trim() || (bodyElement || getLatestVisibleEmailBody())?.textContent?.trim() || "";
      if (!bodyContent) {
        showToast("Open an email with content to check for spam.", "error");
        return;
      }
      setActionLoading(button, true);
      sendAiMessage({ type: "CHECK_SPAM", email_context: ctx! } as ExtensionMessage, "explicit", "message_toolbar", (res) => {
        setActionLoading(button, false);
        const toolbar = button.closest<HTMLElement>(".mailx-message-toolbar");
        if (toolbar && res?.spam) {
          const text = `Spam: ${res.spam.verdict.toUpperCase()}${res.spam.confidence ? ` (${(res.spam.confidence * 100).toFixed(0)}%)` : ''}`;
          setToolbarStatus(toolbar, "spam", text, res.spam.verdict === "spam" ? "danger" : "safe");
          securityResults.set(toolbar, { type: "spam", context: ctx, status: "result", result: res.spam as SpamResult, retry: () => handleAction("spam", button, ctx, bodyElement) });
        } else if (toolbar) {
          setToolbarStatus(toolbar, "spam", "Spam: unavailable");
          securityResults.set(toolbar, { type: "spam", context: ctx, status: "unavailable", message: "MailX could not check this email for spam.", retry: () => handleAction("spam", button, ctx, bodyElement) });
        }
      });
      return;
    }

    if (action === "priority") {
      if (activeActionButton) return;
      const bodyText = (bodyElement || getLatestVisibleEmailBody())?.innerText.trim();
      if (!bodyText) return;
      setActionLoading(button, true);
      sendAiMessage({ type: "CLASSIFY_PRIORITY", email_context: ctx! } as ExtensionMessage, "explicit", "message_toolbar", (res) => {
        setActionLoading(button, false);
        const toolbar = button.closest<HTMLElement>(".mailx-message-toolbar");
        const classification = res?.result?.kind === "priority" && res.result.confidence >= 0.6 ? res.result : null;
        if (toolbar && classification) {
          setToolbarStatus(toolbar, "priority", `Priority: ${classification.priority.toUpperCase()}`, classification.priority === "high" ? "danger" : classification.priority === "medium" ? "warning" : "safe");
          securityResults.set(toolbar, { type: "priority", context: ctx, status: "result", result: classification, retry: () => handleAction("priority", button, ctx, bodyElement) });
        } else if (toolbar) {
          setToolbarStatus(toolbar, "priority", "Priority: unavailable");
          securityResults.set(toolbar, { type: "priority", context: ctx, status: "unavailable", message: "MailX could not determine a priority level.", retry: () => handleAction("priority", button, ctx, bodyElement) });
        }
      });
      return;
    }

    // For summarize, reply, extract, draft, ask -> forward to React panel!
    if (panelController) {
      panelController.requestAction(action, ctx);
    }
  }

  function setActionLoading(button: HTMLButtonElement, loading: boolean): void {
    button.disabled = loading;
    if (loading) {
      activeActionButton = button;
      if (button.dataset.mailxAction) {
        const toolbar = button.closest<HTMLElement>(".mailx-message-toolbar");
        if (toolbar) {
          toolbar.classList.add("mailx-security-pending");
          toolbar.querySelectorAll<HTMLButtonElement>("button").forEach((control) => { if (control !== button) control.disabled = true; });
        }
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
    const toolbar = button.closest<HTMLElement>(".mailx-message-toolbar");
    if (toolbar) {
      toolbar.classList.remove("mailx-security-pending");
      toolbar.querySelectorAll<HTMLButtonElement>("button").forEach((control) => { control.disabled = false; });
    }
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
      button.disabled = false;
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



  function showToast(message: string, type: 'success'|'error' = 'success'): void {
    if (panelController) {
      panelController.showToast(message, type);
      return;
    }
    const existing = document.getElementById("mailx-toast");
    if (existing) existing.remove();
    const t = document.createElement("div");
    t.id = "mailx-toast";
    t.textContent = message;
    Object.assign(t.style, {
      position: "fixed",
      bottom: "80px",
      right: "24px",
      padding: "10px 16px",
      background: type === 'error' ? "#dc2626" : "#1f2937",
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


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
