import { ChevronDown, ExternalLink, RefreshCw, UserCheck, Wallet } from "lucide-react";
import { useState } from "react";
import { useMetaMaskContext } from "../providers/MetaMaskProvider";
import { Button } from "./ui/Button";

export default function ConnectMetaMask() {
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Use the MetaMask context
  const { isInstalled, accounts, connected, connect, disconnect, refreshAccounts, switchAccount } = useMetaMaskContext();

  const address = accounts[0];

  const handleAuthenticate = async () => {
    // For now, just show that authentication would happen
    alert('MetaMask authentication would happen here');
  };

  const handleDisconnect = () => {
    disconnect && disconnect();
  };

  const handleSwitchAccount = async () => {
    // For MetaMask, account switching must be done through the extension
    // We'll try to trigger account selection, but it may not always work
    try {
      await switchAccount();
      setShowAccountMenu(false);
    } catch (error) {
      console.warn("Failed to switch MetaMask accounts:", error);
      // Show user feedback that they need to switch in MetaMask extension
      alert('To switch accounts, please use the MetaMask extension in your browser. Click the MetaMask icon and select a different account.');
      setShowAccountMenu(false);
    }
  };

  const handleRefreshAccounts = async () => {
    try {
      await refreshAccounts();
      setShowAccountMenu(false);
    } catch (error) {
      console.warn("Failed to refresh MetaMask accounts:", error);
      setShowAccountMenu(false);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              MetaMask
              {connected && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              EVM wallet {connected && <span className="text-green-400">• Connected</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isInstalled ? (
            connected ? (
              <>
                <div className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">
                  {address ? truncateAddress(address) : 'Connected'}
                </div>
                <div className="relative">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="h-8 w-8 p-0"
                    title="Account options"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </Button>

                  {showAccountMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                      <div className="py-1">
                        <button
                          onClick={handleSwitchAccount}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <UserCheck className="w-4 h-4" />
                          Switch Account
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await refreshAccounts();
                            } catch (e) {
                              console.warn("Failed to refresh accounts", e);
                            }
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Refresh
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                        <button
                          onClick={handleDisconnect}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          ✕ Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Button
                size="sm"
                variant="default"
                onClick={async () => {
                  try {
                    await connect();
                  } catch (e) {
                    console.warn("MetaMask connect failed", e);
                  }
                }}
                className="h-8 px-4 text-sm"
              >
                Connect
              </Button>
            )
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open("https://metamask.io/", "_blank")}
              className="h-8 px-4 text-sm"
            >
              Install <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showAccountMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAccountMenu(false)}
        />
      )}
    </div>
  );
}
