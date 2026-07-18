import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");

function sourceFiles(path: string): string[] {
  return readdirSync(path).flatMap((entry) => {
    const fullPath = `${path}/${entry}`;
    return statSync(fullPath).isDirectory() ? sourceFiles(fullPath) : [fullPath];
  });
}

function read(relativePath: string): string {
  return readFileSync(`${sourceRoot}/${relativePath}`, "utf8");
}

describe("MailX stylesheet loading", () => {
  test("uses only defined semantic design tokens", () => {
    const source = sourceFiles(sourceRoot)
      .filter((file) => /\.(css|ts|tsx)$/.test(file))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/--mx-color-[A-Za-z0-9-]+/);
    expect(source).not.toContain("--mx-radius-xl");
    expect(source).not.toMatch(/fontSize:\s*(10|11)|font-size:\s*(10|11)px/);
  });

  test("loads shared and component styles at the popup entry", () => {
    const popupEntry = read("popup/index.tsx");
    for (const stylesheet of [
      "tokens.css", "base.css", "components.css", "Button.css", "Tabs.css", "Feedback.css", "Fields.css", "Dialog.css", "popup.css",
    ]) {
      expect(popupEntry).toContain(stylesheet);
    }
  });

  test("injects every shared component stylesheet into the panel Shadow DOM", () => {
    const panelMount = read("content/panel/mountPanel.tsx");
    for (const stylesheet of ["buttonCss", "tabsCss", "feedbackCss", "fieldsCss", "dialogCss"]) {
      expect(panelMount).toContain(stylesheet);
    }
    expect(read("ui/styles/tokens.css")).toContain(":host");
  });
});
