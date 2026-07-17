import { getOrSetCache } from "../shared/cache";
import { countMessages, getGmailAccessToken } from "./gmail";
import { getSupabaseClient, getUserId } from "./supabase";
import { createDeadlineSignal } from "../shared/abort";
import { sha256 } from "../shared/cacheKeys";

export interface MailStats {
  sent: number;
  received: number;
  completedTasks: number;
  pendingTasks: number;
}

export async function getStats(period: 7 | 30 | 90, signal?: AbortSignal, forceRefresh = false): Promise<MailStats> {
  const deadline = createDeadlineSignal(signal, 45_000);
  try {
    const userId = await getUserId();
    if (!userId) throw new Error("Sign in to view statistics.");
    const cacheKey = `stats:${await sha256(userId)}:${period}`;
    const load = async () => {
    const start = new Date();
    start.setDate(start.getDate() - period);
    const date = start.toISOString().slice(0, 10);
    const supabase = getSupabaseClient();
    const gmailToken = await getGmailAccessToken();
    const [taskStats, sent, received] = await Promise.all([
      supabase.rpc("get_task_stats", { since: start.toISOString() }),
      countMessages(`in:sent after:${date}`, deadline.signal, gmailToken, true),
      countMessages(`in:inbox after:${date}`, deadline.signal, gmailToken, true),
    ]);
    if (taskStats.error) throw new Error(taskStats.error.message);
    const taskCounts = taskStats.data?.[0];
    return {
      sent,
      received,
      completedTasks: Number(taskCounts?.completed_tasks) || 0,
      pendingTasks: Number(taskCounts?.pending_tasks) || 0,
    };
    };
    return forceRefresh ? await load() : await getOrSetCache(cacheKey, load, 5 * 60 * 1000, undefined, { owner: userId });
  } finally {
    deadline.cleanup();
  }
}
