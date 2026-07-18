import ReactECharts from 'echarts-for-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FaChartBar, FaCheck, FaChevronDown, FaChevronRight, FaDownload, FaEdit, FaFileDownload, FaPlus, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import { ThemeContext } from '../context/ThemeContext';
import { useRequestToken } from '../hooks/useRequestToken';
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

interface RealizedPnLItem {
  symbol: string; sell_date: string; sell_qty: number; sell_price: number;
  proceeds: number; cost_basis: number; pnl: number;
  holding_period_days: number; term: string; lot_ids: string;
  method: string; acquire_date: string;
}
interface UnrealizedPnLItem {
  symbol: string; qty: number; avg_cost_basis: number;
  current_price: number; market_value: number; unrealized_pnl: number; method: string;
}
interface PnLYearSummary {
  year: number; num_sales: number; num_wins: number; num_losses: number;
  total_proceeds: number; total_cost_basis: number; total_pnl: number;
  short_term_pnl: number; long_term_pnl: number;
}
interface CryptoPnLResponse {
  realized: RealizedPnLItem[]; unrealized: UnrealizedPnLItem[];
  summary: PnLYearSummary[];
}

const TRADE_TYPES = [
  'All', 'Buy', 'Sell', 'Income', 'Staking Reward', 'Staking Reward Compound',
  'Fiat Deposit', 'Fiat Withdrawal', 'Fee', 'Transfer In', 'Transfer Out',
  'Airdrop', 'Swap', 'Swap In', 'Swap Out', 'Mining', 'Interest', 'Incoming',
  'Outgoing', 'Spam', 'Self', 'Mint', 'Unknown',
];

const PAGE_SIZE = 200;
const WALLETS_KEY = 'etherscan_wallets';

const POSITION_ADD_TYPES = new Set([
  'Buy', 'Swap In', 'Airdrop', 'Income',
  'Staking Reward', 'Staking Reward Compound', 'Mining', 'Interest', 'Incoming',
]);
const POSITION_SUB_TYPES = new Set(['Sell', 'Swap Out', 'Outgoing']);

const fmt = (n: number, decimals = 4) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });

const derivePrice = (tx: CryptoTransaction) =>
  tx.price || (tx.txn_qty ? tx.value_incl_fee / tx.txn_qty : 0);

type SortConfig = { col: string; dir: 'asc' | 'desc' };

function genericSort<T>(data: T[], { col, dir }: SortConfig): T[] {
  return [...data].sort((a, b) => {
    const va = (a as any)[col];
    const vb = (b as any)[col];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return dir === 'asc' ? cmp : -cmp;
  });
}

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
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

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
  const [importPriceFetching, setImportPriceFetching] = useState<Set<number>>(new Set());
  const [importChain, setImportChain] = useState<'all' | 'ethereum' | 'optimism' | 'base' | 'polygon' | 'blast' | 'abstract' | 'solana' | 'polkadot' | 'kusama'>('all');
  const [importFromDate, setImportFromDate] = useState('');
  const [importToDate, setImportToDate] = useState('');

  // ── Reports state ──
  const [showReports, setShowReports] = useState(false);
  const [reportTxns, setReportTxns] = useState<CryptoTransaction[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // ── P&L state ──
  const [pnlData, setPnlData] = useState<CryptoPnLResponse | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [pnlError, setPnlError] = useState<string | null>(null);
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [pnlMethod, setPnlMethod] = useState<'FIFO' | 'LIFO' | 'Hybrid'>('Hybrid');

  // ── Report tab state (collapsed by default) ──
  const [showHeatmaps, setShowHeatmaps] = useState(false);
  const [showPnl, setShowPnl] = useState(false);

  // ── Table sort state ──
  const [summarySort, setSummarySort] = useState<SortConfig>({ col: 'year', dir: 'desc' });
  const [realizedSort, setRealizedSort] = useState<SortConfig>({ col: 'sell_date', dir: 'asc' });
  const [unrealizedSort, setUnrealizedSort] = useState<SortConfig>({ col: 'unrealized_pnl', dir: 'desc' });

  const beginRequest = useRequestToken();

  const fetchTransactions = useCallback(async (currentPage: number) => {
    // Guard against out-of-order responses: typing "BTC" fires B, BT, BTC and
    // whichever resolves last would otherwise win. isCurrent() drops stale ones.
    const isCurrent = beginRequest();
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
      if (!isCurrent()) return;
      setTransactions(rows);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch (e) {
      if (!isCurrent()) return;
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [symbolFilter, tradeTypeFilter, beginRequest]);

  useEffect(() => {
    // Debounce so typing in the symbol filter doesn't fire a request per keystroke.
    const t = setTimeout(() => {
      setPage(0);
      fetchTransactions(0);
    }, 300);
    return () => clearTimeout(t);
  }, [fetchTransactions]);

  const visibleRows = transactions;

  // Cumulative position when filtered by a single symbol.
  // Transactions are ordered timestamp DESC, so iterate from last (oldest) to first.
  const showCumulative = !!symbolFilter.trim();
  const cumulativePositions = useMemo(() => {
    if (!showCumulative || visibleRows.length === 0) return [];
    const positions = new Array<number>(visibleRows.length);
    let running = 0;
    for (let i = visibleRows.length - 1; i >= 0; i--) {
      const tx = visibleRows[i];
      const qty = Math.abs(tx.txn_qty);
      if (POSITION_ADD_TYPES.has(tx.trade_type)) running += qty;
      else if (POSITION_SUB_TYPES.has(tx.trade_type)) running -= qty;
      positions[i] = running;
    }
    return positions;
  }, [showCumulative, visibleRows]);

  // ── Existing row edit helpers ──
  const startEdit = (tx: CryptoTransaction) => {
    setEditOriginal(tx);
    setEditRow({ ...tx });
    setSaveError(null);
  };
  const cancelEdit = () => { setEditRow(null); setEditOriginal(null); setSaveError(null); };
  const saveEdit = async () => {
    if (!editRow || !editOriginal) {
      console.warn('saveEdit: editRow or editOriginal is null', { editRow, editOriginal });
      return;
    }
    setIsSaving(true); setSaveError(null);
    try {
      const payload = { original: editOriginal, updated: parseNumericFields(editRow) };
      const res = await authFetch(`${API_BASE_URL}/crypto-transactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || `HTTP ${res.status}`); }
      setEditRow(null); setEditOriginal(null);
      await fetchTransactions(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      console.error('saveEdit error:', msg);
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };
  const numericFields = ['price', 'txn_qty', 'value_incl_fee', 'fee'];
  const parseNumericFields = (row: Record<string, any>) => {
    const out = { ...row };
    for (const f of numericFields) out[f] = parseFloat(out[f]) || 0;
    return out as unknown as CryptoTransaction;
  };
  const updateField = (field: keyof CryptoTransaction, value: string) => {
    if (!editRow) return;
    setEditRow({ ...editRow, [field]: value } as any);
  };
  const updateNewField = (field: keyof CryptoTransaction, value: string) => {
    setNewRow(prev => ({ ...prev, [field]: value } as any));
  };
  const addRow = async () => {
    setIsAdding(true); setAddError(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/crypto-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(parseNumericFields(newRow)),
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

  const EVM_CHAINS = ['ethereum', 'optimism', 'base', 'polygon', 'blast', 'abstract'] as const;

  const fetchSingleChain = async (
    addr: string,
    chain: string,
    fromDate: string,
    toDate: string,
  ): Promise<{ chain: string; rows: CryptoTransaction[]; error?: string }> => {
    const params = new URLSearchParams({ address: addr });
    if (fromDate) params.set('from_date', fromDate);
    if (toDate) params.set('to_date', toDate);
    const SUBSTRATE_CHAINS = ['polkadot', 'kusama'];
    const isSubstrate = SUBSTRATE_CHAINS.includes(chain);
    const endpoint = isSubstrate ? 'subscan-transactions'
      : chain === 'solana' ? 'helius-transactions'
      : 'etherscan-transactions';
    if (isSubstrate) {
      params.set('network', chain);
    } else if (chain !== 'solana' && chain !== 'ethereum') {
      params.set('chain', chain);
    }
    const url = `${API_BASE_URL}/${endpoint}?${params}`;
    console.log(`[Import] Fetching ${chain}:`, url);
    try {
      const res = await authFetch(url, { headers: getAuthHeaders() });
      if (!res.ok) return { chain, rows: [], error: `HTTP ${res.status}` };
      const rows: CryptoTransaction[] = await res.json();
      console.log(`[Import] ${chain} returned ${rows.length} rows`);
      return { chain, rows };
    } catch (e) {
      return { chain, rows: [], error: e instanceof Error ? e.message : 'Fetch failed' };
    }
  };

  const fetchEtherscan = async () => {
    const addr = selectedWallet.trim();
    if (!addr) { setImportError('Select or enter a wallet address'); return; }
    setImportLoading(true); setImportError(null);
    setImportedTxns([]); setImportSaved(new Set()); setImportDiscarded(new Set());
    setImportEditIdx(null); setImportEditRow(null);
    try {
      const chainsToFetch = importChain === 'all' ? [...EVM_CHAINS] : [importChain];

      // Fetch all selected chains in parallel
      const results = await Promise.all(
        chainsToFetch.map(c => fetchSingleChain(addr, c, importFromDate, importToDate))
      );

      // Collect errors and rows
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.warn('[Import] Chain errors:', errors.map(e => `${e.chain}: ${e.error}`));
      }

      const rows: CryptoTransaction[] = [];
      const chainCounts: string[] = [];
      for (const r of results) {
        if (r.rows.length > 0) chainCounts.push(`${r.chain}: ${r.rows.length}`);
        rows.push(...r.rows);
      }
      if (chainCounts.length > 0) console.log('[Import] Per-chain counts:', chainCounts.join(', '));

      // Fetch ALL existing transaction_ids for dedup (lightweight endpoint, no limit)
      const existRes = await authFetch(`${API_BASE_URL}/crypto-transaction-ids`, { headers: getAuthHeaders() });
      let existingIds = new Set<string>();
      if (existRes.ok) {
        const ids: string[] = await existRes.json();
        existingIds = new Set(ids);
        console.log(`[Import] ${ids.length} existing transaction IDs for dedup`);
      }

      const duplicateCount = rows.filter(t => existingIds.has(t.transaction_id)).length;
      const zeroCount = rows.filter(t => !existingIds.has(t.transaction_id) && t.txn_qty === 0 && t.value_incl_fee === 0).length;
      const newTxns = rows.filter(t =>
        !existingIds.has(t.transaction_id) &&
        !(t.txn_qty === 0 && t.value_incl_fee === 0)
      );
      // Sort by timestamp descending
      newTxns.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setImportedTxns(newTxns);

      const summary = importChain === 'all'
        ? `Checked ${chainsToFetch.length} chains. ` + (chainCounts.length > 0 ? `Hits: ${chainCounts.join(', ')}. ` : '')
        : '';
      if (newTxns.length === 0 && rows.length > 0) {
        window.alert(
          `No new transactions for ${addr}.\n` +
          `${summary}API returned ${rows.length} total transaction(s):\n` +
          `  - ${duplicateCount} already exist (duplicates)\n` +
          `  - ${zeroCount} filtered out (txn_qty=0 and value=0)\n` +
          `  - ${newTxns.length} remaining`
        );
      }
      if (errors.length > 0 && rows.length === 0) {
        setImportError(`Failed chains: ${errors.map(e => `${e.chain} (${e.error})`).join(', ')}`);
      }
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setImportLoading(false);
    }
  };

  const updateImportField = (field: keyof CryptoTransaction, value: string) => {
    if (!importEditRow) return;
    setImportEditRow({ ...importEditRow, [field]: value } as any);
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

  const saveImportRow = async (idx: number): Promise<'ok' | 'auth' | 'error'> => {
    setImportSaving(prev => new Set(prev).add(idx));
    try {
      const res = await authFetch(`${API_BASE_URL}/crypto-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(parseNumericFields(importedTxns[idx])),
      });
      if (res.status === 401) {
        setImportError('Session expired — please log in again and retry.');
        return 'auth';
      }
      if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.detail || `HTTP ${res.status}`); }
      setImportSaved(prev => new Set(prev).add(idx));
      return 'ok';
    } catch (e) {
      setImportError(`Save failed for row ${idx + 1}: ${e instanceof Error ? e.message : 'unknown'}`);
      return 'error';
    } finally {
      setImportSaving(prev => { const s = new Set(prev); s.delete(idx); return s; });
    }
  };

  const saveAllImportRows = async () => {
    const toSave = importedTxns
      .map((_, i) => i)
      .filter(i => !importSaved.has(i) && !importDiscarded.has(i));
    let saved = 0;
    for (const idx of toSave) {
      const result = await saveImportRow(idx);
      if (result === 'auth') break;  // stop immediately on auth failure
      if (result === 'ok') saved++;
    }
    if (saved > 0) await fetchTransactions(page);
  };

  const discardImportRow = (idx: number) => {
    setImportDiscarded(prev => new Set(prev).add(idx));
  };

  const fetchImportPrice = async (idx: number) => {
    const tx = importedTxns[idx];
    if (!tx.symbol || !tx.timestamp) return;
    setImportPriceFetching(prev => new Set(prev).add(idx));
    try {
      const date = tx.timestamp.slice(0, 10);
      const res = await authFetch(
        `${API_BASE_URL}/crypto-price-lookup?symbol=${encodeURIComponent(tx.symbol)}&date=${date}`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.price != null && data.price > 0) {
        setImportedTxns(prev => prev.map((t, i) => i === idx ? {
          ...t,
          price: data.price,
          value_incl_fee: Math.round(t.txn_qty * data.price * 1e6) / 1e6,
        } : t));
      } else {
        setImportError(`No price found for ${tx.symbol} on ${date} — enter manually`);
        startImportEdit(idx);
      }
    } catch (e) {
      setImportError(`Price lookup failed: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setImportPriceFetching(prev => { const s = new Set(prev); s.delete(idx); return s; });
    }
  };

  const pendingCount = importedTxns.filter((_, i) => !importSaved.has(i) && !importDiscarded.has(i)).length;

  // ── Reports: fetch all transactions for all saved wallets ──
  const fetchReportData = useCallback(async () => {
    if (wallets.length === 0) {
      setReportError('No wallets saved. Add wallets in the Import section first.');
      return;
    }
    setReportLoading(true);
    setReportError(null);
    try {
      // Paginate through all transactions in batches of 1000
      const batchSize = 1000;
      let allRows: CryptoTransaction[] = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const res = await authFetch(`${API_BASE_URL}/crypto-transactions?limit=${batchSize}&offset=${offset}`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows: CryptoTransaction[] = await res.json();
        allRows = allRows.concat(rows);
        hasMore = rows.length >= batchSize;
        offset += batchSize;
      }
      setReportTxns(allRows);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Failed to load report data');
    } finally {
      setReportLoading(false);
    }
  }, [wallets]);

  const fetchPnlData = useCallback(async () => {
    setPnlLoading(true);
    setPnlError(null);
    try {
      const res = await authFetch(
        `${API_BASE_URL}/crypto-pnl?method=${pnlMethod}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CryptoPnLResponse = await res.json();
      setPnlData(data);
    } catch (e) {
      setPnlError(e instanceof Error ? e.message : 'Failed to load P&L data');
    } finally {
      setPnlLoading(false);
    }
  }, [pnlMethod]);

  const downloadTurboTaxCsv = async (year: number) => {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/crypto-pnl/turbotax-csv?tax_year=${year}&method=${pnlMethod}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crypto_form8949_${year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPnlError(e instanceof Error ? e.message : 'CSV download failed');
    }
  };

  const downloadTurboTaxTxf = async (year: number) => {
    try {
      const res = await authFetch(
        `${API_BASE_URL}/crypto-pnl/turbotax-txf?tax_year=${year}&method=${pnlMethod}`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crypto_form8949_${year}.txf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setPnlError(e instanceof Error ? e.message : 'TXF download failed');
    }
  };

  useEffect(() => {
    if (showHeatmaps && reportTxns.length === 0) fetchReportData();
  }, [showHeatmaps]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (showPnl) fetchPnlData();
  }, [showPnl, pnlMethod]); // eslint-disable-line react-hooks/exhaustive-deps

  const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  // Build per-wallet heatmap options
  const walletHeatmaps = useMemo(() => {
    if (reportTxns.length === 0 || wallets.length === 0) return [];

    const walletLabelMap = new Map(wallets.map(w => [w.address.toLowerCase(), w.label]));

    // Build count map: { walletLabel -> { 'YYYY-MM' -> count } }
    const countMap = new Map<string, Map<string, number>>();
    for (const w of wallets) {
      countMap.set(w.label, new Map());
    }

    for (const tx of reportTxns) {
      const from = tx.from_account?.toLowerCase() ?? '';
      const to = tx.to_account?.toLowerCase() ?? '';
      const ts = tx.timestamp?.slice(0, 7); // 'YYYY-MM'
      if (!ts) continue;

      for (const addr of [from, to]) {
        const label = walletLabelMap.get(addr);
        if (label) {
          const m = countMap.get(label)!;
          m.set(ts, (m.get(ts) || 0) + 1);
        }
      }
    }

    const textColor = isDark ? '#ccc' : '#555';
    const labelColor = isDark ? '#ddd' : '#333';
    const emptyColor = isDark ? '#2d333b' : '#ebedf0';
    const blueScale = isDark
      ? [emptyColor, '#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa']
      : [emptyColor, '#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'];

    return wallets.map(w => {
      const m = countMap.get(w.label);
      if (!m || m.size === 0) return { label: w.label, option: null };

      const months = Array.from(m.keys()).sort();
      const minYear = parseInt(months[0].slice(0, 4));
      const maxYear = parseInt(months[months.length - 1].slice(0, 4));

      const years: string[] = [];
      for (let y = maxYear; y >= minYear; y--) years.push(String(y));

      const data: [number, number, number][] = [];
      let maxVal = 0;
      for (let yi = 0; yi < years.length; yi++) {
        for (let mi = 0; mi < 12; mi++) {
          const key = `${years[yi]}-${String(mi + 1).padStart(2, '0')}`;
          const val = m.get(key) || 0;
          data.push([mi, yi, val]);
          if (val > maxVal) maxVal = val;
        }
      }

      return {
        label: w.label,
        years,
        option: {
          tooltip: {
            position: 'top',
            formatter: (params: any) => {
              const [mi, yi, val] = params.data;
              return `${MONTH_LABELS[mi]} ${years[yi]}: ${val} txn${val !== 1 ? 's' : ''}`;
            },
          },
          grid: { top: 10, bottom: 10, left: 60, right: 20 },
          xAxis: {
            type: 'category' as const,
            data: MONTH_LABELS,
            splitArea: { show: true },
            axisLabel: { color: textColor },
          },
          yAxis: {
            type: 'category' as const,
            data: years,
            splitArea: { show: true },
            axisLabel: { color: textColor },
          },
          visualMap: {
            show: false,
            min: 0,
            max: maxVal || 1,
            inRange: { color: blueScale },
          },
          series: [{
            type: 'heatmap',
            data,
            label: {
              show: true,
              formatter: (params: any) => params.data[2] > 0 ? params.data[2] : '',
              fontSize: 10,
              color: labelColor,
            },
            emphasis: {
              itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' },
            },
          }],
        },
      };
    });
  }, [reportTxns, wallets, isDark]);

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

  const sortHeader = (
    label: string, col: string, sort: SortConfig,
    setSort: React.Dispatch<React.SetStateAction<SortConfig>>,
    className: string
  ) => (
    <th
      className={`${className} cursor-pointer select-none hover:opacity-75`}
      onClick={() => setSort(prev => ({ col, dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc' }))}
    >
      {label}{sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
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
            onClick={() => setShowReports(v => !v)}
             className={`px-4 py-1.5 text-sm ${showReports ? 'bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded focus:outline-none focus:ring-1 focus:ring-purple-500 flex items-center gap-1`}
          >
            <FaChartBar size={10} /> Reports
          </button>
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
                onChange={e => setImportChain(e.target.value as typeof importChain)}
                className="px-3 py-1.5 text-sm border border-orange-300 dark:border-orange-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All EVM Chains</option>
                <option value="ethereum">Ethereum</option>
                <option value="optimism">Optimism</option>
                <option value="base">Base</option>
                <option value="polygon">Polygon</option>
                <option value="blast">Blast</option>
                <option value="abstract">Abstract</option>
                <option value="solana">Solana (Helius)</option>
                <option value="polkadot">Polkadot (Subscan)</option>
                <option value="kusama">Kusama (Subscan)</option>
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
                placeholder={importChain === 'solana' ? 'Solana address...' : ['polkadot', 'kusama'].includes(importChain) ? 'Substrate address (1...)' : '0x... (EVM address)'}
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
                          {cell(fmt(derivePrice(tx), 6), true)}
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
                              {cell(
                                derivePrice(tx) === 0 ? (
                                  <button
                                    onClick={() => fetchImportPrice(idx)}
                                    disabled={importPriceFetching.has(idx)}
                                    className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50"
                                    title="Fetch price from CoinGecko"
                                  >
                                    {importPriceFetching.has(idx) ? '...' : 'N/A'}
                                  </button>
                                ) : fmt(derivePrice(tx), 6),
                                true,
                              )}
                              {cell(fmt(tx.txn_qty, 6), true)}
                              {cell(derivePrice(tx) === 0 ? 'N/A' : fmt(tx.value_incl_fee, 2), true)}
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

      {/* ── Reports Panel ── */}
      {showReports && (
        <div className="mb-6 p-4 rounded-lg border-2 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/10">
          <h2 className="text-sm font-bold text-purple-800 dark:text-purple-300 mb-3">Reports</h2>

          {/* Wallet Activity Heatmaps -- collapsible */}
          <div className="mb-2">
            <button
              onClick={() => setShowHeatmaps(v => !v)}
              className="flex items-center gap-2 w-full text-left py-1.5 px-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20"
            >
              {showHeatmaps ? <FaChevronDown size={10} className="text-purple-500" /> : <FaChevronRight size={10} className="text-purple-500" />}
              <h3 className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                Wallet Activity Heatmaps
              </h3>
            </button>
            {showHeatmaps && (
              <div className="mt-2 ml-4">
                {reportLoading && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Loading report data...</p>}
                {reportError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{reportError}</p>}
                {walletHeatmaps.length > 0 ? walletHeatmaps.map(wh => (
                  <div key={wh.label} className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{wh.label}</p>
                    {wh.option ? (
                      <ReactECharts option={wh.option} style={{ height: Math.max(150, (wh.years!.length * 40) + 40) }} />
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">No transactions found for this wallet.</p>
                    )}
                  </div>
                )) : (
                  !reportLoading && <p className="text-xs text-gray-500 dark:text-gray-400">No transaction data found for saved wallets.</p>
                )}
              </div>
            )}
          </div>

          {/* ── Profit & Loss -- collapsible ── */}
          <div className="mb-2">
            <button
              onClick={() => setShowPnl(v => !v)}
              className="flex items-center gap-2 w-full text-left py-1.5 px-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20"
            >
              {showPnl ? <FaChevronDown size={10} className="text-purple-500" /> : <FaChevronRight size={10} className="text-purple-500" />}
              <h3 className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                Profit &amp; Loss
              </h3>
            </button>
            {showPnl && (
              <div className="mt-2 ml-4">
                <div className="flex items-center gap-3 mb-2">
                  <select
                    value={pnlMethod}
                    onChange={e => setPnlMethod(e.target.value as 'FIFO' | 'LIFO' | 'Hybrid')}
                    className="px-2 py-0.5 text-xs border border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="FIFO">FIFO</option>
                    <option value="LIFO">LIFO</option>
                    <option value="Hybrid">Hybrid (Highest Cost)</option>
                  </select>
                </div>

                {pnlLoading && <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Calculating P&amp;L...</p>}
                {pnlError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{pnlError}</p>}

            {pnlData && (
              <>
                {/* Realized P&L Summary by Year */}
                <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1 mt-3">Realized P&amp;L by Year</h4>
                {pnlData.summary.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg shadow mb-4">
                    <table className="min-w-full divide-y divide-purple-200 dark:divide-purple-800 text-xs">
                      <thead className="bg-purple-100 dark:bg-purple-900/30">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase"></th>
                          {sortHeader('Year', 'year', summarySort, setSummarySort, 'px-2 py-2 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('# Sales', 'num_sales', summarySort, setSummarySort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Wins', 'num_wins', summarySort, setSummarySort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Losses', 'num_losses', summarySort, setSummarySort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Short-Term', 'short_term_pnl', summarySort, setSummarySort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Long-Term', 'long_term_pnl', summarySort, setSummarySort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Total P&L', 'total_pnl', summarySort, setSummarySort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          <th className="px-2 py-2 text-center text-xs font-medium text-purple-700 dark:text-purple-300 uppercase">Export</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-purple-100 dark:divide-purple-900/20">
                        {genericSort(pnlData.summary, summarySort).map(s => (
                          <React.Fragment key={s.year}>
                            <tr
                              className="hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer"
                              onClick={() => setExpandedYear(expandedYear === s.year ? null : s.year)}
                            >
                              <td className="px-2 py-1.5 text-gray-500">
                                {expandedYear === s.year ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                              </td>
                              <td className="px-2 py-1.5 font-medium text-gray-900 dark:text-white">{s.year}</td>
                              <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{s.num_sales}</td>
                              <td className="px-2 py-1.5 text-right text-green-600">{s.num_wins}</td>
                              <td className="px-2 py-1.5 text-right text-red-600">{s.num_losses}</td>
                              <td className={`px-2 py-1.5 text-right font-medium ${s.short_term_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${fmt(s.short_term_pnl, 2)}
                              </td>
                              <td className={`px-2 py-1.5 text-right font-medium ${s.long_term_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${fmt(s.long_term_pnl, 2)}
                              </td>
                              <td className={`px-2 py-1.5 text-right font-bold ${s.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${fmt(s.total_pnl, 2)}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={e => { e.stopPropagation(); downloadTurboTaxCsv(s.year); }}
                                    className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                    title={`Download TurboTax CSV for ${s.year}`}
                                  >
                                    CSV
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); downloadTurboTaxTxf(s.year); }}
                                    className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                    title={`Download TurboTax TXF for ${s.year} (Desktop)`}
                                  >
                                    TXF
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {/* Expanded detail rows */}
                            {expandedYear === s.year && (
                              <tr>
                                <td colSpan={9} className="p-0">
                                  <div className="max-h-96 overflow-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                                      <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                          {sortHeader('Symbol', 'symbol', realizedSort, setRealizedSort, 'px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300')}
                                          {sortHeader('Acquired', 'acquire_date', realizedSort, setRealizedSort, 'px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300')}
                                          {sortHeader('Sold', 'sell_date', realizedSort, setRealizedSort, 'px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300')}
                                          {sortHeader('Qty', 'sell_qty', realizedSort, setRealizedSort, 'px-2 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-300')}
                                          {sortHeader('Proceeds', 'proceeds', realizedSort, setRealizedSort, 'px-2 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-300')}
                                          {sortHeader('Cost Basis', 'cost_basis', realizedSort, setRealizedSort, 'px-2 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-300')}
                                          {sortHeader('P&L', 'pnl', realizedSort, setRealizedSort, 'px-2 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-300')}
                                          {sortHeader('Term', 'term', realizedSort, setRealizedSort, 'px-2 py-1 text-left text-xs font-medium text-gray-500 dark:text-gray-300')}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {genericSort(pnlData.realized
                                          .filter(r => r.sell_date.startsWith(String(s.year))), realizedSort)
                                          .map((r, ri) => (
                                            <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                              <td className="px-2 py-1 font-medium text-gray-900 dark:text-white">{r.symbol}</td>
                                              <td className="px-2 py-1 text-gray-600 dark:text-gray-400">{r.acquire_date}</td>
                                              <td className="px-2 py-1 text-gray-600 dark:text-gray-400">{r.sell_date}</td>
                                              <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300">{fmt(r.sell_qty, 6)}</td>
                                              <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300">${fmt(r.proceeds, 2)}</td>
                                              <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300">${fmt(r.cost_basis, 2)}</td>
                                              <td className={`px-2 py-1 text-right font-medium ${r.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ${fmt(r.pnl, 2)}
                                              </td>
                                              <td className="px-2 py-1 text-gray-600 dark:text-gray-400">
                                                {r.term === 'long_term' ? 'Long' : 'Short'}
                                              </td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  !pnlLoading && <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-4">No realized P&amp;L data.</p>
                )}

                {/* Unrealized P&L */}
                <h4 className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1 mt-3">Unrealized P&amp;L (Current Holdings)</h4>
                {pnlData.unrealized.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg shadow mb-4">
                    <table className="min-w-full divide-y divide-purple-200 dark:divide-purple-800 text-xs">
                      <thead className="bg-purple-100 dark:bg-purple-900/30">
                        <tr>
                          {sortHeader('Symbol', 'symbol', unrealizedSort, setUnrealizedSort, 'px-2 py-2 text-left text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Qty', 'qty', unrealizedSort, setUnrealizedSort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Avg Cost', 'avg_cost_basis', unrealizedSort, setUnrealizedSort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Current Price', 'current_price', unrealizedSort, setUnrealizedSort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Market Value', 'market_value', unrealizedSort, setUnrealizedSort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                          {sortHeader('Unrealized P&L', 'unrealized_pnl', unrealizedSort, setUnrealizedSort, 'px-2 py-2 text-right text-xs font-medium text-purple-700 dark:text-purple-300 uppercase')}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-purple-100 dark:divide-purple-900/20">
                        {genericSort(pnlData.unrealized, unrealizedSort).map((u, ui) => (
                          <tr key={ui} className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
                            <td className="px-2 py-1.5 font-medium text-gray-900 dark:text-white">{u.symbol}</td>
                            <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">{fmt(u.qty, 6)}</td>
                            <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">${fmt(u.avg_cost_basis, 4)}</td>
                            <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">${fmt(u.current_price, 4)}</td>
                            <td className="px-2 py-1.5 text-right text-gray-700 dark:text-gray-300">${fmt(u.market_value, 2)}</td>
                            <td className={`px-2 py-1.5 text-right font-medium ${u.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${fmt(u.unrealized_pnl, 2)}
                            </td>
                          </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-purple-50 dark:bg-purple-900/20 font-bold">
                          <td className="px-2 py-1.5 text-gray-900 dark:text-white">Total</td>
                          <td className="px-2 py-1.5"></td>
                          <td className="px-2 py-1.5"></td>
                          <td className="px-2 py-1.5"></td>
                          <td className="px-2 py-1.5 text-right text-gray-900 dark:text-white">
                            ${fmt(pnlData.unrealized.reduce((s, u) => s + u.market_value, 0), 2)}
                          </td>
                          <td className={`px-2 py-1.5 text-right ${pnlData.unrealized.reduce((s, u) => s + u.unrealized_pnl, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${fmt(pnlData.unrealized.reduce((s, u) => s + u.unrealized_pnl, 0), 2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  !pnlLoading && <p className="text-xs text-gray-500 dark:text-gray-400 italic">No unrealized positions.</p>
                )}
              </>
            )}
              </div>
            )}
          </div>
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
              {showCumulative && <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Position</th>}
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
                {showCumulative && <td></td>}
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
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="p-1 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          title="Save"
                        >
                          {isSaving ? <span className="animate-spin inline-block w-2.5 h-2.5 border border-white border-t-transparent rounded-full"></span> : <FaSave size={10} />}
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
                      {showCumulative && <td className="px-2 py-1.5 text-right text-xs text-gray-400">--</td>}
                      {cell(editInput('transaction_id', 'text', 'w-40'))}
                      {cell(editInput('notes', 'text', 'w-40'))}
                    </>
                  ) : (
                    <>
                      {cell(tx.timestamp)}
                      {cell(<span className="font-medium">{tx.symbol}</span>)}
                      {cell(tx.trade_type)}
                      {cell(fmt(derivePrice(tx), 6), true)}
                      {cell(fmt(tx.txn_qty, 6), true)}
                      {cell(fmt(tx.value_incl_fee, 2), true)}
                      {cell(fmt(tx.fee, 2), true)}
                      {cell(tx.from_account)}
                      {cell(tx.to_account)}
                      {showCumulative && (
                        <td className={`px-2 py-1.5 whitespace-nowrap text-xs text-right font-medium ${cumulativePositions[i] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {fmt(cumulativePositions[i], 6)}
                        </td>
                      )}
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
