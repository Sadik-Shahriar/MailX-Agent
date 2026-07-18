import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { ChatResponse, EmailContext } from "../src/shared/types";
import type { PanelHost } from "../src/content/panel/PanelHost";
import { PanelController } from "../src/content/panel/PanelController";
import { ToastProvider } from "../src/ui/components/Feedback";
import { AssistantView } from "../src/ui/features/assistant/AssistantView";

const emailA: EmailContext = { id: "email-a", sender: "Ada", subject: "First email", body: "First body" };
const emailB: EmailContext = { id: "email-b", sender: "Babbage", subject: "Second email", body: "Second body" };

function chatResponse(text: string): ChatResponse {
  return { intent: "summarize", response: text, actions: [] };
}

afterEach(cleanup);

describe("Panel email context navigation", () => {
  test("publishes Email A to Email B changes even while an email remains open", () => {
    const controller = new PanelController();
    const contexts: Array<EmailContext | null> = [];
    controller.subscribe({ onEmailContextChanged: (context) => contexts.push(context) });

    controller.setEmailContext(emailA);
    controller.setEmailContext(emailB);

    expect(contexts.map((context) => context?.id || null)).toEqual([null, "email-a", "email-b"]);
  });

  test("uses the latest email, cancels the previous request, and ignores its late response", async () => {
    const cancel = vi.fn();
    const cancelAllAiRequests = vi.fn();
    const callbacks: Array<(response: ChatResponse | { error: string } | undefined) => void> = [];
    const sendAiMessage = vi.fn((_message, _source, _caller, callback) => {
      callbacks.push(callback);
      return { requestId: `request-${callbacks.length}`, cancel };
    });
    const host: PanelHost = {
      sendAiMessage,
      cancelAllAiRequests,
      extractEmailContext: () => emailA,
      getComposeText: () => "",
      insertReply: vi.fn(async () => true),
      insertDraft: vi.fn(async () => true),
      copyText: vi.fn(async () => true),
    };

    const { rerender } = render(
      <ToastProvider><AssistantView host={host} emailContext={emailA} /></ToastProvider>,
    );
    await screen.findByText("Ada");
    fireEvent.click(screen.getByRole("button", { name: /Summarize/ }));
    expect(sendAiMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "SUMMARIZE", email_context: emailA }),
      "explicit",
      "action_panel",
      expect.any(Function),
    );

    rerender(<ToastProvider><AssistantView host={host} emailContext={emailB} /></ToastProvider>);
    await screen.findByText("Babbage");
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancelAllAiRequests).toHaveBeenCalledTimes(1);

    callbacks[0](chatResponse("Response for the first email."));
    expect(screen.queryByText("Response for the first email.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Extract tasks/ }));
    await waitFor(() => expect(sendAiMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "EXTRACT_TASKS", email_context: emailB }),
      "explicit",
      "action_panel",
      expect.any(Function),
    ));
  });

  test("clears context and disables email-only actions on inbox navigation", async () => {
    const host: PanelHost = {
      sendAiMessage: vi.fn(() => ({ requestId: "request-1", cancel: vi.fn() })),
      cancelAllAiRequests: vi.fn(),
      extractEmailContext: () => emailA,
      getComposeText: () => "",
      insertReply: vi.fn(async () => true),
      insertDraft: vi.fn(async () => true),
      copyText: vi.fn(async () => true),
    };
    const { rerender } = render(
      <ToastProvider><AssistantView host={host} emailContext={emailA} /></ToastProvider>,
    );
    await screen.findByText("Ada");

    rerender(<ToastProvider><AssistantView host={host} emailContext={null} /></ToastProvider>);
    expect(await screen.findByText(/Open an email to enable/)).not.toBeNull();
    expect((screen.getByRole("button", { name: /Summarize/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Suggested reply/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Extract tasks/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
