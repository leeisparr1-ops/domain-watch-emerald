import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Eagerly initialize the Lovable Cloud auth library so it can process
// OAuth callback tokens on ANY page the user lands on after redirect.
import "@/integrations/lovable/index";

// OAuth callback handler kept as safety net for any redirect-based tokens
import { handleOAuthCallback } from "@/lib/oauthCallback";

// Service worker is registered via index.html for PWABuilder detection
// No duplicate registration needed here

// Preview/dev safety: if a Service Worker caches Vite/React chunks, it can cause
// "Invalid hook call" (dispatcher null) due to stale/double React instances.
// In Lovable preview/dev, we aggressively unregister + clear caches.
const host = window.location.hostname;
const isPreviewOrDev =
  host.startsWith("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.includes("localhost") ||
  host.includes("127.0.0.1");

async function cleanupServiceWorkerInPreview() {
  if (!isPreviewOrDev) return;
  if (!("serviceWorker" in navigator)) return;

  // Run after 'load' because index.html registers the SW on load.
  window.addEventListener("load", async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));

      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }

      // If this page load was controlled by an existing SW, do a one-time reload
      // to ensure we boot without any SW interception.
      const wasControlled = !!navigator.serviceWorker.controller;
      const didReload = sessionStorage.getItem("sw-preview-reloaded") === "1";
      if (wasControlled && !didReload) {
        sessionStorage.setItem("sw-preview-reloaded", "1");
        window.location.reload();
      }
    } catch (e) {
      // Never block app startup
      console.warn("[preview] SW cleanup failed:", e);
    }
  });
}

cleanupServiceWorkerInPreview();

// Handle OAuth callback first, then render the app
handleOAuthCallback().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
