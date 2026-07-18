import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";

import { applyTheme, installThemeSync, normalizeTheme, resolvedTheme } from "../src/ui/runtime/theme";

const sourceRoot = resolve(process.cwd(), "src");

function installChrome(storedTheme: unknown = "system") {
  const storageListeners = new Set<(changes: { [key: string]: chrome.storage.StorageChange }, area: string) => void>();
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      storage: {
        local: { get: vi.fn(async () => ({ mailx_theme: storedTheme })) },
        onChanged: {
          addListener: vi.fn((listener) => { storageListeners.add(listener); }),
          removeListener: vi.fn(),
        },
      },
    },
  });
  return { changeTheme: (theme: unknown) => storageListeners.forEach((listener) => listener({ mailx_theme: { newValue: theme } }, "local")) };
}

function installMediaQuery(initialDark = false) {
  const listeners = new Set<() => void>();
  const media = {
    matches: initialDark,
    addEventListener: vi.fn((_event: string, callback: () => void) => { listeners.add(callback); }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  return { setDark: (dark: boolean) => { media.matches = dark; listeners.forEach((listener) => listener()); } };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("theme runtime", () => {
  test("normalizes persisted values and resolves system preferences", () => {
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("invalid")).toBe("system");
    expect(resolvedTheme("system", true)).toBe("dark");
    expect(resolvedTheme("system", false)).toBe("light");
  });

  test("applies the selected theme and native color scheme", () => {
    const target = document.createElement("div");
    applyTheme(target, "dark");
    expect(target.dataset.theme).toBe("dark");
    expect(target.dataset.themePreference).toBe("dark");
    expect(target.style.colorScheme).toBe("dark");
  });

  test("synchronizes saved, cross-surface, and system theme changes", async () => {
    const media = installMediaQuery(false);
    const storage = installChrome("dark");
    const popup = document.createElement("div");
    const panelHost = document.createElement("div");
    const stopPopup = installThemeSync(popup);
    const stopPanel = installThemeSync(panelHost);

    await Promise.resolve();
    expect(popup.dataset.theme).toBe("dark");
    expect(panelHost.dataset.theme).toBe("dark");

    storage.changeTheme("system");
    expect(popup.dataset.theme).toBe("light");
    expect(panelHost.dataset.theme).toBe("light");

    media.setDark(true);
    expect(popup.dataset.theme).toBe("dark");
    expect(panelHost.dataset.theme).toBe("dark");
    stopPopup();
    stopPanel();
  });
});

describe("theme accessibility styles", () => {
  test("loads reduced-motion and forced-colors fallbacks for every surface", () => {
    const base = readFileSync(resolve(sourceRoot, "ui/styles/base.css"), "utf8");
    const toolbar = readFileSync(resolve(sourceRoot, "content/toolbar.css"), "utf8");
    const tokens = readFileSync(resolve(sourceRoot, "ui/styles/tokens.css"), "utf8");
    const content = readFileSync(resolve(sourceRoot, "content/index.ts"), "utf8");

    expect(base).toContain("@media (prefers-reduced-motion: reduce)");
    expect(base).toContain("@media (forced-colors: active)");
    expect(toolbar).toContain("@media (prefers-reduced-motion: reduce)");
    expect(toolbar).toContain("@media (forced-colors: active)");
    expect(tokens).toContain("CanvasText");
    expect(content).toContain("applyGmailTheme");
  });
});
