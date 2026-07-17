import { getGmailAccessToken, getRecentSentThreads } from "./gmail";
import { getPreferences, getReminderCount, getReminderTasks, getUnnotifiedReminders, markRemindersNotified, resolveReminders, upsertReminders } from "./supabase";
import { abortReason, createDeadlineSignal } from "../shared/abort";

const REMINDER_CHECK_INTERVAL = 60;

export function setupReminderAlarm(): void {
  chrome.alarms.create("followUpCheck", { periodInMinutes: REMINDER_CHECK_INTERVAL });
}

export async function handleReminderCheck(signal?: AbortSignal): Promise<void> {
  const deadline = createDeadlineSignal(signal, 60_000);
  try {
    const preferences = await getPreferences();
    const tasks = await getReminderTasks();
    const dateKey = (value: Date) => new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    const today = dateKey(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = dateKey(tomorrowDate);
    const taskReminders: Record<string, unknown>[] = [];
    const resolveDueSoon: string[] = [];
    const resolveOverdue: string[] = [];

    for (const task of tasks) {
      if (!task.due_date) continue;
      if (task.due_date < today && preferences.reminder_notify_overdue) {
        taskReminders.push({ type: "task_overdue", source_id: task.id, subject: task.description });
        resolveDueSoon.push(task.id);
      } else if (task.due_date === today && preferences.reminder_notify_due) {
        taskReminders.push({ type: "task_due_soon", source_id: task.id, subject: task.description });
        resolveOverdue.push(task.id);
      } else if (task.due_date === tomorrow && preferences.reminder_notify_before) {
        taskReminders.push({ type: "task_due_soon", source_id: task.id, subject: task.description });
        resolveOverdue.push(task.id);
      }
    }
    await Promise.all([
      upsertReminders(taskReminders),
      resolveDueSoon.length ? resolveReminders(resolveDueSoon, ["task_due_soon"]) : Promise.resolve(),
      resolveOverdue.length ? resolveReminders(resolveOverdue, ["task_overdue"]) : Promise.resolve(),
    ]);

    try {
      const token = await getGmailAccessToken();
      const threads = await getRecentSentThreads(preferences.reminder_delay_days, deadline.signal, token);
      const sentReminders: Record<string, unknown>[] = [];
      const replied = threads.filter((thread) => thread.hasReply).map((thread) => thread.id);
      for (const thread of threads.filter((thread) => !thread.hasReply)) {
        const days = Math.floor((Date.now() - new Date(thread.sentDate).getTime()) / 86400000);
        if (days >= preferences.reminder_delay_days) {
          sentReminders.push({ type: "sent_no_reply", source_id: thread.id, subject: thread.subject, recipient_name: thread.recipient, sent_date: thread.sentDate });
        }
      }
      await Promise.all([
        upsertReminders(sentReminders),
        replied.length ? resolveReminders(replied, ["sent_no_reply"]) : Promise.resolve(),
      ]);
    } catch (error) {
      if (signal?.aborted) throw abortReason(signal);
      console.warn("[MailX] Could not check sent-email reminders:", error);
    }

    const count = await getReminderCount();
    await chrome.action.setBadgeText({ text: count > 0 ? `${Math.min(count, 99)}` : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });

    const unnotified = await getUnnotifiedReminders();
    if (unnotified.length) {
      await chrome.notifications.create({
        type: "basic", iconUrl: "public/icons/icon-48.png", title: "MailX - Follow-up Reminders",
        message: `${unnotified.length} item${unnotified.length > 1 ? "s" : ""} need attention`,
        contextMessage: unnotified.slice(0, 3).map((reminder) => reminder.subject).join("\n"),
      });
      await markRemindersNotified(unnotified.map((reminder) => reminder.id));
    }
  } finally {
    deadline.cleanup();
  }
}
