import { ChevronDown, ChevronUp, Plus, RefreshCw, Save, Settings, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { abbreviateSectorIndustry } from '../lib/financialUtils';
import { TableRowSkeleton } from './LoadingSkeleton';
import { Badge } from './ui/badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY;

// Interfaces
interface Portfolio {
  id: string;
  name: string;
  type: 'crypto' | 'stocks';
  symbols: string[];
  action?: 'BUY' | 'SELL';
  quantity?: number;
  price?: number;
}

interface CryptoXDaysData {
  baseCurrency: string;
  close_1d: number | null;
  close_7d: number | null;
  close_30d: number | null;
  close_60d: number | null;
  close_90d: number | null;
  close_120d: number | null;
}

interface LatestPriceData {
  symbol: string;
  latestPrice: number;
  returns: {
    '1d': number | null;
    '7d': number | null;
    '30d': number | null;
    '60d': number | null;
    '90d': number | null;
    '120d': number | null;
  };
}

interface StockXDaysData {
  symbol: string;
  close_1d: number | null;
  close_7d: number | null;
  close_30d: number | null;
  close_60d: number | null;
  close_90d: number | null;
  close_120d: number | null;
}

// Ranks data interface
interface RanksData {
  date?: string;
  industry?: string;
  isADR: boolean;
  isActive: boolean;
  mcap: number;
  name: string;
  permaTicker: string;
  rankFundamental: number;
  rankTechnical: number;
  reportingCurrency: string;
  sector: number;
  statementLastUpdated: string;
  tag: string;
  td__Resistance: number;
  td__Support: number;
  tec_riskRangeHigh: number;
  tec_riskRangeInd: number;
  tec_riskRangeLow: number;
  ticker: string;
  ivol?: number;
  predicted_beta?: number;
  risk_contribution?: number;
}

interface CryptoRankData {
  baseCurrency: string;
  crypto_ranks: number;
  lppl_side: string;
  lppl_pos_conf: number;
  lppl_neg_conf: number;
  strategy_side: string;
  strategy_profit_per_trade: number;
  strategy_expectancy: number;
  strategy_profit_factor: number;
  quoteCurrency: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ivol: number;
  predicted_beta: number;
  risk_contribution: number;
}

// Portfolio transactions per symbol
interface PortfolioTransactionInput {
  date: string; // YYYY-MM-DD
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
}

interface PortfolioAggregatePosition {
  symbol: string;
  total_quantity: number;
  total_cost_basis: number;
}

const Portfolio: React.FC = () => {
  const { user } = useAuth();
  // REMOVED for SIWS migration: const { getAccessToken } = useWalletAuthContext();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('');
  const [cryptoData, setCryptoData] = useState<CryptoXDaysData[]>([]);
  const [stockData, setStockData] = useState<StockXDaysData[]>([]);
  const [latestPrices, setLatestPrices] = useState<LatestPriceData[]>([]);
  const [ranksData, setRanksData] = useState<RanksData[]>([]);
  const [cryptoRanksData, setCryptoRanksData] = useState<CryptoRankData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transactions modal state
  const [showTxModal, setShowTxModal] = useState(false);
  const [txSymbol, setTxSymbol] = useState<string>('');
  const [txRows, setTxRows] = useState<PortfolioTransactionInput[]>([]);

  // Aggregated positions per symbol
  const [aggregates, setAggregates] = useState<Record<string, PortfolioAggregatePosition>>({});

  // New portfolio form
  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioType, setNewPortfolioType] = useState<'crypto' | 'stocks'>('crypto');

  // Add symbol form
  const [showAddSymbolForm, setShowAddSymbolForm] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  // Status message
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column configuration
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [columnConfig, setColumnConfig] = useState<Array<{key: string, visible: boolean, order: number}>>([
    // Stock columns
    { key: 'fundamental', visible: true, order: 0 },
    { key: 'technical', visible: true, order: 1 },
    { key: 'ivol', visible: true, order: 2 },
    { key: 'predicted_beta', visible: true, order: 3 },
    { key: 'risk_contribution', visible: true, order: 4 },
    { key: 'industry', visible: false, order: 5 },
    { key: 'sector', visible: false, order: 6 },
    { key: 'mcap', visible: false, order: 7 },
    { key: 'isADR', visible: false, order: 8 },
    { key: 'isActive', visible: false, order: 9 },
    { key: 'reportingCurrency', visible: false, order: 10 },
    { key: 'td_resistance', visible: false, order: 11 },
    { key: 'td_support', visible: false, order: 12 },
    { key: 'tec_riskRangeHigh', visible: false, order: 13 },
    { key: 'tec_riskRangeLow', visible: false, order: 14 },
    { key: 'tag', visible: false, order: 15 },
    // Crypto columns
    { key: 'crypto_ranks', visible: true, order: 16 },
    { key: 'lppl_side', visible: false, order: 17 },
    { key: 'lppl_pos_conf', visible: false, order: 18 },
    { key: 'lppl_neg_conf', visible: false, order: 19 },
    { key: 'strategy_side', visible: false, order: 20 },
    { key: 'strategy_profit_per_trade', visible: false, order: 21 },
    { key: 'strategy_expectancy', visible: false, order: 22 },
    { key: 'strategy_profit_factor', visible: false, order: 23 },
    { key: 'quoteCurrency', visible: false, order: 24 },
    { key: 'open', visible: false, order: 25 },
    { key: 'high', visible: false, order: 26 },
    { key: 'low', visible: false, order: 27 },
    { key: 'close', visible: false, order: 28 },
    { key: 'volume', visible: false, order: 29 },
  ]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Helper function
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Load column configuration from localStorage
  const loadColumnConfig = () => {
    const saved = localStorage.getItem('portfolio-column-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Handle both old format (Record<string, boolean>) and new format (Array)
        if (Array.isArray(parsed)) {
          // Merge saved config with default config to ensure all columns are present
          const defaultConfig = [
            // Stock columns
            { key: 'fundamental', visible: true, order: 0 },
            { key: 'technical', visible: true, order: 1 },
            { key: 'ivol', visible: true, order: 2 },
            { key: 'predicted_beta', visible: true, order: 3 },
            { key: 'risk_contribution', visible: true, order: 4 },
            { key: 'industry', visible: false, order: 5 },
            { key: 'sector', visible: false, order: 6 },
            { key: 'mcap', visible: false, order: 7 },
            { key: 'isADR', visible: false, order: 8 },
            { key: 'isActive', visible: false, order: 9 },
            { key: 'reportingCurrency', visible: false, order: 10 },
            { key: 'td_resistance', visible: false, order: 11 },
            { key: 'td_support', visible: false, order: 12 },
            { key: 'tec_riskRangeHigh', visible: false, order: 13 },
            { key: 'tec_riskRangeLow', visible: false, order: 14 },
            { key: 'tag', visible: false, order: 15 },
            // Crypto columns
            { key: 'crypto_ranks', visible: true, order: 16 },
            { key: 'lppl_side', visible: false, order: 17 },
            { key: 'lppl_pos_conf', visible: false, order: 18 },
            { key: 'lppl_neg_conf', visible: false, order: 19 },
            { key: 'strategy_side', visible: false, order: 20 },
            { key: 'strategy_profit_per_trade', visible: false, order: 21 },
            { key: 'strategy_expectancy', visible: false, order: 22 },
            { key: 'strategy_profit_factor', visible: false, order: 23 },
            { key: 'quoteCurrency', visible: false, order: 24 },
            { key: 'open', visible: false, order: 25 },
            { key: 'high', visible: false, order: 26 },
            { key: 'low', visible: false, order: 27 },
            { key: 'close', visible: false, order: 28 },
            { key: 'volume', visible: false, order: 29 },
          ];

          // Create a map of saved columns for quick lookup
          const savedMap = new Map(parsed.map((col: any) => [col.key, col]));

          // Merge: use saved settings where available, otherwise use defaults
          const mergedConfig = defaultConfig.map(defaultCol => {
            const savedCol = savedMap.get(defaultCol.key);
            return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
          });

          setColumnConfig(mergedConfig);
        } else {
          // Convert old format to new format
          const newConfig = columnConfig.map(col => ({
            ...col,
            visible: parsed[col.key] !== undefined ? parsed[col.key] : col.visible
          }));
          setColumnConfig(newConfig);
        }
      } catch (error) {
        console.error('Error loading column config:', error);
      }
    }
  };

  // Save column configuration to localStorage
  const saveColumnConfig = (config: Array<{key: string, visible: boolean, order: number}>) => {
    localStorage.setItem('portfolio-column-config', JSON.stringify(config));
    setColumnConfig(config);
  };

  // Get visible columns as a record for easier access
  const getVisibleColumns = () => {
    const visible: Record<string, boolean> = {};
    columnConfig.forEach(col => {
      visible[col.key] = col.visible;
    });
    return visible;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newConfig = [...columnConfig];
    const draggedItem = newConfig[draggedIndex];

    // Remove dragged item
    newConfig.splice(draggedIndex, 1);
    // Insert at new position
    newConfig.splice(dropIndex, 0, draggedItem);

    // Update orders
    newConfig.forEach((item, index) => {
      item.order = index;
    });

    saveColumnConfig(newConfig);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Load column config on mount
  useEffect(() => {
    loadColumnConfig();
  }, []);

  // Sorting function
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Get sorted symbols for the active portfolio
  const getSortedSymbols = (symbols: string[]) => {
    if (!sortColumn || !activePortfolio) return symbols;

    return [...symbols].sort((a, b) => {
      let aValue: any = null;
      let bValue: any = null;

      const aData = displayData.find(d =>
        (activePortfolio.type === 'crypto' && 'baseCurrency' in d && d.baseCurrency === a) ||
        (activePortfolio.type === 'stocks' && 'symbol' in d && d.symbol === a)
      );
      const bData = displayData.find(d =>
        (activePortfolio.type === 'crypto' && 'baseCurrency' in d && d.baseCurrency === b) ||
        (activePortfolio.type === 'stocks' && 'symbol' in d && d.symbol === b)
      );

      const aLatest = latestPrices.find(lp => lp.symbol === a);
      const bLatest = latestPrices.find(lp => lp.symbol === b);

      const aAgg = aggregates[a] || { symbol: a, total_quantity: 0, total_cost_basis: 0 };
      const bAgg = aggregates[b] || { symbol: b, total_quantity: 0, total_cost_basis: 0 };

      switch (sortColumn) {
        case 'symbol':
          aValue = a;
          bValue = b;
          break;
        case 'latest':
          aValue = aLatest?.latestPrice || 0;
          bValue = bLatest?.latestPrice || 0;
          break;
        case 'costBasis':
          aValue = aAgg.total_cost_basis;
          bValue = bAgg.total_cost_basis;
          break;
        case 'unrealizedGain':
          const aLatestPrice = aLatest?.latestPrice || 0;
          const bLatestPrice = bLatest?.latestPrice || 0;
          aValue = (aAgg.total_quantity * aLatestPrice) - aAgg.total_cost_basis;
          bValue = (bAgg.total_quantity * bLatestPrice) - bAgg.total_cost_basis;
          break;
        case '1d':
          aValue = aLatest?.returns['1d'] || 0;
          bValue = bLatest?.returns['1d'] || 0;
          break;
        case '7d':
          aValue = aLatest?.returns['7d'] || 0;
          bValue = bLatest?.returns['7d'] || 0;
          break;
        case '30d':
          aValue = aLatest?.returns['30d'] || 0;
          bValue = bLatest?.returns['30d'] || 0;
          break;
        case '60d':
          aValue = aLatest?.returns['60d'] || 0;
          bValue = bLatest?.returns['60d'] || 0;
          break;
        case '90d':
          aValue = aLatest?.returns['90d'] || 0;
          bValue = bLatest?.returns['90d'] || 0;
          break;
        case '120d':
          aValue = aLatest?.returns['120d'] || 0;
          bValue = bLatest?.returns['120d'] || 0;
          break;
        default:
          return 0;
      }

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = sortColumn === 'symbol' ? '' : -Infinity;
      if (bValue === null || bValue === undefined) bValue = sortColumn === 'symbol' ? '' : -Infinity;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Sortable header component
  const SortableHeader: React.FC<{ column: string; children: React.ReactNode; className?: string }> = ({
    column,
    children,
    className = ""
  }) => {
    const isActive = sortColumn === column;
    return (
      <TableHead
        className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center justify-end gap-1">
          <span>{children}</span>
          <div className="flex flex-col">
            <ChevronUp
              className={`h-3 w-3 ${isActive && sortDirection === 'asc' ? 'text-foreground' : 'text-muted-foreground'}`}
            />
            <ChevronDown
              className={`h-3 w-3 -mt-1 ${isActive && sortDirection === 'desc' ? 'text-foreground' : 'text-muted-foreground'}`}
            />
          </div>
        </div>
      </TableHead>
    );
  };

  // Load portfolios from backend API
  useEffect(() => {
    if (user?.name) {
      loadPortfolios();
    }
  }, [user?.name]);

  // Load portfolios from API
  const loadPortfolios = async () => {
    if (!user?.name) return;

    setIsInitialLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/portfolios?username=${encodeURIComponent(user.name)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load portfolios: ${response.status}`);
      }

      const data = await response.json();
      setPortfolios(data.portfolios || []);
    } catch (err) {
      console.error('Error loading portfolios:', err);
      setError(`Failed to load portfolios: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Create default portfolio - SIWS offline mode
  const createDefaultPortfolio = async () => {
    setError('SIWS mode - Portfolio management requires server authentication and is not available in offline mode');
    setIsInitialLoading(false);
  };

  // Save portfolios - removed as we now save directly via API
  const savePortfolios = useCallback((newPortfolios: Portfolio[]) => {
    // This function is no longer needed as we save directly via API
    // Keeping it for backwards compatibility but it just updates state
    setPortfolios(newPortfolios);
  }, []);

  // Fetch crypto data
  const fetchCryptoData = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/crypto/prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch crypto data: ${response.status}`);
      }

      const data = await response.json();
      setCryptoData(data.prices || []);
    } catch (err) {
      console.error('Error fetching crypto data:', err);
      showStatus(`Failed to load crypto data: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch latest prices from Tiingo API via backend
  const fetchLatestPrices = useCallback(async (symbols: string[], historicalData: CryptoXDaysData[]) => {
    if (symbols.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/prices/latest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch latest prices: ${response.status}`);
      }

      const data = await response.json();
      setLatestPrices(data.prices || []);
    } catch (err) {
      console.error('Error fetching latest prices:', err);
      showStatus(`Failed to load latest prices: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, []);

  // Fetch stock data
  const fetchStockData = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/stocks/prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stock data: ${response.status}`);
      }

      const data = await response.json();
      setStockData(data.prices || []);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      showStatus(`Failed to load stock data: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch ranks data
  const fetchRanksData = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/stocks/ranks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ranks data: ${response.status}`);
      }

      const data = await response.json();
      setRanksData(data.ranks || []);
    } catch (err) {
      console.error('Error fetching ranks data:', err);
      showStatus(`Failed to load stock ranks: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, []);

  // Fetch crypto ranks data
  const fetchCryptoRanksData = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/crypto/ranks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch crypto ranks data: ${response.status}`);
      }

      const data = await response.json();
      setCryptoRanksData(data.ranks || []);
    } catch (err) {
      console.error('Error fetching crypto ranks data:', err);
      showStatus(`Failed to load crypto ranks: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, []);

  // Refresh data for active portfolio
  const refreshData = useCallback(async () => {
    const activePortfolio = portfolios.find(w => w.id === activePortfolioId);
    if (!activePortfolio) return;

    setIsLoading(true);
    setError(null);
    setLatestPrices([]); // Clear latest prices while refreshing
    setRanksData([]); // Clear ranks data while refreshing
    setCryptoRanksData([]); // Clear crypto ranks data while refreshing

    try {
      if (activePortfolio.type === 'crypto') {
        await fetchCryptoData(activePortfolio.symbols);
        // Fetch crypto ranks data for crypto portfolios
        await fetchCryptoRanksData(activePortfolio.symbols);
      } else {
        await fetchStockData(activePortfolio.symbols);
        // Only fetch ranks data for stocks, not crypto
        await fetchRanksData(activePortfolio.symbols);
      }
      // Load aggregates after price data (for Value column calculation)
      await loadAggregates(activePortfolio.symbols);
    } finally {
      setIsLoading(false);
    }
  }, [activePortfolioId, portfolios, fetchCryptoData, fetchStockData, fetchRanksData, fetchCryptoRanksData]);

  // Load aggregated positions for current portfolio
  const loadAggregates = useCallback(async (symbols: string[]) => {
    const activePortfolio = portfolios.find(w => w.id === activePortfolioId);
    if (!activePortfolio || !user?.name || symbols.length === 0) return;

    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${activePortfolioId}/aggregates`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load aggregates: ${response.status}`);
      }

      const data = await response.json();
      setAggregates(data.aggregates || {});
    } catch (err) {
      console.error('Error loading aggregates:', err);
      showStatus(`Failed to load portfolio aggregates: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  }, [activePortfolioId, portfolios, user?.name]);

  // Open transactions modal for a symbol
  const openTransactionsModal = async (symbol: string) => {
    setTxSymbol(symbol);
    setShowTxModal(true);

    if (!user?.name) return;

    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${activePortfolioId}/transactions/${symbol}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load transactions: ${response.status}`);
      }

      const data = await response.json();
      setTxRows(data.transactions || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setTxRows([]);
      showStatus(`Failed to load transactions: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const addTxRow = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setTxRows(prev => [...prev, { date: `${yyyy}-${mm}-${dd}`, action: 'BUY', quantity: 0, price: 0 }]);
  };

  const updateTxRow = (index: number, field: keyof PortfolioTransactionInput, value: any) => {
    setTxRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: field === 'quantity' || field === 'price' ? parseFloat(value) || 0 : value } : r));
  };

  const removeTxRow = (index: number) => {
    setTxRows(prev => prev.filter((_, i) => i !== index));
  };

  const saveTransactions = async () => {
    if (!user?.name || !txSymbol) return;

    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${activePortfolioId}/transactions/${txSymbol}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactions: txRows }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save transactions: ${response.status}`);
      }

      showStatus(`Transactions saved for ${txSymbol}`, 'success');
      setShowTxModal(false);
      // Refresh aggregates after saving transactions
      await loadAggregates([txSymbol]);
    } catch (err) {
      console.error('Error saving transactions:', err);
      showStatus(`Failed to save transactions: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  // Create new portfolio
  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) {
      showStatus('Please enter a portfolio name', 'error');
      return;
    }

    if (!user?.name) {
      showStatus('User not authenticated', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/portfolios`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newPortfolioName.trim(),
          type: newPortfolioType,
          symbols: []
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create portfolio: ${response.status}`);
      }

      const newPortfolio = await response.json();
      setPortfolios(prev => [...prev, newPortfolio]);
      setShowNewPortfolioForm(false);
      setNewPortfolioName('');
      setNewPortfolioType('crypto');
      showStatus('Portfolio created successfully', 'success');
    } catch (err) {
      console.error('Error creating portfolio:', err);
      showStatus(`Failed to create portfolio: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  // Delete portfolio
  const deletePortfolio = async (portfolioId: string) => {
    const portfolio = portfolios.find(w => w.id === portfolioId);
    if (!portfolio) return;

    if (!window.confirm(`Are you sure you want to delete "${portfolio.name}"?`)) {
      return;
    }

    if (!user?.name) {
      showStatus('User not authenticated', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${portfolioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete portfolio: ${response.status}`);
      }

      setPortfolios(prev => prev.filter(w => w.id !== portfolioId));
      if (activePortfolioId === portfolioId) {
        setActivePortfolioId(portfolios.find(w => w.id !== portfolioId)?.id || '');
      }
      showStatus('Portfolio deleted successfully', 'success');
    } catch (err) {
      console.error('Error deleting portfolio:', err);
      showStatus(`Failed to delete portfolio: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  // Add symbol(s) to active portfolio
  const addSymbol = async () => {
    if (!newSymbol.trim()) {
      showStatus('Please enter a symbol', 'error');
      return;
    }

    const activePortfolio = portfolios.find(w => w.id === activePortfolioId);
    if (!activePortfolio) return;

    if (!user?.name) {
      showStatus('User not authenticated', 'error');
      return;
    }

    // Split by comma or space and filter out empty strings
    const symbols = newSymbol
      .trim()
      .split(/[,\s]+/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    if (symbols.length === 0) {
      showStatus('Please enter at least one symbol', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${activePortfolioId}/symbols`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add symbols: ${response.status}`);
      }

      const updatedPortfolio = await response.json();
      setPortfolios(prev => prev.map(w => w.id === activePortfolioId ? updatedPortfolio : w));
      setShowAddSymbolForm(false);
      setNewSymbol('');
      showStatus(`Added ${symbols.length} symbol(s) to ${activePortfolio.name}`, 'success');
    } catch (err) {
      console.error('Error adding symbols:', err);
      showStatus(`Failed to add symbols: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  // Remove symbol from active portfolio
  const removeSymbol = async (symbol: string) => {
    const activePortfolio = portfolios.find(w => w.id === activePortfolioId);
    if (!activePortfolio) return;

    if (!window.confirm(`Remove ${symbol} from ${activePortfolio.name}?`)) {
      return;
    }

    if (!user?.name) {
      showStatus('User not authenticated', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/portfolios/${activePortfolioId}/symbols/${symbol}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to remove symbol: ${response.status}`);
      }

      const updatedPortfolio = await response.json();
      setPortfolios(prev => prev.map(w => w.id === activePortfolioId ? updatedPortfolio : w));
      showStatus(`Removed ${symbol} from ${activePortfolio.name}`, 'success');
    } catch (err) {
      console.error('Error removing symbol:', err);
      showStatus(`Failed to remove symbol: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  // Load data when active portfolio changes
  useEffect(() => {
    if (activePortfolioId) {
      refreshData();
    }
  }, [activePortfolioId, refreshData]);

  const activePortfolio = portfolios.find(w => w.id === activePortfolioId);
  const displayData = activePortfolio?.type === 'crypto' ? cryptoData : stockData;

  // Helper function to format numbers based on column and portfolio type
  const formatNumber = (value: number, column: 'qty' | 'value' | 'costBasis' | 'unrealizedGain', portfolioType: 'crypto' | 'stocks'): string => {
    if (column === 'qty') {
      // Qty: 0 decimals for stocks, 4 decimals for crypto
      const decimals = portfolioType === 'crypto' ? 4 : 0;
      return value.toFixed(decimals);
    } else {
      // Value, Cost Basis, Unrealized Gain: 0 decimals
      return value.toFixed(0);
    }
  };

  // Helper function to format currency values
  const formatCurrency = (value: number, column: 'value' | 'costBasis' | 'unrealizedGain', portfolioType: 'crypto' | 'stocks'): string => {
    const formatted = formatNumber(value, column, portfolioType);
    return `$${formatted}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={() => setShowNewPortfolioForm(true)}
              variant="default"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Portfolio
            </Button>

            <Button
              onClick={refreshData}
              disabled={isLoading || !activePortfolio}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>

            {activePortfolio && (
              <Button
                onClick={() => setShowColumnConfig(!showColumnConfig)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Columns
              </Button>
            )}

            {activePortfolio && (
              <Button
                onClick={() => setShowAddSymbolForm(!showAddSymbolForm)}
                variant="ghost"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Symbol
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {showNewPortfolioForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="portfolioName">Name</Label>
                  <Input
                    id="portfolioName"
                    type="text"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    placeholder="My Portfolio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolioType">Type</Label>
                  <select
                    id="portfolioType"
                    value={newPortfolioType}
                    onChange={(e) => setNewPortfolioType(e.target.value as 'crypto' | 'stocks')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="crypto">Crypto</option>
                    <option value="stocks">Stocks</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button type="button" onClick={createPortfolio} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowNewPortfolioForm(false)}
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showAddSymbolForm && activePortfolio && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add Symbol to {activePortfolio.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder={activePortfolio.type === 'crypto' ? 'BTC, ETH, DOT' : 'AAPL, MSFT, GOOGL'}
                  className="flex-1"
                />
                <Button type="button" onClick={addSymbol}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
                <Button
                  onClick={() => setShowAddSymbolForm(false)}
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showColumnConfig && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Column Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">Choose which rank columns to display and drag to reorder them for {activePortfolio?.type === 'crypto' ? 'crypto' : 'stock'} portfolios</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {columnConfig
                  .filter(col => {
                    if (activePortfolio?.type === 'crypto') {
                      // Crypto columns
                      return ['crypto_ranks', 'lppl_side', 'lppl_pos_conf', 'lppl_neg_conf', 'strategy_side', 'strategy_profit_per_trade', 'strategy_expectancy', 'strategy_profit_factor', 'quoteCurrency', 'open', 'high', 'low', 'close', 'volume', 'ivol', 'predicted_beta', 'risk_contribution'].includes(col.key);
                    } else {
                      // Stock columns
                      return !['crypto_ranks', 'lppl_side', 'lppl_pos_conf', 'lppl_neg_conf', 'strategy_side', 'strategy_profit_per_trade', 'strategy_expectancy', 'strategy_profit_factor', 'quoteCurrency', 'open', 'high', 'low', 'close', 'volume'].includes(col.key);
                    }
                  })
                  .sort((a, b) => a.order - b.order)
                  .map((col, index) => (
                  <div
                    key={col.key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-3 border rounded cursor-move transition-colors ${
                      draggedIndex === index ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-muted-foreground cursor-grab active:cursor-grabbing">
                        ⋮⋮
                      </div>
                      <input
                        type="checkbox"
                        id={`col-${col.key}`}
                        checked={col.visible}
                        onChange={(e) => {
                          const newConfig = columnConfig.map(c =>
                            c.key === col.key ? { ...c, visible: e.target.checked } : c
                          );
                          saveColumnConfig(newConfig);
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`col-${col.key}`} className="text-sm font-medium cursor-pointer">
                        {col.key === 'fundamental' && 'Fundamental Rank'}
                        {col.key === 'technical' && 'Technical Rank'}
                        {col.key === 'ivol' && 'IVol'}
                        {col.key === 'predicted_beta' && 'Predicted Beta'}
                        {col.key === 'risk_contribution' && 'Risk Contribution'}
                        {col.key === 'industry' && 'Industry'}
                        {col.key === 'sector' && 'Sector'}
                        {col.key === 'mcap' && 'Market Cap'}
                        {col.key === 'isADR' && 'ADR'}
                        {col.key === 'isActive' && 'Active'}
                        {col.key === 'reportingCurrency' && 'Currency'}
                        {col.key === 'td_resistance' && 'Resistance'}
                        {col.key === 'td_support' && 'Support'}
                        {col.key === 'tec_riskRangeHigh' && 'Risk Range High'}
                        {col.key === 'tec_riskRangeLow' && 'Risk Range Low'}
                        {col.key === 'tag' && 'Tag'}
                        {col.key === 'crypto_ranks' && 'Crypto Rank'}
                        {col.key === 'lppl_side' && 'LPPL Side'}
                        {col.key === 'lppl_pos_conf' && 'LPPL Pos Conf'}
                        {col.key === 'lppl_neg_conf' && 'LPPL Neg Conf'}
                        {col.key === 'strategy_side' && 'Strategy Side'}
                        {col.key === 'strategy_profit_per_trade' && 'Strategy Profit/Trade'}
                        {col.key === 'strategy_expectancy' && 'Strategy Expectancy'}
                        {col.key === 'strategy_profit_factor' && 'Strategy Profit Factor'}
                        {col.key === 'quoteCurrency' && 'Quote Currency'}
                        {col.key === 'open' && 'Open Price'}
                        {col.key === 'high' && 'High Price'}
                        {col.key === 'low' && 'Low Price'}
                        {col.key === 'close' && 'Close Price'}
                        {col.key === 'volume' && 'Volume'}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => setShowColumnConfig(false)}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {portfolios.length > 0 && (
          <Tabs value={activePortfolioId} onValueChange={setActivePortfolioId} className="w-full">
            <TabsList className="mb-6 flex-wrap">
              {portfolios.map((portfolio) => (
                <div key={portfolio.id} className="flex items-center gap-1">
                  <TabsTrigger value={portfolio.id} className="flex items-center gap-2">
                    {portfolio.name}
                    <Badge variant="secondary" className="text-xs">
                      {portfolio.type}
                    </Badge>
                  </TabsTrigger>
                  {portfolios.length > 1 && (
                    <Button
                      onClick={() => deletePortfolio(portfolio.id)}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </TabsList>

            {portfolios.map((portfolio) => (
              <TabsContent key={portfolio.id} value={portfolio.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{portfolio.name}</span>
                      <Badge variant={portfolio.type === 'crypto' ? 'default' : 'secondary'}>
                        {portfolio.type === 'crypto' ? 'Cryptocurrency' : 'Stocks'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {portfolio.symbols.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No symbols in this watchlist yet.</p>
                        <Button
                          onClick={() => setShowAddSymbolForm(true)}
                          variant="outline"
                          className="mt-4"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Symbol
                        </Button>
                      </div>
                    ) : isInitialLoading ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <SortableHeader column="symbol">Symbol</SortableHeader>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <TableHead className="text-right">Cost Basis</TableHead>
                            <TableHead className="text-right">PnL</TableHead>
                            <SortableHeader column="latest" className="text-right">Latest</SortableHeader>
                            <SortableHeader column="1d" className="text-right">1d</SortableHeader>
                            <SortableHeader column="7d" className="text-right">7d</SortableHeader>
                            <SortableHeader column="30d" className="text-right">30d</SortableHeader>
                            <SortableHeader column="60d" className="text-right">60d</SortableHeader>
                            <SortableHeader column="90d" className="text-right">90d</SortableHeader>
                            <SortableHeader column="120d" className="text-right">120d</SortableHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: Math.min(portfolio.symbols.length, 5) }).map((_, i) => (
                            <TableRowSkeleton key={i} />
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <SortableHeader column="symbol">Symbol</SortableHeader>
                            {portfolio.type === 'stocks' && columnConfig
                              .filter(col => col.visible)
                              .sort((a, b) => a.order - b.order)
                              .map(col => (
                                <TableHead key={col.key} className={col.key === 'industry' || col.key === 'sector' ? 'text-left' : 'text-right'}>
                                  {col.key === 'fundamental' && 'Fundamental Rank'}
                                  {col.key === 'technical' && 'Technical Rank'}
                                  {col.key === 'ivol' && 'IVol'}
                                  {col.key === 'predicted_beta' && 'Predicted Beta'}
                                  {col.key === 'risk_contribution' && 'Risk Contribution'}
                                  {col.key === 'industry' && 'Industry'}
                                  {col.key === 'sector' && 'Sector'}
                                  {col.key === 'mcap' && 'Market Cap'}
                                  {col.key === 'isADR' && 'ADR'}
                                  {col.key === 'isActive' && 'Active'}
                                  {col.key === 'reportingCurrency' && 'Currency'}
                                  {col.key === 'td_resistance' && 'Resistance'}
                                  {col.key === 'td_support' && 'Support'}
                                  {col.key === 'tec_riskRangeHigh' && 'Risk Range High'}
                                  {col.key === 'tec_riskRangeLow' && 'Risk Range Low'}
                                  {col.key === 'tag' && 'Tag'}
                                </TableHead>
                              ))}
                            {portfolio.type === 'crypto' && columnConfig
                              .filter(col => ['crypto_ranks', 'lppl_side', 'lppl_pos_conf', 'lppl_neg_conf', 'strategy_side', 'strategy_profit_per_trade', 'strategy_expectancy', 'strategy_profit_factor', 'quoteCurrency', 'open', 'high', 'low', 'close', 'volume', 'ivol', 'predicted_beta', 'risk_contribution'].includes(col.key) && col.visible)
                              .sort((a, b) => a.order - b.order)
                              .map(col => (
                                <TableHead key={col.key} className="text-right">
                                  {col.key === 'crypto_ranks' && 'Crypto Rank'}
                                  {col.key === 'lppl_side' && 'LPPL Side'}
                                  {col.key === 'lppl_pos_conf' && 'LPPL Pos Conf'}
                                  {col.key === 'lppl_neg_conf' && 'LPPL Neg Conf'}
                                  {col.key === 'strategy_side' && 'Strategy Side'}
                                  {col.key === 'strategy_profit_per_trade' && 'Strategy P/T'}
                                  {col.key === 'strategy_expectancy' && 'Strategy Exp'}
                                  {col.key === 'strategy_profit_factor' && 'Strategy PF'}
                                  {col.key === 'quoteCurrency' && 'Quote Curr'}
                                  {col.key === 'open' && 'Open'}
                                  {col.key === 'high' && 'High'}
                                  {col.key === 'low' && 'Low'}
                                  {col.key === 'close' && 'Close'}
                                  {col.key === 'volume' && 'Volume'}
                                  {col.key === 'ivol' && 'IVol'}
                                  {col.key === 'predicted_beta' && 'Beta'}
                                  {col.key === 'risk_contribution' && 'Risk Contrib'}
                                </TableHead>
                              ))}
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                            <SortableHeader column="costBasis" className="text-right">Cost Basis</SortableHeader>
                            <SortableHeader column="unrealizedGain" className="text-right">PnL</SortableHeader>
                            <SortableHeader column="latest" className="text-right">Latest</SortableHeader>
                            <SortableHeader column="1d" className="text-right">1d</SortableHeader>
                            <SortableHeader column="7d" className="text-right">7d</SortableHeader>
                            <SortableHeader column="30d" className="text-right">30d</SortableHeader>
                            <SortableHeader column="60d" className="text-right">60d</SortableHeader>
                            <SortableHeader column="90d" className="text-right">90d</SortableHeader>
                            <SortableHeader column="120d" className="text-right">120d</SortableHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getSortedSymbols(portfolio.symbols).map((symbol) => {
                            const data = displayData.find(d =>
                              (portfolio.type === 'crypto' && 'baseCurrency' in d && d.baseCurrency === symbol) ||
                              (portfolio.type === 'stocks' && 'symbol' in d && d.symbol === symbol)
                            );

                            const latestData = latestPrices.find(lp => lp.symbol === symbol);
                            const agg = aggregates[symbol] || { symbol, total_quantity: 0, total_cost_basis: 0 };
                            const latest = latestData?.latestPrice || 0;
                            const currentValue = agg.total_quantity * latest;
                            const costBasis = agg.total_cost_basis;
                            const unrealizedGain = currentValue - costBasis;

                            // Get ranks data for stocks
                            const ranksDataItem = portfolio.type === 'stocks' ? ranksData.find(r => r.ticker?.toUpperCase() === symbol) : null;

                            // Get crypto ranks data for crypto
                            const cryptoRanksDataItem = portfolio.type === 'crypto' ? cryptoRanksData.find(r => r.baseCurrency?.toUpperCase() === symbol) : null;

                            const formatPrice = (price: number | null) => price ? `$${price.toFixed(2)}` : 'N/A';
                            const formatReturn = (returnPct: number | null) => {
                              if (returnPct === null) return '';
                              const sign = returnPct >= 0 ? '+' : '';
                              return `${sign}${returnPct.toFixed(2)}%`;
                            };

                            return (
                              <TableRow key={symbol}>
                                <TableCell>
                                  <Button
                                    onClick={() => removeSymbol(symbol)}
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                                <TableCell className="font-medium">
                                  <button className="underline hover:text-primary" onClick={() => openTransactionsModal(symbol)}>
                                    {symbol}
                                  </button>
                                </TableCell>
                                {portfolio.type === 'stocks' && columnConfig
                                  .filter(col => col.visible)
                                  .sort((a, b) => a.order - b.order)
                                  .map(col => {
                                    const rankData = ranksData.find(r => r.ticker?.toUpperCase() === symbol);
                                    const value = rankData?.[col.key === 'fundamental' ? 'rankFundamental' :
                                                     col.key === 'technical' ? 'rankTechnical' :
                                                     col.key === 'ivol' ? 'ivol' :
                                                     col.key === 'predicted_beta' ? 'predicted_beta' :
                                                     col.key === 'risk_contribution' ? 'risk_contribution' :
                                                     col.key === 'industry' ? 'industry' :
                                                     col.key === 'sector' ? 'sector' :
                                                     col.key === 'mcap' ? 'mcap' :
                                                     col.key === 'isADR' ? 'isADR' :
                                                     col.key === 'isActive' ? 'isActive' :
                                                     col.key === 'reportingCurrency' ? 'reportingCurrency' :
                                                     col.key === 'td_resistance' ? 'td__Resistance' :
                                                     col.key === 'td_support' ? 'td__Support' :
                                                     col.key === 'tec_riskRangeHigh' ? 'tec_riskRangeHigh' :
                                                     col.key === 'tec_riskRangeLow' ? 'tec_riskRangeLow' :
                                                     col.key === 'tag' ? 'tag' : col.key as keyof typeof rankData];

                                    return (
                                      <TableCell key={col.key} className={col.key === 'industry' || col.key === 'sector' ? 'text-left' : 'text-right'}>
                                        {col.key === 'fundamental' && (value ? `${value}` : 'N/A')}
                                        {col.key === 'technical' && (value ? `${value}` : 'N/A')}
                                        {col.key === 'ivol' && (value ? `${value}%` : 'N/A')}
                                        {col.key === 'predicted_beta' && (value ? `${value}` : 'N/A')}
                                        {col.key === 'risk_contribution' && (value ? `${value}%` : 'N/A')}
                                        {col.key === 'industry' && abbreviateSectorIndustry(value as string || '', 'industry')}
                                        {col.key === 'sector' && abbreviateSectorIndustry(value as string || '', 'sector')}
                                        {col.key === 'mcap' && (value ? `$${(value as number / 1e9).toFixed(1)}B` : 'N/A')}
                                        {col.key === 'isADR' && (value ? 'Yes' : 'No')}
                                        {col.key === 'isActive' && (value ? 'Yes' : 'No')}
                                        {col.key === 'reportingCurrency' && (value || 'N/A')}
                                        {col.key === 'td_resistance' && (value ? `$${value}` : 'N/A')}
                                        {col.key === 'td_support' && (value ? `$${value}` : 'N/A')}
                                        {col.key === 'tec_riskRangeHigh' && (value ? `$${value}` : 'N/A')}
                                        {col.key === 'tec_riskRangeLow' && (value ? `$${value}` : 'N/A')}
                                        {col.key === 'tag' && (value || 'N/A')}
                                      </TableCell>
                                    );
                                  })}
                                {portfolio.type === 'crypto' && columnConfig
                                  .filter(col => ['crypto_ranks', 'lppl_side', 'lppl_pos_conf', 'lppl_neg_conf', 'strategy_side', 'strategy_profit_per_trade', 'strategy_expectancy', 'strategy_profit_factor', 'quoteCurrency', 'open', 'high', 'low', 'close', 'volume', 'ivol', 'predicted_beta', 'risk_contribution'].includes(col.key) && col.visible)
                                  .sort((a, b) => a.order - b.order)
                                  .map(col => {
                                    let cellContent: React.ReactNode = 'N/A';

                                    switch (col.key) {
                                      case 'crypto_ranks':
                                        cellContent = cryptoRanksDataItem?.crypto_ranks !== null && cryptoRanksDataItem?.crypto_ranks !== undefined ? cryptoRanksDataItem.crypto_ranks.toFixed(1) : 'N/A';
                                        break;
                                      case 'lppl_side':
                                        cellContent = cryptoRanksDataItem?.lppl_side || 'N/A';
                                        break;
                                      case 'lppl_pos_conf':
                                        cellContent = cryptoRanksDataItem?.lppl_pos_conf !== null && cryptoRanksDataItem?.lppl_pos_conf !== undefined ? cryptoRanksDataItem.lppl_pos_conf.toFixed(3) : 'N/A';
                                        break;
                                      case 'lppl_neg_conf':
                                        cellContent = cryptoRanksDataItem?.lppl_neg_conf !== null && cryptoRanksDataItem?.lppl_neg_conf !== undefined ? cryptoRanksDataItem.lppl_neg_conf.toFixed(3) : 'N/A';
                                        break;
                                      case 'strategy_side':
                                        cellContent = cryptoRanksDataItem?.strategy_side || 'N/A';
                                        break;
                                      case 'strategy_profit_per_trade':
                                        cellContent = cryptoRanksDataItem?.strategy_profit_per_trade !== null && cryptoRanksDataItem?.strategy_profit_per_trade !== undefined ? cryptoRanksDataItem.strategy_profit_per_trade.toFixed(3) : 'N/A';
                                        break;
                                      case 'strategy_expectancy':
                                        cellContent = cryptoRanksDataItem?.strategy_expectancy !== null && cryptoRanksDataItem?.strategy_expectancy !== undefined ? cryptoRanksDataItem.strategy_expectancy.toFixed(3) : 'N/A';
                                        break;
                                      case 'strategy_profit_factor':
                                        cellContent = cryptoRanksDataItem?.strategy_profit_factor !== null && cryptoRanksDataItem?.strategy_profit_factor !== undefined ? cryptoRanksDataItem.strategy_profit_factor.toFixed(3) : 'N/A';
                                        break;
                                      case 'quoteCurrency':
                                        cellContent = cryptoRanksDataItem?.quoteCurrency || 'N/A';
                                        break;
                                      case 'open':
                                        cellContent = cryptoRanksDataItem?.open !== null && cryptoRanksDataItem?.open !== undefined ? `$${cryptoRanksDataItem.open.toFixed(2)}` : 'N/A';
                                        break;
                                      case 'high':
                                        cellContent = cryptoRanksDataItem?.high !== null && cryptoRanksDataItem?.high !== undefined ? `$${cryptoRanksDataItem.high.toFixed(2)}` : 'N/A';
                                        break;
                                      case 'low':
                                        cellContent = cryptoRanksDataItem?.low !== null && cryptoRanksDataItem?.low !== undefined ? `$${cryptoRanksDataItem.low.toFixed(2)}` : 'N/A';
                                        break;
                                      case 'close':
                                        cellContent = cryptoRanksDataItem?.close !== null && cryptoRanksDataItem?.close !== undefined ? `$${cryptoRanksDataItem.close.toFixed(2)}` : 'N/A';
                                        break;
                                      case 'volume':
                                        cellContent = cryptoRanksDataItem?.volume !== null && cryptoRanksDataItem?.volume !== undefined ? cryptoRanksDataItem.volume.toLocaleString() : 'N/A';
                                        break;
                                      case 'ivol':
                                        cellContent = cryptoRanksDataItem?.ivol !== null && cryptoRanksDataItem?.ivol !== undefined ? cryptoRanksDataItem.ivol.toFixed(2) : 'N/A';
                                        break;
                                      case 'predicted_beta':
                                        cellContent = cryptoRanksDataItem?.predicted_beta !== null && cryptoRanksDataItem?.predicted_beta !== undefined ? cryptoRanksDataItem.predicted_beta.toFixed(2) : 'N/A';
                                        break;
                                      case 'risk_contribution':
                                        cellContent = cryptoRanksDataItem?.risk_contribution !== null && cryptoRanksDataItem?.risk_contribution !== undefined ? cryptoRanksDataItem.risk_contribution.toFixed(2) : 'N/A';
                                        break;
                                    }

                                    return (
                                      <TableCell key={col.key} className="text-right">
                                        {cellContent}
                                      </TableCell>
                                    );
                                  })}
                                <TableCell className="text-right">{formatNumber(agg.total_quantity, 'qty', portfolio.type)}</TableCell>
                                <TableCell className="text-right">{currentValue ? formatCurrency(currentValue, 'value', portfolio.type) : '$0'}</TableCell>
                                <TableCell className="text-right">{costBasis ? formatCurrency(costBasis, 'costBasis', portfolio.type) : '$0'}</TableCell>
                                <TableCell className="text-right">
                                  <span className={`font-medium ${unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {unrealizedGain >= 0 ? '+' : ''}${formatNumber(unrealizedGain, 'unrealizedGain', portfolio.type)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatPrice(latestData?.latestPrice || null)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={`text-sm font-medium ${latestData?.returns['1d'] && latestData.returns['1d'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatReturn(latestData?.returns['1d'] || null)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatPrice(data?.close_1d || null)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={`text-sm font-medium ${latestData?.returns['7d'] && latestData.returns['7d'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatReturn(latestData?.returns['7d'] || null)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatPrice(data?.close_7d || null)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={`text-sm font-medium ${latestData?.returns['30d'] && latestData.returns['30d'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatReturn(latestData?.returns['30d'] || null)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatPrice(data?.close_30d || null)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={`text-sm font-medium ${latestData?.returns['60d'] && latestData.returns['60d'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatReturn(latestData?.returns['60d'] || null)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatPrice(data?.close_60d || null)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={`text-sm font-medium ${latestData?.returns['90d'] && latestData.returns['90d'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatReturn(latestData?.returns['90d'] || null)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatPrice(data?.close_90d || null)}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end">
                                    <span className={`text-sm font-medium ${latestData?.returns['120d'] && latestData.returns['120d'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {formatReturn(latestData?.returns['120d'] || null)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatPrice(data?.close_120d || null)}</span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {portfolios.length === 0 && (
          <Card className="border-yellow-500/20 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm mb-4">No portfolios found. Create your first portfolio to get started!</p>
                <Button onClick={() => setShowNewPortfolioForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Portfolio
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {statusMessage && (
          <Card className={`mt-6 ${
            statusMessage.type === 'success'
              ? 'border-green-500/20 bg-green-500/10'
              : 'border-destructive/20 bg-destructive/10'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">{statusMessage.text}</span>
                <Button
                  onClick={() => setStatusMessage(null)}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Transactions: {txSymbol}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowTxModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">No transactions yet</TableCell>
                    </TableRow>
                  )}
                  {txRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input type="date" value={row.date} onChange={(e) => updateTxRow(idx, 'date', e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <select
                          value={row.action}
                          onChange={(e) => updateTxRow(idx, 'action', e.target.value as 'BUY' | 'SELL')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                        </select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" step="any" value={row.quantity} onChange={(e) => updateTxRow(idx, 'quantity', e.target.value)} className="text-right" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" step="any" value={row.price} onChange={(e) => updateTxRow(idx, 'price', e.target.value)} className="text-right" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeTxRow(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" onClick={addTxRow}>
                <Plus className="h-4 w-4 mr-2" /> Add Row
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowTxModal(false)}>Cancel</Button>
                <Button onClick={saveTransactions}>
                  <Save className="h-4 w-4 mr-2" /> Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;
