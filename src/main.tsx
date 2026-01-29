import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Service worker is registered via index.html for PWABuilder detection
// No duplicate registration needed here

createRoot(document.getElementById("root")!).render(<App />);
