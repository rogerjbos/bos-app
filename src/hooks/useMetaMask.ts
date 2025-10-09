import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useMetaMask() {
  const [isInstalled, setIsInstalled] = useState<boolean>(
    typeof window !== "undefined" && !!window.ethereum
  );
  const [accounts, setAccounts] = useState<string[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [chainId, setChainId] = useState<string | null>(null);

  const handleAccountsChanged = useCallback((accs: string[]) => {
    setAccounts(accs || []);
    setConnected(Array.isArray(accs) && accs.length > 0);
  }, []);

  const handleChainChanged = useCallback((id: string) => {
    setChainId(id);
  }, []);

  useEffect(() => {
    setIsInstalled(typeof window !== "undefined" && !!window.ethereum);

    if (!window?.ethereum) return;

    try {
      const eth = window.ethereum;
      // Read initial accounts (may be empty)
      eth.request({ method: "eth_accounts" }).then((accs: string[]) => {
        handleAccountsChanged(accs);
      });

      eth.request({ method: "eth_chainId" }).then((id: string) => {
        setChainId(id);
      });

      eth.on && eth.on("accountsChanged", handleAccountsChanged);
      eth.on && eth.on("chainChanged", handleChainChanged);
    } catch (error) {
      console.warn("useMetaMask init error", error);
    }

    return () => {
      try {
        window.ethereum?.removeListener?.(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
      } catch (e) {
        // ignore
      }
    };
  }, [handleAccountsChanged, handleChainChanged]);

  const connect = useCallback(async () => {
    if (!window?.ethereum) throw new Error("MetaMask is not installed");
    try {
      const accs: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      handleAccountsChanged(accs);
      const id: string = await window.ethereum.request({
        method: "eth_chainId",
      });
      setChainId(id);
      return accs;
    } catch (error) {
      throw error;
    }
  }, [handleAccountsChanged]);

  const disconnect = useCallback(() => {
    // MetaMask doesn't provide a programmatic disconnect. We clear local state.
    setAccounts([]);
    setConnected(false);
  }, []);

  return {
    isInstalled,
    accounts,
    connected,
    chainId,
    connect,
    disconnect,
  };
}

export default useMetaMask;
