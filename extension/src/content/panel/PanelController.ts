import type { EmailContext, SpamResult, StructuredAiResult, UrlVerdict } from "../../shared/types";

export type SecurityPanelData =
  | { type: "priority"; context: EmailContext; status: "result"; result: Extract<StructuredAiResult, { kind: "priority" }>; retry: () => void }
  | { type: "spam"; context: EmailContext; status: "result"; result: SpamResult; retry: () => void }
  | { type: "links"; context: EmailContext; status: "result" | "none"; results: UrlVerdict[]; checkedCount: number; retry: () => void }
  | { type: "priority" | "spam" | "links"; context: EmailContext; status: "unavailable"; message: string; retry: () => void };

export type PanelListener = {
  onEmailContextChanged?: (context: EmailContext | null) => void;
  onPanelFind?: () => void;
  onActionRequested?: (action: string, context: any) => void;
  onSecurityRequested?: (data: SecurityPanelData) => void;
  onToastRequested?: (message: string, type: "success" | "error") => void;
};

export class PanelController {
  private listeners: Set<PanelListener> = new Set();
  public emailContext: EmailContext | null = null;

  public subscribe(listener: PanelListener): () => void {
    this.listeners.add(listener);
    // Initial sync
    if (listener.onEmailContextChanged) {
      listener.onEmailContextChanged(this.emailContext);
    }
    return () => this.listeners.delete(listener);
  }

  public setEmailContext(context: EmailContext | null) {
    if (this.emailContext?.id === context?.id) return;
    this.emailContext = context;
    this.listeners.forEach((listener) => listener.onEmailContextChanged?.(context));
  }

  public findPanel() {
    this.listeners.forEach((l) => l.onPanelFind?.());
  }

  public requestAction(action: string, context: any) {
    this.listeners.forEach((l) => l.onActionRequested?.(action, context));
  }

  public requestSecurity(data: SecurityPanelData) {
    this.listeners.forEach((listener) => listener.onSecurityRequested?.(data));
  }

  public showToast(message: string, type: "success" | "error" = "success") {
    this.listeners.forEach((l) => l.onToastRequested?.(message, type));
  }
}
