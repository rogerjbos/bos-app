import { ChevronDown, ChevronUp, Plus, RefreshCw, Save, Settings, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWalletAuthContext } from '../providers/WalletAuthProvider';
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
  ibol?: number;
  predicted_beta?: number;
  risk_contribution?: number;
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
  const { getAccessToken } = useWalletAuthContext();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('');
  const [cryptoData, setCryptoData] = useState<CryptoXDaysData[]>([]);
  const [stockData, setStockData] = useState<StockXDaysData[]>([]);
  const [latestPrices, setLatestPrices] = useState<LatestPriceData[]>([]);
  const [ranksData, setRanksData] = useState<RanksData[]>([]);
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
    { key: 'fundamental', visible: true, order: 0 },
    { key: 'technical', visible: true, order: 1 },
    { key: 'ivol', visible: true, order: 2 },
    { key: 'beta', visible: true, order: 3 },
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
          setColumnConfig(parsed);
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

    try {
      setIsInitialLoading(true);
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${baseUrl}/portfolios?username=${encodeURIComponent(user.address)}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load portfolios: ${response.status}`);
      }

      const data = await response.json();

      if (data.length > 0) {
        setPortfolios(data);
        if (!activePortfolioId) {
          setActivePortfolioId(data[0].id);
        }
      } else {
        // Create default portfolio if none exist
        await createDefaultPortfolio();
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
      showStatus('Failed to load portfolios', 'error');
      // Create default portfolio as fallback
      await createDefaultPortfolio();
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Create default portfolio
  const createDefaultPortfolio = async () => {
    if (!user?.name) return;

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${baseUrl}/portfolios`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'My Watchlist',
          type: 'crypto',
          symbols: ['BTC', 'ETH', 'DOT'],
          username: user.address
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create default portfolio: ${response.status}`);
      }

      const data = await response.json();
      const newPortfolio = data.portfolio;

      setPortfolios([newPortfolio]);
      setActivePortfolioId(newPortfolio.id);
      showStatus('Created default portfolio');
    } catch (error) {
      console.error('Error creating default portfolio:', error);
      showStatus('Failed to create default portfolio', 'error');
    } finally {
      setIsInitialLoading(false);
    }
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

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const url = new URL(`${baseUrl}/crypto_xdays`);
      symbols.forEach(symbol => {
        url.searchParams.append('baseCurrencies', symbol.toLowerCase());
      });

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch crypto data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setCryptoData(data);
      showStatus(`Updated crypto data for ${symbols.length} symbols`);

      // Also fetch latest prices and calculate returns
      await fetchLatestPrices(symbols, data);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
      // Use mock data as fallback
      const mockData = symbols.map(symbol => ({
        baseCurrency: symbol.toUpperCase(),
        close_1d: 100000 + Math.random() * 10000,
        close_7d: 95000 + Math.random() * 10000,
        close_30d: 90000 + Math.random() * 10000,
        close_60d: 85000 + Math.random() * 10000,
        close_90d: 80000 + Math.random() * 10000,
        close_120d: 75000 + Math.random() * 10000,
      }));
      setCryptoData(mockData);
      showStatus(`Using mock data (API unavailable)`);

      // Also use mock latest prices
      await fetchLatestPrices(symbols, mockData);
    }
  }, []);

  // Fetch latest prices from Tiingo API via backend
  const fetchLatestPrices = useCallback(async (symbols: string[], historicalData: CryptoXDaysData[]) => {
    if (symbols.length === 0) return;

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const url = new URL(`${baseUrl}/latest_tiingo_prices`);
      symbols.forEach(symbol => {
        url.searchParams.append('symbols', symbol);
      });

      // Pass historical data as JSON string for return calculations
      if (historicalData.length > 0) {
        url.searchParams.append('historical_data', JSON.stringify(historicalData));
      }

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch latest prices: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Process the data to match our interface
      const latestPriceData: LatestPriceData[] = data.map((item: any) => ({
        symbol: item.symbol,
        latestPrice: item.latestPrice,
        returns: item.returns
      }));

      setLatestPrices(latestPriceData);
    } catch (error) {
      console.error('Error fetching latest prices:', error);
      // Use mock data as fallback
      const mockLatestPrices: LatestPriceData[] = symbols.map(symbol => {
        const basePrice = 105000 + Math.random() * 10000;
        const hist = historicalData.find(h => h.baseCurrency === symbol.toUpperCase());
        return {
          symbol: symbol.toUpperCase(),
          latestPrice: basePrice,
          returns: hist ? {
            '1d': hist.close_1d ? ((basePrice - hist.close_1d) / hist.close_1d) * 100 : 0,
            '7d': hist.close_7d ? ((basePrice - hist.close_7d) / hist.close_7d) * 100 : 0,
            '30d': hist.close_30d ? ((basePrice - hist.close_30d) / hist.close_30d) * 100 : 0,
            '60d': hist.close_60d ? ((basePrice - hist.close_60d) / hist.close_60d) * 100 : 0,
            '90d': hist.close_90d ? ((basePrice - hist.close_90d) / hist.close_90d) * 100 : 0,
            '120d': hist.close_120d ? ((basePrice - hist.close_120d) / hist.close_120d) * 100 : 0,
          } : {
            '1d': 0, '7d': 0, '30d': 0, '60d': 0, '90d': 0, '120d': 0
          }
        };
      });
      setLatestPrices(mockLatestPrices);
    }
  }, []);

  // Fetch stock data
  const fetchStockData = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const url = new URL(`${baseUrl}/stock_xdays`);
      symbols.forEach(symbol => {
        url.searchParams.append('symbols', symbol.toUpperCase());
      });

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stock data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setStockData(data);

      // Calculate returns and set latest prices for stocks
      const latestPricesData: LatestPriceData[] = data.map((item: StockXDaysData) => {
        const latestPrice = item.close_1d || 0;

        return {
          symbol: item.symbol,
          latestPrice,
          returns: {
            '1d': item.close_1d && item.close_1d ? ((latestPrice - item.close_1d) / item.close_1d) * 100 : null,
            '7d': item.close_7d ? ((latestPrice - item.close_7d) / item.close_7d) * 100 : null,
            '30d': item.close_30d ? ((latestPrice - item.close_30d) / item.close_30d) * 100 : null,
            '60d': item.close_60d ? ((latestPrice - item.close_60d) / item.close_60d) * 100 : null,
            '90d': item.close_90d ? ((latestPrice - item.close_90d) / item.close_90d) * 100 : null,
            '120d': item.close_120d ? ((latestPrice - item.close_120d) / item.close_120d) * 100 : null,
          }
        };
      });

      setLatestPrices(latestPricesData);
      showStatus(`Updated stock data for ${symbols.length} symbols`);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      // Use mock data as fallback
      const mockData: StockXDaysData[] = symbols.map(symbol => ({
        symbol,
        close_1d: 100 + Math.random() * 200,
        close_7d: 95 + Math.random() * 200,
        close_30d: 90 + Math.random() * 200,
        close_60d: 85 + Math.random() * 200,
        close_90d: 80 + Math.random() * 200,
        close_120d: 75 + Math.random() * 200,
      }));
      setStockData(mockData);

      // Set mock latest prices
      const mockLatestPrices: LatestPriceData[] = mockData.map(item => {
        const latestPrice = item.close_1d || 0;
        return {
          symbol: item.symbol,
          latestPrice,
          returns: {
            '1d': item.close_1d ? ((latestPrice - item.close_1d) / item.close_1d) * 100 : null,
            '7d': item.close_7d ? ((latestPrice - item.close_7d) / item.close_7d) * 100 : null,
            '30d': item.close_30d ? ((latestPrice - item.close_30d) / item.close_30d) * 100 : null,
            '60d': item.close_60d ? ((latestPrice - item.close_60d) / item.close_60d) * 100 : null,
            '90d': item.close_90d ? ((latestPrice - item.close_90d) / item.close_90d) * 100 : null,
            '120d': item.close_120d ? ((latestPrice - item.close_120d) / item.close_120d) * 100 : null,
          }
        };
      });
      setLatestPrices(mockLatestPrices);
      showStatus(`Using mock data (API unavailable)`);
    }
  }, []);

  // Fetch ranks data
  const fetchRanksData = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Fetch ranks data for each symbol
      const ranksPromises = symbols.map(async (symbol) => {
        const url = `${baseUrl}/ranks?ticker=${symbol.toLowerCase()}`;

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers,
          });

          if (!response.ok) {
            console.warn(`Failed to fetch ranks for ${symbol}: ${response.status}`);
            return null;
          }

          const data = await response.json();
          // Return the first item if it's an array, or the data itself
          return Array.isArray(data) ? data[0] : data;
        } catch (error) {
          console.warn(`Error fetching ranks for ${symbol}:`, error);
          return null;
        }
      });

      const ranksResults = await Promise.all(ranksPromises);
      const validRanksData = ranksResults.filter(item => item !== null) as RanksData[];

      setRanksData(validRanksData);
    } catch (error) {
      console.error('Error fetching ranks data:', error);
      setRanksData([]);
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

    try {
      if (activePortfolio.type === 'crypto') {
        await fetchCryptoData(activePortfolio.symbols);
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
  }, [activePortfolioId, portfolios, fetchCryptoData, fetchStockData, fetchRanksData]);

  // Load aggregated positions for current portfolio
  const loadAggregates = useCallback(async (symbols: string[]) => {
    const activePortfolio = portfolios.find(w => w.id === activePortfolioId);
    if (!activePortfolio || !user?.name || symbols.length === 0) return;

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const url = new URL(`${baseUrl}/portfolios/${activePortfolioId}/transactions/aggregate`);
      url.searchParams.append('username', user.address);
      symbols.forEach(s => url.searchParams.append('symbols', s));

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to load aggregates: ${response.status}`);
      }

      const data: PortfolioAggregatePosition[] = await response.json();
      const map: Record<string, PortfolioAggregatePosition> = {};
      data.forEach(item => { map[item.symbol] = item; });
      setAggregates(map);
    } catch (e) {
      console.error('Error loading aggregates', e);
      // Fallback: zero-out to avoid UI break
      const map: Record<string, PortfolioAggregatePosition> = {};
      symbols.forEach(s => { map[s] = { symbol: s, total_quantity: 0, total_cost_basis: 0 }; });
      setAggregates(map);
    }
  }, [activePortfolioId, portfolios, user?.name]);

  // Open transactions modal for a symbol
  const openTransactionsModal = async (symbol: string) => {
    setTxSymbol(symbol);
    setShowTxModal(true);

    if (!user?.name) return;
    const baseUrl = API_BASE_URL.startsWith('http')
      ? API_BASE_URL
      : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;
    try {
      const url = new URL(`${baseUrl}/portfolios/${activePortfolioId}/transactions`);
      url.searchParams.append('username', user.address);
      url.searchParams.append('symbol', symbol);

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      const rows: PortfolioTransactionInput[] = data.map((d: any) => ({
        date: d.date,
        action: d.action,
        quantity: d.quantity,
        price: d.price,
      }));
      setTxRows(rows);
    } catch (err) {
      console.error('Error fetching transactions', err);
      setTxRows([]);
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
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`${baseUrl}/portfolios/${activePortfolioId}/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: user.address,
          symbol: txSymbol,
          transactions: txRows,
        })
      });
      if (!res.ok) throw new Error('Failed to save transactions');
      showStatus(`Saved ${txRows.length} transactions for ${txSymbol}`);
      setShowTxModal(false);
      // Refresh aggregates for this symbol set
      const symbols = portfolios.find(w => w.id === activePortfolioId)?.symbols || [];
      await loadAggregates(symbols);
    } catch (err) {
      console.error('Error saving transactions', err);
      showStatus('Failed to save transactions', 'error');
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
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${baseUrl}/portfolios`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newPortfolioName.trim(),
          type: newPortfolioType,
          symbols: [],
          username: user.address
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create portfolio: ${response.status}`);
      }

      const data = await response.json();
      const newPortfolio = data.portfolio;

      const updatedPortfolios = [...portfolios, newPortfolio];
      setPortfolios(updatedPortfolios);
      setActivePortfolioId(newPortfolio.id);

      setNewPortfolioName('');
      setNewPortfolioType('crypto');
      setShowNewPortfolioForm(false);
      showStatus(`Created portfolio "${newPortfolio.name}"`);
    } catch (error) {
      console.error('Error creating portfolio:', error);
      showStatus('Failed to create portfolio', 'error');
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
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${baseUrl}/portfolios/${portfolioId}?username=${encodeURIComponent(user.address)}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete portfolio: ${response.status}`);
      }

      const updatedPortfolios = portfolios.filter(w => w.id !== portfolioId);
      setPortfolios(updatedPortfolios);

      if (activePortfolioId === portfolioId && updatedPortfolios.length > 0) {
        setActivePortfolioId(updatedPortfolios[0].id);
      }

      showStatus(`Deleted portfolio "${portfolio.name}"`);
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      showStatus('Failed to delete portfolio', 'error');
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

    // Check for duplicates in the input
    const uniqueSymbols = [...new Set(symbols)];
    if (uniqueSymbols.length < symbols.length) {
      showStatus('Removing duplicate symbols from input', 'error');
    }

    // Filter out symbols that already exist in the portfolio
    const existingSymbols: string[] = [];
    const newSymbolsToAdd = uniqueSymbols.filter(symbol => {
      if (activePortfolio.symbols.includes(symbol)) {
        existingSymbols.push(symbol);
        return false;
      }
      return true;
    });

    if (newSymbolsToAdd.length === 0) {
      showStatus(`All symbols already exist in this portfolio: ${existingSymbols.join(', ')}`, 'error');
      return;
    }

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      let currentPortfolio = activePortfolio;
      const addedSymbols: string[] = [];
      const failedSymbols: string[] = [];

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Add each symbol sequentially
      for (const symbol of newSymbolsToAdd) {
        try {
          const response = await fetch(`${baseUrl}/portfolios/${activePortfolioId}/symbols?username=${encodeURIComponent(user.address)}&symbol=${symbol}`, {
            method: 'POST',
            headers,
          });

          if (!response.ok) {
            throw new Error(`Failed to add ${symbol}: ${response.status}`);
          }

          const data = await response.json();
          currentPortfolio = data.portfolio;
          addedSymbols.push(symbol);
        } catch (error) {
          console.error(`Error adding symbol ${symbol}:`, error);
          failedSymbols.push(symbol);
        }
      }

      // Update the portfolio state with the final result
      const updatedPortfolios = portfolios.map(w =>
        w.id === activePortfolioId ? currentPortfolio : w
      );

      setPortfolios(updatedPortfolios);
      setNewSymbol('');
      setShowAddSymbolForm(false);

      // Show appropriate status message
      if (addedSymbols.length > 0 && failedSymbols.length === 0) {
        showStatus(`Added ${addedSymbols.length} symbol${addedSymbols.length > 1 ? 's' : ''} to ${activePortfolio.name}: ${addedSymbols.join(', ')}`);
      } else if (addedSymbols.length > 0 && failedSymbols.length > 0) {
        showStatus(`Added ${addedSymbols.join(', ')}. Failed: ${failedSymbols.join(', ')}`, 'error');
      } else {
        showStatus(`Failed to add symbols: ${failedSymbols.join(', ')}`, 'error');
      }

      if (existingSymbols.length > 0) {
        setTimeout(() => {
          showStatus(`Skipped existing symbols: ${existingSymbols.join(', ')}`);
        }, 3000);
      }
    } catch (error) {
      console.error('Error adding symbols:', error);
      showStatus('Failed to add symbols', 'error');
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
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${baseUrl}/portfolios/${activePortfolioId}/symbols/${symbol}?username=${encodeURIComponent(user.address)}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to remove symbol: ${response.status}`);
      }

      const data = await response.json();
      const updatedPortfolio = data.portfolio;

      const updatedPortfolios = portfolios.map(w =>
        w.id === activePortfolioId ? updatedPortfolio : w
      );

      setPortfolios(updatedPortfolios);
      showStatus(`Removed ${symbol} from ${activePortfolio.name}`);
    } catch (error) {
      console.error('Error removing symbol:', error);
      showStatus('Failed to remove symbol', 'error');
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
              onClick={refreshData}
              disabled={isLoading || !activePortfolio}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>

            <Button
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              variant="outline"
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Columns
            </Button>

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
              <p className="text-sm text-muted-foreground">Choose which rank columns to display and drag to reorder them for stock portfolios</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {columnConfig
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
                        {col.key === 'beta' && 'Predicted Beta'}
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
                                  {col.key === 'beta' && 'Predicted Beta'}
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
                                    const rankData = ranksData.find(r => r.ticker === symbol);
                                    const value = rankData?.[col.key === 'fundamental' ? 'rankFundamental' :
                                                     col.key === 'technical' ? 'rankTechnical' :
                                                     col.key === 'ivol' ? 'ibol' :
                                                     col.key === 'beta' ? 'predicted_beta' :
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
                                        {col.key === 'beta' && (value ? `${value}` : 'N/A')}
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
