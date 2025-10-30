import { formatTimeAgo } from "@/lib/polkadot";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

export type TransactionStatus =
  | "pending"
  | "broadcasting"
  | "inBlock"
  | "finalized"
  | "error";

export interface Transaction {
  id: string;
  hash?: string;
  blockHash?: string;
  status: TransactionStatus;
  type: string;
  description: string;
  timestamp: number;
  error?: string;
  explorerUrl?: string;
}

interface TransactionQueueProps {
  maxVisible?: number;
  autoRemoveDelay?: number; // ms to auto-remove successful txs
}

/**
 * Transaction Queue Component
 *
 * Manages and displays transaction queue with:
 * - Real-time status updates
 * - Transaction history
 * - Block explorer links
 * - Retry failed transactions
 * - Auto-remove completed transactions
 *
 * @example
 * ```tsx
 * // Add transaction to queue
 * const { addTransaction, updateTransaction } = useTransactionQueue()
 *
 * const txId = addTransaction({
 *   type: 'transfer',
 *   description: 'Transfer 10 DOT to Alice'
 * })
 *
 * // Update status
 * updateTransaction(txId, { status: 'finalized', hash: '0x...' })
 * ```
 */
export function TransactionQueue({
  maxVisible = 5,
  autoRemoveDelay = 5000,
}: TransactionQueueProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("transaction_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTransactions(parsed);
      } catch (error) {
        console.error("Failed to parse transaction history:", error);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem("transaction_history", JSON.stringify(transactions));
    }
  }, [transactions]);

  // Auto-remove finalized transactions after delay
  useEffect(() => {
    const finalizedTxs = transactions.filter((tx) => tx.status === "finalized");

    if (finalizedTxs.length === 0) return;

    const timers = finalizedTxs.map((tx) => {
      const elapsed = Date.now() - tx.timestamp;
      const remaining = autoRemoveDelay - elapsed;

      if (remaining <= 0) return null;

      return setTimeout(() => {
        setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      }, remaining);
    });

    return () => {
      timers.forEach((timer) => timer && clearTimeout(timer));
    };
  }, [transactions, autoRemoveDelay]);

  const pendingCount = transactions.filter(
    (tx) =>
      tx.status === "pending" ||
      tx.status === "broadcasting" ||
      tx.status === "inBlock"
  ).length;

  const visibleTransactions = isExpanded
    ? transactions
    : transactions.slice(0, maxVisible);

  const handleRemove = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  const handleClear = () => {
    setTransactions((prev) =>
      prev.filter((tx) =>
        ["pending", "broadcasting", "inBlock"].includes(tx.status)
      )
    );
  };

  if (transactions.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-dark rounded-xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">
                Transaction Queue
              </h3>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                  {pendingCount} pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="text-white/40 hover:text-white transition-colors"
                title="Clear completed"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {transactions.length > maxVisible && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-white/40">
            {transactions.length} transaction
            {transactions.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Transaction List */}
        <div className="max-h-96 overflow-y-auto">
          <AnimatePresence>
            {visibleTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

interface TransactionItemProps {
  transaction: Transaction;
  onRemove: (id: string) => void;
}

function TransactionItem({ transaction, onRemove }: TransactionItemProps) {
  const getStatusIcon = () => {
    switch (transaction.status) {
      case "pending":
      case "broadcasting":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case "inBlock":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "finalized":
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusText = () => {
    switch (transaction.status) {
      case "pending":
        return "Pending";
      case "broadcasting":
        return "Broadcasting";
      case "inBlock":
        return "In Block";
      case "finalized":
        return "Finalized";
      case "error":
        return "Failed";
    }
  };

  const getStatusColor = () => {
    switch (transaction.status) {
      case "pending":
      case "broadcasting":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "inBlock":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "finalized":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "error":
        return "text-red-400 bg-red-500/10 border-red-500/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-white/10 last:border-b-0"
    >
      <div className="p-4 hover:bg-white/5 transition-colors">
        <div className="flex items-start gap-3">
          {getStatusIcon()}

          <div className="flex-1 min-w-0">
            {/* Type & Status */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white capitalize">
                {transaction.type}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-semibold rounded border",
                  getStatusColor()
                )}
              >
                {getStatusText()}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs text-white/60 mb-2">
              {transaction.description}
            </p>

            {/* Hash */}
            {transaction.hash && (
              <p className="text-xs font-mono text-white/40 mb-2">
                {transaction.hash.slice(0, 10)}...{transaction.hash.slice(-8)}
              </p>
            )}

            {/* Error */}
            {transaction.error && (
              <p className="text-xs text-red-400 mb-2">{transaction.error}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">
                {formatTimeAgo(transaction.timestamp)}
              </span>

              <div className="flex items-center gap-2">
                {transaction.status === "error" && (
                  <button
                    onClick={() => {
                      // Retry logic would go here
                    }}
                    className="text-xs text-white/60 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}

                {transaction.explorerUrl && (
                  <a
                    href={transaction.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/60 hover:text-white flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Explorer
                  </a>
                )}

                {transaction.status === "finalized" && (
                  <button
                    onClick={() => onRemove(transaction.id)}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Hook for managing transaction queue
 */
export function useTransactionQueue() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const addTransaction = (
    data: Omit<Transaction, "id" | "timestamp" | "status">
  ) => {
    const id = Math.random().toString(36).substring(7);
    const transaction: Transaction = {
      ...data,
      id,
      timestamp: Date.now(),
      status: "pending",
    };

    setTransactions((prev) => [transaction, ...prev]);
    return id;
  };

  const updateTransaction = (
    id: string,
    updates: Partial<Omit<Transaction, "id" | "timestamp">>
  ) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
    );
  };

  const removeTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  return {
    transactions,
    addTransaction,
    updateTransaction,
    removeTransaction,
  };
}

export default TransactionQueue;
