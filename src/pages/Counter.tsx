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
  const [privateKey, setPrivateKey] = useState<string>("");
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

  const getRpcProvider = () => {
    return new ethers.JsonRpcProvider(
      "https://testnet-passet-hub-eth-rpc.polkadot.io"
    );
  };

  const getSigner = () => {
    if (!privateKey) {
      throw new Error("Private key is not provided.");
    }
    if (!privateKey.startsWith("0x")) {
      return new ethers.Wallet("0x" + privateKey, getRpcProvider());
    }
    return new ethers.Wallet(privateKey, getRpcProvider());
  };

  const getContract = (signer: ethers.Wallet) => {
    return new ethers.Contract(CONTRACT_ADDRESS, counterABI, signer);
  };

  const fetchNumber = async () => {
    try {
      console.log("Fetching current number...");
      const provider = getRpcProvider();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        counterABI,
        provider
      );
      const currentNumber = await contract.number();
      console.log("Contract number():", currentNumber.toString());
      setNumber(currentNumber.toString());
    } catch (err: any) {
      console.error("Error fetching number:", err);
      setError(`Failed to fetch number: ${err.message || err.toString()}`);
    }
  };

  const handleIncrement = async () => {
    if (!privateKey) {
      setError("Please provide a private key to sign the transaction.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      console.log("Starting increment transaction...");
      const signer = getSigner();
      const contract = getContract(signer);

      console.log(
        `Sending 'increment' transaction from address: ${signer.address}`
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
    if (!privateKey) {
      setError("Please provide a private key to sign the transaction.");
      return;
    }
    if (!newNumber.trim()) return;

    setLoading(true);
    setError("");
    try {
      console.log("Starting setNumber transaction...");
      const signer = getSigner();
      const contract = getContract(signer);
      const value = BigInt(newNumber);

      console.log(
        `Sending 'setNumber(${value})' transaction from address: ${signer.address}`
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
      <Card className="bg-yellow-50 border-yellow-300">
        <CardHeader>
          <CardTitle className="text-yellow-800">Security Warning</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-700">
            You are about to enter your private key. This is **not secure** and
            should only be done with a temporary test account. Never use a
            private key that holds real assets. The key is only held in memory
            and is not stored.
          </p>
          <div className="mt-4">
            <Input
              type="password"
              placeholder="Enter your 0x-prefixed private key"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              className="font-mono"
            />
          </div>
        </CardContent>
      </Card>

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
                disabled={loading || !privateKey}
              >
                {loading ? "Incrementing..." : "Increment"}
              </Button>
              <Button onClick={fetchNumber} variant="outline">
                Refresh
              </Button>
            </div>
            <div className="flex gap-4 items-center">
              <Input
                type="number"
                placeholder="Enter new number"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
              />
              <Button
                onClick={handleSetNumber}
                disabled={loading || !newNumber || !privateKey}
              >
                {loading ? "Setting..." : "Set Number"}
              </Button>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
