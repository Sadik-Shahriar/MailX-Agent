import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TasksView } from "./TasksView";
import { sendMessage } from "../../runtime/sendMessage";

vi.mock("../../runtime/sendMessage", () => ({ sendMessage: vi.fn() }));

describe("TasksView", () => {
  beforeEach(() => vi.mocked(sendMessage).mockReset());

  it("requires confirmation before deleting a completed task", async () => {
    vi.mocked(sendMessage).mockImplementation((message: any) => {
      if (message.type === "GET_TASKS") return Promise.resolve({ tasks: [{ id: "1", description: "Archive report", status: "completed", priority: "low", due_date: null }] });
      if (message.type === "GET_REMINDERS") return Promise.resolve({ reminders: [] });
      return Promise.resolve({ tasks: [] });
    });
    render(<TasksView />);

    const deleteButton = await screen.findByRole("button", { name: "Delete" });
    fireEvent.click(deleteButton);
    expect(screen.getByRole("dialog", { name: "Delete completed task?" })).toBeTruthy();
    expect(vi.mocked(sendMessage)).not.toHaveBeenCalledWith(expect.objectContaining({ type: "DELETE_TASK" }));

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[1]);
    await waitFor(() => expect(vi.mocked(sendMessage)).toHaveBeenCalledWith(expect.objectContaining({ type: "DELETE_TASK", task_id: "1" })));
  });
});
