import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import App from "../src/popup/App";

type Handler = (message: { type: string; [key: string]: unknown }) => unknown;

let handlers: Record<string, Handler>;
let sendMessage: ReturnType<typeof vi.fn>;

beforeEach(() => {
  handlers = {
    GET_STATUS: () => ({ loggedIn: false }),
  };
  sendMessage = vi.fn((message: { type: string }, callback?: (response: unknown) => void) => {
    callback?.(handlers[message.type]?.(message));
  });
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: { lastError: undefined, sendMessage },
      tabs: { create: vi.fn(), query: vi.fn() },
      storage: {
        local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) },
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() }
      }
    },
  });
});

afterEach(() => cleanup());

async function renderSignedInPopup(): Promise<void> {
  handlers.GET_STATUS = () => ({ loggedIn: true, email: "student@example.com" });
  render(<App />);
  await screen.findByText("Home");
}

describe("popup Phase 0 baseline", () => {
  test("renders the sign-in failure returned by the runtime", async () => {
    handlers.SIGN_IN = () => ({ error: "OAuth was cancelled." });
    render(<App />);

    await screen.findByRole("button", { name: "Sign in with Google" });
    fireEvent.click(screen.getByRole("button", { name: "Sign in with Google" }));

    expect(await screen.findByText("OAuth was cancelled.")).not.toBeNull();
  });

  test("shows accessible sign-in progress and synchronizes a successful sign-in", async () => {
    let completeSignIn: ((response: unknown) => void) | undefined;
    handlers.SIGN_IN = () => new Promise((resolve) => { completeSignIn = resolve; });
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Sign in with Google" }));
    expect(screen.getByText("Opening secure Google sign-in...")).not.toBeNull();
    expect((screen.getByRole("button", { name: /Signing in/ }) as HTMLButtonElement).disabled).toBe(true);

    completeSignIn?.({ loggedIn: true, email: "student@example.com" });
    await screen.findByText("Home");
    expect(chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
      mailx_auth_sync: expect.objectContaining({ signedOut: false }),
    }));
  });

  test("synchronizes sign-out after the runtime confirms it", async () => {
    handlers.SIGN_OUT = () => ({ loggedIn: false });
    await renderSignedInPopup();

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("button", { name: "Sign in with Google" })).not.toBeNull();
    expect(chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
      mailx_auth_sync: expect.objectContaining({ signedOut: true }),
    }));
  });

  test("requests the selected statistics period", async () => {
    handlers.GET_STATS = (message) => ({
      sent: message.period,
      received: 2,
      completedTasks: 3,
      pendingTasks: 4,
    });
    await renderSignedInPopup();

    fireEvent.click(screen.getByRole("tab", { name: "Insights" }));
    await screen.findByText("Emails sent");
    fireEvent.click(screen.getByRole("radio", { name: "30 days" }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith(
      { type: "GET_STATS", period: 30, refresh: true },
      expect.any(Function),
    ));
  });

  test("keeps task errors visible after a failed task mutation", async () => {
    handlers.GET_TASKS = () => ({
      tasks: [{
        id: "task-1",
        email_id: "email-1",
        description: "Submit the report",
        assignee: "me",
        due_date: null,
        priority: "high",
        status: "pending",
        created_at: "2026-07-18",
      }],
    });
    handlers.GET_REMINDERS = () => ({ reminders: [] });
    handlers.TOGGLE_TASK = () => ({ error: "Task update failed." });
    await renderSignedInPopup();

    fireEvent.click(screen.getByRole("tab", { name: "Tasks" }));
    const task = await screen.findByLabelText(/Submit the report/);
    fireEvent.click(task);

    expect(await screen.findByText("Task update failed.")).not.toBeNull();
  });

  test("passes a callback when saving settings", async () => {
    handlers.GET_PREFERENCES = () => ({
      reply_tone: "professional",
      reminder_delay_days: 3,
      reminder_notify_before: true,
      reminder_notify_due: true,
      reminder_notify_overdue: false,
    });
    handlers.SAVE_PREFERENCES = () => ({ ok: true });
    await renderSignedInPopup();

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    fireEvent.change(await screen.findByLabelText("Reply Tone"), { target: { value: "casual" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SAVE_PREFERENCES" }),
      expect.any(Function),
    ));
  });

  test("does not dispatch remote AI while mounting or navigating the popup", async () => {
    handlers.GET_STATS = () => ({ sent: 0, received: 0, completedTasks: 0, pendingTasks: 0 });
    await renderSignedInPopup();
    fireEvent.click(screen.getByRole("tab", { name: "Tasks" }));
    fireEvent.click(screen.getByRole("tab", { name: "Insights" }));

    const remoteAiTypes = new Set([
      "SUMMARIZE", "SUGGEST_REPLIES", "CLASSIFY_PRIORITY", "EXTRACT_TASKS",
      "GENERATE_DRAFT", "CHAT", "CHECK_SPAM", "CHECK_PHISHING_URL",
    ]);
    expect(sendMessage.mock.calls.map(([message]) => message.type)).not.toContainEqual(
      expect.stringMatching(/SUMMARIZE|SUGGEST_REPLIES|CLASSIFY_PRIORITY|EXTRACT_TASKS|GENERATE_DRAFT|CHAT|CHECK_SPAM|CHECK_PHISHING_URL/),
    );
    expect(sendMessage.mock.calls.every(([message]) => !remoteAiTypes.has(message.type))).toBe(true);
  });

  test("connects every tab to an existing labelled tabpanel", async () => {
    await renderSignedInPopup();

    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(4);
    for (const tab of screen.getAllByRole("tab")) {
      const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
      expect(panel?.getAttribute("role")).toBe("tabpanel");
      expect(panel?.getAttribute("aria-labelledby")).toBe(tab.id);
    }
  });
});
