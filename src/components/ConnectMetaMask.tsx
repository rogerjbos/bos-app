import { ExternalLink, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useTypink } from "typink";
import { useMetaMaskContext } from "../providers/MetaMaskProvider";
import { Button } from "./ui/Button";

export default function ConnectMetaMask() {
  // Use shared context from MetaMaskProvider so UI reflects a single source of truth
  const { isInstalled, accounts, connected, connect, disconnect } =
    useMetaMaskContext();

  const address = accounts[0];
  const { setConnectedAccount, connectedAccount } = useTypink();
  const [promptedToSwitch, setPromptedToSwitch] = useState(false);
  const [switchMessage, setSwitchMessage] = useState("");

  // Keep typink's connectedAccount in sync with MetaMask state
  useEffect(() => {
    if (connected && address) {
      if (connectedAccount?.address !== address) {
        setConnectedAccount({
          address,
          name: `${address.slice(0, 6)}...${address.slice(-4)}`,
          source: "metamask",
        } as any);
      }
    } else {
      if (connectedAccount?.source === "metamask") {
        // clear typink's connected account if MetaMask disconnected
        setConnectedAccount(undefined as any);
      }
    }
  }, [connected, address, setConnectedAccount, connectedAccount]);

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="font-semibold text-white">MetaMask</div>
          <div className="text-xs text-gray-400">Ethereum wallet (EVM)</div>
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
                onClick={() => {
                  try {
                    // call provider disconnect if available then clear typink
                    disconnect && disconnect();
                    setConnectedAccount(undefined as any);
                  } catch (e) {
                    console.warn("MetaMask disconnect failed", e);
                  }
                }}
              >
                Disconnect
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      // Prompt MetaMask to request accounts (user can change account there)
                      const accs = await connect();
                      // If accounts didn't change, instruct the user to switch in the extension
                      if (!accs || accs[0] === address) {
                        setPromptedToSwitch(true);
                        setSwitchMessage(
                          "If you want to switch accounts, open MetaMask, change account there, then click Re-check."
                        );
                      } else {
                        setPromptedToSwitch(false);
                        setSwitchMessage("");
                      }
                    } catch (e) {
                      console.warn("MetaMask account change failed", e);
                      setSwitchMessage(
                        "Failed to prompt MetaMask. Check console for details."
                      );
                    }
                  }}
                >
                  {promptedToSwitch ? "Re-check" : "Change"}
                </Button>
                {switchMessage && (
                  <div className="text-xs text-gray-400 ml-2">
                    {switchMessage}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="gradient"
              onClick={async () => {
                try {
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
