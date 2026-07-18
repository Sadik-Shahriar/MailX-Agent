import React from "react";
import { createRoot } from "react-dom/client";
import "../ui/styles/tokens.css";
import "../ui/styles/base.css";
import "../ui/styles/components.css";
import "../ui/components/Button.css";
import "../ui/components/Tabs.css";
import "../ui/components/Feedback.css";
import "../ui/components/Fields.css";
import "../ui/components/Dialog.css";
import "./popup.css";
import App from "./App";
import { installThemeSync } from "../ui/runtime/theme";

installThemeSync(document.documentElement);
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
