import { Buffer } from "buffer";
// Expose single Buffer class globally before any GramJS code runs
(window as unknown as Record<string, unknown>).Buffer = Buffer;

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
