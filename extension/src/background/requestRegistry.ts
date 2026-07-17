import { RequestCancelledError } from "../shared/abort";

export class RequestRegistry {
  private readonly controllers = new Map<string, AbortController>();
  private readonly pendingCancellations = new Map<string, number>();

  private prunePendingCancellations(): void {
    const cutoff = Date.now() - 60_000;
    for (const [requestId, createdAt] of this.pendingCancellations) {
      if (createdAt >= cutoff) break;
      this.pendingCancellations.delete(requestId);
    }
    while (this.pendingCancellations.size > 100) {
      this.pendingCancellations.delete(this.pendingCancellations.keys().next().value!);
    }
  }

  register(requestId: string): AbortController {
    this.prunePendingCancellations();
    const existing = this.controllers.get(requestId);
    if (existing) {
      this.controllers.delete(requestId);
      existing.abort(new RequestCancelledError("Request superseded."));
    }
    const controller = new AbortController();
    if (this.pendingCancellations.delete(requestId)) {
      controller.abort(new RequestCancelledError());
      return controller;
    }
    this.controllers.set(requestId, controller);
    return controller;
  }

  cancel(requestId: string, message = "Request cancelled."): boolean {
    const controller = this.controllers.get(requestId);
    if (!controller) {
      this.pendingCancellations.delete(requestId);
      this.pendingCancellations.set(requestId, Date.now());
      this.prunePendingCancellations();
      return true;
    }
    this.controllers.delete(requestId);
    controller.abort(new RequestCancelledError(message));
    return true;
  }

  release(requestId: string, controller: AbortController): void {
    if (this.controllers.get(requestId) === controller) this.controllers.delete(requestId);
  }

  get size(): number {
    return this.controllers.size;
  }
}
