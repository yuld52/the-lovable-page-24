import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global error handler to debug white screen
window.onerror = function (message, source, lineno, colno, error) {
    const errorContainer = document.createElement('div');
    errorContainer.style.position = 'fixed';
    errorContainer.style.top = '0';
    errorContainer.style.left = '0';
    errorContainer.style.width = '100%';
    errorContainer.style.backgroundColor = '#f8d7da';
    errorContainer.style.color = '#721c24';
    errorContainer.style.padding = '20px';
    errorContainer.style.zIndex = '9999';
    errorContainer.style.fontFamily = 'monospace';
    errorContainer.style.whiteSpace = 'pre-wrap';
    errorContainer.innerText = `Error: ${message}\nSource: ${source}:${lineno}:${colno}\nStack: ${error?.stack}`;
    document.body.appendChild(errorContainer);
};

try {
    const rootElement = document.getElementById("root");
    if (!rootElement) throw new Error("Root element not found");

    createRoot(rootElement).render(<App />);
} catch (e: any) {
    console.error("Render error:", e);
    document.body.innerText = `Render Error: ${e.message}\n${e.stack}`;
}