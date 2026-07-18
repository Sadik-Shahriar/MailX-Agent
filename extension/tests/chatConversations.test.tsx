import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { ChatResponse, EmailContext } from "../src/shared/types";
import type { PanelHost } from "../src/content/panel/PanelHost";
import { ChatView } from "../src/ui/features/assistant/ChatView";
import { resetConversationsForTests } from "../src/ui/features/assistant/conversation";

const email = (id: string): EmailContext => ({ id, sender: "Ada", subject: `Subject ${id}`, body: "Email body" });

function hostWith(response: ChatResponse = { intent: "chat", response: "Answer", actions: [] }): PanelHost {
  return {
    sendAiMessage: vi.fn((_message, _source, _caller, callback) => {
      callback(response);
      return { requestId: "request", cancel: vi.fn() };
    }),
    cancelAllAiRequests: vi.fn(),
    extractEmailContext: () => email("one"),
    getComposeText: () => "",
    insertReply: vi.fn(async () => true),
    insertDraft: vi.fn(async () => true),
    copyText: vi.fn(async () => true),
  };
}

function ask(prompt: string) {
  fireEvent.change(screen.getByLabelText("Ask MailX about this email"), { target: { value: prompt } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}

beforeEach(resetConversationsForTests);
afterEach(cleanup);

describe("Ask MailX conversations", () => {
  test("sends prior bounded history and retains only ten messages", () => {
    const host = hostWith();
    render(<ChatView host={host} context={email("one")} onBack={vi.fn()} />);

    for (let index = 1; index <= 6; index += 1) ask(`Question ${index}`);

    const calls = vi.mocked(host.sendAiMessage).mock.calls;
    expect(calls[1][0]).toMatchObject({
      type: "CHAT",
      history: [
        { role: "user", content: "Question 1" },
        { role: "assistant", content: "Answer" },
      ],
    });
    expect((calls[5][0] as { history: unknown[] }).history).toHaveLength(10);
  });

  test("retains conversations by email, evicts the least recently used after three, and preserves history across Back", () => {
    const host = hostWith();
    const { rerender } = render(<ChatView host={host} context={email("one")} onBack={vi.fn()} />);
    ask("One");
    fireEvent.click(screen.getByRole("button", { name: "Back to Assistant" }));
    rerender(<ChatView host={host} context={email("one")} onBack={vi.fn()} />);
    expect(screen.getByText("One")).not.toBeNull();

    rerender(<ChatView host={host} context={email("two")} onBack={vi.fn()} />);
    ask("Two");
    rerender(<ChatView host={host} context={email("three")} onBack={vi.fn()} />);
    ask("Three");
    rerender(<ChatView host={host} context={email("four")} onBack={vi.fn()} />);
    ask("Four");
    rerender(<ChatView host={host} context={email("one")} onBack={vi.fn()} />);
    expect(screen.queryByText("One")).toBeNull();
  });

  test("confirms New chat and leaves history untouched when cancelled", () => {
    const host = hostWith();
    render(<ChatView host={host} context={email("one")} onBack={vi.fn()} />);
    ask("Keep this");
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Keep this")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New chat" }));
    fireEvent.click(screen.getAllByRole("button", { name: "New chat" })[1]);
    expect(screen.queryByText("Keep this")).toBeNull();
  });

  test("routes draft prompts and exposes insertion for draft and reply results", () => {
    const draft = { kind: "draft" as const, to: "ada@example.com", subject: "Hello", greeting: "Hi", body: "Body", sign_off: "Thanks" };
    const host = hostWith({ intent: "draft", response: "Draft ready", result: draft, actions: [] });
    const { rerender } = render(<ChatView host={host} context={email("one")} onBack={vi.fn()} />);
    ask("Compose a new email to Ada");
    expect(host.sendAiMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "GENERATE_DRAFT", prompt: "Compose a new email to Ada" }), "explicit", "chat_composer", expect.any(Function));
    fireEvent.click(screen.getByRole("button", { name: "Insert draft" }));
    expect(host.insertDraft).toHaveBeenCalledWith(draft, false);

    resetConversationsForTests();
    const replyHost = hostWith({ intent: "reply", response: "Thanks!", actions: [] });
    rerender(<ChatView host={replyHost} context={email("two")} onBack={vi.fn()} />);
    ask("Write a reply");
    fireEvent.click(screen.getByRole("button", { name: "Insert reply" }));
    expect(replyHost.insertReply).toHaveBeenCalledWith("Thanks!", false);
  });

  test("stops input keyboard events before Gmail receives them", () => {
    const host = hostWith();
    const gmailShortcut = vi.fn();
    document.addEventListener("keydown", gmailShortcut);
    render(<ChatView host={host} context={email("one")} onBack={vi.fn()} />);
    fireEvent.keyDown(screen.getByLabelText("Ask MailX about this email"), { key: "r" });
    expect(gmailShortcut).not.toHaveBeenCalled();
    document.removeEventListener("keydown", gmailShortcut);
  });
});
