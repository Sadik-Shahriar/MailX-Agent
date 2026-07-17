import { abortReason, createDeadlineSignal, RequestCancelledError, RequestTimeoutError } from "../shared/abort";
import type { MessageType } from "../shared/types";

export type QueueLane = "foreground" | "background";

const FOREGROUND_MESSAGES = new Set<MessageType>([
  "SUMMARIZE",
  "SUGGEST_REPLIES",
  "EXTRACT_TASKS",
  "GENERATE_DRAFT",
  "CHAT",
]);

export function queueLaneForMessage(type: MessageType): QueueLane {
  return FOREGROUND_MESSAGES.has(type) ? "foreground" : "background";
}

export interface QueueStartMetrics {
  queue_wait_ms: number;
  queue_depth: number;
  active_requests: number;
}

export interface QueueOptions {
  lane: QueueLane;
  signal?: AbortSignal;
  expiresInMs?: number;
  runTimeoutMs?: number;
  onStart?: (metrics: QueueStartMetrics) => void;
}

export interface QueueConfig {
  maxConcurrent?: number;
  maxBackgroundConcurrent?: number;
  maxForegroundPending?: number;
  maxBackgroundPending?: number;
  defaultExpiryMs?: number;
  defaultRunTimeoutMs?: number;
}

export class QueueFullError extends Error {
  constructor(lane: QueueLane) {
    super(`The ${lane} AI queue is full. Please try again shortly.`);
    this.name = "QueueFullError";
  }
}

export class QueueExpiredError extends Error {
  constructor() {
    super("The AI request expired before it could start.");
    this.name = "QueueExpiredError";
  }
}

interface QueueJob<T> {
  lane: QueueLane;
  work: (signal: AbortSignal) => Promise<T>;
  options: QueueOptions;
  enqueuedAt: number;
  expiresAt: number;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  expiryTimer?: ReturnType<typeof setTimeout>;
  queuedAbort?: () => void;
  state: "queued" | "running" | "settled";
}

export class AiRequestQueue {
  private readonly maxConcurrent: number;
  private readonly maxBackgroundConcurrent: number;
  private readonly maxForegroundPending: number;
  private readonly maxBackgroundPending: number;
  private readonly defaultExpiryMs: number;
  private readonly defaultRunTimeoutMs: number;
  private readonly foreground: QueueJob<unknown>[] = [];
  private readonly background: QueueJob<unknown>[] = [];
  private active = 0;
  private activeBackground = 0;

  constructor(config: QueueConfig = {}) {
    this.maxConcurrent = config.maxConcurrent ?? 2;
    this.maxBackgroundConcurrent = config.maxBackgroundConcurrent ?? 1;
    this.maxForegroundPending = config.maxForegroundPending ?? 20;
    this.maxBackgroundPending = config.maxBackgroundPending ?? 25;
    this.defaultExpiryMs = config.defaultExpiryMs ?? 15_000;
    this.defaultRunTimeoutMs = config.defaultRunTimeoutMs ?? 40_000;
  }

  enqueue<T>(work: (signal: AbortSignal) => Promise<T>, options: QueueOptions): Promise<T> {
    if (options.signal?.aborted) {
      return Promise.reject(abortReason(options.signal, new RequestCancelledError()));
    }
    const laneQueue = options.lane === "foreground" ? this.foreground : this.background;
    const pendingLimit = options.lane === "foreground" ? this.maxForegroundPending : this.maxBackgroundPending;
    if (laneQueue.length >= pendingLimit) return Promise.reject(new QueueFullError(options.lane));

    return new Promise<T>((resolve, reject) => {
      const expiresInMs = options.expiresInMs ?? this.defaultExpiryMs;
      const job: QueueJob<T> = {
        lane: options.lane,
        work,
        options,
        enqueuedAt: performance.now(),
        expiresAt: performance.now() + expiresInMs,
        resolve,
        reject,
        state: "queued",
      };
      job.expiryTimer = setTimeout(() => this.rejectQueued(job, new QueueExpiredError()), expiresInMs);
      if (options.signal) {
        job.queuedAbort = () => this.rejectQueued(job, abortReason(options.signal!, new RequestCancelledError()));
        options.signal.addEventListener("abort", job.queuedAbort, { once: true });
      }
      laneQueue.push(job as QueueJob<unknown>);
      this.drain();
    });
  }

  private rejectQueued<T>(job: QueueJob<T>, error: Error): void {
    if (job.state !== "queued") return;
    const queue = job.lane === "foreground" ? this.foreground : this.background;
    const index = queue.indexOf(job as QueueJob<unknown>);
    if (index >= 0) queue.splice(index, 1);
    job.state = "settled";
    this.clearQueuedResources(job);
    job.reject(error);
    this.drain();
  }

  private clearQueuedResources<T>(job: QueueJob<T>): void {
    if (job.expiryTimer) clearTimeout(job.expiryTimer);
    if (job.queuedAbort && job.options.signal) {
      job.options.signal.removeEventListener("abort", job.queuedAbort);
    }
  }

  private drain(): void {
    while (this.active < this.maxConcurrent) {
      let job = this.foreground.shift();
      if (!job && this.activeBackground < this.maxBackgroundConcurrent) job = this.background.shift();
      if (!job) return;
      if (performance.now() >= job.expiresAt) {
        job.state = "settled";
        this.clearQueuedResources(job);
        job.reject(new QueueExpiredError());
        continue;
      }
      this.start(job);
    }
  }

  private start(job: QueueJob<unknown>): void {
    if (job.state !== "queued") return;
    job.state = "running";
    this.clearQueuedResources(job);
    this.active += 1;
    if (job.lane === "background") this.activeBackground += 1;

    const deadline = createDeadlineSignal(
      job.options.signal,
      job.options.runTimeoutMs ?? this.defaultRunTimeoutMs,
    );
    try {
      job.options.onStart?.({
        queue_wait_ms: Math.round((performance.now() - job.enqueuedAt) * 100) / 100,
        queue_depth: this.foreground.length + this.background.length,
        active_requests: this.active,
      });
    } catch {
      // Telemetry cannot affect queue correctness.
    }

    const aborted = new Promise<never>((_, reject) => {
      if (deadline.signal.aborted) reject(abortReason(deadline.signal));
      else deadline.signal.addEventListener("abort", () => reject(abortReason(deadline.signal)), { once: true });
    });
    const execution = Promise.resolve().then(() => job.work(deadline.signal));
    Promise.race([execution, aborted]).then(
      (value) => this.finish(job, deadline.cleanup, () => job.resolve(value)),
      (error) => this.finish(job, deadline.cleanup, () => {
        if (deadline.timedOut() && !(error instanceof RequestTimeoutError)) job.reject(new RequestTimeoutError());
        else job.reject(error);
      }),
    );
  }

  private finish(job: QueueJob<unknown>, cleanup: () => void, settle: () => void): void {
    if (job.state !== "running") return;
    job.state = "settled";
    cleanup();
    this.active -= 1;
    if (job.lane === "background") this.activeBackground -= 1;
    settle();
    this.drain();
  }
}

const aiQueue = new AiRequestQueue();

export function enqueueAi<T>(
  work: (signal: AbortSignal) => Promise<T>,
  options: QueueOptions,
): Promise<T> {
  return aiQueue.enqueue(work, options);
}
