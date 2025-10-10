import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useMetaMaskContext } from '../providers/MetaMaskProvider';

// List of authorized wallet addresses (case insensitive)
const AUTHORIZED_WALLETS = import.meta.env.VITE_AUTHORIZED_WALLETS?.toLowerCase().split(',') || [];

interface WalletUser {
  address: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  walletAddress: string | null;
  user: WalletUser | null;
  isAuthorizedWallet: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  walletAddress: null,
  user: null,
  isAuthorizedWallet: false,
  connectWallet: async () => {},
  disconnectWallet: () => {}
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const { accounts, connected, connect, disconnect } = useMetaMaskContext();

  const walletAddress = accounts[0] || null;
  const isAuthorizedWallet = walletAddress ? AUTHORIZED_WALLETS.includes(walletAddress.toLowerCase()) : false;
  const isAuthenticated = connected && isAuthorizedWallet;

  const user: WalletUser | null = walletAddress ? {
    address: walletAddress,
    name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
  } : null;

  useEffect(() => {
    // Set loading to false once MetaMask context is ready
    setLoading(false);
  }, [connected, accounts]);

  const connectWallet = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  const disconnectWallet = () => {
    try {
      disconnect();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      loading,
      walletAddress,
      user,
      isAuthorizedWallet,
      connectWallet,
      disconnectWallet
    }}>
      {children}
    </AuthContext.Provider>
  );
};