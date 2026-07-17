import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = {
    session: null as any,
    authChange: undefined as ((event: string, session: any) => void) | undefined,
    preferences: {
      reply_tone: "professional",
      reminder_delay_days: 3,
      reminder_notify_before: true,
      reminder_notify_due: true,
      reminder_notify_overdue: false,
      spam_whitelist: ["safe.example"],
      spam_blacklist: ["blocked.example"],
      phishing_sensitivity: "default",
      phishing_allowlist: ["trusted.example"],
    } as Record<string, unknown>,
    upserted: null as Record<string, unknown> | null,
  };
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: state.preferences, error: null })),
  };
  const mutation: any = {
    select: vi.fn(() => mutation),
    single: vi.fn(async () => ({ data: state.upserted, error: null })),
  };
  const table: any = {
    select: vi.fn(() => query),
    upsert: vi.fn((values: Record<string, unknown>) => {
      state.upserted = values;
      return mutation;
    }),
  };
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: state.session }, error: null })),
    onAuthStateChange: vi.fn((callback: (event: string, session: any) => void) => {
      state.authChange = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signOut: vi.fn(async () => {
      const previous = state.session;
      state.session = null;
      state.authChange?.("SIGNED_OUT", null);
      return { error: null, previous };
    }),
  };
  const client = { auth, from: vi.fn(() => table) };
  return { state, query, mutation, table, auth, client };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mocks.client),
}));

function session(id: string) {
  return { user: { id, email: `${id}@example.com` }, access_token: `${id}-token` };
}

describe("service-worker auth and preference caches", () => {
  const local = new Map<string, unknown>();
  const sessionStorage = new Map<string, unknown>();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    local.clear();
    sessionStorage.clear();
    mocks.state.session = session("user-a");
    mocks.state.authChange = undefined;
    mocks.state.upserted = null;
    mocks.state.preferences = {
      reply_tone: "professional",
      reminder_delay_days: 3,
      reminder_notify_before: true,
      reminder_notify_due: true,
      reminder_notify_overdue: false,
      spam_whitelist: ["safe.example"],
      spam_blacklist: ["blocked.example"],
      phishing_sensitivity: "default",
      phishing_allowlist: ["trusted.example"],
    };
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: local.get(key) })),
          set: vi.fn(async (items: Record<string, unknown>) => Object.entries(items).forEach(([key, value]) => local.set(key, value))),
          remove: vi.fn(async (keys: string | string[]) => (Array.isArray(keys) ? keys : [keys]).forEach((key) => local.delete(key))),
        },
        session: {
          get: vi.fn(async (key: string | string[] | null) => {
            if (key === null) return Object.fromEntries(sessionStorage);
            if (Array.isArray(key)) return Object.fromEntries(key.map((item) => [item, sessionStorage.get(item)]));
            return { [key]: sessionStorage.get(key) };
          }),
          set: vi.fn(async (items: Record<string, unknown>) => Object.entries(items).forEach(([key, value]) => sessionStorage.set(key, value))),
          remove: vi.fn(async (keys: string | string[]) => (Array.isArray(keys) ? keys : [keys]).forEach((key) => sessionStorage.delete(key))),
        },
      },
    });
  });

  test("coalesces and briefly caches session and preference reads", async () => {
    const { getPreferences, getSession } = await import("../src/background/supabase");

    const sessions = await Promise.all([getSession(), getSession(), getSession()]);
    expect(sessions.every((value) => value?.user.id === "user-a")).toBe(true);
    expect(mocks.auth.getSession).toHaveBeenCalledTimes(1);

    const preferences = await Promise.all([getPreferences(), getPreferences(), getPreferences()]);
    expect(preferences.every((value) => value.spam_whitelist[0] === "safe.example")).toBe(true);
    expect(mocks.query.maybeSingle).toHaveBeenCalledTimes(1);
    await getPreferences();
    expect(mocks.query.maybeSingle).toHaveBeenCalledTimes(1);
  });

  test("merges partial preference saves and invalidates dependent response entries", async () => {
    const cache = await import("../src/shared/cache");
    const { savePreferences } = await import("../src/background/supabase");
    await cache.setCache("owned-response", "old", 60_000, { owner: "user-a" });

    const saved = await savePreferences({ reply_tone: "casual" });

    expect(saved.reply_tone).toBe("casual");
    expect(mocks.state.upserted?.spam_whitelist).toEqual(["safe.example"]);
    expect(mocks.state.upserted?.phishing_allowlist).toEqual(["trusted.example"]);
    await expect(cache.getCache("owned-response")).resolves.toBeNull();
  });

  test("auth account changes and sign-out clear the previous user's cache", async () => {
    const cache = await import("../src/shared/cache");
    const auth = await import("../src/background/supabase");
    await auth.getSession();
    await cache.setCache("account-response", "user-a result", 60_000, { owner: "user-a" });

    mocks.state.session = session("user-b");
    mocks.state.authChange?.("SIGNED_IN", mocks.state.session);
    await vi.waitFor(async () => expect(await cache.getCache("account-response")).toBeNull());
    await cache.setCache("user-b-response", "user-b result", 60_000, { owner: "user-b" });

    await auth.signOut();
    await expect(cache.getCache("user-b-response")).resolves.toBeNull();
  });
});
