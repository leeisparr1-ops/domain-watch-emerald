import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure the PWA service worker is registered on app load (PWABuilder score + offline support)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Ignore registration errors (e.g., unsupported contexts)
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
