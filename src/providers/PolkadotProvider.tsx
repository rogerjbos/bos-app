import { CHAINS, DEFAULT_CHAIN } from "@/config/chains";
import { ApiPromise, WsProvider } from "@polkadot/api";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ProviderState = {
  api: ApiPromise | null;
  status: "not-connected" | "connecting" | "connected" | "error";
  currentEndpoint: string;
  switchNetwork: (newEndpoint: string) => Promise<void>;
};

const PolkadotContext = createContext<ProviderState>({
  api: null,
  status: "not-connected",
  currentEndpoint: DEFAULT_CHAIN.endpoint,
  switchNetwork: async () => {},
});

export function usePolkadot() {
  return useContext(PolkadotContext);
}

export function usePolkadotContext() {
  return useContext(PolkadotContext);
}

export function PolkadotProvider({
  children,
  endpoint,
}: {
  children: React.ReactNode;
  endpoint?: string;
}) {
  // Get initial endpoint from localStorage or use default
  const getInitialEndpoint = () => {
    if (endpoint) return endpoint;
    const savedNetwork = localStorage.getItem("selected_network");
    if (savedNetwork) {
      const savedChain = Object.values(CHAINS).find(
        (c: any) => c.name === savedNetwork
      );
      if (savedChain) return (savedChain as any).endpoint;
    }
    return DEFAULT_CHAIN.endpoint;
  };

  const [currentEndpoint, setCurrentEndpoint] =
    useState<string>(getInitialEndpoint());
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [status, setStatus] =
    useState<ProviderState["status"]>("not-connected");

  useEffect(() => {
    let mounted = true;

    const connectWithFallback = async () => {
      setStatus("connecting");

      // Find chain config for current endpoint to get all fallback endpoints
      const chainConfig = Object.values(CHAINS).find(
        (c) =>
          c.endpoint === currentEndpoint ||
          c.endpoints.includes(currentEndpoint)
      );

      // Use all endpoints if available, otherwise just the current one
      const endpointsToTry = chainConfig?.endpoints || [currentEndpoint];

      let lastError: Error | null = null;

      // Try each endpoint in order
      for (const endpointUrl of endpointsToTry) {
        if (!mounted) return;

        try {
          console.log(`Attempting to connect to: ${endpointUrl}`);
          const provider = new WsProvider(endpointUrl);
          const apiInstance = await ApiPromise.create({ provider });
          await apiInstance.isReady;

          if (!mounted) {
            await apiInstance.disconnect();
            return;
          }

          console.log(`Successfully connected to: ${endpointUrl}`);
          setApi(apiInstance);
          setStatus("connected");
          return; // Success! Exit the loop
        } catch (e) {
          console.warn(`Failed to connect to ${endpointUrl}:`, e);
          lastError = e as Error;
          // Continue to next endpoint
        }
      }

      // If we get here, all endpoints failed
      if (mounted) {
        console.error("Failed to connect to any endpoint", lastError);
        setStatus("error");
      }
    };

    connectWithFallback();

    return () => {
      mounted = false;
      if (api) {
        api.disconnect().catch(console.error);
      }
    };
  }, [currentEndpoint]);

  const switchNetwork = async (newEndpoint: string) => {
    if (newEndpoint === currentEndpoint) return;

    // Disconnect current API
    if (api) {
      await api.disconnect();
      setApi(null);
    }

    // Set new endpoint (will trigger useEffect to reconnect)
    setCurrentEndpoint(newEndpoint);
  };

  const value = useMemo(
    () => ({
      api,
      status,
      currentEndpoint,
      switchNetwork,
    }),
    [api, status, currentEndpoint]
  );

  return (
    <PolkadotContext.Provider value={value}>
      {children}
    </PolkadotContext.Provider>
  );
}
