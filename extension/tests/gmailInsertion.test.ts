import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getComposeText, insertDraftIntoGmail, insertReplyIntoGmail } from "../src/content/gmail/insertion";

function visible<T extends HTMLElement>(element: T): T {
  Object.defineProperty(element, "offsetParent", { configurable: true, value: document.body });
  return element;
}

function editor(text = ""): HTMLElement {
  const element = visible(document.createElement("div"));
  element.setAttribute("contenteditable", "true");
  element.setAttribute("role", "textbox");
  element.textContent = text;
  document.body.appendChild(element);
  return element;
}

beforeEach(() => {
  document.body.replaceChildren();
  Object.defineProperty(document, "execCommand", { configurable: true, value: vi.fn(() => true) });
});

afterEach(() => vi.restoreAllMocks());

describe("Gmail insertion", () => {
  test("opens Reply and inserts text with a Gmail-compatible InputEvent", async () => {
    const reply = visible(document.createElement("button"));
    reply.setAttribute("data-tooltip", "Reply");
    document.body.appendChild(reply);
    const input = vi.fn();
    reply.addEventListener("click", () => editor().addEventListener("input", input));

    await expect(insertReplyIntoGmail("Thanks for the update.", false)).resolves.toBe(true);
    const composer = document.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(document.execCommand).toHaveBeenCalledWith("insertText", false, "Thanks for the update.");
    expect(input).toHaveBeenCalledTimes(1);
    expect(getComposeText()).toBe(composer.textContent);
  });

  test("opens Compose and puts recipient, subject, and body in separate fields", async () => {
    const compose = visible(document.createElement("button"));
    compose.setAttribute("gh", "cm");
    document.body.appendChild(compose);
    let recipient: HTMLInputElement;
    let subject: HTMLInputElement;
    compose.addEventListener("click", () => {
      recipient = visible(document.createElement("input"));
      recipient.name = "to";
      subject = visible(document.createElement("input"));
      subject.name = "subjectbox";
      document.body.append(recipient, subject);
      editor();
    });

    await expect(insertDraftIntoGmail({
      kind: "draft", to: "ada@example.com", subject: "Project update", greeting: "Hello Ada,", body: "The project is on track.", sign_off: "Best,",
    }, false)).resolves.toBe(true);

    expect(recipient!.value).toBe("ada@example.com");
    expect(subject!.value).toBe("Project update");
    expect(document.execCommand).toHaveBeenCalledWith("insertText", false, "Hello Ada,\n\nThe project is on track.\n\nBest,");
  });

  test("replaces existing content only on explicit replacement", async () => {
    const composer = editor("Existing reply");

    await expect(insertReplyIntoGmail("New reply", true)).resolves.toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith("selectAll", false);
    expect(document.execCommand).toHaveBeenCalledWith("delete", false);
    expect(composer.dispatchEvent).toBeDefined();
  });

  test("returns false when Gmail reply or compose controls are unavailable", async () => {
    await expect(insertReplyIntoGmail("Reply", false)).resolves.toBe(false);
    await expect(insertDraftIntoGmail({
      kind: "draft", to: null, subject: "Subject", greeting: "Hello,", body: "Body", sign_off: "Regards,",
    }, false)).resolves.toBe(false);
  });

  test("recovers when Gmail does not open an editor or expose requested draft fields", async () => {
    const reply = visible(document.createElement("button"));
    reply.setAttribute("data-tooltip", "Reply");
    document.body.appendChild(reply);
    await expect(insertReplyIntoGmail("Reply", false, 10)).resolves.toBe(false);

    const compose = visible(document.createElement("button"));
    compose.setAttribute("gh", "cm");
    compose.addEventListener("click", () => editor());
    document.body.appendChild(compose);
    await expect(insertDraftIntoGmail({
      kind: "draft", to: "ada@example.com", subject: "Subject", greeting: "Hello,", body: "Body", sign_off: "Regards,",
    }, false)).resolves.toBe(false);
  });
});
