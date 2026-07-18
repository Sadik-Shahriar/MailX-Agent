import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InsightsView } from "./InsightsView";
import { sendMessage } from "../../runtime/sendMessage";

vi.mock("../../runtime/sendMessage", () => ({ sendMessage: vi.fn() }));

describe("InsightsView", () => {
  beforeEach(() => vi.mocked(sendMessage).mockReset());

  it("renders zero metrics and chart labels", async () => {
    vi.mocked(sendMessage).mockResolvedValue({ sent: 0, received: 0, completedTasks: 0, pendingTasks: 0 });
    render(<InsightsView />);

    await waitFor(() => expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(4));
    expect(screen.getByRole("img", { name: "Sent: 0" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Pending: 0" })).toBeTruthy();
  });

  it("offers a retry after a failed request", async () => {
    vi.mocked(sendMessage).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({ sent: 1, received: 2, completedTasks: 3, pendingTasks: 4 });
    render(<InsightsView />);

    expect(await screen.findByText("Offline")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByText("Emails sent")).toBeTruthy());
  });
});
