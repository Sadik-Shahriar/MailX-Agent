import { getCache, setCache } from "../shared/cache";
import { getRecentSentThreads } from "./gmail";
import { getPreferences, getReminders, getTasks, resolveReminders, upsertReminder } from "./supabase";

const REMINDER_CHECK_INTERVAL = 60; // minutes
const DEFAULT_REMINDER_DAYS = 3;

export function setupReminderAlarm(): void {
  chrome.alarms.create("followUpCheck", {
    periodInMinutes: REMINDER_CHECK_INTERVAL,
  });
}

export async function handleReminderCheck(): Promise<void> {
  const reminders: string[] = [];
  const preferences = await getPreferences();

  // Check tasks due soon/overdue
  const tasks = await getTasks();
  const dateKey = (value: Date) => {
    const offset = value.getTimezoneOffset() * 60_000;
    return new Date(value.getTime() - offset).toISOString().slice(0, 10);
  };
  const today = dateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = dateKey(tomorrowDate);

  for (const task of tasks) {
    if (task.status !== "pending") {
      await resolveReminders(task.id, ["task_due_soon", "task_overdue"]);
      continue;
    }
    if (!task.due_date) continue;

    if (task.due_date < today && preferences.reminder_notify_overdue) {
      reminders.push(`Task overdue: "${task.description}" was due ${task.due_date}`);
      await upsertReminder({ type: "task_overdue", source_id: task.id, subject: task.description });
    } else if (task.due_date === today && preferences.reminder_notify_due) {
      reminders.push(`Task due today: "${task.description}" is due today`);
      await upsertReminder({ type: "task_due_soon", source_id: task.id, subject: task.description });
    } else if (task.due_date === tomorrow && preferences.reminder_notify_before) {
      reminders.push(`Task due soon: "${task.description}" is due tomorrow`);
      await upsertReminder({ type: "task_due_soon", source_id: task.id, subject: task.description });
    }
  }

  // Gmail failures must not suppress task reminders or leave the badge stale.
  try {
    const sentThreads = await getRecentSentThreads(preferences.reminder_delay_days);
    for (const thread of sentThreads) {
      if (thread.hasReply) {
        await resolveReminders(thread.id, ["sent_no_reply"]);
        continue;
      }
      const days = Math.floor(
        (Date.now() - new Date(thread.sentDate).getTime()) / 86400000
      );
      if (days >= preferences.reminder_delay_days) {
        reminders.push(
          `No reply from ${thread.recipient} about "${thread.subject}" (${days} days)`
        );
        await upsertReminder({
          type: "sent_no_reply", source_id: thread.id, subject: thread.subject,
          recipient_name: thread.recipient, sent_date: thread.sentDate,
        });
      }
    }
  } catch (error) {
    console.warn("[MailX] Could not check sent-email reminders:", error);
  }

  // Update badge
  const count = (await getReminders()).length;
  await chrome.action.setBadgeText({
    text: count > 0 ? `${Math.min(count, 99)}` : "",
  });
  await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });

  // Show notification for new reminders
  if (reminders.length > 0) {
    const cacheKey = "last_reminder_hash";
    const hash = await simpleHash(reminders.join("|"));
    const lastHash = await getCache<string>(cacheKey);
    if (hash !== lastHash) {
      await chrome.notifications.create({
        type: "basic",
        iconUrl: "public/icons/icon-48.png",
        title: "MailX - Follow-up Reminders",
        message: `${reminders.length} item${reminders.length > 1 ? "s" : ""} need attention`,
        contextMessage: reminders.slice(0, 3).join("\n"),
      });
      await setCache(cacheKey, hash, 60 * 60 * 1000);
    }
  }
}

async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
