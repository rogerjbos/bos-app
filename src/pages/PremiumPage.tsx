import React, { useEffect, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3FromAddress } from '@polkadot/extension-dapp';
import { useAuth } from '../context/AuthContext';

// Paseo testnet configuration
const PASEO_RPC = 'wss://paseo.rpc.amforc.com';
const PAYMENT_AMOUNT = 1_000_000_000_000; // 1 PAS (12 decimals)
const RECIPIENT_ADDRESS = '1Rcc56nuVXqTGidi25iL2bbHzcmMY6RDFywdmZRmPchCSN7'; // PAS Substrate account

interface PaymentStatus {
  status: 'unpaid' | 'pending' | 'verifying' | 'paid' | 'error';
  message?: string;
  blockHash?: string;
  extrinsicHash?: string;
  expiresAt?: string;
  hoursRemaining?: number;
}

const PremiumPage: React.FC = () => {
  const auth = useAuth();
  const { currentWalletAddress, walletAddress } = auth;
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({ status: 'unpaid' });
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Use whichever address is available, but ensure it's a Substrate address (not EVM)
  const rawAddress = currentWalletAddress || walletAddress;

  // Check if address is a Polkadot/Substrate address (starts with uppercase letter, 47-48 chars)
  // EVM addresses start with 0x and are 42 chars
  const isSubstrateAddress = rawAddress && !rawAddress.startsWith('0x') && rawAddress.length >= 47;
  const connectedAddress = isSubstrateAddress ? rawAddress : null;

  // Debug logging
  // useEffect(() => {
  //   console.log('[PremiumPage] Full auth object:', auth);
  //   console.log('[PremiumPage] currentWalletAddress:', currentWalletAddress);
  //   console.log('[PremiumPage] walletAddress:', walletAddress);
  //   console.log('[PremiumPage] rawAddress:', rawAddress);
  //   console.log('[PremiumPage] isSubstrateAddress:', isSubstrateAddress);
  //   console.log('[PremiumPage] connectedAddress:', connectedAddress);
  //   console.log('[PremiumPage] API connected:', !!api);
  //   console.log('[PremiumPage] Payment status:', paymentStatus.status);
  //   console.log('[PremiumPage] Is connecting:', isConnecting);
  // }, [auth, currentWalletAddress, walletAddress, rawAddress, isSubstrateAddress, connectedAddress, api, paymentStatus.status, isConnecting]);

  // Connect to Paseo testnet
  useEffect(() => {
    const connectToPaseo = async () => {
      try {
        // console.log('[PremiumPage] Connecting to Paseo RPC:', PASEO_RPC);
        setIsConnecting(true);
        const provider = new WsProvider(PASEO_RPC);
        const apiInstance = await ApiPromise.create({ provider });
        // console.log('[PremiumPage] Successfully connected to Paseo');
        setApi(apiInstance);
        setIsConnecting(false);
      } catch (error) {
        console.error('[PremiumPage] Failed to connect to Paseo:', error);
        setPaymentStatus({
          status: 'error',
          message: 'Failed to connect to Paseo testnet'
        });
        setIsConnecting(false);
      }
    };

    connectToPaseo();

    return () => {
      if (api) {
        api.disconnect();
      }
    };
  }, []);

  // Fetch PAS token balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!api || !connectedAddress) return;

      try {
        setIsLoadingBalance(true);
        const account = await api.query.system.account(connectedAddress);
        const accountData: any = account.toJSON();
        const freeBalance = BigInt(accountData.data.free);
        const balanceInPAS = Number(freeBalance) / 1e12; // 12 decimals
        setBalance(balanceInPAS.toFixed(4));
        // console.log('[PremiumPage] Balance:', balanceInPAS, 'PAS');
      } catch (error) {
        console.error('[PremiumPage] Failed to fetch balance:', error);
        setBalance(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [api, connectedAddress]);

  // Check if user has already paid
  useEffect(() => {
    const checkPayment = async () => {
      if (!connectedAddress) return;

      try {
        const response = await fetch(`/api/premium/check-payment?address=${connectedAddress}`);
        const data = await response.json();

        if (data.hasPaid) {
          setPaymentStatus({
            status: 'paid',
            expiresAt: data.expiresAt,
            hoursRemaining: data.hoursRemaining
          });
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };

    checkPayment();
  }, [connectedAddress]);

  const handlePayment = async () => {
    if (!api || !connectedAddress) {
      setPaymentStatus({
        status: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }

    try {
      // console.log('[Payment] Starting payment process...');
      setPaymentStatus({ status: 'pending', message: 'Preparing transaction...' });

      // Get the signer from the extension
      // console.log('[Payment] Getting signer from extension...');
      const injector = await web3FromAddress(connectedAddress);
      // console.log('[Payment] Signer obtained:', injector);

      // Create the transfer transaction
      // console.log('[Payment] Creating transfer transaction...');
      setPaymentStatus({ status: 'pending', message: 'Please sign the transaction in your wallet...' });

      const transfer = api.tx.balances.transferKeepAlive(
        RECIPIENT_ADDRESS,
        PAYMENT_AMOUNT
      );
      // console.log('[Payment] Transaction created, waiting for signature...');

      // Sign and send the transaction
      const unsub = await transfer.signAndSend(
        connectedAddress,
        { signer: injector.signer },
        async ({ status, txHash, events }) => {
          // console.log('[Payment] Status update:', status.type, status.toHuman());

          if (status.isInBlock) {
            // console.log('[Payment] Transaction in block:', txHash.toHex());
            setPaymentStatus({
              status: 'pending',
              message: 'Transaction included in block, waiting for finalization...',
              extrinsicHash: txHash.toHex()
            });
          } else if (status.isFinalized) {
            // console.log('[Payment] Transaction finalized!');
            const blockHash = status.asFinalized.toHex();
            // console.log('[Payment] Block hash:', blockHash);

            // Get the block number
            const block = await api.rpc.chain.getBlock(blockHash);
            const blockNumber = block.block.header.number.toNumber();
            // console.log('[Payment] Block number:', blockNumber);

            setPaymentStatus({
              status: 'verifying',
              message: 'Transaction finalized, verifying payment...',
              blockHash,
              extrinsicHash: txHash.toHex()
            });

            // Verify the payment with the backend
            try {
              // console.log('[Payment] Verifying with backend...');
              const verifyResponse = await fetch('/api/premium/verify-payment', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  blockHash,
                  fromAddress: connectedAddress,
                  toAddress: RECIPIENT_ADDRESS,
                  amount: PAYMENT_AMOUNT.toString()
                })
              });

              // console.log('[Payment] Verification response status:', verifyResponse.status);
              const verifyData = await verifyResponse.json();
              // console.log('[Payment] Verification data:', verifyData);

              if (verifyData.verified) {
                // console.log('[Payment] Payment verified successfully!');
                setPaymentStatus({
                  status: 'paid',
                  message: 'Payment verified! You now have access to premium content.',
                  blockHash
                });
              } else {
                console.error('[Payment] Verification failed:', verifyData.error);
                setPaymentStatus({
                  status: 'error',
                  message: verifyData.error || 'Payment verification failed'
                });
              }
            } catch (error) {
              console.error('[Payment] Verification error:', error);
              setPaymentStatus({
                status: 'error',
                message: 'Failed to verify payment. Please contact support.'
              });
            }

            unsub();
          } else if (status.isInvalid || status.isDropped) {
            console.error('[Payment] Transaction invalid or dropped');
            setPaymentStatus({
              status: 'error',
              message: 'Transaction failed. Please try again.'
            });
            unsub();
          }
        }
      );

      // console.log('[Payment] Waiting for transaction status updates...');

    } catch (error: any) {
      console.error('[Payment] Error in payment process:', error);
      setPaymentStatus({
        status: 'error',
        message: error.message || 'Failed to process payment'
      });
    }
  };

  const renderPaymentUI = () => {
    // Check if user has MetaMask connected instead of Polkadot
    if (rawAddress && !isSubstrateAddress) {
      return (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-200 mb-3">
            Wrong Wallet Type
          </h3>
          <p className="text-orange-800 dark:text-orange-300 mb-4">
            You're connected with a MetaMask/EVM wallet, but this page requires a Polkadot/Substrate wallet for PAS token payments on Paseo testnet.
          </p>

          <div className="bg-orange-100 dark:bg-orange-900/30 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-2">
              To use this feature:
            </p>
            <ol className="text-sm text-orange-800 dark:text-orange-300 space-y-1 list-decimal list-inside">
              <li>Disconnect your current wallet (click your address in the top bar)</li>
              <li>Click "Connect Wallet" and select a Substrate wallet</li>
              <li>Choose: Polkadot.js, Talisman, or SubWallet</li>
              <li>Select an account and sign the authentication message</li>
            </ol>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-700 rounded p-3 mb-3">
            <p className="text-xs text-orange-700 dark:text-orange-300">
              <strong>Current wallet:</strong> {rawAddress?.slice(0, 10)}...{rawAddress?.slice(-8)} (EVM/MetaMask)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
            <span>💡</span>
            <span>Need a Polkadot wallet? Install <a href="https://polkadot.js.org/extension/" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-700">Polkadot.js extension</a></span>
          </div>
        </div>
      );
    }

    if (!connectedAddress) {
      return (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-3">
            Polkadot Wallet Required
          </h3>
          <p className="text-yellow-800 dark:text-yellow-300 mb-4">
            To access premium content, you need to connect a Polkadot/Substrate wallet (not MetaMask).
          </p>

          <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
              Steps to connect:
            </p>
            <ol className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1 list-decimal list-inside">
              <li>Click "Connect Wallet" button in the top navigation bar</li>
              <li>Select a <strong>Substrate wallet</strong>: Polkadot.js, Talisman, or SubWallet</li>
              <li>Choose an account from your wallet</li>
              <li>Sign the authentication message</li>
              <li>Return to this page to make payment</li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-3 mb-3">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> MetaMask/EVM wallets cannot be used for Paseo testnet payments. You need a Polkadot wallet that supports Substrate networks.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
            <span>💡</span>
            <span>Need a wallet? Install <a href="https://polkadot.js.org/extension/" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-700">Polkadot.js extension</a></span>
          </div>
        </div>
      );
    }

    if (isConnecting) {
      return (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <p className="text-blue-800 dark:text-blue-200">
            Connecting to Paseo testnet...
          </p>
        </div>
      );
    }

    switch (paymentStatus.status) {
      case 'unpaid':
        return (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Premium Access Required
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              To access this premium content, you need to pay 1 PAS token on the Paseo testnet.
            </p>

            {/* Wallet Balance */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                Your Polkadot Wallet:
              </p>
              <div className="text-sm space-y-1">
                <div className="flex justify-between text-blue-800 dark:text-blue-300">
                  <span>Address:</span>
                  <span className="font-mono">{connectedAddress?.slice(0, 8)}...{connectedAddress?.slice(-6)}</span>
                </div>
                <div className="flex justify-between text-blue-800 dark:text-blue-300">
                  <span>Network:</span>
                  <span className="font-semibold">Paseo Testnet</span>
                </div>
                <div className="flex justify-between text-blue-800 dark:text-blue-300">
                  <span>Balance:</span>
                  <span className="font-semibold">
                    {isLoadingBalance ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : balance !== null ? (
                      `${balance} PAS`
                    ) : (
                      'Unable to load'
                    )}
                  </span>
                </div>
                {balance !== null && parseFloat(balance) < 1.01 && (
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                    ⚠️ Insufficient balance. You need at least 1 PAS.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Payment Details:</p>
              <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                <li><strong>Amount:</strong> 1 PAS</li>
                <li><strong>Network:</strong> Paseo Testnet</li>
                <li><strong>Recipient:</strong> {RECIPIENT_ADDRESS.slice(0, 10)}...{RECIPIENT_ADDRESS.slice(-8)}</li>
              </ul>
            </div>
            <button
              onClick={handlePayment}
              disabled={!api || (balance !== null && parseFloat(balance) < 1)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition duration-200"
            >
              {!api ? 'Connecting...' : (balance !== null && parseFloat(balance) < 1) ? 'Insufficient Balance' : 'Pay 1 PAS to Access Premium Content'}
            </button>
          </div>
        );

      case 'pending':
      case 'verifying':
        return (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                {paymentStatus.status === 'pending' ? 'Processing Payment...' : 'Verifying Payment...'}
              </h3>
            </div>
            <p className="text-blue-800 dark:text-blue-300 text-sm">
              {paymentStatus.message}
            </p>
            {paymentStatus.extrinsicHash && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 break-all">
                TX: {paymentStatus.extrinsicHash}
              </p>
            )}
          </div>
        );

      case 'paid':
        return (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-3">
              ✓ Payment Verified
            </h3>
            <p className="text-green-800 dark:text-green-300 mb-2">
              You now have access to premium content!
            </p>
            {paymentStatus.hoursRemaining !== undefined && (
              <div className="mt-3 p-3 bg-green-100 dark:bg-green-800/30 rounded-md">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Session expires in:</strong> {paymentStatus.hoursRemaining.toFixed(1)} hours
                </p>
                {paymentStatus.expiresAt && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {new Date(paymentStatus.expiresAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
            {paymentStatus.blockHash && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-3 break-all">
                Block: {paymentStatus.blockHash}
              </p>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-3">
              Payment Error
            </h3>
            <p className="text-red-800 dark:text-red-300 mb-4">
              {paymentStatus.message}
            </p>
            {paymentStatus.extrinsicHash && (
              <p className="text-xs text-red-600 dark:text-red-400 mb-4 break-all">
                TX: {paymentStatus.extrinsicHash}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setPaymentStatus({ status: 'unpaid' })}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition duration-200"
              >
                Refresh Page
              </button>
            </div>
          </div>
        );
    }
  };

  const renderPremiumContent = () => {
    if (paymentStatus.status !== 'paid') {
      return null;
    }

    return (
      <div className="mt-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-purple-900 dark:text-purple-200 mb-4">
          🎉 Welcome to Premium Content!
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300">
            Congratulations! You've successfully paid 10 PAS tokens and verified your payment on the Paseo testnet.
          </p>
          <h3 className="text-xl font-semibold text-purple-800 dark:text-purple-300 mt-6 mb-3">
            Exclusive Benefits:
          </h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>✓ Access to advanced analytics</li>
            <li>✓ Real-time market data</li>
            <li>✓ Priority support</li>
            <li>✓ Custom trading strategies</li>
            <li>✓ Portfolio optimization tools</li>
          </ul>
          <div className="mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Note:</strong> This is a demo implementation using the x402 payment pattern.
              In production, you would store payment status in a database and implement session management.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Premium Content
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Access exclusive content by paying with PAS tokens on Paseo testnet
          </p>
        </div>

        {renderPaymentUI()}
        {renderPremiumContent()}

        {/* Help Section */}
        <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Need Testnet Tokens?
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
            Get free PAS tokens from the Paseo faucet to test this feature:
          </p>
          <a
            href="https://faucet.polkadot.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Visit Paseo Faucet →
          </a>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
