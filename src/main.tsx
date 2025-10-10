import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { MetaMaskProvider } from "./providers/MetaMaskProvider";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MetaMaskProvider>
        <App />
      </MetaMaskProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
