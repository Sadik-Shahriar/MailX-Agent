import { createClient, SupabaseClient } from "@supabase/supabase-js";

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

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      skipBrowserRedirect: true,
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
