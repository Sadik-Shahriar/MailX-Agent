import { getOrSetCache } from "../shared/cache";
import { countMessages } from "./gmail";
import { getSupabaseClient, getUserId } from "./supabase";

export interface MailStats {
  sent: number;
  received: number;
  completedTasks: number;
  pendingTasks: number;
  highPrioritySenders: number;
}

export async function getStats(period: 7 | 30 | 90): Promise<MailStats> {
  return getOrSetCache(`stats:${period}`, async () => {
    const userId = await getUserId();
    if (!userId) throw new Error("Sign in to view statistics.");
    const start = new Date();
    start.setDate(start.getDate() - period);
    const date = start.toISOString().slice(0, 10);
    const supabase = getSupabaseClient();
    const [tasks, senders, sent, received] = await Promise.all([
      supabase.from("tasks").select("status").eq("user_id", userId).gte("created_at", start.toISOString()),
      supabase.from("sender_scores").select("score").eq("user_id", userId).gte("score", 70),
      countMessages(`in:sent after:${date}`),
      countMessages(`in:inbox after:${date}`),
    ]);
    if (tasks.error || senders.error) throw new Error(tasks.error?.message || senders.error?.message);
    return {
      sent,
      received,
      completedTasks: tasks.data.filter((task) => task.status === "completed").length,
      pendingTasks: tasks.data.filter((task) => task.status === "pending").length,
      highPrioritySenders: senders.data.length,
    };
  }, 5 * 60 * 1000);
}
