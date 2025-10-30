import { ExternalLink, RefreshCw, Wallet } from "lucide-react";
import { useMetaMaskContext } from "../providers/MetaMaskProvider";
import { Button } from "./ui/Button";

export default function ConnectMetaMask() {
  // Use shared context from MetaMaskProvider so UI reflects a single source of truth
  const { isInstalled, accounts, connected, connect, disconnect, refreshAccounts } =
    useMetaMaskContext();

  const address = accounts[0];

  return (
    <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">MetaMask</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">EVM wallet</div>
        </div>
      </div>

      <div>
        {isInstalled ? (
          // Show either the connected address with actions or a prominent Connect button
          connected ? (
            <div className="flex items-center gap-1">
              <div className="text-xs text-green-400 font-mono">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await refreshAccounts();
                  } catch (e) {
                    console.warn("Failed to refresh accounts", e);
                  }
                }}
                title="Switch to a different account"
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  try {
                    // call provider disconnect if available
                    disconnect && disconnect();
                  } catch (e) {
                    console.warn("MetaMask disconnect failed", e);
                  }
                }}
                className="h-6 px-2 text-xs"
              >
                ✕
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={async () => {
                try {
                  // Connect will automatically get the currently selected account
                  await connect();
                } catch (e) {
                  console.warn("MetaMask connect failed", e);
                }
              }}
              className="h-7 px-3 text-xs"
            >
              Connect
            </Button>
          )
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open("https://metamask.io/", "_blank")}
            className="h-7 px-3 text-xs"
          >
            Install <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
