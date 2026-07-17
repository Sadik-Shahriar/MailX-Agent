import { afterEach, describe, expect, test, vi } from "vitest";

import { AiRequestQueue, QueueExpiredError, QueueFullError, queueLaneForMessage, type QueueStartMetrics } from "../src/background/queue";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("AI request queue", () => {
  test("classifies primary user actions as foreground", () => {
    expect(["SUMMARIZE", "SUGGEST_REPLIES", "EXTRACT_TASKS", "GENERATE_DRAFT", "CHAT"].map(
      (type) => queueLaneForMessage(type as Parameters<typeof queueLaneForMessage>[0]),
    )).toEqual(["foreground", "foreground", "foreground", "foreground", "foreground"]);
    expect(queueLaneForMessage("CLASSIFY_PRIORITY")).toBe("background");
    expect(queueLaneForMessage("CHECK_SPAM")).toBe("background");
    expect(queueLaneForMessage("CHECK_PHISHING_URL")).toBe("background");
  });

  test("reserves capacity for foreground work and keeps each lane FIFO", async () => {
    const queue = new AiRequestQueue();
    const gates = [deferred(), deferred(), deferred(), deferred()];
    const started: string[] = [];
    const run = (name: string, gate: ReturnType<typeof deferred>) => async () => {
      started.push(name);
      await gate.promise;
      return name;
    };

    const backgroundOne = queue.enqueue(run("background-1", gates[0]), { lane: "background" });
    const backgroundTwo = queue.enqueue(run("background-2", gates[1]), { lane: "background" });
    await vi.waitFor(() => expect(started).toEqual(["background-1"]));

    const foregroundOne = queue.enqueue(run("foreground-1", gates[2]), { lane: "foreground" });
    const foregroundTwo = queue.enqueue(run("foreground-2", gates[3]), { lane: "foreground" });
    await vi.waitFor(() => expect(started).toEqual(["background-1", "foreground-1"]));

    gates[2].resolve();
    await vi.waitFor(() => expect(started).toEqual(["background-1", "foreground-1", "foreground-2"]));
    gates[0].resolve();
    await vi.waitFor(() => expect(started).toEqual(["background-1", "foreground-1", "foreground-2", "background-2"]));

    gates[1].resolve();
    gates[3].resolve();
    await expect(Promise.all([backgroundOne, backgroundTwo, foregroundOne, foregroundTwo])).resolves.toEqual([
      "background-1", "background-2", "foreground-1", "foreground-2",
    ]);
  });

  test("starts foreground work immediately when capacity is available", async () => {
    const queue = new AiRequestQueue();
    let metrics: QueueStartMetrics | undefined;

    await queue.enqueue(async () => "ready", {
      lane: "foreground",
      onStart: (value) => { metrics = value; },
    });

    expect(metrics?.queue_wait_ms).toBeLessThan(250);
  });

  test("admits the existing twenty-link safety batch without becoming unbounded", async () => {
    const queue = new AiRequestQueue();
    const controller = new AbortController();
    const never = deferred();
    const jobs = Array.from({ length: 20 }, () => queue.enqueue(
      async () => never.promise,
      { lane: "background", signal: controller.signal },
    ));
    const settled = Promise.allSettled(jobs);

    controller.abort();
    const results = await settled;

    expect(results).toHaveLength(20);
    expect(results.every((result) => result.status === "rejected" && result.reason.name === "AbortError")).toBe(true);
  });

  test("execution timeout releases capacity even when work ignores abort", async () => {
    vi.useFakeTimers();
    const queue = new AiRequestQueue({ maxConcurrent: 1, defaultRunTimeoutMs: 10 });
    const never = deferred();
    const started: string[] = [];
    const timedOut = queue.enqueue(async () => {
      started.push("stuck");
      await never.promise;
    }, { lane: "foreground" });
    const next = queue.enqueue(async () => {
      started.push("next");
      return "next";
    }, { lane: "foreground" });
    const timeoutResult = expect(timedOut).rejects.toMatchObject({ name: "TimeoutError" });

    await vi.advanceTimersByTimeAsync(10);

    await timeoutResult;
    await expect(next).resolves.toBe("next");
    expect(started).toEqual(["stuck", "next"]);
  });

  test("running cancellation releases capacity", async () => {
    const queue = new AiRequestQueue({ maxConcurrent: 1 });
    const controller = new AbortController();
    const never = deferred();
    const started: string[] = [];
    const cancelled = queue.enqueue(async () => {
      started.push("cancelled");
      await never.promise;
    }, { lane: "foreground", signal: controller.signal });
    const next = queue.enqueue(async () => {
      started.push("next");
      return "next";
    }, { lane: "foreground" });

    await vi.waitFor(() => expect(started).toEqual(["cancelled"]));
    const cancellationResult = expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();

    await cancellationResult;
    await expect(next).resolves.toBe("next");
  });

  test("queued cancellation removes work before it starts", async () => {
    const queue = new AiRequestQueue({ maxConcurrent: 1 });
    const runningGate = deferred();
    const controller = new AbortController();
    const started: string[] = [];
    const running = queue.enqueue(async () => {
      started.push("running");
      await runningGate.promise;
    }, { lane: "foreground" });
    const queued = queue.enqueue(async () => {
      started.push("cancelled-before-start");
    }, { lane: "foreground", signal: controller.signal });
    const cancellationResult = expect(queued).rejects.toMatchObject({ name: "AbortError" });

    controller.abort();
    await cancellationResult;
    runningGate.resolve();
    await running;

    expect(started).toEqual(["running"]);
  });

  test("queued work expires and bounded lanes reject excess work", async () => {
    vi.useFakeTimers();
    const queue = new AiRequestQueue({ maxConcurrent: 1, maxForegroundPending: 1 });
    const never = deferred();
    const running = queue.enqueue(async () => never.promise, { lane: "foreground" });
    const expiring = queue.enqueue(async () => "late", { lane: "foreground", expiresInMs: 5 });
    const excess = queue.enqueue(async () => "excess", { lane: "foreground" });
    const expiryResult = expect(expiring).rejects.toBeInstanceOf(QueueExpiredError);

    await expect(excess).rejects.toBeInstanceOf(QueueFullError);
    await vi.advanceTimersByTimeAsync(5);
    await expiryResult;

    never.resolve();
    await expect(running).resolves.toBeUndefined();
  });

  test("asynchronous rejection and synchronous throw both release capacity", async () => {
    const queue = new AiRequestQueue({ maxConcurrent: 1 });
    const first = queue.enqueue(async () => { throw new Error("async failure"); }, { lane: "foreground" });
    const second = queue.enqueue(() => { throw new Error("sync failure"); }, { lane: "foreground" });
    const third = queue.enqueue(async () => "recovered", { lane: "foreground" });

    await expect(first).rejects.toThrow("async failure");
    await expect(second).rejects.toThrow("sync failure");
    await expect(third).resolves.toBe("recovered");
  });

  test("telemetry callback failure cannot leak a slot", async () => {
    const queue = new AiRequestQueue({ maxConcurrent: 1 });
    const first = queue.enqueue(async () => "first", {
      lane: "foreground",
      onStart: () => { throw new Error("telemetry failed"); },
    });
    const second = queue.enqueue(async () => "second", { lane: "foreground" });

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");
  });
});
