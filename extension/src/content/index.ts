import { ExtensionMessage, EmailContext } from "../shared/types";

(function () {
  if (window.location.hostname !== "mail.google.com") return;

  let overlayShadow: ShadowRoot | null = null;
  let floatingBar: HTMLElement | null = null;

  function init(): void {
    const root = document.createElement("div");
    root.id = "mailx-root";
    overlayShadow = root.attachShadow({ mode: "closed" });
    document.body.appendChild(root);

    createBadge();
    createToolbar();

    setInterval(() => {
      const hash = window.location.hash;
      const hasEmail = /\/[a-zA-Z0-9_-]{10,}/.test(hash);
      if (floatingBar) {
        floatingBar.style.display = hasEmail ? "flex" : "none";
      }
    }, 1000);

    chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
      if (msg.type === "RENDER_RESULT") renderResult(msg.data);
      sendResponse({ received: true });
      return true;
    });
  }

  function createBadge(): void {
    const badge = document.createElement("div");
    badge.textContent = "MailX";
    Object.assign(badge.style, {
      position: "fixed",
      top: "4px",
      right: "4px",
      zIndex: "99999",
      background: "#1f2937",
      color: "white",
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: "600",
      fontFamily: "system-ui, sans-serif",
      opacity: "0.7",
    });
    document.body.appendChild(badge);
  }

  function createToolbar(): void {
    floatingBar = document.createElement("div");
    Object.assign(floatingBar.style, {
      display: "none",
      position: "fixed",
      top: "60px",
      right: "24px",
      zIndex: "99999",
      gap: "4px",
      padding: "8px 12px",
      background: "#ffffff",
      borderRadius: "10px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
      border: "1px solid #e5e7eb",
      alignItems: "center",
      flexWrap: "wrap",
    });

    const label = document.createElement("div");
    label.textContent = "MailX";
    Object.assign(label.style, {
      fontWeight: "700",
      fontSize: "11px",
      color: "#6b7280",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      width: "100%",
      marginBottom: "4px",
    });
    floatingBar.appendChild(label);

    const buttons = [
      { id: "summarize", label: "Summarize", emoji: "📝" },
      { id: "reply", label: "Smart Reply", emoji: "💬" },
      { id: "draft", label: "Draft", emoji: "✏️" },
      { id: "priority", label: "Priority", emoji: "🏷️" },
      { id: "tasks", label: "Tasks", emoji: "✅" },
    ];

    for (const b of buttons) {
      const btn = document.createElement("button");
      btn.textContent = `${b.emoji} ${b.label}`;
      Object.assign(btn.style, {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "6px 12px",
        cursor: "pointer",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "500",
        color: "#374151",
        background: "#f3f4f6",
        border: "1px solid #d1d5db",
        whiteSpace: "nowrap",
        transition: "background 0.15s",
        fontFamily: "system-ui, sans-serif",
      });
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "#e5e7eb";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "#f3f4f6";
      });
      btn.addEventListener("click", () => handleAction(b.id));
      floatingBar.appendChild(btn);
    }

    document.body.appendChild(floatingBar);
  }

  function handleAction(action: string): void {
    const ctx = extractEmailContext();
    if (!ctx) {
      showToast("Open an email with a conversation thread");
      return;
    }

    const typeMap: Record<string, string> = {
      summarize: "SUMMARIZE",
      reply: "SUGGEST_REPLIES",
      draft: "GENERATE_DRAFT",
      priority: "CLASSIFY_PRIORITY",
      tasks: "EXTRACT_TASKS",
    };

    chrome.runtime.sendMessage(
      { type: typeMap[action], email_context: ctx } as ExtensionMessage,
      (response) => {
        if (response?.error) {
          showToast(response.error);
          return;
        }
        const text =
          typeof response?.response === "string"
            ? response.response
            : JSON.stringify(response?.response);
        renderResult({ text, actions: response?.actions });
      }
    );
  }

  function extractEmailContext(): EmailContext | null {
    const hash = window.location.hash;
    const m = hash.match(/#[^/]+\/([a-zA-Z0-9_-]+)/);
    if (!m) return null;

    let subject = "";
    let sender = "";
    let body = "";

    const h2 = document.querySelector("h2");
    if (h2) subject = h2.textContent || "";

    const emailAttr = document.querySelector("[email]");
    const mailto = document.querySelector('[href^="mailto:"]');
    const gD = document.querySelector(".gD");
    if (emailAttr) sender = emailAttr.getAttribute("email") || "";
    else if (mailto) sender = mailto.getAttribute("href")?.replace("mailto:", "") || "";
    else if (gD) sender = gD.textContent || "";

    const a3s = document.querySelector(".a3s");
    if (a3s) body = a3s.textContent?.trim() || "";

    return { id: m[1], sender, subject, body };
  }

  function renderResult(data: any): void {
    if (!overlayShadow) return;
    const existing = overlayShadow.querySelector("#mailx-result");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "mailx-result";
    Object.assign(container.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      width: "380px",
      maxHeight: "440px",
      background: "#ffffff",
      borderRadius: "10px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
      padding: "20px",
      zIndex: "999999",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
      lineHeight: "1.6",
      color: "#1f2937",
      overflowY: "auto",
    });

    const content = document.createElement("div");
    content.style.whiteSpace = "pre-wrap";
    content.textContent =
      typeof data === "string" ? data : data?.text || JSON.stringify(data);
    container.appendChild(content);

    if (data?.actions?.length) {
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
        btn.onclick = () => container.remove();
        div.appendChild(btn);
      }
      container.appendChild(div);
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
    close.onclick = () => container.remove();
    container.appendChild(close);

    overlayShadow.appendChild(container);
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
