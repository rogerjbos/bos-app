import Identicon from "@polkadot/react-identicon";
import { Check, ChevronRight, Download, User, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import ConnectMetaMask from "./ConnectMetaMask";
import { Button } from "./ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";

type View = "wallets" | "accounts";

interface PolkadotAccount {
  address: string;
  name?: string;
  source: string;
}

export default function ConnectWallet() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("wallets");
  const [polkadotAccounts, setPolkadotAccounts] = useState<PolkadotAccount[]>([]);
  const [connectedAccount, setConnectedAccount] = useState<PolkadotAccount | null>(null);
  const [extensions, setExtensions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize Polkadot extensions on mount
  useEffect(() => {
    const initExtensions = async () => {
      try {
        const exts = await web3Enable('Bos App');
        setExtensions(exts);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize Polkadot extensions:', error);
        setLoading(false);
      }
    };

    initExtensions();
  }, []);

  const handleConnectWallet = async (extensionName: string) => {
    try {
      const accounts = await web3Accounts({ extensions: [extensionName] });
      const polkadotAccounts = accounts.map(acc => ({
        address: acc.address,
        name: acc.meta.name,
        source: acc.meta.source,
      }));

      setPolkadotAccounts(polkadotAccounts);
      setView("accounts");
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleSelectAccount = (account: PolkadotAccount) => {
    setConnectedAccount(account);
    setOpen(false);
    setView("wallets");
  };

  const handleDisconnect = () => {
    setConnectedAccount(null);
    setPolkadotAccounts([]);
    setOpen(false);
    setView("wallets");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => setView("wallets"), 200);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Get available wallets from extensions
  const availableWallets = [
    {
      id: 'polkadot-js',
      name: 'Polkadot.js',
      installed: extensions.some(ext => ext.name === 'polkadot-js'),
    },
    {
      id: 'talisman',
      name: 'Talisman',
      installed: extensions.some(ext => ext.name === 'talisman'),
    },
    {
      id: 'subwallet-js',
      name: 'SubWallet',
      installed: extensions.some(ext => ext.name === 'subwallet-js'),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        variant={connectedAccount ? "secondary" : "default"}
        size="lg"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        {connectedAccount ? (
          <>
            <div className="flex items-center gap-2">
              <Identicon
                value={connectedAccount.address}
                size={24}
                theme="polkadot"
              />
              <span>
                {connectedAccount.name ||
                  truncateAddress(connectedAccount.address)}
              </span>
            </div>
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </>
        )}
      </Button>

      <DialogContent className="sm:max-w-[500px]">
        {view === "wallets" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-gradient">
                {connectedAccount
                  ? "Connected Wallets"
                  : "Connect Wallet"}
              </DialogTitle>
              <DialogDescription>
                {connectedAccount
                  ? "Select a wallet to view accounts or connect a new one"
                  : "Choose a wallet to connect to your account"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {/* MetaMask (EVM) option */}
              <ConnectMetaMask />

              {/* Polkadot wallets */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Substrate Wallets</h3>
                {loading ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    Loading wallet extensions...
                  </div>
                ) : availableWallets.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No Polkadot wallet extensions detected. Install a wallet extension to connect.
                  </div>
                ) : (
                  availableWallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="group relative flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-pink-500/50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {wallet.name}
                            </span>
                            {connectedAccount?.source === wallet.id && (
                              <div className="flex items-center gap-1 text-xs text-green-400">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                Connected
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {wallet.installed ? (
                          connectedAccount?.source === wallet.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setView("accounts")}
                                className="gap-1"
                              >
                                View Accounts
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnect()}
                              >
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleConnectWallet(wallet.id)}
                              className="gap-1"
                            >
                              Connect
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          )
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const installUrls: Record<string, string> = {
                                "polkadot-js": "https://polkadot.js.org/extension/",
                                talisman: "https://talisman.xyz/",
                                "subwallet-js": "https://subwallet.app/",
                              };
                              const url = installUrls[wallet.id];
                              if (url) window.open(url, "_blank");
                            }}
                            className="gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Install
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {connectedAccount && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDisconnect}
                  className="w-full"
                >
                  Disconnect All
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("wallets")}
                className="w-fit mb-2"
              >
                ← Back to Wallets
              </Button>
              <DialogTitle className="text-gradient">
                Select Account
              </DialogTitle>
              <DialogDescription>
                Choose an account to use with this application
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {polkadotAccounts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No accounts found</p>
                  <p className="text-sm mt-1">
                    Make sure you have created accounts in your wallet extension
                  </p>
                </div>
              ) : (
                polkadotAccounts.map((account) => {
                  const isSelected =
                    connectedAccount?.address === account.address;

                  return (
                    <button
                      key={account.address}
                      onClick={() => handleSelectAccount(account)}
                      className={`
                        w-full group relative flex items-center justify-between p-4 rounded-xl border
                        transition-all duration-300 text-left
                        ${
                          isSelected
                            ? "border-pink-500 bg-pink-500/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/50"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Identicon
                          value={account.address}
                          size={40}
                          theme="polkadot"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white flex items-center gap-2">
                            {account.name || "Unnamed Account"}
                            {isSelected && (
                              <Check className="w-4 h-4 text-pink-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {truncateAddress(account.address)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {account.source}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
