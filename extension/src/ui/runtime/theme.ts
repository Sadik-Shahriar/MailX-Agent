export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "mailx_theme";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

export function normalizeTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolvedTheme(preference: ThemePreference, prefersDark = systemPrefersDark()): "light" | "dark" {
  return preference === "system" ? (prefersDark ? "dark" : "light") : preference;
}

export function applyTheme(target: HTMLElement, preference: ThemePreference, prefersDark = systemPrefersDark()): void {
  const theme = resolvedTheme(preference, prefersDark);
  target.dataset.theme = theme;
  target.dataset.themePreference = preference;
  target.style.colorScheme = theme;
}

/** Applies the saved preference now and keeps an open extension surface in sync. */
export function installThemeSync(target: HTMLElement): () => void {
  let preference: ThemePreference = "system";
  const media = typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : undefined;
  const apply = () => applyTheme(target, preference, media?.matches === true);
  const onSystemChange = () => {
    if (preference === "system") apply();
  };
  const onStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== "local" || !changes[THEME_STORAGE_KEY]) return;
    preference = normalizeTheme(changes[THEME_STORAGE_KEY].newValue);
    apply();
  };

  apply();
  media?.addEventListener?.("change", onSystemChange);
  if (typeof chrome !== "undefined") {
    chrome.storage.onChanged.addListener(onStorageChange);
    void chrome.storage.local.get(THEME_STORAGE_KEY).then((stored) => {
      preference = normalizeTheme(stored[THEME_STORAGE_KEY]);
      apply();
    });
  }

  return () => {
    media?.removeEventListener?.("change", onSystemChange);
    if (typeof chrome !== "undefined") chrome.storage.onChanged.removeListener(onStorageChange);
  };
}
