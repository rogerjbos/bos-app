import { useSIWS, useSIWSAuth, useWalletConnect } from '@shawncoe/siws-auth/react';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useMetaMaskContext } from '../providers/MetaMaskProvider';
import { useWalletAuthContext } from '../providers/WalletAuthProvider';

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
  serverAuthenticate: (walletType: 'metamask' | 'polkadot') => Promise<boolean>;
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
  signOut: () => {},
  serverAuthenticate: async () => false,
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

  // Wallet auth hook (challenge/verify/JWT management)
  const { generateChallenge, authenticate, getAccessToken } = useWalletAuthContext();

  // Track whether server auth is in progress
  const [serverAuthInProgress, setServerAuthInProgress] = useState(false);
  const authAttemptedRef = useRef<string | null>(null);

  // Get current wallet address - prefer SIWS user address, then SIWS accounts, then MetaMask
  const currentWalletAddress = siwsUser?.address || accounts[0]?.address || metaMaskAccounts[0] || null;
  const siwsWalletAddress = siwsUser?.address || null;

  // Check if the currently connected wallet is authorized
  const isAuthorizedWallet = currentWalletAddress ? AUTHORIZED_WALLETS.includes(currentWalletAddress.toLowerCase()) : false;

  // Check if current wallet matches authenticated SIWS wallet
  const walletMatchesAuth = !siwsAuthenticated || (siwsWalletAddress === currentWalletAddress);

  // Determine if this is a MetaMask connection
  const isMetaMaskConnection = metaMaskConnected && metaMaskAccounts.length > 0 && currentWalletAddress === metaMaskAccounts[0];

  // Check if we have a valid JWT
  const hasValidJwt = (() => {
    const token = getAccessToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  })();

  // Use SIWS authentication only if wallet matches AND wallet is authorized AND it's not a MetaMask connection
  // For authorized wallets (including MetaMask), allow access without SIWS
  // Also consider JWT-based auth as fully authenticated
  const isAuthenticated = hasValidJwt ||
                         (siwsAuthenticated && walletMatchesAuth && AUTHORIZED_WALLETS.includes(siwsWalletAddress?.toLowerCase() || '')) ||
                         isAuthorizedWallet;

  useEffect(() => {
  }, [currentWalletAddress, siwsAuthenticated, siwsWalletAddress, metaMaskConnected, metaMaskAccounts, accounts, isMetaMaskConnection, walletMatchesAuth, isAuthorizedWallet, isAuthenticated]);

  const user: WalletUser | null = siwsUser ? {
    address: siwsUser.address,
    name: siwsUser.identity?.display || `${siwsUser.address.slice(0, 6)}...${siwsUser.address.slice(-4)}`,
    identity: siwsUser.identity,
    verified: siwsUser.verified
  } : null;

  /**
   * Perform server-side wallet authentication:
   * 1. Request challenge from server
   * 2. Sign challenge with wallet (MetaMask personal_sign or Polkadot signRaw)
   * 3. Submit signature to verify endpoint, receive JWT
   */
  const serverAuthenticate = useCallback(async (walletType: 'metamask' | 'polkadot'): Promise<boolean> => {
    if (!currentWalletAddress || !isAuthorizedWallet) return false;

    setServerAuthInProgress(true);
    try {
      // 1. Get challenge from server
      const challenge = await generateChallenge(currentWalletAddress, walletType);

      // 2. Sign challenge with the connected wallet
      let signature: string;

      if (walletType === 'metamask') {
        // MetaMask personal_sign
        if (!window.ethereum) throw new Error('MetaMask not available');
        signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [challenge, currentWalletAddress],
        });
      } else {
        // Polkadot signRaw via @polkadot/extension-dapp
        const { web3FromAddress } = await import('@polkadot/extension-dapp');
        const injector = await web3FromAddress(currentWalletAddress);
        if (!injector.signer?.signRaw) throw new Error('Polkadot signer not available');
        const { signature: sig } = await injector.signer.signRaw({
          address: currentWalletAddress,
          data: challenge,
          type: 'bytes',
        });
        signature = sig;
      }

      // 3. Verify signature with server, stores JWT in localStorage
      await authenticate(challenge, signature, currentWalletAddress, walletType);
      return true;
    } catch (error) {
      console.error('Server authentication failed:', error);
      return false;
    } finally {
      setServerAuthInProgress(false);
    }
  }, [currentWalletAddress, isAuthorizedWallet, generateChallenge, authenticate]);

  // Auto-authenticate with server when wallet connects and is authorized
  useEffect(() => {
    if (!currentWalletAddress || !isAuthorizedWallet || hasValidJwt || serverAuthInProgress) return;
    // Only attempt once per wallet address
    if (authAttemptedRef.current === currentWalletAddress) return;
    authAttemptedRef.current = currentWalletAddress;

    const walletType: 'metamask' | 'polkadot' = isMetaMaskConnection ? 'metamask' : 'polkadot';
    serverAuthenticate(walletType).catch(() => {
      // Silent fail — user can still use the app with client-side auth
    });
  }, [currentWalletAddress, isAuthorizedWallet, hasValidJwt, serverAuthInProgress, isMetaMaskConnection, serverAuthenticate]);

  // Connect wallet (for SIWS, this is handled by signIn)
  const connectWallet = async () => {
    // Clear MetaMask disconnect flag when connecting with Polkadot wallet
    sessionStorage.removeItem('metamask_disconnected');
    await siwsSignIn();
  };

  // Disconnect wallet - properly clear both SIWS and MetaMask state
  const disconnectWallet = async () => {
    await signOut();
  };

  // Sign in method
  const signIn = async () => {
    // Clear MetaMask disconnect flag when connecting with Polkadot wallet
    sessionStorage.removeItem('metamask_disconnected');
    await siwsSignIn();
  };

  // Sign out method - properly clear both SIWS and MetaMask state
  const signOut = async () => {
    try {
      // Set MetaMask disconnect flag BEFORE clearing sessionStorage
      sessionStorage.setItem('metamask_disconnected', 'true');

      // Sign out from SIWS if available
      if (siwsSignOut) {
        await siwsSignOut();
      }

      // Disconnect MetaMask if connected
      if (metaMaskDisconnect) {
        metaMaskDisconnect();
      }

      // Reset auth attempt tracking
      authAttemptedRef.current = null;

      // Clear local storage that might contain auth state (but preserve metamask_disconnected)
      const metamaskDisconnected = sessionStorage.getItem('metamask_disconnected');
      localStorage.clear();
      sessionStorage.clear();
      if (metamaskDisconnected) {
        sessionStorage.setItem('metamask_disconnected', metamaskDisconnected);
      }

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
      loading: siwsLoading || serverAuthInProgress,
      walletAddress: currentWalletAddress,
      user,
      isAuthorizedWallet,
      connectWallet,
      disconnectWallet,
      signIn,
      signOut,
      serverAuthenticate
    }}>
      {children}
    </AuthContext.Provider>
  );
};
