import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { PanelHost } from "../src/content/panel/PanelHost";
import { PanelApp } from "../src/content/panel/PanelApp";
import { PanelController } from "../src/content/panel/PanelController";

function host(): PanelHost {
  return {
    sendAiMessage: vi.fn(() => ({ requestId: "request-1", cancel: vi.fn() })),
    cancelAllAiRequests: vi.fn(),
    extractEmailContext: () => null,
    getComposeText: () => "",
    insertReply: vi.fn(async () => true),
    insertDraft: vi.fn(async () => true),
    copyText: vi.fn(async () => true),
  };
}

let storageListener: ((changes: { [key: string]: chrome.storage.StorageChange }, area: string) => void) | undefined;

function installChrome(loggedIn = true) {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        getURL: vi.fn((path) => `chrome-extension://test/${path}`),
        sendMessage: vi.fn((_message, callback) => callback({ loggedIn, email: loggedIn ? "ada@example.com" : "" })),
      },
      storage: {
        local: { get: vi.fn((_keys, callback) => callback({ mailx_panel_collapsed: true })), set: vi.fn() },
        onChanged: { addListener: vi.fn((listener) => { storageListener = listener; }), removeListener: vi.fn() },
      },
    },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  storageListener = undefined;
});

describe("Panel launcher and Find Panel", () => {
  test("uses a native launcher that keyboard users can reopen and that unmounts expanded content", async () => {
    installChrome();
    const user = userEvent.setup();
    render(<PanelApp controller={new PanelController()} host={host()} />);

    const launcher = await screen.findByRole("button", { name: "Open MailX" });
    expect(screen.queryByRole("heading", { name: "MailX" })).toBeNull();
    launcher.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: "MailX" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Collapse panel" }));
    const collapsedLauncher = await screen.findByRole("button", { name: "Open MailX" });
    collapsedLauncher.focus();
    await user.keyboard(" ");
    expect(await screen.findByRole("heading", { name: "MailX" })).not.toBeNull();
  });

  test("Find Panel expands, focuses MailX, and clamps/reset positions", async () => {
    installChrome();
    const controller = new PanelController();
    render(<PanelApp controller={controller} host={host()} />);
    await screen.findByRole("button", { name: "Open MailX" });

    const panel = document.getElementById("mailx-action-panel") as HTMLDivElement;
    Object.defineProperty(panel, "offsetWidth", { configurable: true, value: 380 });
    Object.defineProperty(panel, "offsetHeight", { configurable: true, value: 680 });
    controller.findPanel();

    const heading = await screen.findByRole("heading", { name: "MailX" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(Number.parseFloat(panel.style.left)).toBeGreaterThanOrEqual(0);
    expect(Number.parseFloat(panel.style.top)).toBeGreaterThanOrEqual(0);

    panel.style.left = "9999px";
    panel.style.top = "9999px";
    fireEvent(window, new Event("resize"));
    expect(Number.parseFloat(panel.style.left)).toBeLessThanOrEqual(window.innerWidth - 380);
    expect(Number.parseFloat(panel.style.top)).toBeLessThanOrEqual(window.innerHeight - 680);

    fireEvent.click(screen.getByRole("button", { name: "Reset panel position" }));
    expect(Number.parseFloat(panel.style.left)).toBeGreaterThanOrEqual(0);
    expect(Number.parseFloat(panel.style.top)).toBeGreaterThanOrEqual(0);
  });

  test("refreshes auth from GET_STATUS when popup sign-in synchronization arrives", async () => {
    installChrome(false);
    const controller = new PanelController();
    render(<PanelApp controller={controller} host={host()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Open MailX" }));
    await screen.findByRole("button", { name: "Sign in with Google" });

    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockImplementation((_message, callback) => callback({ loggedIn: true, email: "ada@example.com" }));
    storageListener?.({ mailx_auth_sync: { newValue: { changedAt: Date.now(), signedOut: false } } as chrome.storage.StorageChange }, "local");

    expect(await screen.findByRole("tab", { name: "Assistant" })).not.toBeNull();
  });

  test("keeps the panel mounted and offers Reconnect when a session expires", async () => {
    installChrome(true);
    render(<PanelApp controller={new PanelController()} host={host()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Open MailX" }));
    await screen.findByRole("tab", { name: "Assistant" });

    (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockImplementation((_message, callback) => callback({ loggedIn: false }));
    storageListener?.({ mailx_auth_sync: { newValue: { changedAt: Date.now(), signedOut: false } } as chrome.storage.StorageChange }, "local");

    expect(await screen.findByRole("button", { name: "Reconnect with Google" })).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Assistant" })).not.toBeNull();
  });
});
