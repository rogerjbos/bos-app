import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMetaMaskContext } from '../providers/MetaMaskProvider';

interface ProtectedRouteProps {
  element: React.ReactElement;
  authorizedOnly?: boolean;
  walletOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, authorizedOnly = false, walletOnly = false }) => {
  const { isAuthenticated, isAuthorizedWallet, walletAddress, loading } = useAuth();
  const { connect: connectMetaMask } = useMetaMaskContext();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // If route requires only a connected wallet, check walletAddress presence
  if (walletOnly) {
    if (!walletAddress) {
      return <Navigate to="/login" replace />;
    }
    return element;
  }

  // If route requires authorized wallet, prompt to connect instead of redirecting
  if (authorizedOnly) {
    if (!isAuthenticated || !isAuthorizedWallet) {
      const handleConnect = async () => {
        setConnecting(true);
        setConnectError(null);
        try {
          sessionStorage.removeItem('metamask_disconnected');
          await connectMetaMask();
        } catch (e) {
          setConnectError(e instanceof Error ? e.message : 'Connection failed');
        } finally {
          setConnecting(false);
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center p-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Wallet Connection Required</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {walletAddress
                ? 'Your connected wallet is not authorized to access this page.'
                : 'Connect your wallet to access this page.'}
            </p>
            {connectError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">{connectError}</p>
            )}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {connecting ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        </div>
      );
    }
    return element;
  }

  return element;
};

export default ProtectedRoute;
