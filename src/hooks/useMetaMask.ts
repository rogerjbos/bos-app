import { useCallback, useEffect, useRef, useState } from "react";

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

  // Use refs to store stable callback functions for event listeners
  const accountsChangedRef = useRef<(accs: string[]) => void>();
  const chainChangedRef = useRef<(id: string) => void>();

  const handleAccountsChanged = useCallback((accs: string[]) => {
    setAccounts(accs || []);
    setConnected(Array.isArray(accs) && accs.length > 0);
  }, []);

  const handleChainChanged = useCallback((id: string) => {
    setChainId(id);
  }, []);

  // Update refs when callbacks change
  useEffect(() => {
    accountsChangedRef.current = handleAccountsChanged;
    chainChangedRef.current = handleChainChanged;
  }, [handleAccountsChanged, handleChainChanged]);

  useEffect(() => {
    setIsInstalled(typeof window !== "undefined" && !!window.ethereum);

    if (!window?.ethereum) return;

    const setupMetaMask = async () => {
      try {
        const eth = window.ethereum;

        // Read initial accounts (may be empty)
        const accs = await eth.request({ method: "eth_accounts" });
        handleAccountsChanged(accs);

        const id = await eth.request({ method: "eth_chainId" });
        setChainId(id);

        // Set up event listeners with stable callback functions
        const accountsChangedCallback = (newAccounts: string[]) => {
          accountsChangedRef.current?.(newAccounts);
        };

        const chainChangedCallback = (newChainId: string) => {
          chainChangedRef.current?.(newChainId);
        };

        if (eth.on) {
          eth.on("accountsChanged", accountsChangedCallback);
          eth.on("chainChanged", chainChangedCallback);
        }

        // Store cleanup functions
        return () => {
          try {
            console.log("Cleaning up MetaMask listeners");
            if (window.ethereum?.removeListener) {
              window.ethereum.removeListener("accountsChanged", accountsChangedCallback);
              window.ethereum.removeListener("chainChanged", chainChangedCallback);
            }
          } catch (e) {
            console.warn("Error cleaning up listeners", e);
          }
        };
      } catch (error) {
        console.warn("useMetaMask init error", error);
      }
    };

    const cleanup = setupMetaMask();

    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []); // Remove dependencies since we're using refs

  const connect = useCallback(async () => {
    if (!window?.ethereum) throw new Error("MetaMask is not installed");
    try {
      // Try to request permissions first to ensure fresh account selection
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permError) {
        // Permission request failed or not supported, fall back to eth_requestAccounts
      }

      // Always request accounts to get the currently selected account in MetaMask
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

  // Method to refresh accounts - also prompts user to ensure we get current account
  const refreshAccounts = useCallback(async () => {
    if (!window?.ethereum) return;
    try {
      console.log("Refreshing accounts...");

      // Try to request permissions first
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permError) {
        // Permission request failed or not supported, fall back to eth_requestAccounts
      }

      const accs: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      handleAccountsChanged(accs);
      return accs;
    } catch (error) {
      console.warn("Failed to refresh accounts", error);
      return [];
    }
  }, [handleAccountsChanged]);

  return {
    isInstalled,
    accounts,
    connected,
    chainId,
    connect,
    disconnect,
    refreshAccounts,
  };
}

export default useMetaMask;
