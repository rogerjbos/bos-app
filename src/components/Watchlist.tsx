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
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// Interfaces
interface Watchlist {
  id: string;
  name: string;
  type: 'crypto' | 'stocks';
  symbols: string[];
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

interface StockXDaysData {
  symbol: string;
  close_1d: number | null;
  close_7d: number | null;
  close_30d: number | null;
  close_60d: number | null;
  close_90d: number | null;
  close_120d: number | null;
}

const Watchlist: React.FC = () => {
  const { user } = useAuth();

  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('');
  const [cryptoData, setCryptoData] = useState<CryptoXDaysData[]>([]);
  const [stockData, setStockData] = useState<StockXDaysData[]>([]);
  const [latestPrices, setLatestPrices] = useState<LatestPriceData[]>([]);
  const [ranksData, setRanksData] = useState<RanksData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New watchlist form
  const [showNewWatchlistForm, setShowNewWatchlistForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newWatchlistType, setNewWatchlistType] = useState<'crypto' | 'stocks'>('crypto');

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
    const saved = localStorage.getItem('watchlist-column-config');
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
    localStorage.setItem('watchlist-column-config', JSON.stringify(config));
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

  // Get sorted symbols for the active watchlist
  const getSortedSymbols = (symbols: string[]) => {
    if (!sortColumn || !activeWatchlist) return symbols;

    return [...symbols].sort((a, b) => {
      let aValue: any = null;
      let bValue: any = null;

      const aData = displayData.find(d =>
        (activeWatchlist.type === 'crypto' && 'baseCurrency' in d && d.baseCurrency === a) ||
        (activeWatchlist.type === 'stocks' && 'symbol' in d && d.symbol === a)
      );
      const bData = displayData.find(d =>
        (activeWatchlist.type === 'crypto' && 'baseCurrency' in d && d.baseCurrency === b) ||
        (activeWatchlist.type === 'stocks' && 'symbol' in d && d.symbol === b)
      );

      const aLatest = latestPrices.find(lp => lp.symbol === a);
      const bLatest = latestPrices.find(lp => lp.symbol === b);

      // For stocks, also get ranks data
      const aRanks = activeWatchlist.type === 'stocks' ? ranksData.find(r => r.ticker?.toUpperCase() === a) : null;
      const bRanks = activeWatchlist.type === 'stocks' ? ranksData.find(r => r.ticker?.toUpperCase() === b) : null;

      switch (sortColumn) {
        case 'symbol':
          aValue = a;
          bValue = b;
          break;
        case 'latest':
          aValue = aLatest?.latestPrice || 0;
          bValue = bLatest?.latestPrice || 0;
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
        case 'fundamental':
          aValue = aRanks?.rankFundamental || 0;
          bValue = bRanks?.rankFundamental || 0;
          break;
        case 'technical':
          aValue = aRanks?.rankTechnical || 0;
          bValue = bRanks?.rankTechnical || 0;
          break;
        case 'ivol':
          aValue = aRanks?.ibol || 0;
          bValue = bRanks?.ibol || 0;
          break;
        case 'beta':
          aValue = aRanks?.predicted_beta || 0;
          bValue = bRanks?.predicted_beta || 0;
          break;
        case 'risk_contribution':
          aValue = aRanks?.risk_contribution || 0;
          bValue = bRanks?.risk_contribution || 0;
          break;
        case 'industry':
          aValue = aRanks?.industry || '';
          bValue = bRanks?.industry || '';
          break;
        case 'sector':
          aValue = aRanks?.sector || 0;
          bValue = bRanks?.sector || 0;
          break;
        case 'mcap':
          aValue = aRanks?.mcap || 0;
          bValue = bRanks?.mcap || 0;
          break;
        case 'isADR':
          aValue = aRanks?.isADR ? 1 : 0;
          bValue = bRanks?.isADR ? 1 : 0;
          break;
        case 'isActive':
          aValue = aRanks?.isActive ? 1 : 0;
          bValue = bRanks?.isActive ? 1 : 0;
          break;
        case 'reportingCurrency':
          aValue = aRanks?.reportingCurrency || '';
          bValue = bRanks?.reportingCurrency || '';
          break;
        case 'td_resistance':
          aValue = aRanks?.td__Resistance || 0;
          bValue = bRanks?.td__Resistance || 0;
          break;
        case 'td_support':
          aValue = aRanks?.td__Support || 0;
          bValue = bRanks?.td__Support || 0;
          break;
        case 'tec_riskRangeHigh':
          aValue = aRanks?.tec_riskRangeHigh || 0;
          bValue = bRanks?.tec_riskRangeHigh || 0;
          break;
        case 'tec_riskRangeLow':
          aValue = aRanks?.tec_riskRangeLow || 0;
          bValue = bRanks?.tec_riskRangeLow || 0;
          break;
        case 'tag':
          aValue = aRanks?.tag || '';
          bValue = bRanks?.tag || '';
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

  // Load watchlists from backend API
  useEffect(() => {
    if (user?.name) {
      loadWatchlists();
    }
  }, [user?.name]);

  // Load watchlists from API
  const loadWatchlists = async () => {
    if (!user?.name) return;

    try {
      setIsInitialLoading(true);
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const response = await fetch(`${baseUrl}/watchlists?username=${encodeURIComponent(user.name)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load watchlists: ${response.status}`);
      }

      const data = await response.json();

      if (data.length > 0) {
        setWatchlists(data);
        if (!activeWatchlistId) {
          setActiveWatchlistId(data[0].id);
        }
      } else {
        // Create default watchlist if none exist
        await createDefaultWatchlist();
      }
    } catch (error) {
      console.error('Error loading watchlists:', error);
      showStatus('Failed to load watchlists', 'error');
      // Create default watchlist as fallback
      await createDefaultWatchlist();
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Create default watchlist
  const createDefaultWatchlist = async () => {
    if (!user?.name) return;

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const response = await fetch(`${baseUrl}/watchlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'My Watchlist',
          type: 'crypto',
          symbols: ['BTC', 'ETH', 'DOT'],
          username: user.name
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create default watchlist: ${response.status}`);
      }

      const data = await response.json();
      const newWatchlist = data.watchlist;

      setWatchlists([newWatchlist]);
      setActiveWatchlistId(newWatchlist.id);
      showStatus('Created default watchlist');
    } catch (error) {
      console.error('Error creating default watchlist:', error);
      showStatus('Failed to create default watchlist', 'error');
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Save watchlists - removed as we now save directly via API
  const saveWatchlists = useCallback((newWatchlists: Watchlist[]) => {
    // This function is no longer needed as we save directly via API
    // Keeping it for backwards compatibility but it just updates state
    setWatchlists(newWatchlists);
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

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
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

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
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

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
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

      // Fetch ranks data for each symbol
      const ranksPromises = symbols.map(async (symbol) => {
        const url = `${baseUrl}/ranks?ticker=${symbol.toLowerCase()}`;

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
            },
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

  // Refresh data for active watchlist
  const refreshData = useCallback(async () => {
    const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
    if (!activeWatchlist) return;

    setIsLoading(true);
    setError(null);
    setLatestPrices([]); // Clear latest prices while refreshing
    setRanksData([]); // Clear ranks data while refreshing

    try {
      if (activeWatchlist.type === 'crypto') {
        await fetchCryptoData(activeWatchlist.symbols);
      } else {
        await fetchStockData(activeWatchlist.symbols);
        // Only fetch ranks data for stocks, not crypto
        await fetchRanksData(activeWatchlist.symbols);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeWatchlistId, watchlists, fetchCryptoData, fetchStockData, fetchRanksData]);

  // Create new watchlist
  const createWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      showStatus('Please enter a watchlist name', 'error');
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

      const response = await fetch(`${baseUrl}/watchlists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWatchlistName.trim(),
          type: newWatchlistType,
          symbols: [],
          username: user.name
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create watchlist: ${response.status}`);
      }

      const data = await response.json();
      const newWatchlist = data.watchlist;

      const updatedWatchlists = [...watchlists, newWatchlist];
      setWatchlists(updatedWatchlists);
      setActiveWatchlistId(newWatchlist.id);

      setNewWatchlistName('');
      setNewWatchlistType('crypto');
      setShowNewWatchlistForm(false);
      showStatus(`Created watchlist "${newWatchlist.name}"`);
    } catch (error) {
      console.error('Error creating watchlist:', error);
      showStatus('Failed to create watchlist', 'error');
    }
  };

  // Delete watchlist
  const deleteWatchlist = async (watchlistId: string) => {
    const watchlist = watchlists.find(w => w.id === watchlistId);
    if (!watchlist) return;

    if (!window.confirm(`Are you sure you want to delete "${watchlist.name}"?`)) {
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

      const response = await fetch(`${baseUrl}/watchlists/${watchlistId}?username=${encodeURIComponent(user.name)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete watchlist: ${response.status}`);
      }

      const updatedWatchlists = watchlists.filter(w => w.id !== watchlistId);
      setWatchlists(updatedWatchlists);

      if (activeWatchlistId === watchlistId && updatedWatchlists.length > 0) {
        setActiveWatchlistId(updatedWatchlists[0].id);
      }

      showStatus(`Deleted watchlist "${watchlist.name}"`);
    } catch (error) {
      console.error('Error deleting watchlist:', error);
      showStatus('Failed to delete watchlist', 'error');
    }
  };

  // Add symbol(s) to active watchlist
  const addSymbol = async () => {
    if (!newSymbol.trim()) {
      showStatus('Please enter a symbol', 'error');
      return;
    }

    const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
    if (!activeWatchlist) return;

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

    // Filter out symbols that already exist in the watchlist
    const existingSymbols: string[] = [];
    const newSymbolsToAdd = uniqueSymbols.filter(symbol => {
      if (activeWatchlist.symbols.includes(symbol)) {
        existingSymbols.push(symbol);
        return false;
      }
      return true;
    });

    if (newSymbolsToAdd.length === 0) {
      showStatus(`All symbols already exist in this watchlist: ${existingSymbols.join(', ')}`, 'error');
      return;
    }

    try {
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      let currentWatchlist = activeWatchlist;
      const addedSymbols: string[] = [];
      const failedSymbols: string[] = [];

      // Add each symbol sequentially
      for (const symbol of newSymbolsToAdd) {
        try {
          const response = await fetch(`${baseUrl}/watchlists/${activeWatchlistId}/symbols?username=${encodeURIComponent(user.name)}&symbol=${symbol}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to add ${symbol}: ${response.status}`);
          }

          const data = await response.json();
          currentWatchlist = data.watchlist;
          addedSymbols.push(symbol);
        } catch (error) {
          console.error(`Error adding symbol ${symbol}:`, error);
          failedSymbols.push(symbol);
        }
      }

      // Update the watchlist state with the final result
      const updatedWatchlists = watchlists.map(w =>
        w.id === activeWatchlistId ? currentWatchlist : w
      );

      setWatchlists(updatedWatchlists);
      setNewSymbol('');
      setShowAddSymbolForm(false);

      // Show appropriate status message
      if (addedSymbols.length > 0 && failedSymbols.length === 0) {
        showStatus(`Added ${addedSymbols.length} symbol${addedSymbols.length > 1 ? 's' : ''} to ${activeWatchlist.name}: ${addedSymbols.join(', ')}`);
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

  // Remove symbol from active watchlist
  const removeSymbol = async (symbol: string) => {
    const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
    if (!activeWatchlist) return;

    if (!window.confirm(`Remove ${symbol} from ${activeWatchlist.name}?`)) {
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

      const response = await fetch(`${baseUrl}/watchlists/${activeWatchlistId}/symbols/${symbol}?username=${encodeURIComponent(user.name)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to remove symbol: ${response.status}`);
      }

      const data = await response.json();
      const updatedWatchlist = data.watchlist;

      const updatedWatchlists = watchlists.map(w =>
        w.id === activeWatchlistId ? updatedWatchlist : w
      );

      setWatchlists(updatedWatchlists);
      showStatus(`Removed ${symbol} from ${activeWatchlist.name}`);
    } catch (error) {
      console.error('Error removing symbol:', error);
      showStatus('Failed to remove symbol', 'error');
    }
  };

  // Load data when active watchlist changes
  useEffect(() => {
    if (activeWatchlistId) {
      refreshData();
    }
  }, [activeWatchlistId, refreshData]);

  const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
  const displayData = activeWatchlist?.type === 'crypto' ? cryptoData : stockData;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Watchlists</h1>
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={refreshData}
              disabled={isLoading || !activeWatchlist}
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

            {activeWatchlist && (
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

        {showNewWatchlistForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Create New Watchlist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="watchlistName">Name</Label>
                  <Input
                    id="watchlistName"
                    type="text"
                    value={newWatchlistName}
                    onChange={(e) => setNewWatchlistName(e.target.value)}
                    placeholder="My Watchlist"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="watchlistType">Type</Label>
                  <select
                    id="watchlistType"
                    value={newWatchlistType}
                    onChange={(e) => setNewWatchlistType(e.target.value as 'crypto' | 'stocks')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="crypto">Crypto</option>
                    <option value="stocks">Stocks</option>
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button type="button" onClick={createWatchlist} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowNewWatchlistForm(false)}
                    variant="outline"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showAddSymbolForm && activeWatchlist && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Add Symbol to {activeWatchlist.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder={activeWatchlist.type === 'crypto' ? 'BTC, ETH, DOT' : 'AAPL, MSFT, GOOGL'}
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
              <p className="text-sm text-muted-foreground">Choose which rank columns to display and drag to reorder them for stock watchlists</p>
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

        {watchlists.length > 0 && (
          <Tabs value={activeWatchlistId} onValueChange={setActiveWatchlistId} className="w-full">
            <TabsList className="mb-6 flex-wrap">
              {watchlists.map((watchlist) => (
                <div key={watchlist.id} className="flex items-center gap-1">
                  <TabsTrigger value={watchlist.id} className="flex items-center gap-2">
                    {watchlist.name}
                    <Badge variant="secondary" className="text-xs">
                      {watchlist.type}
                    </Badge>
                  </TabsTrigger>
                  {watchlists.length > 1 && (
                    <Button
                      onClick={() => deleteWatchlist(watchlist.id)}
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

            {watchlists.map((watchlist) => (
              <TabsContent key={watchlist.id} value={watchlist.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{watchlist.name}</span>
                      <Badge variant={watchlist.type === 'crypto' ? 'default' : 'secondary'}>
                        {watchlist.type === 'crypto' ? 'Cryptocurrency' : 'Stocks'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {watchlist.symbols.length === 0 ? (
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
                          {Array.from({ length: Math.min(watchlist.symbols.length, 5) }).map((_, i) => (
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
                            <SortableHeader column="latest" className="text-right">Latest</SortableHeader>
                            <SortableHeader column="1d" className="text-right">1d</SortableHeader>
                            <SortableHeader column="7d" className="text-right">7d</SortableHeader>
                            <SortableHeader column="30d" className="text-right">30d</SortableHeader>
                            <SortableHeader column="60d" className="text-right">60d</SortableHeader>
                            <SortableHeader column="90d" className="text-right">90d</SortableHeader>
                            <SortableHeader column="120d" className="text-right">120d</SortableHeader>
                            {watchlist.type === 'stocks' && (
                              <>
                                {columnConfig
                                  .filter(col => col.visible)
                                  .sort((a, b) => a.order - b.order)
                                  .map(col => {
                                    const headerText = {
                                      fundamental: 'Fund. Rank',
                                      technical: 'Tech. Rank',
                                      ivol: 'IVol',
                                      beta: 'Beta',
                                      risk_contribution: 'Risk Contrib.',
                                      industry: 'Industry',
                                      sector: 'Sector',
                                      mcap: 'Market Cap',
                                      isADR: 'ADR',
                                      isActive: 'Active',
                                      reportingCurrency: 'Currency',
                                      td_resistance: 'Resistance',
                                      td_support: 'Support',
                                      tec_riskRangeHigh: 'Risk Range High',
                                      tec_riskRangeLow: 'Risk Range Low',
                                      tag: 'Tag'
                                    }[col.key] || col.key;

                                    return (
                                      <SortableHeader key={col.key} column={col.key} className="text-right">
                                        {headerText}
                                      </SortableHeader>
                                    );
                                  })}
                              </>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getSortedSymbols(watchlist.symbols).map((symbol) => {
                            const data = displayData.find(d =>
                              (watchlist.type === 'crypto' && 'baseCurrency' in d && d.baseCurrency === symbol) ||
                              (watchlist.type === 'stocks' && 'symbol' in d && d.symbol === symbol)
                            );

                            const latestData = latestPrices.find(lp => lp.symbol === symbol);

                            // Get ranks data for stocks
                            const ranksDataItem = watchlist.type === 'stocks' ? ranksData.find(r => r.ticker?.toUpperCase() === symbol) : null;

                            const formatPrice = (price: number | null) => price ? `$${price.toFixed(2)}` : 'N/A';
                            const formatReturn = (returnPct: number | null) => {
                              if (returnPct === null) return '';
                              const sign = returnPct >= 0 ? '+' : '';
                              return `${sign}${returnPct.toFixed(2)}%`;
                            };
                            const formatRank = (rank: number | null) => rank !== null && rank !== undefined ? rank.toFixed(1) : 'N/A';

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
                                <TableCell className="font-medium">{symbol}</TableCell>
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
                                {watchlist.type === 'stocks' && (
                                  <>
                                    {columnConfig
                                      .filter(col => col.visible)
                                      .sort((a, b) => a.order - b.order)
                                      .map(col => {
                                        let cellContent: React.ReactNode = 'N/A';

                                        switch (col.key) {
                                          case 'fundamental':
                                            cellContent = formatRank(ranksDataItem?.rankFundamental || null);
                                            break;
                                          case 'technical':
                                            cellContent = formatRank(ranksDataItem?.rankTechnical || null);
                                            break;
                                          case 'ivol':
                                            cellContent = ranksDataItem?.ibol !== null && ranksDataItem?.ibol !== undefined ? ranksDataItem.ibol.toFixed(3) : 'N/A';
                                            break;
                                          case 'beta':
                                            cellContent = ranksDataItem?.predicted_beta !== null && ranksDataItem?.predicted_beta !== undefined ? ranksDataItem.predicted_beta.toFixed(3) : 'N/A';
                                            break;
                                          case 'risk_contribution':
                                            cellContent = ranksDataItem?.risk_contribution !== null && ranksDataItem?.risk_contribution !== undefined ? ranksDataItem.risk_contribution.toFixed(3) : 'N/A';
                                            break;
                                          case 'industry':
                                            cellContent = abbreviateSectorIndustry(ranksDataItem?.industry || null, 'industry');
                                            break;
                                          case 'sector':
                                            cellContent = abbreviateSectorIndustry(String(ranksDataItem?.sector || ''), 'sector');
                                            break;
                                          case 'mcap':
                                            cellContent = ranksDataItem?.mcap !== null && ranksDataItem?.mcap !== undefined ? `$${(ranksDataItem.mcap / 1000000).toFixed(1)}M` : 'N/A';
                                            break;
                                          case 'isADR':
                                            cellContent = ranksDataItem?.isADR ? 'Yes' : 'No';
                                            break;
                                          case 'isActive':
                                            cellContent = ranksDataItem?.isActive ? 'Active' : 'Inactive';
                                            break;
                                          case 'reportingCurrency':
                                            cellContent = ranksDataItem?.reportingCurrency || 'N/A';
                                            break;
                                          case 'td_resistance':
                                            cellContent = ranksDataItem?.td__Resistance !== null && ranksDataItem?.td__Resistance !== undefined ? `$${ranksDataItem.td__Resistance.toFixed(2)}` : 'N/A';
                                            break;
                                          case 'td_support':
                                            cellContent = ranksDataItem?.td__Support !== null && ranksDataItem?.td__Support !== undefined ? `$${ranksDataItem.td__Support.toFixed(2)}` : 'N/A';
                                            break;
                                          case 'tec_riskRangeHigh':
                                            cellContent = ranksDataItem?.tec_riskRangeHigh !== null && ranksDataItem?.tec_riskRangeHigh !== undefined ? `$${ranksDataItem.tec_riskRangeHigh.toFixed(2)}` : 'N/A';
                                            break;
                                          case 'tec_riskRangeLow':
                                            cellContent = ranksDataItem?.tec_riskRangeLow !== null && ranksDataItem?.tec_riskRangeLow !== undefined ? `$${ranksDataItem.tec_riskRangeLow.toFixed(2)}` : 'N/A';
                                            break;
                                          case 'tag':
                                            cellContent = ranksDataItem?.tag || 'N/A';
                                            break;
                                        }

                                        return (
                                          <TableCell key={col.key} className={col.key === 'sector' || col.key === 'industry' ? 'text-left' : 'text-right'}>
                                            {cellContent}
                                          </TableCell>
                                        );
                                      })}
                                  </>
                                )}
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

        {watchlists.length === 0 && (
          <Card className="border-yellow-500/20 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm mb-4">No watchlists found. Create your first watchlist to get started!</p>
                <Button onClick={() => setShowNewWatchlistForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Watchlist
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
    </div>
  );
};

export default Watchlist;
