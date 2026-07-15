const SESSION_CACHE_PREFIX = "mailx_";

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const result = await chrome.storage.session.get(
      `${SESSION_CACHE_PREFIX}${key}`
    );
    const entry = result[`${SESSION_CACHE_PREFIX}${key}`] as { value: T; expires?: number } | undefined;
    if (!entry || (entry.expires && entry.expires <= Date.now())) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlMs?: number
): Promise<void> {
  const entry = {
    value,
    expires: ttlMs ? Date.now() + ttlMs : undefined,
  };
  await chrome.storage.session.set({
    [`${SESSION_CACHE_PREFIX}${key}`]: entry,
  });
}

export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;
  const value = await fetchFn();
  await setCache(key, value, ttlMs);
  return value;
}
