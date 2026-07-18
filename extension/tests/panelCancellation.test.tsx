import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { ChatResponse, EmailContext } from "../src/shared/types";
import type { PanelHost } from "../src/content/panel/PanelHost";
import { PanelApp } from "../src/content/panel/PanelApp";
import { PanelController } from "../src/content/panel/PanelController";
import { ToastProvider } from "../src/ui/components/Feedback";
import { AssistantView } from "../src/ui/features/assistant/AssistantView";
import { ChatView } from "../src/ui/features/assistant/ChatView";
import { DraftView } from "../src/ui/features/assistant/DraftView";

const context: EmailContext = { id: "email-1", sender: "Ada", subject: "Project", body: "Please review." };

function hostWith(callbacks: Array<(response: ChatResponse | { error: string } | undefined) => void>, cancel = vi.fn()): PanelHost {
  return {
    sendAiMessage: vi.fn((_message, _source, _caller, callback) => {
      callbacks.push(callback);
      return { requestId: `request-${callbacks.length}`, cancel };
    }),
    cancelAllAiRequests: vi.fn(),
    extractEmailContext: () => context,
    getComposeText: () => "",
    insertReply: vi.fn(async () => true),
    insertDraft: vi.fn(async () => true),
    copyText: vi.fn(async () => true),
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Panel request cancellation", () => {
  test("cancels a result on Back and ignores its late callback", async () => {
    const callbacks: Array<(response: ChatResponse) => void> = [];
    const cancel = vi.fn();
    const host = hostWith(callbacks, cancel);
    render(<ToastProvider><AssistantView host={host} emailContext={context} /></ToastProvider>);
    await screen.findByText("Ada");

    fireEvent.click(screen.getByRole("button", { name: /Summarize/ }));
    expect(screen.getByRole("button", { name: "Cancel" })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to Assistant" }));
    expect(cancel).toHaveBeenCalledTimes(1);

    callbacks[0]({ intent: "summarize", response: "Late result", actions: [] });
    expect(screen.queryByText("Late result")).toBeNull();
    expect(screen.getByRole("button", { name: /Summarize/ })).not.toBeNull();
  });

  test("cancels chat work through Cancel and on unmount without accepting stale callbacks", () => {
    const callbacks: Array<(response: ChatResponse) => void> = [];
    const cancel = vi.fn();
    const host = hostWith(callbacks, cancel);
    const { unmount } = render(<ChatView host={host} context={context} onBack={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), { target: { value: "What is next?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalledTimes(1);
    callbacks[0]({ intent: "chat", response: "Late answer", actions: [] });
    expect(screen.queryByText("Late answer")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), { target: { value: "Try again" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    unmount();
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  test("cancels draft generation on unmount", () => {
    const callbacks: Array<(response: ChatResponse) => void> = [];
    const cancel = vi.fn();
    const host = hostWith(callbacks, cancel);
    const { unmount } = render(<ToastProvider><DraftView host={host} context={context} onBack={vi.fn()} /></ToastProvider>);

    fireEvent.change(screen.getByPlaceholderText(/Follow up on the project/), { target: { value: "Write an update" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate draft" }));
    expect(screen.getByRole("button", { name: "Cancel" })).not.toBeNull();
    unmount();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  test("cancels panel work before changing tabs", async () => {
    const callbacks: Array<(response: ChatResponse) => void> = [];
    const host = hostWith(callbacks);
    Object.defineProperty(globalThis, "chrome", {
      configurable: true,
      value: {
        runtime: {
          getURL: vi.fn((path) => `chrome-extension://test/${path}`),
          sendMessage: vi.fn((_message, callback) => callback({ loggedIn: true, email: "ada@example.com" })),
        },
        storage: {
          local: { get: vi.fn((_keys, callback) => callback({})), set: vi.fn() },
          onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
        },
      },
    });

    render(<PanelApp controller={new PanelController()} host={host} />);
    fireEvent.click(await screen.findByRole("tab", { name: "Tasks" }));
    await waitFor(() => expect(host.cancelAllAiRequests).toHaveBeenCalledTimes(1));
  });
});
