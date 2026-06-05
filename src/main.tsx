import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log("PWA update available");
    },
    onOfflineReady() {
      console.log("PWA ready for offline");
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
