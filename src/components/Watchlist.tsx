import { ChevronDown, ChevronUp, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
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
const TIINGO_API_KEY = import.meta.env.VITE_TIINGO_API_KEY || '';

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
  const [isLoading, setIsLoading] = useState(false);
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

  // Helper function
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

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

  // Refresh data for active watchlist
  const refreshData = useCallback(async () => {
    const activeWatchlist = watchlists.find(w => w.id === activeWatchlistId);
    if (!activeWatchlist) return;

    setIsLoading(true);
    setError(null);
    setLatestPrices([]); // Clear latest prices while refreshing

    try {
      if (activeWatchlist.type === 'crypto') {
        await fetchCryptoData(activeWatchlist.symbols);
      } else {
        await fetchStockData(activeWatchlist.symbols);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeWatchlistId, watchlists, fetchCryptoData, fetchStockData]);

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
              onClick={() => setShowNewWatchlistForm(!showNewWatchlistForm)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Watchlist
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
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <SortableHeader column="symbol">Symbol</SortableHeader>
                            <SortableHeader column="latest" className="text-right">Latest</SortableHeader>
                            <SortableHeader column="1d" className="text-right">1 Day Ago</SortableHeader>
                            <SortableHeader column="7d" className="text-right">7 Days Ago</SortableHeader>
                            <SortableHeader column="30d" className="text-right">30 Days Ago</SortableHeader>
                            <SortableHeader column="60d" className="text-right">60 Days Ago</SortableHeader>
                            <SortableHeader column="90d" className="text-right">90 Days Ago</SortableHeader>
                            <SortableHeader column="120d" className="text-right">120 Days Ago</SortableHeader>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getSortedSymbols(watchlist.symbols).map((symbol) => {
                            const data = displayData.find(d =>
                              (watchlist.type === 'crypto' && 'baseCurrency' in d && d.baseCurrency === symbol) ||
                              (watchlist.type === 'stocks' && 'symbol' in d && d.symbol === symbol)
                            );

                            const latestData = latestPrices.find(lp => lp.symbol === symbol);

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
