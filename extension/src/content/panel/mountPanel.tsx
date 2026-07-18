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

export function mountPanel(container: HTMLElement, host: PanelHost): PanelController {
  const controller = new PanelController();

  // Inject styles into the shadow root
  const styleEl = document.createElement("style");
  styleEl.textContent = [
    tokensCss,
    baseCss,
    componentsCss,
    layoutCss,
    segmentedControlCss,
    buttonCss,
    tabsCss,
    feedbackCss,
    fieldsCss,
    dialogCss,
    panelCss
  ].join("\n");
  
  const rootNode = container.getRootNode() as ShadowRoot;
  if (rootNode instanceof ShadowRoot) {
    installThemeSync(rootNode.host as HTMLElement);
    rootNode.appendChild(styleEl);
  } else {
    container.appendChild(styleEl);
  }

  const appContainer = document.createElement("div");
  appContainer.id = "mailx-react-root";
  container.appendChild(appContainer);

  const root = createRoot(appContainer);
  root.render(<PanelApp controller={controller} host={host} />);

  return controller;
}
