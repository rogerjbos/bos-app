import { ethers } from "ethers";
import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useMetaMask } from "../hooks/useMetaMask";

// Counter contract ABI
const counterABI = [
  {
    inputs: [],
    name: "increment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "number",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "newNumber", type: "uint256" }],
    name: "setNumber",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Contract address
const CONTRACT_ADDRESS = "0xfb79c7b0a6F798aE1135592c4B940cec1359D830";

// Paseo Asset Hub network
const PASEO_ASSET_HUB = {
  chainId: "0x190f1b46", // 420420422 in hex
  chainName: "Paseo Asset Hub",
  nativeCurrency: {
    name: "PAS",
    symbol: "PAS",
    decimals: 18,
  },
  rpcUrls: ["https://testnet-passet-hub-eth-rpc.polkadot.io"],
  blockExplorerUrls: [
    "https://blockscout-passet-hub.parity-testnet.parity.io/",
  ],
};

export default function Counter() {
  const { connected, chainId } = useMetaMask();
  const [number, setNumber] = useState<string>("0");
  const [newNumber, setNewNumber] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const isCorrectNetwork = chainId === PASEO_ASSET_HUB.chainId;

  useEffect(() => {
    if (connected && isCorrectNetwork) {
      fetchNumber();
    }
  }, [connected, isCorrectNetwork]);

  const switchToPaseoAssetHub = async () => {
    if (!(window as any).ethereum) {
      setError("MetaMask not detected in this browser");
      return;
    }

    try {
      // Try to switch to the network if it's already added
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: PASEO_ASSET_HUB.chainId }],
      });
      setError("");
    } catch (switchError: any) {
      // This error code indicates the chain has not been added to MetaMask
      if (switchError?.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [PASEO_ASSET_HUB],
          });
          setError("");
        } catch (addError: any) {
          console.error("Failed to add chain to MetaMask:", addError);
          setError(
            `Failed to add network to MetaMask: ${
              addError?.message || addError
            }`
          );
        }
      } else {
        console.error("Failed to switch network:", switchError);
        setError(
          `Failed to switch network: ${switchError?.message || switchError}`
        );
      }
    }
  };

  const getProvider = () => {
    if (!(window as any).ethereum) {
      throw new Error("MetaMask not detected.");
    }
    return new ethers.BrowserProvider((window as any).ethereum);
  };

  const getSigner = async () => {
    const provider = getProvider();
    return provider.getSigner();
  };

  const getContract = async (withSigner = false) => {
    const provider = getProvider();
    if (withSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, counterABI, signer);
    }
    return new ethers.Contract(CONTRACT_ADDRESS, counterABI, provider);
  };

  const fetchNumber = async () => {
    try {
      console.log("Fetching current number...");
      const contract = await getContract();
      const currentNumber = await contract.number();
      console.log("Contract number():", currentNumber.toString());
      setNumber(currentNumber.toString());
    } catch (err: any) {
      console.error("Error fetching number:", err);
      setError(`Failed to fetch number: ${err.message || err.toString()}`);
    }
  };

  const handleIncrement = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Starting increment transaction...");
      const contract = await getContract(true);

      console.log(
        `Sending 'increment' transaction from address: ${await (
          await getSigner()
        ).getAddress()}`
      );
      const tx = await contract.increment();

      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
      await fetchNumber();
    } catch (err: any) {
      console.error("Error incrementing:", err);
      setError(`Failed to increment: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetNumber = async () => {
    if (!newNumber.trim()) return;

    setLoading(true);
    setError("");
    try {
      console.log("Starting setNumber transaction...");
      const contract = await getContract(true);
      const value = BigInt(newNumber);

      console.log(
        `Sending 'setNumber(${value})' transaction from address: ${await (
          await getSigner()
        ).getAddress()}`
      );
      const tx = await contract.setNumber(value);

      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
      setNewNumber("");
      await fetchNumber();
    } catch (err: any) {
      console.error("Error setting number:", err);
      setError(`Failed to set number: ${err.message || err.toString()}`);
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>MetaMask not connected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Please connect your MetaMask wallet to use this page.
            </p>
            <div className="flex gap-3">
              <Button
                variant="gradient"
                onClick={async () => {
                  try {
                    await (window as any).ethereum.request({
                      method: "eth_requestAccounts",
                    });
                    setError("");
                  } catch (e: any) {
                    console.error("MetaMask connect failed", e);
                    setError(e?.message || String(e));
                  }
                }}
              >
                Connect MetaMask
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  await switchToPaseoAssetHub();
                }}
              >
                Switch Network
              </Button>
            </div>
            {error && <p className="text-red-500 mt-3">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Counter Contract</CardTitle>
          <p className="text-sm text-gray-600">Address: {CONTRACT_ADDRESS}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">
                Current Number: {number}
              </h3>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handleIncrement}
                disabled={loading || !isCorrectNetwork}
              >
                {loading ? "Incrementing..." : "Increment"}
              </Button>
              <Button
                onClick={fetchNumber}
                variant="outline"
                disabled={!isCorrectNetwork}
              >
                Refresh
              </Button>
            </div>
            <div className="flex gap-4 items-center">
              <Input
                type="number"
                placeholder="Enter new number"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                disabled={!isCorrectNetwork}
              />
              <Button
                onClick={handleSetNumber}
                disabled={loading || !newNumber || !isCorrectNetwork}
              >
                {loading ? "Setting..." : "Set Number"}
              </Button>
            </div>
            {!isCorrectNetwork && (
              <p className="text-yellow-600">
                Please switch to the Paseo Asset Hub network to interact with
                the contract.
              </p>
            )}
            {error && <p className="text-red-500">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
