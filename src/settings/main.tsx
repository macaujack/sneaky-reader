import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import i18next from "i18next";
import { webviewWindow } from "@tauri-apps/api";

webviewWindow.getCurrentWebviewWindow()?.setTitle(i18next.t("settingsTitle"));
document.addEventListener("keydown", (event) => event.preventDefault());
document.addEventListener("contextmenu", (event) => event.preventDefault());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
