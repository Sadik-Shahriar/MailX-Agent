import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { ChatResponse, EmailContext } from "../src/shared/types";
import type { PanelHost } from "../src/content/panel/PanelHost";
import { ResultView } from "../src/ui/features/assistant/ResultView";
import { DraftView } from "../src/ui/features/assistant/DraftView";
import { ChatView } from "../src/ui/features/assistant/ChatView";
import { ToastProvider } from "../src/ui/components/Feedback";

const context: EmailContext = { id: "email-1", sender: "Ada", subject: "Project", body: "Please review." };

function response(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return { intent: "summarize", response: "The project needs review.", actions: [], ...overrides };
}

function hostWith(aiResponse: ChatResponse | { error: string } | undefined = response()): PanelHost {
  return {
    sendAiMessage: (_message, _source, _caller, callback) => {
      callback(aiResponse);
      return { requestId: "request-1", cancel: vi.fn() };
    },
    cancelAllAiRequests: vi.fn(),
    extractEmailContext: () => context,
    getComposeText: () => "",
    insertReply: vi.fn(async () => true),
    insertDraft: vi.fn(async () => true),
    copyText: vi.fn(async () => true),
  };
}

function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

afterEach(cleanup);

describe("Assistant ChatResponse boundary", () => {
  test("renders a summary from ChatResponse.response", () => {
    renderWithToast(<ResultView host={hostWith()} action="summarize" result={response()} pending={false} onBack={vi.fn()} />);

    expect(screen.getByText("The project needs review.")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Copy" })).not.toBeNull();
  });

  test("renders and inserts one suggested reply from ChatResponse.response", async () => {
    const host = hostWith(response({ intent: "reply", response: "Thanks, I will review it today." }));
    renderWithToast(<ResultView host={host} action="reply" result={response({ intent: "reply", response: "Thanks, I will review it today." })} pending={false} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Insert in Gmail" }));
    await vi.waitFor(() => expect(host.insertReply).toHaveBeenCalledWith("Thanks, I will review it today.", false));
  });

  test("keeps or explicitly replaces existing Gmail reply text", async () => {
    const host = hostWith(response({ intent: "reply", response: "Thanks, I will review it today." }));
    host.getComposeText = () => "Existing reply";
    renderWithToast(<ResultView host={host} action="reply" result={response({ intent: "reply", response: "Thanks, I will review it today." })} pending={false} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Insert in Gmail" }));
    fireEvent.click(await screen.findByRole("button", { name: "Keep my text" }));
    expect(host.insertReply).not.toHaveBeenCalled();
    expect(await screen.findByText("Your existing text was kept.")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Insert in Gmail" }));
    fireEvent.click(await screen.findByRole("button", { name: "Replace" }));
    await vi.waitFor(() => expect(host.insertReply).toHaveBeenCalledWith("Thanks, I will review it today.", true));
  });

  test("renders typed task rows and does not offer Gmail insertion", () => {
    renderWithToast(<ResultView host={hostWith()} action="extract" result={response({
      intent: "tasks",
      response: "One task found.",
      result: { kind: "tasks", tasks: [{ description: "Send the report", assignee: "Ada", due_date: "2026-07-20", priority: "high" }] },
    })} pending={false} onBack={vi.fn()} />);

    expect(screen.getByText("Send the report")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Insert in Gmail" })).toBeNull();
  });

  test("renders tasks with null or missing assignee and due date without error", () => {
    renderWithToast(<ResultView host={hostWith()} action="extract" result={response({
      intent: "tasks",
      response: "Four tasks found.",
      result: {
        kind: "tasks",
        tasks: [
          { description: "Submit final documentation", assignee: "Sadik", due_date: "2026-08-17", priority: "high" },
          { description: "Review and merge PRs", assignee: null, due_date: "2026-08-20", priority: "high" },
          { description: "Prepare product demo deck", assignee: "Alex", due_date: "2026-08-22", priority: "high" },
          { description: "Update project dependency licenses", assignee: null, due_date: null, priority: "medium" },
        ],
      },
    })} pending={false} onBack={vi.fn()} />);

    expect(screen.getByText("Submit final documentation")).not.toBeNull();
    expect(screen.getByText("Review and merge PRs")).not.toBeNull();
    expect(screen.getByText("Prepare product demo deck")).not.toBeNull();
    expect(screen.getByText("Update project dependency licenses")).not.toBeNull();
    expect(screen.queryByText(/unexpected response/i)).toBeNull();
  });

  test("renders structured draft fields separately", () => {
    const host = hostWith(response({
      intent: "draft",
      result: { kind: "draft", to: "ada@example.com", subject: "Project update", greeting: "Hello Ada,", body: "The project is on track.", sign_off: "Best," },
    }));
    renderWithToast(<DraftView host={host} context={context} onBack={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Follow up on the project/), { target: { value: "Write an update" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate draft" }));

    expect(screen.getByText("To")).not.toBeNull();
    expect(screen.getByText("ada@example.com")).not.toBeNull();
    expect(screen.getByText("Subject")).not.toBeNull();
    expect(screen.getByText("Project update")).not.toBeNull();
    expect(screen.getByText("Greeting")).not.toBeNull();
    expect(screen.getByText("Sign-off")).not.toBeNull();
  });

  test("sends a structured draft to Gmail insertion", async () => {
    const draft = { kind: "draft" as const, to: "ada@example.com", subject: "Project update", greeting: "Hello Ada,", body: "The project is on track.", sign_off: "Best," };
    const host = hostWith(response({ intent: "draft", result: draft }));
    renderWithToast(<DraftView host={host} context={context} onBack={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/Follow up on the project/), { target: { value: "Write an update" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate draft" }));
    fireEvent.click(await screen.findByRole("button", { name: "Insert in Gmail" }));

    await vi.waitFor(() => expect(host.insertDraft).toHaveBeenCalledWith(draft, false));
  });

  test("renders chat assistant text from ChatResponse.response", () => {
    const host = hostWith(response({ intent: "chat", response: ["The deadline is Friday.", "Please confirm the owner."] }));
    render(<ChatView host={host} context={context} onBack={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Ask a question..."), { target: { value: "When is it due?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByText(/The deadline is Friday/)).not.toBeNull();
    expect(screen.getByText(/Please confirm the owner/)).not.toBeNull();
  });

  test("renders runtime errors and malformed responses as recoverable errors", () => {
    const { rerender } = renderWithToast(<ResultView host={hostWith()} action="summarize" result={{ error: "Provider unavailable" }} pending={false} onBack={vi.fn()} />);
    expect(screen.getByText(/Provider unavailable/)).not.toBeNull();

    rerender(<ToastProvider><ResultView host={hostWith()} action="summarize" result={{ response: "missing required fields" }} pending={false} onBack={vi.fn()} /></ToastProvider>);
    expect(screen.getByText(/unexpected response/i)).not.toBeNull();

    rerender(<ToastProvider><ResultView host={hostWith()} action="summarize" result={undefined} pending={false} onBack={vi.fn()} /></ToastProvider>);
    expect(screen.getByText(/did not return a response/i)).not.toBeNull();
  });

  test("does not render unknown backend actions", () => {
    renderWithToast(<ResultView host={hostWith()} action="summarize" result={response({ actions: [{ label: "Delete Gmail", action: "DELETE_EMAIL" }] })} pending={false} onBack={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Delete Gmail" })).toBeNull();
  });
});
