import { chat } from "./api";
import { setupReminderAlarm, handleReminderCheck } from "./reminders";
import { ExtensionMessage, Task } from "../shared/types";
import { getOrSetCache } from "../shared/cache";
import { signInWithGoogle, devSignIn, signOut, getSession, getPreferences, getTasks, saveTasks, toggleTask, getReminders, dismissReminder, savePreferences } from "./supabase";
import { getStats } from "./stats";
import { checkSpam } from "./spam";
import { checkUrl } from "./phishing";

// Free LLM providers become unreliable with an unbounded burst, but a single
// queue makes a conversation wait behind older inbox jobs. Keep two in flight.
let activeAiRequests = 0;
const pendingAiRequests: (() => void)[] = [];

function enqueueAi<T>(work: () => Promise<T>, interactive = false): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      activeAiRequests += 1;
      work().then(resolve, reject).finally(() => {
        activeAiRequests -= 1;
        pendingAiRequests.shift()?.();
      });
    };
    if (activeAiRequests < 2) run();
    else if (interactive) pendingAiRequests.unshift(run);
    else pendingAiRequests.push(run);
  });
}

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
      if (!await getSession()) throw new Error("Sign in before using MailX AI tools.");
      const intentMap: Record<string, string> = {
        SUMMARIZE: "summarize",
        SUGGEST_REPLIES: "reply",
        CLASSIFY_PRIORITY: "priority",
        EXTRACT_TASKS: "tasks",
        GENERATE_DRAFT: "draft",
        CHAT: "chat",
      };
      // Replies, drafts, and task extraction must reflect the current message and
      // user intent; caching them can surface a response from another Gmail thread.
      const isCacheable = msg.type === "SUMMARIZE" || msg.type === "CLASSIFY_PRIORITY";
      const cacheKey = isCacheable && msg.email_context?.id
        ? `${intentMap[msg.type]}:${msg.email_context.id}:${msg.prompt || ""}` : "";
      const request = {
        intent: intentMap[msg.type] || "chat",
        email_context: msg.email_context,
        prompt: msg.prompt,
        conversation_id: msg.conversation_id,
        history: msg.history,
        preferences: await getPreferences(),
      };
      const response = cacheKey
        ? await getOrSetCache(cacheKey, () => enqueueAi(() => chat(request)), 30 * 60 * 1000)
        : await enqueueAi(() => chat(request), msg.type === "CHAT");
      if (msg.type === "EXTRACT_TASKS" && msg.email_context) {
        const parsed = parseTasks(response.response, msg.email_context);
        const tasks = await saveTasks(parsed);
        return { ...response, tasks, response: tasks.length ? response.response : "No tasks found in this email." };
      }
      return response;
    }

    case "GET_TASKS": {
      return { tasks: await getTasks() };
    }

    case "TOGGLE_TASK": {
      if (!msg.task_id) throw new Error("Missing task ID.");
      return { tasks: await toggleTask(msg.task_id) };
    }

    case "CHECK_SPAM": {
      if (!msg.email_context) throw new Error("Open an email before checking it.");
      return { spam: await enqueueAi(() => checkSpam(msg.email_context!, getPreferences())) };
    }

    case "CHECK_PHISHING_URL": {
      if (!msg.url) throw new Error("Missing URL.");
      return { verdict: await enqueueAi(() => checkUrl(msg.url!, getPreferences())) };
    }

    case "GET_REMINDERS": return { reminders: await getReminders() };
    case "DISMISS_REMINDER":
      if (!msg.reminder_id) throw new Error("Missing reminder ID.");
      await dismissReminder(msg.reminder_id);
      return { reminders: await getReminders() };
    case "GET_STATS": return getStats(msg.period || 7);
    case "GET_PREFERENCES": return getPreferences();
    case "SAVE_PREFERENCES": return savePreferences(msg.preferences || {});

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

function parseTasks(response: string | string[], context: NonNullable<ExtensionMessage["email_context"]>): Omit<Task, "id" | "status" | "created_at">[] {
  const text = Array.isArray(response) ? response.join("\n") : response;
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((task) => typeof task?.description === "string" && task.description.trim()).map((task) => ({
      email_id: context.id, email_subject: context.subject, email_sender: context.sender,
      description: task.description.trim(), assignee: task.assignee === "me" ? "me" : String(task.assignee || "me"),
      due_date: /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate || task.due_date || "") ? (task.dueDate || task.due_date) : null,
      priority: ["high", "medium", "low"].includes(task.priority) ? task.priority : "medium",
    }));
  } catch { return []; }
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
