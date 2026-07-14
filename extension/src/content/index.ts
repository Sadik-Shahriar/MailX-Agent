import { ExtensionMessage, EmailContext } from "../shared/types";

(function () {
  if (window.location.hostname !== "mail.google.com") return;

  let overlayShadow: ShadowRoot | null = null;
  let actionPanel: HTMLElement | null = null;
  let activeActionButton: HTMLButtonElement | null = null;
  let panelIdleTimer: number | null = null;
  const PANEL_COLLAPSED_KEY = "mailx_panel_collapsed";
  const PANEL_IDLE_MS = 45_000;

  function init(): void {
    const root = document.createElement("div");
    root.id = "mailx-root";
    overlayShadow = root.attachShadow({ mode: "closed" });
    document.body.appendChild(root);

    addPanelStyles();
    syncActionPanel();
    window.addEventListener("resize", () => {
      if (actionPanel) clampPanelToViewport(actionPanel);
    });

    setInterval(() => {
      syncActionPanel();
      scanInboxForPriority();
    }, 1000);

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
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 2147483646;
        box-sizing: border-box;
        width: 272px;
        overflow: hidden;
        border: 1px solid #d7e1f1;
        border-radius: 14px;
         background: #ffffff;
         box-shadow: 0 4px 10px rgba(30, 64, 115, 0.14), 0 14px 34px rgba(30, 64, 115, 0.22);
         color: #172033;
         font-family: Arial, sans-serif;
         transition: width 340ms cubic-bezier(.22, 1, .36, 1), height 300ms cubic-bezier(.22, 1, .36, 1), border-radius 260ms ease, transform 260ms ease, box-shadow 260ms ease;
      }

      .mailx-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 13px 14px 11px;
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
         max-height: 180px;
         padding: 12px;
         opacity: 1;
         overflow: hidden;
         transition: max-height 260ms ease, padding 260ms ease, opacity 180ms ease;
       }
       .mailx-actions { min-width: 248px; }
       .mailx-email-actions { margin-top: 10px; padding-top: 10px; border-top: 1px solid #e6edf8; }
       #mailx-action-panel.has-result { width: 650px; max-width: calc(100vw - 32px); }
       #mailx-action-panel.has-result .mailx-panel-content {
         display: grid;
         grid-template-columns: 248px minmax(0, 1fr);
         gap: 14px;
         max-height: 460px;
       }
      .mailx-primary-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .mailx-secondary-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-top: 10px;
      }

      .mailx-action {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        min-height: 62px;
        border: 1px solid #d8e2f0;
        border-radius: 10px;
        background: #ffffff;
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
      .mailx-primary-action { padding: 10px; }
      .mailx-secondary-action {
        min-height: 34px;
        align-items: center;
        padding: 6px 4px;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
      }

      .mailx-action-label { font-size: 12px; font-weight: 700; }
      .mailx-action-description {
        margin-top: 4px;
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
    generalActions.append(createActionButton("draft", "Draft", "Create a new email", true));

    const emailActions = document.createElement("div");
    emailActions.className = "mailx-email-actions";
    const primaryActions = document.createElement("div");
    primaryActions.className = "mailx-primary-actions";
    primaryActions.append(
      createActionButton("summarize", "Summarize", "Key facts and next steps", true),
      createActionButton("reply", "Smart Reply", "Three ready-to-send options", true)
    );

    const secondaryActions = document.createElement("div");
    secondaryActions.className = "mailx-secondary-actions";
    secondaryActions.append(
      createActionButton("priority", "Priority", "", false),
      createActionButton("tasks", "Tasks", "", false)
    );

    emailActions.append(primaryActions, secondaryActions);
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
    if (panel.classList.contains("is-collapsed")) return;
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

  function handleAction(action: string, button: HTMLButtonElement): void {
    if (activeActionButton) return;

    const ctx = extractEmailContext();
    if (action === "draft") {
      renderDraftComposer(ctx || { id: "", sender: "", subject: "", body: "" });
      return;
    }
    if (!ctx) {
      showToast("Open an email with a conversation thread");
      return;
    }
    if (action === "summarize" && !hasSummarizableContent(ctx.body)) {
      showToast("MailX could not find email body text to summarize");
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
    };

    chrome.runtime.sendMessage(
      { type: typeMap[action], email_context: ctx, prompt } as ExtensionMessage,
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
        renderResult({ text, actions: response?.actions, intent: action, tasks: response?.tasks });
      }
    );
  }

  function setActionLoading(button: HTMLButtonElement, loading: boolean): void {
    const label = button.querySelector(".mailx-action-label");
    button.disabled = loading;
    if (loading) {
      activeActionButton = button;
      if (label) label.textContent = "Working...";
      return;
    }

    activeActionButton = null;
    if (label) label.textContent = button.dataset.label || "MailX";
  }

  function extractEmailContext(): EmailContext | null {
    const hash = window.location.hash;
    const m = hash.match(/#[^/]+\/([a-zA-Z0-9_-]+)/);
    const id = m?.[1] || hash || "current-email";

    let subject = "";
    let sender = "";
    let body = "";

    const h2 = document.querySelector("h2");
    if (h2) subject = h2.textContent || "";

    const latestBody = getLatestVisibleEmailBody();
    const messageCard = latestBody?.closest<HTMLElement>(".adn.ads, .h7");
    const emailAttr = messageCard?.querySelector("[email]") || document.querySelector("[email]");
    const mailto = messageCard?.querySelector('[href^="mailto:"]') || document.querySelector('[href^="mailto:"]');
    const gD = messageCard?.querySelector(".gD") || document.querySelector(".gD");
    if (emailAttr) sender = emailAttr.getAttribute("email") || "";
    else if (mailto) sender = mailto.getAttribute("href")?.replace("mailto:", "") || "";
    else if (gD) sender = gD.textContent || "";

    body = extractCurrentEmailBody(latestBody);

    return { id, sender, subject, body };
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
    const draft = data?.intent === "draft" ? parseDraft(text) : null;
    content.textContent = draft ? formatDraft(draft, true) : text;
    container.appendChild(content);

    if (data?.intent === "priority") {
      const match = text.match(/"priority"\s*:\s*"(high|medium|low)"/i);
      if (match) {
        content.textContent = `Priority: ${match[1].toUpperCase()}`;
        content.style.fontWeight = "700";
        content.style.color = match[1].toLowerCase() === "high" ? "#b91c1c" : match[1].toLowerCase() === "medium" ? "#a16207" : "#15803d";
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
          for (const button of [copy, insert]) {
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
          card.append(label, replyText, copy, insert);
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
        row.style.marginTop = "6px";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.addEventListener("change", () => chrome.runtime.sendMessage({ type: "TOGGLE_TASK", task_id: task.id }));
        row.append(checkbox, document.createTextNode(` ${task.description}${task.due_date ? ` (due ${task.due_date})` : ""}`));
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
            const inserted = insertIntoCompose(extractInsertText(text, data?.intent));
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
    close.textContent = "✕";
    Object.assign(close.style, {
      position: "absolute",
      top: "10px",
      right: "10px",
      border: "none",
      background: "none",
      cursor: "pointer",
      fontSize: "16px",
      color: "#9ca3af",
      padding: "2px 6px",
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
    generate.textContent = "Generate draft";
    for (const button of [cancel, generate]) button.style.cssText = "margin-top:8px;padding:6px 10px;border-radius:5px;cursor:pointer;font-size:12px;";
    cancel.style.cssText += "border:1px solid #cbd5e1;background:#fff;color:#334155;";
    generate.style.cssText += "margin-left:7px;border:1px solid #1a73e8;background:#1a73e8;color:#fff;";
    cancel.onclick = () => { container.remove(); actionPanel?.classList.remove("has-result"); };
    generate.onclick = () => {
      const prompt = input.value.trim();
      if (!prompt) { error.textContent = "Enter what you want to draft first."; input.focus(); return; }
      generate.disabled = true;
      generate.textContent = "Generating...";
      chrome.runtime.sendMessage({ type: "GENERATE_DRAFT", email_context: ctx, prompt } as ExtensionMessage, (response) => {
        if (chrome.runtime.lastError || response?.error) {
          error.textContent = response?.error || chrome.runtime.lastError?.message || "Could not generate the draft.";
          generate.disabled = false;
          generate.textContent = "Generate draft";
          return;
        }
        renderResult({ text: response.response, actions: response.actions, intent: "draft" });
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
    if (priorityScanInProgress || Date.now() - lastPriorityScanAt < 2_000 || !document.querySelector('tr.zA')) return;
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
    chrome.runtime.sendMessage({ type: "CLASSIFY_PRIORITY", email_context: {
      id: row.getAttribute('data-legacy-thread-id') || `${sender}:${subject}`, sender, subject, snippet, body: "",
    } }, (response) => {
      const result = typeof response?.response === "string" ? response.response : "";
      const classification = parsePriorityClassification(result);
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

  function parsePriorityClassification(text: string): { priority: "high" | "medium" | "low"; confidence: number } | null {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const value = JSON.parse(match[0]);
      if (!["high", "medium", "low"].includes(value.priority)) return null;
      return { priority: value.priority, confidence: Number(value.confidence) || 0 };
    } catch { return null; }
  }

  function extractInsertText(text: string, intent: string): string {
    if (intent !== "draft") return text.replace(/^R\d\s*[:.-]\s*/gim, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return text;
    try {
      const draft = JSON.parse(match[0]);
      return [draft.greeting, draft.body, draft.signOff].filter(Boolean).join("\n\n");
    } catch { return text; }
  }

  interface DraftData {
    subject?: string;
    greeting?: string;
    body?: string;
    signOff?: string;
  }

  function parseDraft(text: string): DraftData | null {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const draft = JSON.parse(match[0]);
      return draft && typeof draft === "object" ? draft as DraftData : null;
    } catch { return null; }
  }

  function formatDraft(draft: DraftData, includeSubject: boolean): string {
    return [
      includeSubject && draft.subject ? `Subject: ${draft.subject}` : "",
      draft.greeting || "",
      draft.body || "",
      draft.signOff || "",
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
    return ["1", "2", "3"].map((id) => replies.get(id)).filter((reply): reply is string => Boolean(reply));
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
    if (!composer || !await replaceAndInsert(composer, formatDraft(draft, false))) return false;
    const subject = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="subjectbox"]'))
      .filter((input) => input.offsetParent !== null).pop();
    if (subject && draft.subject) {
      subject.value = draft.subject;
      subject.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: draft.subject }));
    }
    return true;
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
