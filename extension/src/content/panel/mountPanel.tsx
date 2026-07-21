import React from "react";
import { createRoot } from "react-dom/client";
import { PanelApp } from "./PanelApp";
import { PanelHost } from "./PanelHost";
import { PanelController } from "./PanelController";
import { installThemeSync } from "../../ui/runtime/theme";

import tokensCss from "../../ui/styles/tokens.css?inline";
import baseCss from "../../ui/styles/base.css?inline";
import componentsCss from "../../ui/styles/components.css?inline";
import layoutCss from "../../ui/components/Layout.css?inline";
import segmentedControlCss from "../../ui/components/SegmentedControl.css?inline";
import buttonCss from "../../ui/components/Button.css?inline";
import tabsCss from "../../ui/components/Tabs.css?inline";
import feedbackCss from "../../ui/components/Feedback.css?inline";
import fieldsCss from "../../ui/components/Fields.css?inline";
import dialogCss from "../../ui/components/Dialog.css?inline";
import panelCss from "./panel.css?inline";

function scopeCss(css: string): string {
  return `@scope (#mailx-root) {\n${css}\n}`;
}

export function mountPanel(container: HTMLElement, host: PanelHost): PanelController {
  const controller = new PanelController();

  const styleEl = document.createElement("style");
  styleEl.textContent = [
    tokensCss,
    scopeCss(baseCss),
    scopeCss(componentsCss),
    scopeCss(layoutCss),
    scopeCss(segmentedControlCss),
    scopeCss(buttonCss),
    scopeCss(tabsCss),
    scopeCss(feedbackCss),
    scopeCss(fieldsCss),
    scopeCss(dialogCss),
    scopeCss(panelCss),
  ].join("\n");

  installThemeSync(container.parentElement || document.documentElement);
  container.appendChild(styleEl);

  const appContainer = document.createElement("div");
  appContainer.id = "mailx-react-root";
  container.appendChild(appContainer);

  const root = createRoot(appContainer);
  root.render(<PanelApp controller={controller} host={host} />);

  return controller;
}
