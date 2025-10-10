import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMetaMaskContext } from '../providers/MetaMaskProvider';
import ConnectMetaMask from '../components/ConnectMetaMask';

const LoginPage: React.FC = () => {
  const { isAuthenticated, isAuthorizedWallet, walletAddress } = useAuth();
  const { connected, accounts } = useMetaMaskContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white mb-6">
            Wallet Authentication
          </h2>

          <div className="text-center mb-6">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect your Web3 wallet to access restricted features. Only authorized wallet addresses can access protected pages.
            </p>

            {/* Wallet Connection Status */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-center mb-3">
                <ConnectMetaMask />
              </div>

              {connected && accounts.length > 0 && (
                <div className="text-sm">
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Connected Wallet: <span className="font-mono text-xs">{accounts[0]}</span>
                  </p>
                  {isAuthorizedWallet ? (
                    <p className="text-green-600 dark:text-green-400 font-medium">
                      ✅ Authorized - You have access to all features
                    </p>
                  ) : (
                    <p className="text-red-600 dark:text-red-400 font-medium">
                      ❌ Not Authorized - This wallet address is not in the authorized list
                    </p>
                  )}
                </div>
              )}

              {!connected && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Please connect your MetaMask wallet above
                </p>
              )}
            </div>

            {/* Authorized Wallets Info */}
            <div className="text-left text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <p className="font-medium mb-1">Authorized Wallets:</p>
              <p>• Only specific wallet addresses have access to restricted features</p>
              <p>• Contact administrator to add your wallet address</p>
              <p>• Make sure you're connected to the correct network</p>
            </div>
          </div>

          {/* Back to Home Button */}
          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;