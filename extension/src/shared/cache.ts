const SESSION_CACHE_PREFIX = "mailx_cache_v2_";
const LEGACY_CACHE_PREFIX = "mailx_";
const MAX_CACHE_ENTRIES = 200;

interface CacheEntry<T> {
  value: T;
  expires?: number;
  createdAt: number;
  owner?: string;
}

export interface CacheOptions {
  owner?: string;
}

const inFlight = new Map<string, Promise<unknown>>();
const ownerGenerations = new Map<string, number>();

export type CacheTelemetryEvent =
  | { outcome: "hit" | "miss" | "coalesced" | "read_error" }
  | { outcome: "persisted"; persistence_ms: number }
  | { outcome: "write_error"; persistence_ms: number };

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ownerKey(owner?: string): Promise<string | undefined> {
  return owner ? digest(owner) : undefined;
}

function emit(onTelemetry: ((event: CacheTelemetryEvent) => void) | undefined, event: CacheTelemetryEvent): void {
  try { onTelemetry?.(event); } catch { /* Telemetry must not affect cache behavior. */ }
}

async function readCache<T>(storageKey: string): Promise<{ outcome: "hit"; value: T } | { outcome: "miss" | "read_error" }> {
  try {
    const result = await chrome.storage.session.get(storageKey);
    const entry = result[storageKey] as CacheEntry<T> | undefined;
    if (!entry) return { outcome: "miss" };
    if (entry.expires && entry.expires <= Date.now()) {
      void chrome.storage.session.remove(storageKey).catch(() => undefined);
      return { outcome: "miss" };
    }
    return { outcome: "hit", value: entry.value };
  } catch {
    return { outcome: "read_error" };
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const result = await readCache<T>(`${SESSION_CACHE_PREFIX}${key}`);
  return result.outcome === "hit" ? result.value : null;
}

async function pruneCache(): Promise<void> {
  try {
    const stored = await chrome.storage.session.get(null);
    const now = Date.now();
    const entries = Object.entries(stored)
      .filter(([key]) => key.startsWith(SESSION_CACHE_PREFIX))
      .map(([key, value]) => ({ key, entry: value as CacheEntry<unknown> }));
    const expired = entries.filter(({ entry }) => entry.expires && entry.expires <= now).map(({ key }) => key);
    const live = entries.filter(({ key }) => !expired.includes(key));
    const excess = live
      .sort((left, right) => (left.entry.createdAt || 0) - (right.entry.createdAt || 0))
      .slice(0, Math.max(0, live.length - MAX_CACHE_ENTRIES))
      .map(({ key }) => key);
    const removals = [...expired, ...excess];
    if (removals.length) await chrome.storage.session.remove(removals);
  } catch {
    // A cleanup failure must not discard the value that was just fetched.
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlMs?: number,
  options: CacheOptions = {},
): Promise<void> {
  const owner = await ownerKey(options.owner);
  const entry = {
    value,
    expires: ttlMs ? Date.now() + ttlMs : undefined,
    createdAt: Date.now(),
    owner,
  };
  await chrome.storage.session.set({
    [`${SESSION_CACHE_PREFIX}${key}`]: entry,
  });
  await pruneCache();
}

export async function invalidateUserCache(owner: string): Promise<void> {
  const hashedOwner = await ownerKey(owner);
  if (!hashedOwner) return;
  ownerGenerations.set(hashedOwner, (ownerGenerations.get(hashedOwner) || 0) + 1);
  try {
    const stored = await chrome.storage.session.get(null);
    const keys = Object.entries(stored)
      .filter(([key, value]) => key.startsWith(SESSION_CACHE_PREFIX) && (value as CacheEntry<unknown>)?.owner === hashedOwner)
      .map(([key]) => key);
    if (keys.length) await chrome.storage.session.remove(keys);
  } catch {
    // Memory generation still prevents obsolete requests from repopulating the cache.
  }
}

export async function clearLegacyCache(): Promise<void> {
  try {
    const stored = await chrome.storage.session.get(null);
    const keys = Object.keys(stored).filter((key) => key.startsWith(LEGACY_CACHE_PREFIX) && !key.startsWith(SESSION_CACHE_PREFIX));
    if (keys.length) await chrome.storage.session.remove(keys);
  } catch {
    // Legacy cleanup is best effort.
  }
}

export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs?: number,
  onTelemetry?: (event: CacheTelemetryEvent) => void,
  options: CacheOptions = {},
): Promise<T> {
  const storageKey = `${SESSION_CACHE_PREFIX}${key}`;
  const existing = inFlight.get(storageKey) as Promise<T> | undefined;
  if (existing) {
    emit(onTelemetry, { outcome: "coalesced" });
    return existing;
  }

  const operation = (async () => {
    const owner = await ownerKey(options.owner);
    const generation = owner ? ownerGenerations.get(owner) || 0 : 0;
    const cached = await readCache<T>(storageKey);
    if (cached.outcome === "hit") {
      emit(onTelemetry, { outcome: "hit" });
      return cached.value;
    }
    emit(onTelemetry, { outcome: cached.outcome });
    const value = await fetchFn();
    const persistenceStarted = performance.now();
    try {
      if (!owner || generation === (ownerGenerations.get(owner) || 0)) {
        await setCache(key, value, ttlMs, options);
        emit(onTelemetry, {
          outcome: "persisted",
          persistence_ms: Math.round((performance.now() - persistenceStarted) * 100) / 100,
        });
      }
    } catch {
      emit(onTelemetry, {
        outcome: "write_error",
        persistence_ms: Math.round((performance.now() - persistenceStarted) * 100) / 100,
      });
    }
    return value;
  })();
  inFlight.set(storageKey, operation);
  try {
    return await operation;
  } finally {
    if (inFlight.get(storageKey) === operation) inFlight.delete(storageKey);
  }
}
