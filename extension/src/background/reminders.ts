import { getOrSetCache } from "../shared/cache";

const REMINDER_CHECK_INTERVAL = 60; // minutes
const DEFAULT_REMINDER_DAYS = 3;

export function setupReminderAlarm(): void {
  chrome.alarms.create("followUpCheck", {
    periodInMinutes: REMINDER_CHECK_INTERVAL,
  });
}

export async function handleReminderCheck(): Promise<void> {
  const reminders: string[] = [];

  // Check tasks due soon/overdue
  const tasks = await getTasksFromStorage();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const task of tasks) {
    if (task.status !== "pending") continue;
    if (!task.due_date) continue;

    const dueDate = new Date(task.due_date);
    if (dueDate <= today) {
      reminders.push(`Task overdue: "${task.description}" was due ${task.due_date}`);
    } else if (dueDate <= tomorrow) {
      reminders.push(`Task due soon: "${task.description}" is due tomorrow`);
    }
  }

  // Check sent emails with no reply
  const sentThreads = await getSentThreadsNoReply();
  for (const thread of sentThreads) {
    const days = Math.floor(
      (Date.now() - new Date(thread.sentDate).getTime()) / 86400000
    );
    if (days >= DEFAULT_REMINDER_DAYS) {
      reminders.push(
        `No reply from ${thread.recipient} about "${thread.subject}" (${days} days)`
      );
    }
  }

  // Update badge
  const count = reminders.length;
  await chrome.action.setBadgeText({
    text: count > 0 ? `${Math.min(count, 99)}` : "",
  });
  await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });

  // Show notification for new reminders
  if (reminders.length > 0) {
    const cacheKey = "last_reminder_hash";
    const hash = await simpleHash(reminders.join("|"));
    const lastHash = await getOrSetCache(cacheKey, async () => "", 60 * 60 * 1000);
    if (hash !== lastHash) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "public/icons/icon-48.png",
        title: "MailX - Follow-up Reminders",
        message: `${reminders.length} item${reminders.length > 1 ? "s" : ""} need attention`,
        contextMessage: reminders.slice(0, 3).join("\n"),
      });
      await chrome.storage.session.set({ [cacheKey]: hash });
    }
  }
}

async function getTasksFromStorage(): Promise<any[]> {
  const result = await chrome.storage.local.get("tasks");
  return result.tasks || [];
}

async function getSentThreadsNoReply(): Promise<any[]> {
  // Placeholder: will integrate with Gmail API
  return [];
}

async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
