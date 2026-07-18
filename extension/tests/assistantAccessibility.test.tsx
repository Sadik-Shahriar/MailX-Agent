import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { EmailContext } from "../src/shared/types";
import type { PanelHost } from "../src/content/panel/PanelHost";
import { ToastProvider } from "../src/ui/components/Feedback";
import { AssistantView } from "../src/ui/features/assistant/AssistantView";
import { ChatView } from "../src/ui/features/assistant/ChatView";
import { DraftView } from "../src/ui/features/assistant/DraftView";
import { ResultView } from "../src/ui/features/assistant/ResultView";

const context: EmailContext = { id: "email-1", sender: "Ada", subject: "Project", body: "Please review." };
const host: PanelHost = {
  sendAiMessage: vi.fn(() => ({ requestId: "request-1", cancel: vi.fn() })),
  cancelAllAiRequests: vi.fn(),
  extractEmailContext: () => context,
  getComposeText: () => "",
  insertReply: vi.fn(async () => true),
  insertDraft: vi.fn(async () => true),
  copyText: vi.fn(async () => true),
};

afterEach(cleanup);

describe("Assistant accessibility", () => {
  test("uses labelled inputs, semantic headings, and live status regions", () => {
    const { unmount } = render(<ChatView host={host} context={context} onBack={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Ask MailX" })).not.toBeNull();
    expect(screen.getByLabelText("Ask MailX about this email")).not.toBeNull();
    expect(screen.getByRole("log")).not.toBeNull();
    unmount();

    render(<ToastProvider><DraftView host={host} context={context} onBack={vi.fn()} /></ToastProvider>);
    expect(screen.getByRole("heading", { name: "Create draft" })).not.toBeNull();
    expect(screen.getByLabelText("What should this email be about?")).not.toBeNull();
  });

  test("focuses result headings and restores the action trigger after Back", async () => {
    const { unmount } = render(<ToastProvider><ResultView host={host} action="summarize" result={undefined} pending onBack={vi.fn()} /></ToastProvider>);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Summary" }));
    expect(screen.getByRole("status")).not.toBeNull();
    unmount();

    render(<ToastProvider><AssistantView host={host} emailContext={context} /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Ask MailX/ }));
    fireEvent.click(screen.getByRole("button", { name: "Back to Assistant" }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: /Ask MailX/ })));
  });
});
