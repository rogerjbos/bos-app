import React from "react";
import { createRoot } from "react-dom/client";
import MelodyLab from "./pages/Melodylab";

// Standalone entry for the MelodyLab iframe document. It is served from its own
// HTML file (/melody-frame.html) with a relaxed CSP — `script-src` allows
// 'unsafe-eval' and data: there, which Strudel needs to compile patterns and
// load its AudioWorklet. The rest of the app keeps a strict script-src 'self'.
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MelodyLab />
  </React.StrictMode>
);
