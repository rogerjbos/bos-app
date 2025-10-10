import { ExternalLink, Wallet, RefreshCw } from "lucide-react";
import { useMetaMaskContext } from "../providers/MetaMaskProvider";
import { Button } from "./ui/Button";

export default function ConnectMetaMask() {
  // Use shared context from MetaMaskProvider so UI reflects a single source of truth
  const { isInstalled, accounts, connected, connect, disconnect, refreshAccounts } =
    useMetaMaskContext();

  const address = accounts[0];

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">MetaMask</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Ethereum wallet (EVM)</div>
        </div>
      </div>

      <div>
        {isInstalled ? (
          // Show either the connected address with actions or a prominent Connect button
          connected ? (
            <div className="flex items-center gap-2">
              <div className="text-sm text-green-400 max-w-[220px] truncate">
                {address}
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
              >
                <RefreshCw className="w-4 h-4" />
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
              >
                Disconnect
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
              className="min-w-[96px]"
            >
              Connect
            </Button>
          )
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open("https://metamask.io/", "_blank")}
            className="min-w-[96px]"
          >
            Install <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
