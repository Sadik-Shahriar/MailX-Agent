import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const supabase = {
    rpc: vi.fn(async () => ({ data: [{ completed_tasks: 3, pending_tasks: 5 }], error: null })),
  };
  return {
    supabase,
    getOrSetCache: vi.fn(async (_key: string, fetcher: () => Promise<unknown>) => fetcher()),
    countMessages: vi.fn()
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(29),
  };
});

vi.mock("../src/shared/cache", () => ({ getOrSetCache: mocks.getOrSetCache }));
vi.mock("../src/shared/cacheKeys", () => ({ sha256: vi.fn(async () => "user-hash") }));
vi.mock("../src/background/gmail", () => ({
  countMessages: mocks.countMessages,
  getGmailAccessToken: vi.fn(async () => "gmail-token"),
}));
vi.mock("../src/background/supabase", () => ({
  getSupabaseClient: () => mocks.supabase,
  getUserId: vi.fn(async () => "user-1"),
}));

describe("statistics aggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.countMessages.mockResolvedValueOnce(11).mockResolvedValueOnce(29);
  });

  test("uses one database-side aggregation instead of downloading task or sender rows", async () => {
    const { getStats } = await import("../src/background/stats");

    await expect(getStats(7)).resolves.toEqual({
      sent: 11,
      received: 29,
      completedTasks: 3,
      pendingTasks: 5,
    });

    expect(mocks.supabase.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.supabase.rpc).toHaveBeenCalledWith("get_task_stats", { since: expect.any(String) });
  });
});

describe("statistics response guard", () => {
  test("rejects an older period response after a newer request starts", async () => {
    const { createStatsRequestGuard } = await import("../src/popup/statsRequestGuard");
    const guard = createStatsRequestGuard();
    const first = guard.start();
    const second = guard.start();

    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });
});
