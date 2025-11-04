import React, { createContext, useContext } from 'react';
import useWalletAuth from '../hooks/useWalletAuth';

interface WalletAuthContextValue extends ReturnType<typeof useWalletAuth> {}

const WalletAuthContext = createContext<WalletAuthContextValue | undefined>(
  undefined
);

export const WalletAuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const auth = useWalletAuth();

  return (
    <WalletAuthContext.Provider value={auth}>
      {children}
    </WalletAuthContext.Provider>
  );
};

export function useWalletAuthContext() {
  const ctx = useContext(WalletAuthContext);
  if (!ctx)
    throw new Error('useWalletAuthContext must be used within WalletAuthProvider');
  return ctx;
}

export default WalletAuthProvider;
