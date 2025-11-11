import { useSIWS, useSIWSAuth, useWalletConnect } from '@shawncoe/siws-auth/react';
import React, { createContext, ReactNode, useContext, useEffect } from 'react';
import { useMetaMaskContext } from '../providers/MetaMaskProvider';

// MetaMask hook type
declare global {
  interface Window {
    ethereum?: any;
  }
}

// List of authorized wallet addresses (case insensitive) - fallback for non-JWT auth
const AUTHORIZED_WALLETS = import.meta.env.VITE_AUTHORIZED_WALLETS?.toLowerCase().split(',') || [];

interface WalletUser {
  address: string;
  name: string;
  identity?: {
    display?: string;
    legal?: string;
    email?: string;
    web?: string;
  };
  verified?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  walletAddress: string | null;
  user: WalletUser | null;
  isAuthorizedWallet: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  walletAddress: null,
  user: null,
  isAuthorizedWallet: false,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  signIn: async () => {},
  signOut: () => {}
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { user: siwsUser, isAuthenticated: siwsAuthenticated, isLoading: siwsLoading, signOut: siwsSignOut } = useSIWS();
  const { signIn: siwsSignIn } = useSIWSAuth();
  const { accounts } = useWalletConnect();

  // Use MetaMask context instead of direct detection
  const { accounts: metaMaskAccounts, connected: metaMaskConnected, disconnect: metaMaskDisconnect } = useMetaMaskContext();

  // Get current wallet address - prefer SIWS user address, then SIWS accounts, then MetaMask
  const currentWalletAddress = siwsUser?.address || accounts[0]?.address || metaMaskAccounts[0] || null;  // Convert SIWS user to our WalletUser format
  const siwsWalletAddress = siwsUser?.address || null;

  // Check if the currently connected wallet is authorized
  const isAuthorizedWallet = currentWalletAddress ? AUTHORIZED_WALLETS.includes(currentWalletAddress.toLowerCase()) : false;

  // Check if current wallet matches authenticated SIWS wallet
  const walletMatchesAuth = !siwsAuthenticated || (siwsWalletAddress === currentWalletAddress);

  // Determine if this is a MetaMask connection
  const isMetaMaskConnection = metaMaskConnected && metaMaskAccounts.length > 0 && currentWalletAddress === metaMaskAccounts[0];

  // Use SIWS authentication only if wallet matches AND wallet is authorized AND it's not a MetaMask connection
  // For authorized wallets (including MetaMask), allow access without SIWS
  const isAuthenticated = (siwsAuthenticated && walletMatchesAuth && AUTHORIZED_WALLETS.includes(siwsWalletAddress?.toLowerCase() || '')) ||
                         isAuthorizedWallet;  // Debug logging for wallet address changes
  useEffect(() => {
  }, [currentWalletAddress, siwsAuthenticated, siwsWalletAddress, metaMaskConnected, metaMaskAccounts, accounts, isMetaMaskConnection, walletMatchesAuth, isAuthorizedWallet, isAuthenticated]);

  const user: WalletUser | null = siwsUser ? {
    address: siwsUser.address,
    name: siwsUser.identity?.display || `${siwsUser.address.slice(0, 6)}...${siwsUser.address.slice(-4)}`,
    identity: siwsUser.identity,
    verified: siwsUser.verified
  } : null;

  // Connect wallet (for SIWS, this is handled by signIn)
  const connectWallet = async () => {
    await siwsSignIn();
  };

  // Disconnect wallet - properly clear both SIWS and MetaMask state
  const disconnectWallet = async () => {
    await signOut();
  };

  // Sign in method
  const signIn = async () => {
    await siwsSignIn();
  };

  // Sign out method - properly clear both SIWS and MetaMask state
  const signOut = async () => {
    try {

      // Sign out from SIWS if available
      if (siwsSignOut) {
        await siwsSignOut();
      }

      // Disconnect MetaMask if connected
      if (metaMaskDisconnect) {
        metaMaskDisconnect();
      }

      // Clear local storage that might contain auth state
      localStorage.clear();
      sessionStorage.clear();

      // Reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Error during sign out:', error);
      // Fallback to reload
      window.location.reload();
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      loading: siwsLoading,
      walletAddress: currentWalletAddress,
      user,
      isAuthorizedWallet,
      connectWallet,
      disconnectWallet,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
};
