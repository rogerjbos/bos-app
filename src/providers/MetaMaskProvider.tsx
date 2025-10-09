import React, { createContext, useContext } from "react";
import useMetaMask from "../hooks/useMetaMask";

type MetaMaskContextValue = ReturnType<typeof useMetaMask>;

const MetaMaskContext = createContext<MetaMaskContextValue | undefined>(
  undefined
);

export const MetaMaskProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const meta = useMetaMask();

  return (
    <MetaMaskContext.Provider value={meta}>{children}</MetaMaskContext.Provider>
  );
};

export function useMetaMaskContext() {
  const ctx = useContext(MetaMaskContext);
  if (!ctx)
    throw new Error("useMetaMaskContext must be used within MetaMaskProvider");
  return ctx;
}

export default MetaMaskProvider;
