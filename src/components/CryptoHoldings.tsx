import React, { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaDownload, FaEdit, FaPlus, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import { API_BASE_URL, authFetch, getAuthHeaders } from '../lib/api';

interface CryptoTransaction {
  currency: string;
  symbol: string;
  timestamp: string;
  trade_type: string;
  price: number;
  txn_qty: number;
  value_incl_fee: number;
  fee: number;
  from_account: string;
  to_account: string;
  transaction_id: string;
  comments: string | null;
  notes: string | null;
}

const TRADE_TYPES = [
  'All', 'Buy', 'Sell', 'Income', 'Staking Reward', 'Staking Reward Compound',
  'Fiat Deposit', 'Fiat Withdrawal', 'Fee', 'Transfer In', 'Transfer Out',
  'Airdrop', 'Swap', 'Swap In', 'Swap Out', 'Mining', 'Interest', 'Incoming',
  'Outgoing', 'Spam', 'Self', 'Mint', 'Unknown',
];

const PAGE_SIZE = 200;
const WALLETS_KEY = 'etherscan_wallets';

const fmt = (n: number, decimals = 4) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });

function loadWallets(): { label: string; address: string }[] {
  try {
    const raw = localStorage.getItem(WALLETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveWallets(wallets: { label: string; address: string }[]) {
  localStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
}

const CryptoHoldings: React.FC = () => {
  const [transactions, setTransactions] = useState<CryptoTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [symbolFilter, setSymbolFilter] = useState('');
  const [tradeTypeFilter, setTradeTypeFilter] = useState('All');

  const [page, setPage] = useState(0);

  // Edit state
  const [editRow, setEditRow] = useState<CryptoTransaction | null>(null);
  const [editOriginal, setEditOriginal] = useState<CryptoTransaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(false);

  // Add row state
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRow, setNewRow] = useState<CryptoTransaction>({
    currency: 'USD', symbol: '', timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    trade_type: 'Buy', price: 0, txn_qty: 0, value_incl_fee: 0, fee: 0,
    from_account: '', to_account: '', transaction_id: '', comments: null, notes: null,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Etherscan import state ──
  const [showImport, setShowImport] = useState(false);
  const [wallets, setWallets] = useState(loadWallets);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedTxns, setImportedTxns] = useState<CryptoTransaction[]>([]);
  const [importEditIdx, setImportEditIdx] = useState<number | null>(null);
  const [importEditRow, setImportEditRow] = useState<CryptoTransaction | null>(null);
  const [importSaving, setImportSaving] = useState<Set<number>>(new Set());
  const [importSaved, setImportSaved] = useState<Set<number>>(new Set());
  const [importDiscarded, setImportDiscarded] = useState<Set<number>>(new Set());
  const [importChain, setImportChain] = useState<'ethereum' | 'solana'>('ethereum');
  const [importFromDate, setImportFromDate] = useState('');
  const [importToDate, setImportToDate] = useState('');

  const fetchTransactions = useCallback(async (currentPage: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const sym = symbolFilter.trim().toUpperCase();
      if (sym) params.set('symbol', sym);
      if (tradeTypeFilter !== 'All') params.set('trade_type', tradeTypeFilter);
      if (!sym) {
        params.set('limit', String(PAGE_SIZE));
        params.set('offset', String(currentPage * PAGE_SIZE));
      }

      const res = await authFetch(`${API_BASE_URL}/crypto-transactions?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows: CryptoTransaction[] = await res.json();
      setTransactions(rows);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [symbolFilter, tradeTypeFilter]);

  useEffect(() => {
    setPage(0);
    fetchTransactions(0);
  }, [fetchTransactions]);

  const visibleRows = transactions;

  // ── Existing row edit helpers ──
  const startEdit = (tx: CryptoTransaction) => {
    setEditOriginal(tx);
    setEditRow({ ...tx });
    setSaveError(null);
  };
  const cancelEdit = () => { setEditRow(null); setEditOriginal(null); setSaveError(null); };
  const saveEdit = async () => {
    if (!editRow || !editOriginal) return;
    setIsSaving(true); setSaveError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/crypto-transactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ original: editOriginal, updated: editRow }),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || `HTTP ${res.status}`); }
      setEditRow(null); setEditOriginal(null);
      await fetchTransactions(page);
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setIsSaving(false); }
  };
  const updateField = (field: keyof CryptoTransaction, value: string) => {
    if (!editRow) return;
    const numericFields = ['price', 'txn_qty', 'value_incl_fee', 'fee'];
    setEditRow({ ...editRow, [field]: numericFields.includes(field) ? parseFloat(value) || 0 : value });
  };
  const updateNewField = (field: keyof CryptoTransaction, value: string) => {
    const numericFields = ['price', 'txn_qty', 'value_incl_fee', 'fee'];
    setNewRow(prev => ({ ...prev, [field]: numericFields.includes(field) ? parseFloat(value) || 0 : value }));
  };
  const addRow = async () => {
    setIsAdding(true); setAddError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/crypto-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(newRow),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || `HTTP ${res.status}`); }
      setShowAddRow(false);
      setNewRow({ currency: 'USD', symbol: '', timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), trade_type: 'Buy', price: 0, txn_qty: 0, value_incl_fee: 0, fee: 0, from_account: '', to_account: '', transaction_id: '', comments: null, notes: null });
      await fetchTransactions(page);
    } catch (e) { setAddError(e instanceof Error ? e.message : 'Add failed'); }
    finally { setIsAdding(false); }
  };
  const isEditingRow = (tx: CryptoTransaction) =>
    editOriginal !== null &&
    editOriginal.timestamp === tx.timestamp && editOriginal.symbol === tx.symbol &&
    editOriginal.trade_type === tx.trade_type && editOriginal.transaction_id === tx.transaction_id;

  // ── Etherscan import helpers ──
  const addWallet = () => {
    const addr = newWalletAddress.trim();
    const lbl = newWalletLabel.trim() || addr.slice(0, 10) + '...';
    if (!addr) return;
    const updated = [...wallets, { label: lbl, address: addr }];
    setWallets(updated);
    saveWallets(updated);
    setSelectedWallet(addr);
    setNewWalletAddress('');
    setNewWalletLabel('');
  };

  const removeWallet = (addr: string) => {
    const updated = wallets.filter(w => w.address !== addr);
    setWallets(updated);
    saveWallets(updated);
    if (selectedWallet === addr) setSelectedWallet('');
  };

  const fetchEtherscan = async () => {
    const addr = selectedWallet.trim();
    if (!addr) { setImportError('Select or enter a wallet address'); return; }
    setImportLoading(true); setImportError(null);
    setImportedTxns([]); setImportSaved(new Set()); setImportDiscarded(new Set());
    setImportEditIdx(null); setImportEditRow(null);
    try {
      const params = new URLSearchParams({ address: addr });
      if (importFromDate) params.set('from_date', importFromDate);
      if (importToDate) params.set('to_date', importToDate);
      const endpoint = importChain === 'solana' ? 'solscan-transactions' : 'etherscan-transactions';
      const res = await authFetch(`${API_BASE_URL}/${endpoint}?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows: CryptoTransaction[] = await res.json();

      // Fetch ALL existing transaction_ids so we can filter duplicates
      const existRes = await authFetch(`${API_BASE_URL}/crypto-transactions?limit=1000&offset=0`, { headers: getAuthHeaders() });
      let existingIds = new Set<string>();
      if (existRes.ok) {
        const existing: CryptoTransaction[] = await existRes.json();
        existingIds = new Set(existing.map(t => t.transaction_id));
      }

      const newTxns = rows.filter(t =>
        !existingIds.has(t.transaction_id) &&
        !(t.txn_qty === 0 && t.value_incl_fee === 0)
      );
      setImportedTxns(newTxns);
      if (newTxns.length === 0 && rows.length > 0) {
        window.alert(`No new transactions in ${addr}`);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setImportLoading(false);
    }
  };

  const updateImportField = (field: keyof CryptoTransaction, value: string) => {
    if (!importEditRow) return;
    const numericFields = ['price', 'txn_qty', 'value_incl_fee', 'fee'];
    setImportEditRow({ ...importEditRow, [field]: numericFields.includes(field) ? parseFloat(value) || 0 : value });
  };

  const startImportEdit = (idx: number) => {
    setImportEditIdx(idx);
    setImportEditRow({ ...importedTxns[idx] });
  };

  const cancelImportEdit = () => { setImportEditIdx(null); setImportEditRow(null); };

  const applyImportEdit = () => {
    if (importEditIdx === null || !importEditRow) return;
    setImportedTxns(prev => prev.map((t, i) => i === importEditIdx ? importEditRow : t));
    setImportEditIdx(null); setImportEditRow(null);
  };

  const saveImportRow = async (idx: number) => {
    setImportSaving(prev => new Set(prev).add(idx));
    try {
      const res = await authFetch(`${API_BASE_URL}/crypto-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(importedTxns[idx]),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || `HTTP ${res.status}`); }
      setImportSaved(prev => new Set(prev).add(idx));
    } catch (e) {
      setImportError(`Save failed for row ${idx + 1}: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setImportSaving(prev => { const s = new Set(prev); s.delete(idx); return s; });
    }
  };

  const saveAllImportRows = async () => {
    const toSave = importedTxns
      .map((_, i) => i)
      .filter(i => !importSaved.has(i) && !importDiscarded.has(i));
    for (const idx of toSave) {
      await saveImportRow(idx);
    }
    await fetchTransactions(page);
  };

  const discardImportRow = (idx: number) => {
    setImportDiscarded(prev => new Set(prev).add(idx));
  };

  const pendingCount = importedTxns.filter((_, i) => !importSaved.has(i) && !importDiscarded.has(i)).length;

  // ── Render helpers ──
  const cell = (content: React.ReactNode, right = false) => (
    <td className={`px-2 py-1.5 whitespace-nowrap text-xs text-gray-900 dark:text-gray-100 ${right ? 'text-right' : ''}`}>
      {content}
    </td>
  );

  const editInput = (field: keyof CryptoTransaction, type = 'text', width = 'w-24') => (
    <input
      type={type}
      {...(type === 'number' ? { step: 'any' } : {})}
      value={String(editRow?.[field] ?? '')}
      onChange={e => updateField(field, e.target.value)}
      className={`${width} px-1 py-0.5 text-xs border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500`}
    />
  );

  const importInput = (field: keyof CryptoTransaction, type = 'text', width = 'w-24') => (
    <input
      type={type}
      {...(type === 'number' ? { step: 'any' } : {})}
      value={String(importEditRow?.[field] ?? '')}
      onChange={e => updateImportField(field, e.target.value)}
      className={`${width} px-1 py-0.5 text-xs border border-orange-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500`}
    />
  );

  return (
    <div className="max-w-full mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Crypto Holdings</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Symbol</label>
          <input
            type="text"
            placeholder="e.g. BTC"
            value={symbolFilter}
            onChange={e => setSymbolFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Trade Type</label>
          <select
            value={tradeTypeFilter}
            onChange={e => setTradeTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TRADE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setPage(0); fetchTransactions(0); }}
          className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          Search
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 self-end">
          {transactions.length.toLocaleString()} rows
        </span>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setShowImport(v => !v)}
            className={`px-4 py-1.5 text-sm ${showImport ? 'bg-orange-700' : 'bg-orange-600 hover:bg-orange-700'} text-white rounded focus:outline-none focus:ring-1 focus:ring-orange-500 flex items-center gap-1`}
          >
            <FaDownload size={10} /> Import Transactions
          </button>
          <button
            onClick={() => setShowAddRow(r => !r)}
            className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded focus:outline-none focus:ring-1 focus:ring-green-500 flex items-center gap-1"
          >
            <FaPlus size={10} /> Add Row
          </button>
        </div>
      </div>

      {/* ── Etherscan Import Panel ── */}
      {showImport && (
        <div className="mb-6 p-4 rounded-lg border-2 border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/10">
          <h2 className="text-sm font-bold text-orange-800 dark:text-orange-300 mb-3">Import from Block Explorer</h2>

          {/* Chain + Wallet selector */}
          <div className="flex flex-wrap gap-3 items-end mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Chain</label>
              <select
                value={importChain}
                onChange={e => setImportChain(e.target.value as 'ethereum' | 'solana')}
                className="px-3 py-1.5 text-sm border border-orange-300 dark:border-orange-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="ethereum">Ethereum (Etherscan)</option>
                <option value="solana">Solana (Helius)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Wallet</label>
              <select
                value={selectedWallet}
                onChange={e => setSelectedWallet(e.target.value)}
                className="px-3 py-1.5 text-sm border border-orange-300 dark:border-orange-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-80"
              >
                <option value="">-- select a wallet --</option>
                {wallets.map(w => (
                  <option key={w.address} value={w.address}>{w.label} ({w.address.slice(0, 6)}...{w.address.slice(-4)})</option>
                ))}
              </select>
            </div>
            {selectedWallet && (
              <button
                onClick={() => removeWallet(selectedWallet)}
                className="px-2 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                title="Remove this wallet from saved list"
              >
                <FaTrash size={10} />
              </button>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">From Date</label>
              <input
                type="date"
                value={importFromDate}
                onChange={e => setImportFromDate(e.target.value)}
                className="px-2 py-1.5 text-sm border border-orange-300 dark:border-orange-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">To Date</label>
              <input
                type="date"
                value={importToDate}
                onChange={e => setImportToDate(e.target.value)}
                className="px-2 py-1.5 text-sm border border-orange-300 dark:border-orange-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={fetchEtherscan}
              disabled={importLoading || !selectedWallet}
              className="px-4 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded disabled:opacity-50"
            >
              {importLoading ? 'Fetching...' : 'Fetch Transactions'}
            </button>
          </div>

          {/* Add new wallet */}
          <div className="flex flex-wrap gap-2 items-end mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">New Wallet Label</label>
              <input
                type="text"
                placeholder="e.g. My MetaMask"
                value={newWalletLabel}
                onChange={e => setNewWalletLabel(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Address</label>
              <input
                type="text"
                placeholder={importChain === 'solana' ? 'Solana address...' : '0x...'}
                value={newWalletAddress}
                onChange={e => setNewWalletAddress(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-96 font-mono"
              />
            </div>
            <button
              onClick={addWallet}
              disabled={!newWalletAddress.trim()}
              className="px-4 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded disabled:opacity-50"
            >
              Add Wallet
            </button>
          </div>

          {importError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{importError}</p>}

          {/* Imported transactions review table */}
          {importedTxns.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                  {importedTxns.length} new transaction{importedTxns.length !== 1 ? 's' : ''} found
                  {pendingCount < importedTxns.length && ` (${pendingCount} pending)`}
                </span>
                {pendingCount > 0 && (
                  <button
                    onClick={saveAllImportRows}
                    className="px-4 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-1"
                  >
                    <FaSave size={10} /> Save All Pending ({pendingCount})
                  </button>
                )}
              </div>
              <div className="overflow-x-auto rounded-lg shadow mb-2">
                <table className="min-w-full divide-y divide-orange-200 dark:divide-orange-800 text-xs table-fixed">
                  <thead className="bg-orange-100 dark:bg-orange-900/30 sticky top-0">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-orange-700 dark:text-orange-300 uppercase w-24">Actions</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Timestamp</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-orange-700 dark:text-orange-300 uppercase w-8">Symbol</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Trade Type</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Price</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Qty</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Value</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Fee</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">From</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">To</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Txn ID</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-orange-700 dark:text-orange-300 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-orange-100 dark:divide-orange-900/20">
                    {importedTxns.map((tx, idx) => {
                      const saved = importSaved.has(idx);
                      const discarded = importDiscarded.has(idx);
                      const saving = importSaving.has(idx);
                      const editing = importEditIdx === idx;

                      if (discarded) return (
                        <tr key={idx} className="opacity-30 line-through">
                          <td className="px-2 py-1.5 text-xs text-gray-400" colSpan={12}>Discarded</td>
                        </tr>
                      );

                      if (saved) return (
                        <tr key={idx} className="bg-green-50 dark:bg-green-900/10">
                          {cell(<FaCheck className="text-green-600" size={12} />)}
                          {cell(tx.timestamp)}
                          {cell(<span className="font-medium">{tx.symbol}</span>)}
                          {cell(tx.trade_type)}
                          {cell(fmt(tx.price, 6), true)}
                          {cell(fmt(tx.txn_qty, 6), true)}
                          {cell(fmt(tx.value_incl_fee, 2), true)}
                          {cell(fmt(tx.fee, 6), true)}
                          {cell(tx.from_account)}
                          {cell(tx.to_account)}
                          {cell(<span className="font-mono text-gray-500 dark:text-gray-400">{tx.transaction_id.slice(0, 16)}...</span>)}
                          {cell(tx.notes ?? tx.comments ?? '')}
                        </tr>
                      );

                      return (
                        <tr key={idx} className={`bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20 ${editing ? 'ring-2 ring-orange-400' : ''}`}>
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            <div className="flex gap-1">
                              {editing ? (
                                <>
                                  <button onClick={applyImportEdit} className="p-1 rounded text-white bg-orange-600 hover:bg-orange-700" title="Apply edit"><FaCheck size={10} /></button>
                                  <button onClick={cancelImportEdit} className="p-1 rounded text-white bg-gray-500 hover:bg-gray-600" title="Cancel edit"><FaTimes size={10} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => saveImportRow(idx)} disabled={saving} className="p-1 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50" title="Save to DB">
                                    {saving ? '...' : <FaSave size={10} />}
                                  </button>
                                  <button onClick={() => startImportEdit(idx)} className="p-1 rounded text-white bg-orange-600 hover:bg-orange-700" title="Edit before saving"><FaEdit size={10} /></button>
                                  <button onClick={() => discardImportRow(idx)} className="p-1 rounded text-white bg-red-500 hover:bg-red-600" title="Discard"><FaTimes size={10} /></button>
                                </>
                              )}
                            </div>
                          </td>
                          {editing && importEditRow ? (
                            <>
                              {cell(importInput('timestamp', 'text', 'w-36'))}
                              {cell(importInput('symbol', 'text', 'w-16'))}
                              {cell(
                                <select
                                  value={importEditRow.trade_type}
                                  onChange={e => updateImportField('trade_type', e.target.value)}
                                  className="w-28 px-1 py-0.5 text-xs border border-orange-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  {TRADE_TYPES.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
                                </select>
                              )}
                              {cell(importInput('price', 'number', 'w-20'), true)}
                              {cell(importInput('txn_qty', 'number', 'w-24'), true)}
                              {cell(importInput('value_incl_fee', 'number', 'w-20'), true)}
                              {cell(importInput('fee', 'number', 'w-16'), true)}
                              {cell(importInput('from_account', 'text', 'w-24'))}
                              {cell(importInput('to_account', 'text', 'w-24'))}
                              {cell(importInput('transaction_id', 'text', 'w-40'))}
                              {cell(importInput('notes', 'text', 'w-40'))}
                            </>
                          ) : (
                            <>
                              {cell(tx.timestamp)}
                              {cell(<span className="font-medium">{tx.symbol}</span>)}
                              {cell(tx.trade_type)}
                              {cell(fmt(tx.price, 6), true)}
                              {cell(fmt(tx.txn_qty, 6), true)}
                              {cell(fmt(tx.value_incl_fee, 2), true)}
                              {cell(fmt(tx.fee, 6), true)}
                              {cell(tx.from_account)}
                              {cell(tx.to_account)}
                              {cell(<span className="font-mono text-gray-500 dark:text-gray-400">{tx.transaction_id.slice(0, 16)}...</span>)}
                              {cell(tx.notes ?? tx.comments ?? '')}
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {addError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">Add error: {addError}</p>}

      {/* Status messages */}
      {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Loading...</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
      {saveError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">Save error: {saveError}</p>}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs table-fixed">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"></th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Timestamp</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase w-8">Symbol</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Trade Type</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Price</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Qty</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Value</th>
              <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fee</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">From</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">To</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Transaction ID</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Notes</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
            {showAddRow && (
              <tr className="bg-green-50 dark:bg-green-900/20">
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <div className="flex gap-1">
                    <button onClick={addRow} disabled={isAdding} className="p-1 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50" title="Save"><FaSave size={10} /></button>
                    <button onClick={() => setShowAddRow(false)} className="p-1 rounded text-white bg-gray-500 hover:bg-gray-600" title="Cancel"><FaTimes size={10} /></button>
                  </div>
                </td>
                {cell(<input type="text" value={newRow.timestamp} onChange={e => updateNewField('timestamp', e.target.value)} className="w-36 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />)}
                {cell(<input type="text" value={newRow.symbol} onChange={e => updateNewField('symbol', e.target.value)} placeholder="BTC" className="w-16 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />)}
                {cell(<select value={newRow.trade_type} onChange={e => updateNewField('trade_type', e.target.value)} className="w-36 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white">{TRADE_TYPES.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}</select>)}
                {cell(<input type="number" step="any" value={newRow.price} onChange={e => updateNewField('price', e.target.value)} className="w-20 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />, true)}
                {cell(<input type="number" step="any" value={newRow.txn_qty} onChange={e => updateNewField('txn_qty', e.target.value)} className="w-24 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />, true)}
                {cell(<input type="number" step="any" value={newRow.value_incl_fee} onChange={e => updateNewField('value_incl_fee', e.target.value)} className="w-20 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />, true)}
                {cell(<input type="number" step="any" value={newRow.fee} onChange={e => updateNewField('fee', e.target.value)} className="w-16 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />, true)}
                {cell(<input type="text" value={newRow.from_account} onChange={e => updateNewField('from_account', e.target.value)} className="w-24 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />)}
                {cell(<input type="text" value={newRow.to_account} onChange={e => updateNewField('to_account', e.target.value)} className="w-24 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />)}
                {cell(<input type="text" value={newRow.transaction_id} onChange={e => updateNewField('transaction_id', e.target.value)} className="w-40 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />)}
                {cell(<input type="text" value={newRow.notes ?? ''} onChange={e => updateNewField('notes', e.target.value)} className="w-40 px-1 py-0.5 text-xs border border-green-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />)}
              </tr>
            )}
            {visibleRows.map((tx, i) => {
              const editing = isEditingRow(tx);
              const globalIndex = page * PAGE_SIZE + i;
              return (
                <tr key={globalIndex} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${editing ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  {/* Action buttons */}
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {editing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="p-1 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          title="Save"
                        >
                          <FaSave size={10} />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 rounded text-white bg-gray-500 hover:bg-gray-600"
                          title="Cancel"
                        >
                          <FaTimes size={10} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(tx)}
                        className="p-1 rounded text-white bg-blue-600 hover:bg-blue-700"
                        title="Edit"
                      >
                        <FaEdit size={10} />
                      </button>
                    )}
                  </td>
                  {editing && editRow ? (
                    <>
                      {cell(editInput('timestamp', 'text', 'w-36'))}
                      {cell(editInput('symbol', 'text', 'w-16'))}
                      {cell(
                        <select
                          value={editRow.trade_type}
                          onChange={e => updateField('trade_type', e.target.value)}
                          className="w-36 px-1 py-0.5 text-xs border border-blue-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          {TRADE_TYPES.filter(t => t !== 'All').map(t => <option key={t}>{t}</option>)}
                        </select>
                      )}
                      {cell(editInput('price', 'number', 'w-20'), true)}
                      {cell(editInput('txn_qty', 'number', 'w-24'), true)}
                      {cell(editInput('value_incl_fee', 'number', 'w-20'), true)}
                      {cell(editInput('fee', 'number', 'w-16'), true)}
                      {cell(editInput('from_account', 'text', 'w-24'))}
                      {cell(editInput('to_account', 'text', 'w-24'))}
                      {cell(editInput('transaction_id', 'text', 'w-40'))}
                      {cell(editInput('notes', 'text', 'w-40'))}
                    </>
                  ) : (
                    <>
                      {cell(tx.timestamp)}
                      {cell(<span className="font-medium">{tx.symbol}</span>)}
                      {cell(tx.trade_type)}
                      {cell(fmt(tx.price, 6), true)}
                      {cell(fmt(tx.txn_qty, 6), true)}
                      {cell(fmt(tx.value_incl_fee, 2), true)}
                      {cell(fmt(tx.fee, 2), true)}
                      {cell(tx.from_account)}
                      {cell(tx.to_account)}
                      {cell(<span className="font-mono text-gray-500 dark:text-gray-400">{tx.transaction_id}</span>)}
                      {cell(tx.notes ?? tx.comments ?? '')}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && transactions.length === 0 && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No transactions found.</p>
        )}
      </div>

      {!symbolFilter.trim() && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => { setPage(p => p - 1); fetchTransactions(page - 1); }}
            disabled={page === 0}
            className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            &lsaquo; Prev
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">Page {page + 1}</span>
          <button
            onClick={() => { setPage(p => p + 1); fetchTransactions(page + 1); }}
            disabled={!hasMore}
            className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-40 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Next &rsaquo;
          </button>
        </div>
      )}
    </div>
  );
};

export default CryptoHoldings;
