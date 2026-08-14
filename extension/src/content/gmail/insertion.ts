import type { StructuredDraft } from "../panel/PanelHost";

const EDITOR_SELECTORS = [
  '[contenteditable="true"][role="textbox"]',
  '[contenteditable="true"][aria-label*="Message Body"]',
  '.Am.Al.editable',
  'div[role="textbox"][contenteditable="true"]',
];
const REPLY_SELECTORS = ['[data-tooltip="Reply"]', '[aria-label="Reply"]'];
const COMPOSE_TRIGGER_SELECTORS = ['[gh="cm"]', '[data-tooltip="Compose"]', '[aria-label="Compose"]'];
const TO_SELECTORS = [
  'input[name="to"]',
  'input[aria-label^="To"]',
  'input[aria-label^="Recipients"]',
  'input[aria-label*="recipients"]',
  'div[aria-label*="To"][contenteditable="true"]',
  'div[aria-label*="recipients"][contenteditable="true"]',
];
const SUBJECT_SELECTORS = [
  'input[name="subjectbox"]',
  'input[placeholder="Subject"]',
  'input[aria-label="Subject"]',
  'input[aria-label*="Subject"]',
  'input[aria-label*="subject"]',
];

function isVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null || element.getClientRects().length > 0;
}

function findVisible(selectors: string[]): HTMLElement | undefined {
  for (const selector of selectors) {
    const element = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(isVisible);
    if (element) return element;
  }
}

export type ComposeBoxResult =
  | { ok: true; composer: HTMLElement }
  | { ok: false; reason: "no_composer" };

export function getComposeBox(): HTMLElement | undefined {
  for (const selector of EDITOR_SELECTORS) {
    const boxes = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(isVisible);
    if (boxes.length) return boxes[boxes.length - 1];
  }
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

function waitForStableDialog(timeoutMs = 2_000): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      // After compose opens, Gmail may batch-render dialog fields.
      const composer = getComposeBox();
      const to = TO_SELECTORS.some((s) => document.querySelector(s));
      if (composer && to) { resolve(); return; }
      if (Date.now() - startedAt >= timeoutMs) { resolve(); return; }
      window.setTimeout(check, 80);
    };
    const startedAt = Date.now();
    check();
  });
}

async function openEditor(timeoutMs: number): Promise<HTMLElement | undefined> {
  const existing = getComposeBox();
  if (existing) return existing;
  const trigger = findVisible(COMPOSE_TRIGGER_SELECTORS);
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
  const existing = getComposeBox();
  if (existing) {
    if (replace) replaceComposerText(existing);
    insertComposerText(text, existing);
    return true;
  }
  const trigger = findVisible(REPLY_SELECTORS);
  if (!trigger) return false;
  trigger.click();
  const composer = await waitForComposeBox(timeoutMs);
  if (!composer) return false;
  if (replace) replaceComposerText(composer);
  insertComposerText(text, composer);
  return true;
}

function trySetField(selectors: string[], value: string): boolean {
  const field = findVisible(selectors);
  if (!(field instanceof HTMLInputElement)) return false;
  // contenteditable divs used in some Gmail layouts
  if (field.isContentEditable) {
    field.focus();
    field.textContent = value;
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    return true;
  }
  setFieldValue(field, value);
  return true;
}

export async function insertDraftIntoGmail(draft: StructuredDraft, replace: boolean, timeoutMs = 4_000): Promise<ComposeBoxResult> {
  const composer = await openEditor(timeoutMs);
  if (!composer) return { ok: false, reason: "no_composer" };

  // Give compose dialog fields a moment to render after opening.
  await waitForStableDialog(2_000);

  if (isValidRecipient(draft.to)) {
    const success = trySetField(TO_SELECTORS, draft.to.trim());
    if (!success) return { ok: false, reason: "no_composer" };
  }
  if (draft.subject) {
    const success = trySetField(SUBJECT_SELECTORS, draft.subject);
    if (!success) return { ok: false, reason: "no_composer" };
  }
  if (replace) replaceComposerText(composer);
  insertComposerText(draftBody(draft), composer);
  return { ok: true, composer };
}
