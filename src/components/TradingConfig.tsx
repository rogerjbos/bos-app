import { Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWalletAuthContext } from '../providers/WalletAuthProvider';
import { KrakenBotSymbol, KrakenBotSymbolsConfig, SchwabBotSymbol, SchwabBotSymbolsConfig } from '../types/trading';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Helper function to sanitize numeric fields
const sanitizeNumericField = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return defaultValue;
  }
  return Number(value);
};

// Helper function to sanitize trading symbol data
const sanitizeKrakenBotSymbol = (item: any): KrakenBotSymbol => {
  return {
    symbol: item.symbol || '',
    entry_amount: sanitizeNumericField(item.entry_amount),
    entry_threshold: sanitizeNumericField(item.entry_threshold),
    exit_amount: sanitizeNumericField(item.exit_amount),
    exit_threshold: sanitizeNumericField(item.exit_threshold),
    max_amount: sanitizeNumericField(item.max_amount)
  };
};

// Helper function to sanitize Schwab symbol data
const sanitizeSchwabBotSymbol = (item: any): SchwabBotSymbol => {
  return {
    symbol: item.symbol || '',
    account_hash: item.account_hash || '',
    entry_amount: sanitizeNumericField(item.entry_amount),
    entry_threshold: sanitizeNumericField(item.entry_threshold),
    exit_amount: sanitizeNumericField(item.exit_amount),
    exit_threshold: sanitizeNumericField(item.exit_threshold),
    max_weight: sanitizeNumericField(item.max_weight),
    strategy: item.strategy || 'volatility_capture',
    api: item.api || 'schwab'
  };
};

const Bots: React.FC = () => {
  // Get the authenticated user and authentication status
  const { user, isAuthenticated, walletAddress } = useAuth();
  const { getAccessToken } = useWalletAuthContext();

  const [tradingSymbols, setTradingSymbols] = useState<KrakenBotSymbolsConfig>([]);
  const [schwabSymbols, setSchwabSymbols] = useState<SchwabBotSymbolsConfig>([]);

  const [newItem, setNewItem] = useState<KrakenBotSymbol>({
    symbol: '',
    entry_amount: 58,
    entry_threshold: -2.1,
    exit_amount: 26,
    exit_threshold: 2.6,
    max_amount: 2000
  });

  const [newSchwabItem, setNewSchwabItem] = useState({
    symbol: '',
    account_hash: '',
    entry_amount: '150',
    entry_threshold: '-2.6',
    exit_amount: '100',
    exit_threshold: '2.1',
    max_weight: '0.02',
    strategy: 'volatility_capture',
    api: 'schwab'
  });

  const [showForm, setShowForm] = useState(false);
  const [showSchwabForm, setShowSchwabForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<KrakenBotSymbol | null>(null);
  const [schwabEditIndex, setSchwabEditIndex] = useState<number | null>(null);
  const [schwabEditItem, setSchwabEditItem] = useState<{
    symbol: string;
    account_hash: string;
    entry_amount: string;
    entry_threshold: string;
    exit_amount: string;
    exit_threshold: string;
    max_weight: string;
    strategy: string;
    api: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cryptoThresholds, setCryptoThresholds] = useState<{[key: string]: {min_entry_threshold: number, min_exit_threshold: number}}>({});
  const [stockThresholds, setStockThresholds] = useState<{[key: string]: {entry_threshold: number, exit_threshold: number}}>({});
  const [cryptoPrices, setCryptoPrices] = useState<{[key: string]: {close: number, return30d: number}}>({});
  const [stockPrices, setStockPrices] = useState<{[key: string]: {close: number, return30d: number}}>({});
  const [isDark, setIsDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Helper function
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Listen for theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      console.log('TradingConfig loadInitialData called:', { isAuthenticated, user: !!user, walletAddress });
      setIsLoading(true);
      try {
        // Load public trading config and schwab symbols even when user is not logged in.
        const symbols = await fetchTradingConfig();

        // Extract unique baseCurrencies from trading symbols, lowercase
        const baseCurrencies: string[] = [...new Set(symbols.map((s: KrakenBotSymbol) => s.symbol.split('/')[0].toLowerCase()))];

        await fetchCryptoThresholds(baseCurrencies);

        // Fetch schwab config once and reuse
        const schwabSymbolsList: SchwabBotSymbolsConfig = await fetchSchwabConfig();
        const stockSymbols: string[] = [...new Set(schwabSymbolsList.map((s: SchwabBotSymbol) => s.symbol))];

        await fetchStockThresholds(stockSymbols);
        await fetchLatestCryptoPrices(baseCurrencies);
        await fetchLatestStockPrices(stockSymbols);
        console.log('TradingConfig loadInitialData completed:', { tradingSymbolsLength: symbols.length, schwabSymbolsLength: schwabSymbolsList.length });
      } catch (e) {
        console.error("Error in loadInitialData:", e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
        showStatus(`Failed to load trading config: ${errorMessage}`, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated, walletAddress]);

  const fetchTradingConfig = useCallback(async (): Promise<KrakenBotSymbolsConfig> => {
    // This endpoint is public for reads; don't require user to be logged in to fetch config.

    try {
      // Only add Authorization header when we actually have a token
      const accessToken = getAccessToken ? getAccessToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`${API_BASE_URL}/kraken-bot-symbols`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle the response based on your API structure
      let apiData = [];
      if (Array.isArray(data)) {
        apiData = data;
      } else if (data.data && Array.isArray(data.data)) {
        apiData = data.data;
      } else if (data) {
        // If single object, wrap in array
        apiData = [data];
      }

      // Sanitize the data to ensure numeric fields are properly handled
      const sanitizedData = apiData.map(sanitizeKrakenBotSymbol);
      setTradingSymbols(sanitizedData);
      return sanitizedData;
    } catch (error) {
      console.error('Error fetching trading config from API:', error);
      throw error;
    }
  }, [user?.name, walletAddress, API_BASE_URL, getAccessToken]);

  const saveTradingConfigToAPI = useCallback(async (data: KrakenBotSymbolsConfig) => {
    const identifier = user?.name || walletAddress;
    if (!identifier) {
      return false;
    }

    try {
      const accessToken = getAccessToken ? getAccessToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`${API_BASE_URL}/kraken-bot-symbols`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: identifier,
          data: data
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save to API: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error saving to API:', error);
      throw error;
    }
  }, [user?.name, walletAddress, API_BASE_URL, getAccessToken]);

  const fetchSchwabConfig = useCallback(async () => {
    // Public read; don't require user to fetch. Only include Authorization when token present.
    try {
      const accessToken = getAccessToken ? getAccessToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`${API_BASE_URL}/schwab-bot-symbols`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle the response based on your API structure
      let apiData = [];
      if (Array.isArray(data)) {
        apiData = data;
      } else if (data.data && Array.isArray(data.data)) {
        apiData = data.data;
      } else if (data) {
        // If single object, wrap in array
        apiData = [data];
      }

      // Sanitize the data to ensure numeric fields are properly handled
      const sanitizedData = apiData.map(sanitizeSchwabBotSymbol);
      setSchwabSymbols(sanitizedData);
      return sanitizedData;
    } catch (error) {
      console.error('Error fetching schwab config from API:', error);
      throw error;
    }
  }, [user?.name, walletAddress, API_BASE_URL, getAccessToken]);

  const saveSchwabConfigToAPI = useCallback(async (data: SchwabBotSymbolsConfig) => {
    const identifier = user?.name || walletAddress;
    if (!identifier) {
      return false;
    }

    try {
      const accessToken = getAccessToken ? getAccessToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`${API_BASE_URL}/schwab-bot-symbols`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: identifier,
          data: data
        }),
      });

      if (!response.ok) {
        // Try to extract error details from response body
        let errorDetail = `${response.status} ${response.statusText}`;
        try {
          const errorText = await response.text();
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.detail) {
                errorDetail = errorData.detail;
              } else if (errorData.message) {
                errorDetail = errorData.message;
              }
            } catch (parseError) {
              // If it's not JSON, use the raw text
              errorDetail = errorText.substring(0, 200); // Limit length
            }
          }
        } catch (e) {
          // Ignore JSON parse errors, keep default error message
        }
        throw new Error(`Failed to save to API: ${errorDetail}`);
      }

      const result = await response.json();
      return true;
    } catch (error) {
      console.error('Error saving schwab config to API:', error);
      throw error;
    }
  }, [user?.name, walletAddress, API_BASE_URL, getAccessToken]);

  // Auto-save when tradingSymbols changes
  useEffect(() => {
    if (tradingSymbols.length > 0) {
      saveTradingConfigToAPI(tradingSymbols).catch(error => {
        console.warn('Failed to sync with API:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradingSymbols]);

  // Auto-save when schwabSymbols changes
  useEffect(() => {
    if (schwabSymbols.length > 0) {
      saveSchwabConfigToAPI(schwabSymbols).catch(error => {
        console.warn('Failed to sync schwab config with API:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        showStatus(`Failed to save: ${errorMessage}`, 'error');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schwabSymbols]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: name === 'symbol' ? value : parseFloat(value) || 0
    });
  };

  const handleSchwabInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewSchwabItem({
      ...newSchwabItem,
      [name]: value
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editItem) return;

    const { name, value } = e.target;
    setEditItem({
      ...editItem,
      [name]: name === 'symbol' ? value : parseFloat(value) || 0
    });
  };

  const handleSchwabEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!schwabEditItem) return;

    const { name, value } = e.target;
    setSchwabEditItem({
      ...schwabEditItem,
      [name]: value
    });
  };

  const startEditing = (index: number) => {
    setEditIndex(index);
    setEditItem({...tradingSymbols[index]});
  };

  const startSchwabEditing = (index: number) => {
    setSchwabEditIndex(index);
    const item = schwabSymbols[index];
    setSchwabEditItem({
      symbol: item.symbol,
      account_hash: item.account_hash,
      entry_amount: item.entry_amount.toString(),
      entry_threshold: item.entry_threshold.toString(),
      exit_amount: item.exit_amount.toString(),
      exit_threshold: item.exit_threshold.toString(),
      max_weight: item.max_weight.toString(),
      strategy: item.strategy,
      api: item.api
    });
  };

  const cancelEditing = () => {
    setEditIndex(null);
    setEditItem(null);
  };

  const cancelSchwabEditing = () => {
    setSchwabEditIndex(null);
    setSchwabEditItem(null);
  };

  const saveEdit = () => {
    if (editIndex === null || !editItem) return;

    const updatedItems = [...tradingSymbols];
    updatedItems[editIndex] = editItem;
    setTradingSymbols(updatedItems);
    setEditIndex(null);
    setEditItem(null);
    showStatus('Configuration updated successfully', 'success');
  };

  const saveSchwabEdit = () => {
    if (schwabEditIndex === null || !schwabEditItem) return;

    const item: SchwabBotSymbol = {
      symbol: schwabEditItem.symbol,
      account_hash: schwabEditItem.account_hash,
      entry_amount: parseFloat(schwabEditItem.entry_amount) || 0,
      entry_threshold: parseFloat(schwabEditItem.entry_threshold) || 0,
      exit_amount: parseFloat(schwabEditItem.exit_amount) || 0,
      exit_threshold: parseFloat(schwabEditItem.exit_threshold) || 0,
      max_weight: parseFloat(schwabEditItem.max_weight) || 0,
      strategy: schwabEditItem.strategy as any,
      api: schwabEditItem.api as any
    };

    const updatedItems = [...schwabSymbols];
    updatedItems[schwabEditIndex] = item;
    setSchwabSymbols(updatedItems);
    setSchwabEditIndex(null);
    setSchwabEditItem(null);
    showStatus('Schwab configuration updated successfully', 'success');
  };

  const addTradingSymbol = async () => {
    if (!newItem.symbol) {
      alert('Please enter a symbol');
      return;
    }

    // Check for duplicates
    const isDuplicate = tradingSymbols.some(item =>
      item.symbol.toLowerCase() === newItem.symbol.toLowerCase()
    );

    if (isDuplicate) {
      const confirmMessage = `Symbol "${newItem.symbol}" already exists. Add anyway?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    try {
      const updatedItems = [...tradingSymbols, newItem];
      setTradingSymbols(updatedItems);

      // Reset form
      setNewItem({
        symbol: '',
        entry_amount: 0,
        entry_threshold: 0,
        exit_amount: 0,
        exit_threshold: 0,
        max_amount: 0
      });

      // Hide form after successful add
      setShowForm(false);
      showStatus('Trading symbol added successfully', 'success');

    } catch (error) {
      console.error('Error adding item:', error);
      alert(`Failed to add item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const removeTradingSymbol = async (index: number) => {
    const itemToDelete = tradingSymbols[index];
    const confirmMessage = `Are you sure you want to delete ${itemToDelete.symbol}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const updatedItems = tradingSymbols.filter((_, i) => i !== index);
      setTradingSymbols(updatedItems);
      showStatus('Trading symbol deleted successfully', 'success');

    } catch (error) {
      console.error('Error deleting item:', error);
      alert(`Item deleted locally, but failed to sync with server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addSchwabSymbol = async () => {
    if (!newSchwabItem.symbol) {
      alert('Please enter a symbol');
      return;
    }

    // Check for duplicates
    const isDuplicate = schwabSymbols.some(item =>
      item.symbol.toLowerCase() === newSchwabItem.symbol.toLowerCase() &&
      item.account_hash === newSchwabItem.account_hash
    );

    if (isDuplicate) {
      const confirmMessage = `Symbol "${newSchwabItem.symbol}" with account "${newSchwabItem.account_hash}" already exists. Add anyway?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    try {
      const item: SchwabBotSymbol = {
        symbol: newSchwabItem.symbol,
        account_hash: newSchwabItem.account_hash,
        entry_amount: parseFloat(newSchwabItem.entry_amount) || 0,
        entry_threshold: parseFloat(newSchwabItem.entry_threshold) || 0,
        exit_amount: parseFloat(newSchwabItem.exit_amount) || 0,
        exit_threshold: parseFloat(newSchwabItem.exit_threshold) || 0,
        max_weight: parseFloat(newSchwabItem.max_weight) || 0,
        strategy: newSchwabItem.strategy as any,
        api: newSchwabItem.api as any
      };
      const updatedItems = [...schwabSymbols, item];
      setSchwabSymbols(updatedItems);

      // Reset form
      setNewSchwabItem({
        symbol: '',
        account_hash: '',
        entry_amount: '0',
        entry_threshold: '0',
        exit_amount: '0',
        exit_threshold: '0',
        max_weight: '0',
        strategy: 'volatility_capture',
        api: 'schwab'
      });

      // Hide form after successful add
      setShowSchwabForm(false);
      showStatus('Schwab symbol added successfully', 'success');

    } catch (error) {
      console.error('Error adding schwab item:', error);
      alert(`Failed to add item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const removeSchwabSymbol = async (index: number) => {
    const itemToDelete = schwabSymbols[index];
    const confirmMessage = `Are you sure you want to delete ${itemToDelete.symbol}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const updatedItems = schwabSymbols.filter((_, i) => i !== index);
      setSchwabSymbols(updatedItems);
      showStatus('Schwab symbol deleted successfully', 'success');

    } catch (error) {
      console.error('Error deleting schwab item:', error);
      alert(`Item deleted locally, but failed to sync with server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const renderEditableCell = (field: keyof KrakenBotSymbol, item: KrakenBotSymbol, index: number, isNumeric: boolean = true) => {
    if (editIndex === index && editItem) {
      return (
        <input
          type={isNumeric ? "number" : "text"}
          name={field}
          value={editItem[field]}
          onChange={handleEditChange}
          step={isNumeric ? "0.1" : undefined}
          min={isNumeric && (field === 'entry_threshold' || field === 'exit_threshold') ? "-100" : undefined}
          className="w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      );
    } else {
      return (
        <div
          onClick={() => startEditing(index)}
          className="cursor-pointer editable-cell hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-1 py-1"
        >
          {isNumeric ? ((item[field] as number) ?? 0).toFixed(1) : item[field]}
        </div>
      );
    }
  };

  const renderSchwabEditableCell = (field: keyof SchwabBotSymbol, item: SchwabBotSymbol, index: number, isNumeric: boolean = true, isSelect: boolean = false, options?: string[]) => {
    if (schwabEditIndex === index && schwabEditItem) {
      if (isSelect && options) {
        return (
          <select
            name={field}
            value={schwabEditItem[field] as string}
            onChange={handleSchwabEditChange}
            className="w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      return (
        <input
          type={isNumeric ? "number" : "text"}
          name={field}
          value={schwabEditItem[field]}
          onChange={handleSchwabEditChange}
          step={isNumeric ? "0.1" : undefined}
          min={isNumeric && (field === 'entry_threshold' || field === 'exit_threshold') ? "-100" : undefined}
          className="w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      );
    } else {
      return (
        <div
          onClick={() => startSchwabEditing(index)}
          className="cursor-pointer editable-cell hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-1 py-1"
        >
          {isNumeric ? ((item[field] as number) ?? 0).toFixed(field === 'max_weight' ? 2 : 1) : item[field]}
        </div>
      );
    }
  };

  const formatNumber = (value: number, decimals: number = 1): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  const refreshFromAPI = async () => {
    setIsLoading(true);
    try {
      const symbols = await fetchTradingConfig();
      const baseCurrencies: string[] = [...new Set(symbols.map((s: KrakenBotSymbol) => s.symbol.split('/')[0].toLowerCase()))];
      await fetchCryptoThresholds(baseCurrencies);
      const schwabSymbols: SchwabBotSymbolsConfig = await fetchSchwabConfig();
      const stockSymbols: string[] = [...new Set(schwabSymbols.map((s: SchwabBotSymbol) => s.symbol))];
      await fetchStockThresholds(stockSymbols);
      await fetchLatestCryptoPrices(baseCurrencies);
      await fetchLatestStockPrices(stockSymbols);
      showStatus('Configuration refreshed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showStatus(`Failed to refresh: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCryptoThresholds = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const queryParams = symbols.map(sym => `symbols=${encodeURIComponent(sym)}`).join('&');
      const accessToken = getAccessToken ? getAccessToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`${API_BASE_URL}/crypto_thresholds?${queryParams}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform into a map keyed by baseCurrency
      const thresholdsMap: {[key: string]: {min_entry_threshold: number, min_exit_threshold: number}} = {};
      data.forEach((item: any) => {
        thresholdsMap[item.baseCurrency] = {
          min_entry_threshold: item.min_entry_threshold,
          min_exit_threshold: item.min_exit_threshold
        };
      });

      setCryptoThresholds(thresholdsMap);
    } catch (error) {
      console.error('Error fetching crypto thresholds:', error);
      // Don't show error for thresholds, just log it
    }
  }, [API_BASE_URL, getAccessToken]);

  const fetchStockThresholds = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const queryParams = symbols.map(sym => `symbols=${encodeURIComponent(sym)}`).join('&');
      const accessToken = getAccessToken ? getAccessToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`${API_BASE_URL}/stock_thresholds?${queryParams}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform into a map keyed by symbol
      const thresholdsMap: {[key: string]: {entry_threshold: number, exit_threshold: number}} = {};
      data.forEach((item: any) => {
        thresholdsMap[item.symbol] = {
          entry_threshold: item.entry_threshold,
          exit_threshold: item.exit_threshold
        };
      });

      setStockThresholds(thresholdsMap);
    } catch (error) {
      console.error('Error fetching stock thresholds:', error);
      // Don't show error for thresholds, just log it
    }
  }, [API_BASE_URL, getAccessToken]);

  const fetchLatestCryptoPrices = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const queryParams = symbols.map(sym => `symbols=${encodeURIComponent(sym)}`).join('&');
      const accessToken = getAccessToken ? getAccessToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`${API_BASE_URL}/latest_crypto_price?${queryParams}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform into a map keyed by baseCurrency
      const pricesMap: {[key: string]: {close: number, return30d: number}} = {};
      data.forEach((item: any) => {
        pricesMap[item.baseCurrency] = {
          close: item.close,
          return30d: item.return30d || 0
        };
      });

      setCryptoPrices(pricesMap);
    } catch (error) {
      console.error('Error fetching latest crypto prices:', error);
      // Don't show error for prices, just log it
    }
  }, [API_BASE_URL, getAccessToken]);

  const fetchLatestStockPrices = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    try {
      const queryParams = symbols.map(sym => `symbols=${encodeURIComponent(sym)}`).join('&');
      const accessToken = getAccessToken ? getAccessToken() : null;
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`${API_BASE_URL}/latest_stock_price?${queryParams}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Transform into a map keyed by symbol
      const pricesMap: {[key: string]: {close: number, return30d: number}} = {};
      data.forEach((item: any) => {
        pricesMap[item.symbol] = {
          close: item.close,
          return30d: item.return30d || 0
        };
      });

      setStockPrices(pricesMap);
    } catch (error) {
      console.error('Error fetching latest stock prices:', error);
      // Don't show error for prices, just log it
    }
  }, [API_BASE_URL, getAccessToken]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Bots</h1>
          <Button
            onClick={refreshFromAPI}
            disabled={!isAuthenticated || isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Config
          </Button>
        </div>

        <Tabs defaultValue="kraken" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="kraken">Kraken Bot</TabsTrigger>
            <TabsTrigger value="schwab">Schwab Bot</TabsTrigger>
          </TabsList>

          <TabsContent value="kraken">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Kraken Bot Configuration</h2>
              <Button
                onClick={() => setShowForm(!showForm)}
                variant="ghost"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {showForm ? 'Hide Form' : 'Add Symbol'}
              </Button>
            </div>

            {showForm && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Add New Trading Symbol</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="symbol">Symbol</Label>
                      <Input
                        id="symbol"
                        type="text"
                        name="symbol"
                        value={newItem.symbol}
                        onChange={handleInputChange}
                        placeholder="BTC/USD"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="entry_amount">Entry Amount</Label>
                      <Input
                        id="entry_amount"
                        type="number"
                        name="entry_amount"
                        value={newItem.entry_amount}
                        onChange={handleInputChange}
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="entry_threshold">Entry Threshold</Label>
                      <Input
                        id="entry_threshold"
                        type="number"
                        name="entry_threshold"
                        value={newItem.entry_threshold}
                        onChange={handleInputChange}
                        step="0.1"
                        min="-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exit_amount">Exit Amount</Label>
                      <Input
                        id="exit_amount"
                        type="number"
                        name="exit_amount"
                        value={newItem.exit_amount}
                        onChange={handleInputChange}
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exit_threshold">Exit Threshold</Label>
                      <Input
                        id="exit_threshold"
                        type="number"
                        name="exit_threshold"
                        value={newItem.exit_threshold}
                        onChange={handleInputChange}
                        step="0.1"
                        min="-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_amount">Max Amount</Label>
                      <Input
                        id="max_amount"
                        type="number"
                        name="max_amount"
                        value={newItem.max_amount}
                        onChange={handleInputChange}
                        step="0.1"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={addTradingSymbol}
                        className="w-full"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      {user ? `Loading trading configuration for ${user.name}...` : walletAddress ? `Loading trading configuration for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}...` : 'Loading configuration...'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : tradingSymbols.length === 0 ? (
              <Card className="border-yellow-500/20 bg-yellow-500/10">
                <CardContent className="pt-6">
                  <p className="text-sm">
                    {(() => {
                      console.log('TradingConfig render check:', { isAuthenticated, tradingSymbolsLength: tradingSymbols.length, user: !!user, walletAddress });
                      return isAuthenticated
                        ? 'No trading symbols configured.'
                        : 'Please log in to view trading configuration.';
                    })()}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16"></TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Entry Amount</TableHead>
                        <TableHead>Entry Threshold</TableHead>
                        <TableHead>Exit Amount</TableHead>
                        <TableHead>Exit Threshold</TableHead>
                        <TableHead>Max Amount</TableHead>
                        <TableHead>90d Entry Thr</TableHead>
                        <TableHead>90d Exit Thr</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tradingSymbols.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {editIndex === idx ? (
                              <div className="flex space-x-1">
                                <Button
                                  onClick={saveEdit}
                                  size="sm"
                                  variant="default"
                                  className="h-6 w-6 p-0"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={cancelEditing}
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => removeTradingSymbol(idx)}
                                size="sm"
                                variant="destructive"
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{renderEditableCell('symbol', item, idx, false)}</TableCell>
                          <TableCell>{renderEditableCell('entry_amount', item, idx)}</TableCell>
                          <TableCell>{renderEditableCell('entry_threshold', item, idx)}</TableCell>
                          <TableCell>{renderEditableCell('exit_amount', item, idx)}</TableCell>
                          <TableCell>{renderEditableCell('exit_threshold', item, idx)}</TableCell>
                          <TableCell>{renderEditableCell('max_amount', item, idx)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {(() => {
                              const baseCurrency = item.symbol.split('/')[0].toLowerCase();
                              const threshold = cryptoThresholds[baseCurrency];
                              return threshold ? threshold.min_entry_threshold.toFixed(1) : '-';
                            })()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {(() => {
                              const baseCurrency = item.symbol.split('/')[0].toLowerCase();
                              const threshold = cryptoThresholds[baseCurrency];
                              return threshold ? threshold.min_exit_threshold.toFixed(1) : '-';
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schwab">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Schwab Bot Configuration</h2>
              <Button
                onClick={() => setShowSchwabForm(!showSchwabForm)}
                variant="ghost"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {showSchwabForm ? 'Hide Form' : 'Add Symbol'}
              </Button>
            </div>

            {showSchwabForm && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Add New Schwab Symbol</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="schwab_symbol">Symbol</Label>
                      <Input
                        id="schwab_symbol"
                        type="text"
                        name="symbol"
                        value={newSchwabItem.symbol}
                        onChange={handleSchwabInputChange}
                        placeholder="AAPL"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schwab_account_hash">Account Hash</Label>
                      <Input
                        id="schwab_account_hash"
                        type="text"
                        name="account_hash"
                        value={newSchwabItem.account_hash}
                        onChange={handleSchwabInputChange}
                        placeholder="8B47A2FD..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schwab_entry_amount">Entry Amount</Label>
                      <Input
                        id="schwab_entry_amount"
                        type="number"
                        name="entry_amount"
                        value={newSchwabItem.entry_amount}
                        onChange={handleSchwabInputChange}
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schwab_entry_threshold">Entry Threshold</Label>
                      <Input
                        id="schwab_entry_threshold"
                        type="number"
                        name="entry_threshold"
                        value={newSchwabItem.entry_threshold}
                        onChange={handleSchwabInputChange}
                        step="0.1"
                        min="-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schwab_exit_amount">Exit Amount</Label>
                      <Input
                        id="schwab_exit_amount"
                        type="number"
                        name="exit_amount"
                        value={newSchwabItem.exit_amount}
                        onChange={handleSchwabInputChange}
                        step="0.1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schwab_exit_threshold">Exit Threshold</Label>
                      <Input
                        id="schwab_exit_threshold"
                        type="number"
                        name="exit_threshold"
                        value={newSchwabItem.exit_threshold}
                        onChange={handleSchwabInputChange}
                        step="0.1"
                        min="-100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schwab_max_weight">Max Weight</Label>
                      <Input
                        id="schwab_max_weight"
                        type="number"
                        name="max_weight"
                        value={newSchwabItem.max_weight}
                        onChange={handleSchwabInputChange}
                        step="0.01"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schwab_strategy">Strategy</Label>
                      <select
                        id="schwab_strategy"
                        name="strategy"
                        value={newSchwabItem.strategy}
                        onChange={handleSchwabInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="volatility_capture">Volatility Capture</option>
                        <option value="momentum">Momentum</option>
                        <option value="mean_reversion">Mean Reversion</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="schwab_api">API</Label>
                      <select
                        id="schwab_api"
                        name="api"
                        value={newSchwabItem.api}
                        onChange={handleSchwabInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="schwab">Schwab</option>
                        <option value="ibkr">IBKR</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={addSchwabSymbol}
                        className="w-full"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {schwabSymbols.length === 0 ? (
              <Card className="border-yellow-500/20 bg-yellow-500/10">
                <CardContent className="pt-6">
                  <p className="text-sm">No Schwab symbols configured.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16"></TableHead>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Entry Amt</TableHead>
                        <TableHead>Entry Thr</TableHead>
                        <TableHead>Exit Amt</TableHead>
                        <TableHead>Exit Thr</TableHead>
                        <TableHead>Max Wt</TableHead>
                        <TableHead>Strategy</TableHead>
                        <TableHead>API</TableHead>
                        <TableHead>90d Entry Thr</TableHead>
                        <TableHead>90d Exit Thr</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schwabSymbols.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {schwabEditIndex === idx ? (
                              <div className="flex space-x-1">
                                <Button
                                  onClick={saveSchwabEdit}
                                  size="sm"
                                  variant="default"
                                  className="h-6 w-6 p-0"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  onClick={cancelSchwabEditing}
                                  size="sm"
                                  variant="secondary"
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => removeSchwabSymbol(idx)}
                                size="sm"
                                variant="destructive"
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{renderSchwabEditableCell('symbol', item, idx, false)}</TableCell>
                          <TableCell>
                            <div className="truncate max-w-[100px]" title={item.account_hash}>
                              {renderSchwabEditableCell('account_hash', item, idx, false)}
                            </div>
                          </TableCell>
                          <TableCell>{renderSchwabEditableCell('entry_amount', item, idx)}</TableCell>
                          <TableCell>{renderSchwabEditableCell('entry_threshold', item, idx)}</TableCell>
                          <TableCell>{renderSchwabEditableCell('exit_amount', item, idx)}</TableCell>
                          <TableCell>{renderSchwabEditableCell('exit_threshold', item, idx)}</TableCell>
                          <TableCell>{renderSchwabEditableCell('max_weight', item, idx)}</TableCell>
                          <TableCell>{renderSchwabEditableCell('strategy', item, idx, false, true, ['volatility_capture', 'momentum', 'mean_reversion'])}</TableCell>
                          <TableCell>{renderSchwabEditableCell('api', item, idx, false, true, ['schwab', 'ibkr'])}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {(() => {
                              const threshold = stockThresholds[item.symbol];
                              return threshold ? threshold.entry_threshold.toFixed(1) : '-';
                            })()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {(() => {
                              const threshold = stockThresholds[item.symbol];
                              return threshold ? threshold.exit_threshold.toFixed(1) : '-';
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {statusMessage && (
          <Card className={`mt-6 ${statusMessage.type === 'success' ? 'border-green-500/20 bg-green-500/10' : 'border-destructive/20 bg-destructive/10'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span>{statusMessage.text}</span>
                <Button
                  onClick={() => setStatusMessage(null)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
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

export default Bots;
