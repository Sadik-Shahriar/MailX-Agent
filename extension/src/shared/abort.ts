export class RequestTimeoutError extends Error {
  constructor(message = "Request timed out.") {
    super(message);
    this.name = "TimeoutError";
  }
}

export class RequestCancelledError extends Error {
  constructor(message = "Request cancelled.") {
    super(message);
    this.name = "AbortError";
  }
}

export function abortReason(signal: AbortSignal, fallback = new RequestCancelledError()): Error {
  return signal.reason instanceof Error ? signal.reason : fallback;
}

export function createDeadlineSignal(parent: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
  timedOut: () => boolean;
} {
  const controller = new AbortController();
  let timeoutReached = false;
  const onParentAbort = () => controller.abort(abortReason(parent!));
  if (parent?.aborted) onParentAbort();
  else parent?.addEventListener("abort", onParentAbort, { once: true });

  const timer = setTimeout(() => {
    timeoutReached = true;
    controller.abort(new RequestTimeoutError());
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => timeoutReached,
    cleanup: () => {
      clearTimeout(timer);
      parent?.removeEventListener("abort", onParentAbort);
    },
  };
}
