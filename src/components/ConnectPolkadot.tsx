import { useSIWSAuth, useWalletConnect } from '@shawncoe/siws-auth/react';
import { ChevronDown, RefreshCw, Shield, UserCheck, Wallet } from "lucide-react";
import { useState } from 'react';
import { Button } from "./ui/Button";

export default function ConnectPolkadot() {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const { signIn, isSigningIn, isAuthenticated, error } = useSIWSAuth();
  const { connect, accounts, isConnecting } = useWalletConnect();

  const address = accounts[0]?.address;

  const handleConnect = async () => {
    try {
      await connect();
      // Log addresses after connection
      setTimeout(() => {
        if (accounts.length > 0) {
          // Connection successful
        }
      }, 100);
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await connect(); // Re-connect will allow account selection
      // Log addresses after account switch
      setTimeout(() => {
        if (accounts.length > 0) {
          // Account switch successful
        }
      }, 100);
      setShowAccountMenu(false);
    } catch (err) {
      console.error('Account switching failed:', err);
      // Don't show error alert for rate limiting - it's handled automatically
      if (!(err instanceof Error) || !err.message?.includes('Rate limit exceeded')) {
        alert('Failed to switch accounts. Please try again or check your Polkadot extension.');
        setShowAccountMenu(false);
      }
    }
  };

  const handleRefreshAccounts = async () => {
    try {
      await connect(); // Re-connect to refresh accounts
      // Log addresses after refresh
      setTimeout(() => {
        if (accounts.length > 0) {
          // Refresh successful
        }
      }, 100);
      setShowAccountMenu(false);
    } catch (err) {
      console.error('Failed to refresh accounts:', err);
      // Don't show error alert for rate limiting - it's handled automatically
      if (!(err instanceof Error) || !err.message?.includes('Rate limit exceeded')) {
        setShowAccountMenu(false);
      }
    }
  };

  const handleAuthenticate = async () => {
    if (!address) return;

    try {
      await signIn({
        address,
        network: "polkadot",
        statement: "Sign in to Bos App with your Polkadot account"
      });
    } catch (err) {
      console.error('SIWS authentication failed:', err);
    }
  };

  const handleDisconnect = () => {
    // SIWS handles sign out
    window.location.reload(); // Simple way to clear all state
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-white/10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              Polkadot
              {accounts.length > 0 && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Substrate wallet {isAuthenticated && <span className="text-green-400">• Authenticated</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {accounts.length > 0 ? (
            <>
              <div className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
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
                        onClick={handleRefreshAccounts}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                      <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                      {isAuthenticated ? (
                        <button
                          onClick={handleDisconnect}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          ✕ Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={handleAuthenticate}
                          disabled={isSigningIn}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Shield className="w-4 h-4" />
                          {isSigningIn ? 'Authenticating...' : 'Authenticate'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button
              size="sm"
              variant="default"
              onClick={handleConnect}
              disabled={isConnecting}
              className="h-8 px-4 text-sm"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
          {error}
        </div>
      )}

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
