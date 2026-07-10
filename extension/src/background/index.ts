import { chat } from "./api";
import { setupReminderAlarm, handleReminderCheck } from "./reminders";
import { ExtensionMessage } from "../shared/types";
import { signInWithGoogle, devSignIn, signOut, getSession } from "./supabase";

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch((err) => {
      console.error("[MailX] Error handling message:", err);
      sendResponse({ error: err.message });
    });
    return true;
  }
);

async function handleMessage(msg: ExtensionMessage): Promise<any> {
  switch (msg.type) {
    case "SUMMARIZE":
    case "SUGGEST_REPLIES":
    case "CLASSIFY_PRIORITY":
    case "EXTRACT_TASKS":
    case "GENERATE_DRAFT":
    case "CHAT": {
      const intentMap: Record<string, string> = {
        SUMMARIZE: "summarize",
        SUGGEST_REPLIES: "reply",
        CLASSIFY_PRIORITY: "priority",
        EXTRACT_TASKS: "tasks",
        GENERATE_DRAFT: "draft",
        CHAT: "chat",
      };
      return chat({
        intent: intentMap[msg.type] || "chat",
        email_context: msg.email_context,
        prompt: msg.prompt,
        conversation_id: msg.conversation_id,
        history: msg.history,
      });
    }

    case "GET_TASKS": {
      const result = await chrome.storage.local.get("tasks");
      return { tasks: result.tasks || [] };
    }

    case "TOGGLE_TASK": {
      const data = await chrome.storage.local.get("tasks");
      const tasks = data.tasks || [];
      const updated = tasks.map((t: any) =>
        t.id === msg.task_id
          ? { ...t, status: t.status === "completed" ? "pending" : "completed" }
          : t
      );
      await chrome.storage.local.set({ tasks: updated });
      return { tasks: updated };
    }

    case "SIGN_IN": {
      await signInWithGoogle();
      const session = await getSession();
      return {
        loggedIn: !!session,
        email: session?.user?.email || "",
      };
    }

    case "DEV_SIGN_IN": {
      await devSignIn(msg.email);
      const session = await getSession();
      return {
        loggedIn: !!session,
        email: session?.user?.email || "dev@mailx.local",
      };
    }

    case "SIGN_OUT": {
      await signOut();
      return { loggedIn: false };
    }

    case "GET_STATUS": {
      const session = await getSession();
      return {
        loggedIn: !!session,
        email: session?.user?.email || "",
      };
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}

// Set up alarms on install
chrome.runtime.onInstalled.addListener(() => {
  setupReminderAlarm();
});

// Handle reminder alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "followUpCheck") {
    handleReminderCheck();
  }
});
