import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import { TypinkProvider } from "typink";
import App from "./App";
import "./index.css";
import { MetaMaskProvider } from "./providers/MetaMaskProvider";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TypinkProvider appName="Polkadot UI Template">
        <MetaMaskProvider>
          <App />
        </MetaMaskProvider>
      </TypinkProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
