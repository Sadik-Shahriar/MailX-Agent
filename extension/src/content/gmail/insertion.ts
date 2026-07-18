import type { StructuredDraft } from "../panel/PanelHost";

const EDITOR_SELECTOR = '[contenteditable="true"][role="textbox"]';
const REPLY_SELECTORS = ['[data-tooltip="Reply"]', '[aria-label="Reply"]'];
const COMPOSE_SELECTORS = ['[gh="cm"]', '[data-tooltip="Compose"]', '[aria-label="Compose"]'];
const TO_SELECTORS = ['input[name="to"]', 'input[aria-label^="To"]', 'input[aria-label^="Recipients"]'];
const SUBJECT_SELECTORS = ['input[name="subjectbox"]', 'input[placeholder="Subject"]', 'input[aria-label="Subject"]'];

function isVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null;
}

function findVisible(selectors: string[]): HTMLElement | undefined {
  for (const selector of selectors) {
    const element = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible);
    if (element) return element;
  }
}

export function getComposeBox(): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>(EDITOR_SELECTOR)).filter(isVisible).pop();
}

export function getComposeText(): string {
  return getComposeBox()?.textContent || "";
}

function waitForComposeBox(timeoutMs = 4_000): Promise<HTMLElement | undefined> {
  const existing = getComposeBox();
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const composer = getComposeBox();
      if (composer || Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(timer);
        resolve(composer);
      }
    }, 50);
  });
}

async function openEditor(selectors: string[], timeoutMs: number): Promise<HTMLElement | undefined> {
  const existing = getComposeBox();
  if (existing) return existing;
  const trigger = findVisible(selectors);
  if (!trigger) return undefined;
  trigger.click();
  return waitForComposeBox(timeoutMs);
}

function replaceComposerText(composer: HTMLElement): void {
  composer.focus();
  document.execCommand("selectAll", false);
  document.execCommand("delete", false);
  composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContentBackward" }));
}

function insertComposerText(text: string, composer: HTMLElement): void {
  composer.focus();
  document.execCommand("insertText", false, text);
  composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
}

function setFieldValue(field: HTMLInputElement, value: string): void {
  field.focus();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(field, value);
  field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function isValidRecipient(value: string | null): value is string {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function draftBody(draft: StructuredDraft): string {
  return [draft.greeting, draft.body, draft.sign_off].filter(Boolean).join("\n\n");
}

export async function insertReplyIntoGmail(text: string, replace: boolean, timeoutMs = 4_000): Promise<boolean> {
  const composer = await openEditor(REPLY_SELECTORS, timeoutMs);
  if (!composer) return false;
  if (replace) replaceComposerText(composer);
  insertComposerText(text, composer);
  return true;
}

export async function insertDraftIntoGmail(draft: StructuredDraft, replace: boolean, timeoutMs = 4_000): Promise<boolean> {
  const composer = await openEditor(COMPOSE_SELECTORS, timeoutMs);
  if (!composer) return false;

  if (isValidRecipient(draft.to)) {
    const recipient = findVisible(TO_SELECTORS);
    if (!(recipient instanceof HTMLInputElement)) return false;
    setFieldValue(recipient, draft.to.trim());
  }
  if (draft.subject) {
    const subject = findVisible(SUBJECT_SELECTORS);
    if (!(subject instanceof HTMLInputElement)) return false;
    setFieldValue(subject, draft.subject);
  }
  if (replace) replaceComposerText(composer);
  insertComposerText(draftBody(draft), composer);
  return true;
}
