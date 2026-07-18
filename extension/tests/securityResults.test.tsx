import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SecurityResultView } from "../src/ui/features/assistant/SecurityResultView";

const context = { id: "email-1", sender: "Ada", subject: "Project", body: "Review this" };

describe("Security result details", () => {
  test("renders priority category and confidence", () => {
    render(<SecurityResultView data={{ type: "priority", context, status: "result", result: { kind: "priority", priority: "high", category: "action_required", confidence: 0.82 }, retry: vi.fn() }} onBack={vi.fn()} />);
    expect(screen.getByText("action_required")).not.toBeNull();
    expect(screen.getByText("82%")).not.toBeNull();
  });

  test("renders spam reason, confidence, and source", () => {
    render(<SecurityResultView data={{ type: "spam", context, status: "result", result: { verdict: "spam", confidence: 0.91, reason: "Impersonation signals", category: "impersonation", source: "rule" }, retry: vi.fn() }} onBack={vi.fn()} />);
    expect(screen.getByText("Impersonation signals")).not.toBeNull();
    expect(screen.getByText("rule")).not.toBeNull();
  });

  test("renders link hostname, reason, and checked count", () => {
    render(<SecurityResultView data={{ type: "links", context, status: "result", checkedCount: 2, results: [{ url: "https://bad.example/path", hostname: "bad.example", verdict: "phishing", confidence: 0.88, reason: "Lookalike domain", heuristics: [], source: "heuristic" }], retry: vi.fn() }} onBack={vi.fn()} />);
    expect(screen.getByText(/2 links checked/)).not.toBeNull();
    expect(screen.getByText(/bad.example - Lookalike domain/)).not.toBeNull();
  });

  test("offers Retry only for unavailable results", () => {
    const retry = vi.fn();
    render(<SecurityResultView data={{ type: "links", context, status: "unavailable", message: "Provider busy", retry }} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
