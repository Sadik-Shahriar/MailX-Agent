import { backendDeadlineMs, chat, checkModelStatus } from "./api";
import { setupReminderAlarm, handleReminderCheck } from "./reminders";
import { ExtensionMessage, RequestTelemetry, StructuredAiResult, Task } from "../shared/types";
import { CacheTelemetryEvent, getOrSetCache } from "../shared/cache";
import { signInWithGoogle, signOut, getSession, getPreferences, getTasks, saveTasks, toggleTask, deleteTask, deleteCompletedTasks, getReminders, dismissReminder, savePreferences } from "./supabase";
import { getStats } from "./stats";
import { checkSpam } from "./spam";
import { checkUrl } from "./phishing";
import { enqueueAi, queueLaneForMessage, QueueLane } from "./queue";
import { ensureRequestTelemetry, logTelemetry } from "../shared/telemetry";
import { canSendRemoteAi } from "../shared/aiPolicy";
import { abortReason, createDeadlineSignal } from "../shared/abort";
import { RequestRegistry } from "./requestRegistry";
import { responseCacheKey } from "../shared/cacheKeys";

const requestRegistry = new RequestRegistry();

function requireExplicitAi(telemetry: RequestTelemetry, intent: string): void {
  if (canSendRemoteAi(telemetry.source)) return;
  logTelemetry("automatic_remote_blocked", telemetry, { intent });
  throw new Error("Automatic AI analysis is disabled.");
}

function logCacheEvent(telemetry: RequestTelemetry, intent: string, event: CacheTelemetryEvent): void {
  if (event.outcome === "hit" || event.outcome === "miss" || event.outcome === "coalesced" || event.outcome === "read_error") {
    logTelemetry("cache_lookup", telemetry, { intent, cache_outcome: event.outcome });
    return;
  }
  if ("persistence_ms" in event) logTelemetry("cache_persistence", telemetry, {
    intent,
    status: event.outcome === "persisted" ? "success" : "error",
    cache_persistence_ms: event.persistence_ms,
  });
}

function enqueueTraced<T>(
  work: (signal: AbortSignal) => Promise<T>,
  telemetry: RequestTelemetry,
  intent: string,
  lane: QueueLane,
  signal: AbortSignal,
): Promise<T> {
  return enqueueAi(work, {
    lane,
    signal,
    expiresInMs: lane === "foreground" ? 15_000 : 8_000,
    runTimeoutMs: backendDeadlineMs(intent),
    onStart: (metrics) => logTelemetry("queue_started", telemetry, { intent, ...metrics }),
  });
}

async function withRegisteredRequest<T>(
  telemetry: RequestTelemetry,
  timeoutMs: number,
  work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = requestRegistry.register(telemetry.request_id);
  const deadline = createDeadlineSignal(controller.signal, timeoutMs);
  try {
    if (deadline.signal.aborted) throw abortReason(deadline.signal);
    return await work(deadline.signal);
  } finally {
    deadline.cleanup();
    requestRegistry.release(telemetry.request_id, controller);
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse).catch((err) => {
      if (err?.name !== "AbortError") console.error("[MailX] Error handling message:", err);
      sendResponse({ error: err.message });
    });
    return true;
  }
);

async function handleMessage(msg: ExtensionMessage): Promise<any> {
  if (import.meta.env.DEV && msg.type === "DEV_SIGN_IN") {
    const { devSignIn } = await import("./supabase");
    await devSignIn(msg.email);
    const session = await getSession();
    return {
      loggedIn: !!session,
      email: session?.user?.email || "dev@mailx.local",
    };
  }
  switch (msg.type) {
    case "SUMMARIZE":
    case "SUGGEST_REPLIES":
    case "CLASSIFY_PRIORITY":
    case "EXTRACT_TASKS":
    case "GENERATE_DRAFT":
    case "CHAT": {
      const telemetry = ensureRequestTelemetry(msg.telemetry);
      const intentMap: Record<string, string> = {
        SUMMARIZE: "summarize",
        SUGGEST_REPLIES: "reply",
        CLASSIFY_PRIORITY: "priority",
        EXTRACT_TASKS: "tasks",
        GENERATE_DRAFT: "draft",
        CHAT: "chat",
      };
      logTelemetry("request_received", telemetry, { intent: intentMap[msg.type] });
      requireExplicitAi(telemetry, intentMap[msg.type]);
      return withRegisteredRequest(telemetry, backendDeadlineMs(intentMap[msg.type]), async (signal) => {
        const session = await getSession();
        if (!session) throw new Error("Sign in before using MailX AI tools.");
        if (signal.aborted) throw abortReason(signal);
        const isCacheable = msg.type === "SUMMARIZE" || msg.type === "CLASSIFY_PRIORITY";
        const content = msg.type === "SUMMARIZE"
          ? { body: msg.email_context?.body || "" }
          : {
            sender: msg.email_context?.sender || "",
            subject: msg.email_context?.subject || "",
            snippet: msg.email_context?.snippet || "",
          };
        const userPreferences = await getPreferences();
        const cacheKey = isCacheable && msg.email_context
          ? await responseCacheKey(session.user.id, intentMap[msg.type] as "summarize" | "priority", content, userPreferences)
          : "";
        const request = {
          intent: intentMap[msg.type] || "chat",
          email_context: msg.email_context,
          prompt: msg.prompt,
          history: msg.history,
          preferences: userPreferences,
          telemetry,
        };
        const lane = queueLaneForMessage(msg.type);
        const response = cacheKey
          ? await getOrSetCache(
            cacheKey,
            () => enqueueTraced((queueSignal) => chat(request, queueSignal, session.access_token), telemetry, request.intent, lane, signal),
            30 * 60 * 1000,
            (event) => logCacheEvent(telemetry, request.intent, event),
            { owner: session.user.id },
          )
          : await enqueueTraced((queueSignal) => chat(request, queueSignal, session.access_token), telemetry, request.intent, lane, signal);
        if (signal.aborted) throw abortReason(signal);
        if (msg.type === "EXTRACT_TASKS" && msg.email_context) {
          const parsed = response.result?.kind === "tasks" ? parseTasks(response.result, msg.email_context) : [];
          const persistenceStarted = performance.now();
          try {
            const tasks = await saveTasks(parsed);
            logTelemetry("persistence_finished", telemetry, {
              intent: request.intent,
              status: "success",
              persistence_ms: Math.round((performance.now() - persistenceStarted) * 100) / 100,
            });
            return { ...response, tasks, response: tasks.length ? response.response : "No tasks found in this email." };
          } catch (error) {
            logTelemetry("persistence_finished", telemetry, {
              intent: request.intent,
              status: "error",
              persistence_ms: Math.round((performance.now() - persistenceStarted) * 100) / 100,
            });
            throw error;
          }
        }
        return response;
      });
    }

    case "GET_TASKS": {
      return { tasks: await getTasks(msg.period) };
    }

    case "TOGGLE_TASK": {
      if (!msg.task_id) throw new Error("Missing task ID.");
      return { tasks: await toggleTask(msg.task_id, msg.period) };
    }

    case "DELETE_TASK": {
      if (!msg.task_id) throw new Error("Missing task ID.");
      return { tasks: await deleteTask(msg.task_id, msg.period) };
    }

    case "DELETE_COMPLETED_TASKS":
      return { tasks: await deleteCompletedTasks(msg.period) };

    case "CHECK_SPAM": {
      if (!msg.email_context) throw new Error("Open an email before checking it.");
      const telemetry = ensureRequestTelemetry(msg.telemetry);
      logTelemetry("request_received", telemetry, { intent: "spam" });
      requireExplicitAi(telemetry, "spam");
      return withRegisteredRequest(telemetry, backendDeadlineMs("spam"), async (signal) => {
        const session = await getSession();
        if (!session) throw new Error("Sign in before using MailX AI tools.");
        return { spam: await enqueueTraced(
          (queueSignal) => checkSpam(msg.email_context!, getPreferences, session.user.id, telemetry, queueSignal, session.access_token),
          telemetry, "spam", "background", signal,
        ) };
      });
    }

    case "CHECK_PHISHING_URL": {
      if (!msg.url) throw new Error("Missing URL.");
      const telemetry = ensureRequestTelemetry(msg.telemetry);
      logTelemetry("request_received", telemetry, { intent: "phishing" });
      requireExplicitAi(telemetry, "phishing");
      return withRegisteredRequest(telemetry, backendDeadlineMs("phishing"), async (signal) => {
        const session = await getSession();
        if (!session) throw new Error("Sign in before using MailX AI tools.");
        return { verdict: await enqueueTraced(
          (queueSignal) => checkUrl(msg.url!, getPreferences, session.user.id, telemetry, queueSignal, session.access_token),
          telemetry, "phishing", "background", signal,
        ) };
      });
    }

    case "CANCEL_REQUEST":
      return { cancelled: !!msg.request_id && requestRegistry.cancel(msg.request_id) };

    case "FIND_PANEL": {
      const tabs = await chrome.tabs.query({ url: "*://mail.google.com/*" });
      if (!tabs.length || !tabs[0].id) throw new Error("Open Gmail to find the MailX panel.");
      if (tabs[0].windowId !== undefined) await chrome.windows.update(tabs[0].windowId, { focused: true });
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.tabs.sendMessage(tabs[0].id, { type: "FIND_PANEL" });
      return { found: true };
    }

    case "GET_REMINDERS": return { reminders: await getReminders() };
    case "DISMISS_REMINDER":
      if (!msg.reminder_id) throw new Error("Missing reminder ID.");
      await dismissReminder(msg.reminder_id);
      return { reminders: await getReminders() };
    case "GET_STATS": return getStats(msg.period || 7, undefined, msg.refresh === true);
    case "GET_PREFERENCES": return getPreferences();
    case "SAVE_PREFERENCES": return savePreferences(msg.preferences || {});
    case "CHECK_MODEL_STATUS": {
      const session = await getSession();
      if (!session) throw new Error("Sign in before checking model status.");
      return await checkModelStatus(msg.model || "", session.access_token);
    }

    case "SIGN_IN": {
      await signInWithGoogle();
      const session = await getSession();
      return {
        loggedIn: !!session,
        email: session?.user?.email || "",
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

function parseTasks(result: Extract<StructuredAiResult, { kind: "tasks" }>, context: NonNullable<ExtensionMessage["email_context"]>): Omit<Task, "id" | "status" | "created_at">[] {
  return result.tasks.map((task) => ({
    email_id: context.id, email_subject: context.subject, email_sender: context.sender,
    description: task.description, assignee: task.assignee,
    due_date: task.due_date, priority: task.priority,
  }));
}

// Set up alarms on install
chrome.runtime.onInstalled.addListener(() => {
  setupReminderAlarm();
});

// Handle reminder alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "followUpCheck") {
    void handleReminderCheck().catch((error) => console.error("[MailX] Reminder check failed:", error));
  }
});
