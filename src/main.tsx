import { createRoot } from "react-dom/client";
import "./index.css";

const APP_SHELL_VERSION = "2026-04-02-auth-cache-fix-1";
const PREVIEW_RELOAD_KEY = "sw-preview-reloaded";
const VERSION_STORAGE_KEY = "eh_app_shell_version";
const VERSION_RELOAD_KEY = "eh_app_shell_version_reload";

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

async function clearServiceWorkerState() {
  let hadState = false;

  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    hadState ||= regs.length > 0;
    await Promise.all(regs.map((r) => r.unregister()));
  }

  if ("caches" in window) {
    const names = await caches.keys();
    hadState ||= names.length > 0;
    await Promise.all(names.map((n) => caches.delete(n)));
  }

  return hadState;
}

async function cleanupServiceWorkerInPreview() {
  if (!isPreviewOrDev) return true;
  if (!("serviceWorker" in navigator)) return true;

  try {
    const wasControlled = !!navigator.serviceWorker.controller;
    const hadState = await clearServiceWorkerState();
    const didReload = sessionStorage.getItem(PREVIEW_RELOAD_KEY) === "1";

    if ((wasControlled || hadState) && !didReload) {
      sessionStorage.setItem(PREVIEW_RELOAD_KEY, "1");
      window.location.reload();
      return false;
    }

    sessionStorage.removeItem(PREVIEW_RELOAD_KEY);
  } catch (e) {
    console.warn("[preview] SW cleanup failed:", e);
  }

  return true;
}

async function refreshPublishedServiceWorkerOnVersionChange() {
  if (isPreviewOrDev) return true;
  if (!("serviceWorker" in navigator)) return true;

  try {
    const previousVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    const didReload = sessionStorage.getItem(VERSION_RELOAD_KEY) === APP_SHELL_VERSION;

    if (previousVersion !== APP_SHELL_VERSION) {
      localStorage.setItem(VERSION_STORAGE_KEY, APP_SHELL_VERSION);
      const hadState = await clearServiceWorkerState();

      if (hadState && !didReload) {
        sessionStorage.setItem(VERSION_RELOAD_KEY, APP_SHELL_VERSION);
        window.location.reload();
        return false;
      }
    }

    sessionStorage.removeItem(VERSION_RELOAD_KEY);
  } catch (e) {
    console.warn("[app] SW version refresh failed:", e);
  }

  return true;
}

async function bootstrap() {
  const previewReady = await cleanupServiceWorkerInPreview();
  if (!previewReady) return;

  const publishedReady = await refreshPublishedServiceWorkerOnVersionChange();
  if (!publishedReady) return;

  const { default: App } = await import("./App.tsx");

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
