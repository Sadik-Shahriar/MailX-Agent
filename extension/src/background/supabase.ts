import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Task, UserPreferences } from "../shared/types";

const SUPABASE_URL = "https://akespqwzlrsajibjheqg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZXNwcXd6bHJzYWppYmpoZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTU3MzMsImV4cCI6MjA5OTI3MTczM30.teIgOfx9PeqLHLJ6PYulgr2o0Y5VEcQMMe0rvKFD7fk";
const DEV_STORAGE_KEY = "mailx_dev_user";

let client: SupabaseClient | null = null;

const chromeStorageAdapter = {
  getItem: async (key: string) => {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  },
  setItem: async (key: string, value: string) => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string) => {
    await chrome.storage.local.remove(key);
  },
};

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: chromeStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        flowType: "pkce",
      },
    });
  }
  return client;
}

export async function getSession() {
  // Check real Supabase session first
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (!error && data.session) return data.session;

  // Fallback: check dev mode
  const dev = await chrome.storage.local.get(DEV_STORAGE_KEY);
  if (dev[DEV_STORAGE_KEY]) {
    return dev[DEV_STORAGE_KEY] as any;
  }
  return null;
}

export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id === "dev-user-001" ? null : session?.user?.id || null;
}

const defaultPreferences: UserPreferences = {
  reply_tone: "professional",
  reminder_delay_days: 3,
  reminder_notify_before: true,
  reminder_notify_due: true,
  reminder_notify_overdue: false,
  spam_whitelist: [],
  spam_blacklist: [],
  phishing_sensitivity: "default",
  phishing_allowlist: [],
};

export async function getPreferences(): Promise<UserPreferences> {
  const userId = await getUserId();
  if (!userId) return defaultPreferences;
  const { data, error } = await getSupabaseClient()
    .from("preferences").select("reply_tone, reminder_delay_days, reminder_notify_before, reminder_notify_due, reminder_notify_overdue, spam_whitelist, spam_blacklist, phishing_sensitivity, phishing_allowlist").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return { ...defaultPreferences, ...data };
}

export async function savePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
  const userId = await getUserId();
  if (!userId) throw new Error("Sign in with Google to save preferences.");
  const values = { user_id: userId, ...defaultPreferences, ...preferences, updated_at: new Date().toISOString() };
  const { data, error } = await getSupabaseClient().from("preferences")
    .upsert(values).select("reply_tone, reminder_delay_days, reminder_notify_before, reminder_notify_due, reminder_notify_overdue, spam_whitelist, spam_blacklist, phishing_sensitivity, phishing_allowlist").single();
  if (error) throw error;
  return data;
}

export async function getTasks(): Promise<Task[]> {
  const userId = await getUserId();
  if (!userId) return (await chrome.storage.local.get("tasks")).tasks || [];
  const { data, error } = await getSupabaseClient().from("tasks").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data as Task[];
}

export async function saveTasks(tasks: Omit<Task, "id" | "status" | "created_at">[]): Promise<Task[]> {
  const userId = await getUserId();
  if (!userId) throw new Error("Sign in with Google to save extracted tasks.");
  if (!tasks.length) return [];
  const supabase = getSupabaseClient();
  const emailIds = [...new Set(tasks.map((task) => task.email_id))];
  const { data: existing, error: existingError } = await supabase.from("tasks").select("*")
    .eq("user_id", userId).in("email_id", emailIds);
  if (existingError) throw existingError;

  const normalized = (description: string) => description.trim().replace(/\s+/g, " ").toLowerCase();
  const existingByKey = new Map((existing as Task[]).map((task) => [
    `${task.email_id}:${normalized(task.description)}`, task,
  ]));
  const newTasks = tasks.filter((task) => !existingByKey.has(`${task.email_id}:${normalized(task.description)}`));
  if (!newTasks.length) {
    return tasks.map((task) => existingByKey.get(`${task.email_id}:${normalized(task.description)}`)).filter((task): task is Task => Boolean(task));
  }

  const { data, error } = await supabase.from("tasks").insert(
    newTasks.map((task) => ({ ...task, user_id: userId, status: "pending" }))
  ).select();
  if (error) throw error;
  return [...(data as Task[]), ...tasks.map((task) => existingByKey.get(`${task.email_id}:${normalized(task.description)}`)).filter((task): task is Task => Boolean(task))];
}

export async function toggleTask(id: string): Promise<Task[]> {
  const userId = await getUserId();
  if (!userId) {
    const stored = await chrome.storage.local.get("tasks");
    const tasks = (stored.tasks || []).map((task: Task) => task.id === id
      ? { ...task, status: task.status === "completed" ? "pending" : "completed" } : task);
    await chrome.storage.local.set({ tasks });
    return tasks;
  }
  const { data: task, error: fetchError } = await getSupabaseClient().from("tasks").select("status")
    .eq("id", id).eq("user_id", userId).single();
  if (fetchError) throw fetchError;
  const status = task.status === "completed" ? "pending" : "completed";
  const { error } = await getSupabaseClient().from("tasks").update({
    status, completed_at: status === "completed" ? new Date().toISOString() : null,
  }).eq("id", id).eq("user_id", userId);
  if (error) throw error;
  if (status === "completed") await resolveReminders(id, ["task_due_soon", "task_overdue"]);
  return getTasks();
}

export async function getReminders() {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await getSupabaseClient().from("reminders").select("*")
    .eq("user_id", userId).eq("dismissed", false).eq("resolved", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function dismissReminder(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Sign in to manage reminders.");
  const { error } = await getSupabaseClient().from("reminders").update({ dismissed: true })
    .eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function resolveReminders(sourceId: string, types?: string[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  let query = getSupabaseClient().from("reminders").update({ resolved: true })
    .eq("user_id", userId).eq("source_id", sourceId).eq("resolved", false);
  if (types?.length) query = query.in("type", types);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertReminder(reminder: Record<string, unknown>): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("reminders").select("id")
    .eq("user_id", userId).eq("type", reminder.type).eq("source_id", reminder.source_id).maybeSingle();
  if (error) throw error;
  if (!data) {
    const { error: insertError } = await supabase.from("reminders").insert({ ...reminder, user_id: userId });
    if (insertError) throw insertError;
  }
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      skipBrowserRedirect: true,
      redirectTo: chrome.identity.getRedirectURL(),
      scopes: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
    },
  });

  if (error || !data.url) throw error || new Error("No OAuth URL");

  const result = await chrome.identity.launchWebAuthFlow({
    url: data.url,
    interactive: true,
  });

  if (chrome.runtime.lastError) {
    throw new Error(chrome.runtime.lastError.message);
  }

  if (!result) {
    throw new Error("No redirect URL returned");
  }

  const url = new URL(result);
  const code = url.searchParams.get("code");
  if (!code) throw new Error("No auth code returned");

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

export async function devSignIn(email?: string): Promise<void> {
  const devUser = {
    user: {
      id: "dev-user-001",
      email: email || "dev@mailx.local",
      app_metadata: {},
      user_metadata: { full_name: "Dev User" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    },
    access_token: "dev-token",
    refresh_token: "dev-refresh-token",
    expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    token_type: "bearer",
  };
  await chrome.storage.local.set({ [DEV_STORAGE_KEY]: devUser });
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  await chrome.storage.local.remove("supabase.auth.token");
  await chrome.storage.local.remove(DEV_STORAGE_KEY);
}
