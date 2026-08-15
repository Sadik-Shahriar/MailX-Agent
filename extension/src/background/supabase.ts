import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";
import { Task, UserPreferences } from "../shared/types";
import { clearLegacyCache, invalidateUserCache } from "../shared/cache";

const SUPABASE_URL = "https://akespqwzlrsajibjheqg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrZXNwcXd6bHJzYWppYmpoZXFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTU3MzMsImV4cCI6MjA5OTI3MTczM30.teIgOfx9PeqLHLJ6PYulgr2o0Y5VEcQMMe0rvKFD7fk";
const DEV_STORAGE_KEY = "mailx_dev_user";
const SESSION_TTL_MS = 20_000;
const PREFERENCES_TTL_MS = 60_000;

let client: SupabaseClient | null = null;
let sessionMemory: { value: Session | null; expiresAt: number } | null = null;
let sessionInFlight: Promise<Session | null> | null = null;
let activeOwner: string | null = null;
const preferencesMemory = new Map<string, { value: UserPreferences; expiresAt: number }>();
const preferencesInFlight = new Map<string, Promise<UserPreferences>>();

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
    client.auth.onAuthStateChange((event, session) => {
      const previousOwner = activeOwner;
      const nextOwner = session?.user?.id || null;
      sessionMemory = session ? { value: session, expiresAt: Date.now() + SESSION_TTL_MS } : null;
      sessionInFlight = null;
      preferencesMemory.clear();
      preferencesInFlight.clear();
      activeOwner = nextOwner;
      if (previousOwner && (event === "SIGNED_OUT" || previousOwner !== nextOwner)) {
        void invalidateUserCache(previousOwner);
      }
    });
  }
  return client;
}

export async function getSession(): Promise<Session | null> {
  if (sessionMemory && sessionMemory.expiresAt > Date.now()) return sessionMemory.value;
  if (sessionInFlight) return sessionInFlight;

  sessionInFlight = (async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    let session = !error && data.session ? data.session : null;
    if (!session) {
      const dev = await chrome.storage.local.get(DEV_STORAGE_KEY);
      session = (dev[DEV_STORAGE_KEY] as Session | undefined) || null;
    }
    const previousOwner = activeOwner;
    const nextOwner = session?.user?.id || null;
    sessionMemory = { value: session, expiresAt: Date.now() + SESSION_TTL_MS };
    activeOwner = nextOwner;
    if (previousOwner && previousOwner !== nextOwner) {
      preferencesMemory.clear();
      preferencesInFlight.clear();
      await invalidateUserCache(previousOwner);
    }
    return session;
  })();
  try {
    return await sessionInFlight;
  } finally {
    sessionInFlight = null;
  }
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
  ai_model: "llama-3.1-8b-instant",
  thinking_mode: false,
  summary_length: "medium",
  custom_priority_rules: "",
  custom_reply_instructions: "",
  custom_summary_instructions: "",
  custom_draft_instructions: "",
  custom_task_instructions: "",
  user_name: "",
};

const PREFERENCES_SELECT_COLUMNS = "reply_tone, reminder_delay_days, reminder_notify_before, reminder_notify_due, reminder_notify_overdue, spam_whitelist, spam_blacklist, phishing_sensitivity, phishing_allowlist, ai_model, thinking_mode, summary_length, custom_priority_rules, custom_reply_instructions, custom_summary_instructions, custom_draft_instructions, custom_task_instructions, user_name";

export async function getPreferences(): Promise<UserPreferences> {
  const session = await getSession();
  const metaName = (
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.user_metadata?.given_name ||
    (session?.user?.email ? session.user.email.split("@")[0].replace(/[._+-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "")
  );

  const userId = session?.user?.id;
  if (!userId) return { ...defaultPreferences, user_name: metaName };
  const cached = preferencesMemory.get(userId);
  if (cached && cached.expiresAt > Date.now()) return { ...cached.value, user_name: cached.value.user_name || metaName };
  const existing = preferencesInFlight.get(userId);
  if (existing) return existing;
  const request = (async () => {
    const { data, error } = await getSupabaseClient()
      .from("preferences").select(PREFERENCES_SELECT_COLUMNS).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const value = { ...defaultPreferences, ...data };
    if (!value.user_name && metaName) {
      value.user_name = metaName;
    }
    preferencesMemory.set(userId, { value, expiresAt: Date.now() + PREFERENCES_TTL_MS });
    return value;
  })();
  preferencesInFlight.set(userId, request);
  try {
    return await request;
  } finally {
    preferencesInFlight.delete(userId);
  }
}

export async function savePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
  const userId = await getUserId();
  if (!userId) throw new Error("Sign in with Google to save preferences.");
  const current = await getPreferences();
  const values = { user_id: userId, ...current, ...preferences, updated_at: new Date().toISOString() };
  const { data, error } = await getSupabaseClient().from("preferences")
    .upsert(values).select(PREFERENCES_SELECT_COLUMNS).single();
  if (error) throw error;
  const value = { ...defaultPreferences, ...data };
  preferencesMemory.set(userId, { value, expiresAt: Date.now() + PREFERENCES_TTL_MS });
  await invalidateUserCache(userId);
  return value;
}

export async function getTasks(period?: 7 | 30 | 90): Promise<Task[]> {
  const userId = await getUserId();
  const start = period ? new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString() : undefined;
  if (!userId) {
    const tasks = ((await chrome.storage.local.get("tasks")).tasks || []) as Task[];
    return period ? tasks.filter((task) => new Date(task.created_at).toISOString() >= start!) : tasks;
  }
  let query = getSupabaseClient().from("tasks").select("*").eq("user_id", userId);
  if (start) query = query.gte("created_at", start);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data as Task[];
}

function sanitizeDueDate(dueDate?: string | null): string | null {
  if (!dueDate) return null;
  const trimmed = dueDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    try {
      return new Date(parsed).toISOString().split("T")[0];
    } catch {
      return null;
    }
  }
  return null;
}

export async function saveTasks(tasks: Omit<Task, "id" | "status" | "created_at">[]): Promise<Task[]> {
  const userId = await getUserId();
  if (!userId) {
    if (!tasks.length) return [];
    const stored = await chrome.storage.local.get("tasks");
    const existing = (stored.tasks || []) as Task[];
    const normalized = (description: string) => description.trim().replace(/\s+/g, " ").toLowerCase();
    const existingByKey = new Map(existing.map((task) => [
      `${task.email_id}:${normalized(task.description)}`, task,
    ]));
    const now = new Date().toISOString();
    const newTasks: Task[] = tasks.filter((task) => !existingByKey.has(`${task.email_id}:${normalized(task.description)}`))
      .map((task) => ({
        ...task,
        assignee: task.assignee?.trim() || "me",
        due_date: sanitizeDueDate(task.due_date),
        id: crypto.randomUUID(),
        status: "pending" as const,
        created_at: now,
      }));
    const all = [...newTasks, ...existing];
    await chrome.storage.local.set({ tasks: all });
    return [...newTasks, ...tasks.map((task) => existingByKey.get(`${task.email_id}:${normalized(task.description)}`)).filter((task): task is Task => Boolean(task))];
  }
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
    newTasks.map((task) => ({
      ...task,
      user_id: userId,
      status: "pending",
      assignee: task.assignee?.trim() || "me",
      due_date: sanitizeDueDate(task.due_date),
    }))
  ).select();
  if (error) throw error;
  await invalidateUserCache(userId);
  return [...(data as Task[]), ...tasks.map((task) => existingByKey.get(`${task.email_id}:${normalized(task.description)}`)).filter((task): task is Task => Boolean(task))];
}

export async function toggleTask(id: string, period?: 7 | 30 | 90): Promise<Task[]> {
  const userId = await getUserId();
  if (!userId) {
    const stored = await chrome.storage.local.get("tasks");
    const tasks = (stored.tasks || []).map((task: Task) => task.id === id
      ? { ...task, status: task.status === "completed" ? "pending" : "completed" } : task);
    await chrome.storage.local.set({ tasks });
    return period ? tasks.filter((task: Task) => new Date(task.created_at).toISOString() >= new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString()) : tasks;
  }
  const { data: task, error: fetchError } = await getSupabaseClient().from("tasks").select("status")
    .eq("id", id).eq("user_id", userId).single();
  if (fetchError) throw fetchError;
  const status = task.status === "completed" ? "pending" : "completed";
  const { error } = await getSupabaseClient().from("tasks").update({
    status, completed_at: status === "completed" ? new Date().toISOString() : null,
  }).eq("id", id).eq("user_id", userId);
  if (error) throw error;
  if (status === "completed") {
    const { error: historyError } = await getSupabaseClient().rpc("record_task_completion", { p_task_id: id });
    if (historyError) throw historyError;
    await resolveReminders(id, ["task_due_soon", "task_overdue"]);
  }
  await invalidateUserCache(userId);
  return getTasks(period);
}

export async function deleteTask(id: string, period?: 7 | 30 | 90): Promise<Task[]> {
  const userId = await getUserId();
  if (!userId) {
    const tasks = ((await chrome.storage.local.get("tasks")).tasks || []) as Task[];
    const target = tasks.find((task) => task.id === id);
    if (!target || target.status !== "completed") throw new Error("Only completed tasks can be deleted.");
    const remaining = tasks.filter((task) => task.id !== id);
    await chrome.storage.local.set({ tasks: remaining });
    return period ? remaining.filter((task) => new Date(task.created_at).toISOString() >= new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString()) : remaining;
  }
  const { error } = await getSupabaseClient().from("tasks").delete()
    .eq("id", id).eq("user_id", userId).eq("status", "completed");
  if (error) throw error;
  await invalidateUserCache(userId);
  return getTasks(period);
}

export async function deleteCompletedTasks(period?: 7 | 30 | 90): Promise<Task[]> {
  const userId = await getUserId();
  if (!userId) {
    const tasks = ((await chrome.storage.local.get("tasks")).tasks || []) as Task[];
    const remaining = tasks.filter((task) => task.status !== "completed");
    await chrome.storage.local.set({ tasks: remaining });
    return period ? remaining.filter((task) => new Date(task.created_at).toISOString() >= new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString()) : remaining;
  }
  const { error } = await getSupabaseClient().from("tasks").delete()
    .eq("user_id", userId).eq("status", "completed");
  if (error) throw error;
  await invalidateUserCache(userId);
  return getTasks(period);
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

export async function getReminderTasks(): Promise<Pick<Task, "id" | "description" | "due_date" | "status">[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await getSupabaseClient().from("tasks").select("id, description, due_date, status")
    .eq("user_id", userId).eq("status", "pending").not("due_date", "is", null);
  if (error) throw error;
  return data;
}

export async function getReminderCount(): Promise<number> {
  const userId = await getUserId();
  if (!userId) return 0;
  const { count, error } = await getSupabaseClient().from("reminders").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("dismissed", false).eq("resolved", false);
  if (error) throw error;
  return count || 0;
}

export async function getUnnotifiedReminders() {
  const userId = await getUserId();
  if (!userId) return [];
  const { data, error } = await getSupabaseClient().from("reminders").select("id, subject, type")
    .eq("user_id", userId).eq("dismissed", false).eq("resolved", false).is("notified_at", null);
  if (error) throw error;
  return data;
}

export async function markRemindersNotified(ids: string[]): Promise<void> {
  const userId = await getUserId();
  if (!userId || !ids.length) return;
  const { error } = await getSupabaseClient().from("reminders").update({ notified_at: new Date().toISOString() })
    .eq("user_id", userId).in("id", ids);
  if (error) throw error;
}

export async function dismissReminder(id: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Sign in to manage reminders.");
  const { error } = await getSupabaseClient().from("reminders").update({ dismissed: true })
    .eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

export async function resolveReminders(sourceIds: string | string[], types?: string[]): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  let query = getSupabaseClient().from("reminders").update({ resolved: true })
    .eq("user_id", userId).eq("resolved", false);
  query = Array.isArray(sourceIds) ? query.in("source_id", sourceIds) : query.eq("source_id", sourceIds);
  if (types?.length) query = query.in("type", types);
  const { error } = await query;
  if (error) throw error;
}

export async function upsertReminders(reminders: Record<string, unknown>[]): Promise<void> {
  const userId = await getUserId();
  if (!userId || !reminders.length) return;
  const { error } = await getSupabaseClient().from("reminders").upsert(
    reminders.map((reminder) => ({ ...reminder, user_id: userId })),
    { onConflict: "user_id,type,source_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      skipBrowserRedirect: true,
      redirectTo: chrome.identity.getRedirectURL(),
      scopes: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
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
  const previousOwner = activeOwner;
  sessionMemory = { value: devUser as Session, expiresAt: Date.now() + SESSION_TTL_MS };
  sessionInFlight = null;
  activeOwner = devUser.user.id;
  preferencesMemory.clear();
  preferencesInFlight.clear();
  if (previousOwner && previousOwner !== activeOwner) await invalidateUserCache(previousOwner);
}

export async function signOut(): Promise<void> {
  const owner = (await getSession())?.user?.id || activeOwner;
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  await chrome.storage.local.remove("supabase.auth.token");
  await chrome.storage.local.remove(DEV_STORAGE_KEY);
  sessionMemory = { value: null, expiresAt: Date.now() + SESSION_TTL_MS };
  sessionInFlight = null;
  activeOwner = null;
  preferencesMemory.clear();
  preferencesInFlight.clear();
  if (owner) await invalidateUserCache(owner);
  await clearLegacyCache();
}
