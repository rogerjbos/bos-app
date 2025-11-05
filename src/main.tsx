import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { MetaMaskProvider } from "./providers/MetaMaskProvider";
import { WalletAuthProvider } from "./providers/WalletAuthProvider";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MetaMaskProvider>
        <WalletAuthProvider>
          <App />
        </WalletAuthProvider>
      </MetaMaskProvider>
    </QueryClientProvider>
  </React.StrictMode>
);