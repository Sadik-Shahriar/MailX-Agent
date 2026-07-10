const SESSION_CACHE_PREFIX = "mailx_";

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const result = await chrome.storage.session.get(
      `${SESSION_CACHE_PREFIX}${key}`
    );
    return result[`${SESSION_CACHE_PREFIX}${key}`] ?? null;
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
  const cached = await getCache<{ value: T; expires?: number }>(key);
  if (cached && (!cached.expires || cached.expires > Date.now())) {
    return cached.value;
  }
  const value = await fetchFn();
  await setCache(key, { value }, ttlMs);
  return value;
}
