import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useWalletAuthContext } from '../providers/WalletAuthProvider';

// List of authorized wallet addresses (case insensitive) - fallback for non-JWT auth
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

  // Use the JWT wallet authentication context
  const { user: jwtUser, isAuthenticated: jwtAuthenticated, isLoading: jwtLoading } = useWalletAuthContext();

  // For backward compatibility, also check MetaMask connection (but prioritize JWT auth)
  const walletAddress = jwtUser?.address || null;
  const isAuthorizedWallet = walletAddress ? AUTHORIZED_WALLETS.includes(walletAddress.toLowerCase()) : false;

  // Use JWT authentication as primary, fall back to authorized wallet list
  const isAuthenticated = jwtAuthenticated || isAuthorizedWallet;

  const user: WalletUser | null = jwtUser ? {
    address: jwtUser.address,
    name: jwtUser.address ? `${jwtUser.address.slice(0, 6)}...${jwtUser.address.slice(-4)}` : 'Unknown'
  } : null;

  useEffect(() => {
    // Set loading to false once JWT auth context is ready
    if (!jwtLoading) {
      setLoading(false);
    }
  }, [jwtLoading]);

  // These methods are kept for backward compatibility but JWT auth handles the actual authentication
  const connectWallet = async () => {
    // JWT authentication is handled by the ConnectMetaMask component
    // This is just a placeholder for backward compatibility
  };

  const disconnectWallet = () => {
    // JWT logout is handled by the ConnectMetaMask component
    // This is just a placeholder for backward compatibility
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
