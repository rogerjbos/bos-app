import { cn } from '@/lib/utils';
import * as echarts from 'echarts';
import { ExternalLink, Eye, EyeOff, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Badge } from './ui/badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';


// Check your interface definition to ensure all required fields are present
interface StakingItem {
  username?: string,
  account: string;
  ticker: string;
  stakedQuantity: string;
  unclaimedQuantity: string;
  price: string;
  stakingUrl: string;
  priceLastUpdated?: string;
  return30d?: string;
}

// Interface for price data from CSV
interface PriceData {
  [symbol: string]: number;
}

// Interface for return data
interface ReturnData {
  [symbol: string]: number;
}

  // Define constants at the top of your component
  const APP_VERSION = '1.0.0';

  // API configuration (similar to Ranks.tsx)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

// Treemap component for staking data
const StakingTreemap: React.FC<{
  title: string;
  items: StakingItem[];
  calculatedValues: Array<{ totalQuantity: number; itemValue: number }>;
  isDark: boolean;
  hideValues: boolean;
}> = ({ title, items, calculatedValues, isDark, hideValues }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current, isDark ? 'dark' : 'light');

    // Prepare data for treemap with color based on 30D returns
    const data = items.map((item, idx) => {
      const { itemValue } = calculatedValues[idx];
      const return30d = item.return30d ? parseFloat(item.return30d) : 0;

      // Calculate color based on return
      let color: string;
      if (return30d > 0) {
        // Green shades for positive returns (brighter = better performance)
        const intensity = Math.min(return30d / 50, 1); // Scale based on return percentage
        const greenValue = Math.floor(100 + (intensity * 155)); // Range: 100-255
        color = `rgb(0, ${greenValue}, 0)`;
      } else if (return30d < 0) {
        // Red shades for negative returns (brighter = worse performance)
        const intensity = Math.min(Math.abs(return30d) / 50, 1); // Scale based on loss percentage
        const redValue = Math.floor(100 + (intensity * 155)); // Range: 100-255
        color = `rgb(${redValue}, 0, 0)`;
      } else {
        // Neutral gray for zero returns
        color = 'rgb(128, 128, 128)';
      }

      return {
        name: item.ticker,
        value: itemValue,
        return30d: return30d,
        // Store additional data for tooltips
        quantity: calculatedValues[idx].totalQuantity,
        account: item.account,
        // Set individual item color
        itemStyle: {
          color: color
        }
      };
    });

    const option = {
      title: {
        text: `${title} 30D Return`,
        left: 'center',
        textStyle: {
          color: isDark ? '#ffffff' : '#000000'
        }
      },
      tooltip: {
        formatter: (params: any) => {
          const data = params.data;
          const valueDisplay = hideValues ? '***' : `$${data.value.toLocaleString()}`;
          const quantityDisplay = hideValues ? '***' : data.quantity.toFixed(4);
          return `${data.name}<br/>Value: ${valueDisplay}<br/>Quantity: ${quantityDisplay}<br/>30D Return: ${data.return30d.toFixed(2)}%<br/>Account: ${data.account}`;
        }
      },
      series: [{
        name: '30 Day Return',
        type: 'treemap',
        data: data,
        label: {
          show: true,
          formatter: '{b}',
          color: isDark ? '#ffffff' : '#000000',
          fontSize: 12
        },
        itemStyle: {
          borderColor: isDark ? '#ffffff' : '#000000',
          borderWidth: 1
        },
        emphasis: {
          label: {
            fontSize: 14,
            fontWeight: 'bold'
          }
        }
      }]
    };

    chartInstance.current.setOption(option);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [title, items, calculatedValues, isDark, hideValues]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

const Staking: React.FC = () => {
  // Get the authenticated user
  const { user } = useAuth();

  const [stakingItems, setStakingItems] = useState<StakingItem[]>([]);

  // Add these calculations at the component level
  const calculatedValues = useMemo(() => {
    return stakingItems.map(item => {
      const totalQuantity = parseFloat(item.stakedQuantity || '0') + parseFloat(item.unclaimedQuantity || '0');
      const itemValue = totalQuantity * parseFloat(item.price || '0');
      return { totalQuantity, itemValue };
    });
  }, [stakingItems]);

  const totalValue = useMemo(() => {
    return calculatedValues.reduce((sum, { itemValue }) => sum + itemValue, 0);
  }, [calculatedValues]);

  // Filter staking items by account type
  const otherItems = stakingItems.filter(item => !item.account?.toLowerCase().startsWith('solo'));
  const soloItems = stakingItems.filter(item => item.account?.toLowerCase().startsWith('solo'));

  // Calculate values for Other items (everything except Solo)
  const otherCalculatedValues = useMemo(() => {
    return otherItems.map(item => {
      const totalQuantity = parseFloat(item.stakedQuantity || '0') + parseFloat(item.unclaimedQuantity || '0');
      const itemValue = totalQuantity * parseFloat(item.price || '0');
      return { totalQuantity, itemValue };
    });
  }, [otherItems]);

  const otherTotalValue = useMemo(() => {
    return otherCalculatedValues.reduce((sum, { itemValue }) => sum + itemValue, 0);
  }, [otherCalculatedValues]);

  // Sort Other items by percent of total value descending
  const sortedOtherItems = useMemo(() => {
    if (otherItems.length === 0) return [];
    return otherItems
      .map((item, idx) => {
        const { itemValue } = otherCalculatedValues[idx];
        const percentOfTotal = otherTotalValue > 0 ? (itemValue / otherTotalValue) * 100 : 0;
        return { item, idx, percentOfTotal };
      })
      .sort((a, b) => b.percentOfTotal - a.percentOfTotal)
      .map(({ item, idx }) => ({ item, idx }));
  }, [otherItems, otherCalculatedValues, otherTotalValue]);

  // Calculate values for Solo items
  const soloCalculatedValues = useMemo(() => {
    return soloItems.map(item => {
      const totalQuantity = parseFloat(item.stakedQuantity || '0') + parseFloat(item.unclaimedQuantity || '0');
      const itemValue = totalQuantity * parseFloat(item.price || '0');
      return { totalQuantity, itemValue };
    });
  }, [soloItems]);

  const soloTotalValue = useMemo(() => {
    return soloCalculatedValues.reduce((sum, { itemValue }) => sum + itemValue, 0);
  }, [soloCalculatedValues]);

  // Sort Solo items by percent of total value descending
  const sortedSoloItems = useMemo(() => {
    if (soloItems.length === 0) return [];
    return soloItems
      .map((item, idx) => {
        const { itemValue } = soloCalculatedValues[idx];
        const percentOfTotal = soloTotalValue > 0 ? (itemValue / soloTotalValue) * 100 : 0;
        return { item, idx, percentOfTotal };
      })
      .sort((a, b) => b.percentOfTotal - a.percentOfTotal)
      .map(({ item, idx }) => ({ item, idx }));
  }, [soloItems, soloCalculatedValues, soloTotalValue]);

  // Combined items for "All" tab
  const combinedItems = useMemo(() => {
    return [...otherItems, ...soloItems];
  }, [otherItems, soloItems]);

  // Calculate values for combined items
  const combinedCalculatedValues = useMemo(() => {
    return combinedItems.map(item => {
      const totalQuantity = parseFloat(item.stakedQuantity || '0') + parseFloat(item.unclaimedQuantity || '0');
      const itemValue = totalQuantity * parseFloat(item.price || '0');
      return { totalQuantity, itemValue };
    });
  }, [combinedItems]);

  const combinedTotalValue = useMemo(() => {
    return combinedCalculatedValues.reduce((sum, { itemValue }) => sum + itemValue, 0);
  }, [combinedCalculatedValues]);

  // Sort combined items by percent of total value descending
  const sortedCombinedItems = useMemo(() => {
    if (combinedItems.length === 0) return [];
    return combinedItems
      .map((item, idx) => {
        const { itemValue } = combinedCalculatedValues[idx];
        const percentOfTotal = combinedTotalValue > 0 ? (itemValue / combinedTotalValue) * 100 : 0;
        return { item, idx, percentOfTotal };
      })
      .sort((a, b) => b.percentOfTotal - a.percentOfTotal)
      .map(({ item, idx }) => ({ item, idx }));
  }, [combinedItems, combinedCalculatedValues, combinedTotalValue]);

  const [newItem, setNewItem] = useState<StakingItem>({
    account: '',
    ticker: '',
    stakedQuantity: '0',
    unclaimedQuantity: '0',
    price: '0',
    stakingUrl: ''
  });
  // const [totalValue, setTotalValue] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<StakingItem | null>(null);
  const [priceData, setPriceData] = useState<PriceData>({});
  const [returnData, setReturnData] = useState<ReturnData>({});
  const [priceUpdateDate, setPriceUpdateDate] = useState<string>('');
  const [priceUpdateError, setPriceUpdateError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pricesLoaded, setPricesLoaded] = useState(false);

  // ADD HIDE VALUES STATE HERE
  const [hideValues, setHideValues] = useState(false);

  // Add this state
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  // Theme detection for heatmaps
  const [isDark, setIsDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Helper function
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setPricesLoaded(false);
      try {
        // Wait for user to be available before fetching data
        let loadedItems: StakingItem[] = [];
        if (user) {
          try {
            loadedItems = await fetchStakingData(); // Changed from fetchBackupData
          } catch (dataError) {
            console.error("Failed to load staking data:", dataError);
            // Fix: Properly handle the unknown error type
            const errorMessage = dataError instanceof Error ? dataError.message : 'Unknown error occurred';
            setPriceUpdateError(`Failed to load staking data: ${errorMessage}`);
          }
        }

        // Always load prices - pass the loaded items to fetchPriceData
        if (loadedItems.length > 0) {
          await fetchPriceData(loadedItems);
        }
        setPricesLoaded(true);

      } catch (e) {
        console.error("Error in loadInitialData:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Intentionally excluding other dependencies to prevent infinite loops

  // ADD EFFECT TO SAVE HIDE VALUES PREFERENCE
  useEffect(() => {
    // No longer saving to localStorage
  }, [hideValues]);

  // Listen for theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const fetchPriceData = useCallback(async (itemsToUse?: StakingItem[]) => {
    // setIsUpdatingPrices(true);
    setPriceUpdateError(null);

    showStatus('Updating prices...', 'success');

    try {
      // Get unique tickers from staking items (use provided items or current state)
      const currentStakingItems = itemsToUse || stakingItems;
      const uniqueTickers = [...new Set(currentStakingItems.map(item => item.ticker?.toUpperCase()).filter(Boolean))];

      if (uniqueTickers.length === 0) {
        showStatus('No tickers to update prices for', 'error');
        setPricesLoaded(true); // Still mark as loaded even if no tickers
        return;
      }

      // console.log('Fetching prices for tickers:', uniqueTickers);

      // Build URL with multiple symbols using the endpoint
      // Handle both relative and absolute URLs
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const url = new URL(`${baseUrl}/latest_crypto_price`);
      uniqueTickers.forEach(ticker => {
        url.searchParams.append('symbols', ticker);
      });


      // Fetch prices for all tickers at once using the endpoint
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch crypto prices: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Process results into price data
      let prices: PriceData = {};
      let returns: ReturnData = {};
      let latestDate = '';

      // Group data by symbol and pick the USD entry (or first available)
      const symbolData: { [symbol: string]: any } = {};

      data.forEach((priceInfo: any) => {
        if (priceInfo && typeof priceInfo === 'object' && priceInfo.symbol) {
          const symbol = priceInfo.symbol.toLowerCase();

          // Prefer USD, then USDT, then USDC, then any other
          const priority = priceInfo.quoteCurrency?.toLowerCase() === 'usd' ? 4 :
                          priceInfo.quoteCurrency?.toLowerCase() === 'usdt' ? 3 :
                          priceInfo.quoteCurrency?.toLowerCase() === 'usdc' ? 2 : 1;

          if (!symbolData[symbol] || priority > (symbolData[symbol].priority || 0)) {
            symbolData[symbol] = { ...priceInfo, priority };
          }
        }
      });

      // Process the selected entries for each symbol
      Object.entries(symbolData).forEach(([symbol, priceInfo]: [string, any]) => {
        const price = priceInfo.close;
        const return30d = priceInfo.return30d;
        const date = priceInfo.date;

        if (price !== undefined && price !== null && !isNaN(price)) {
          prices[symbol] = parseFloat(price.toString());

          if (return30d !== undefined && return30d !== null && !isNaN(return30d)) {
            returns[symbol] = parseFloat(return30d.toString());
          }

          // Update latest date if this is more recent
          if (date && (!latestDate || new Date(date) > new Date(latestDate))) {
            latestDate = date;
          }

          console.log(`Updated price for ${symbol.toUpperCase()}: $${price}, 30d return: ${return30d}%`);
        } else {
          console.log(`No valid price found for ${symbol}:`, priceInfo);
        }
      });

      setPriceData(prices);
      setReturnData(returns);
      setPriceUpdateDate(latestDate || new Date().toISOString());

      // Update staking item prices
      updateStakingPrices(prices, returns, latestDate || new Date().toISOString(), currentStakingItems);

      const updatedCount = Object.keys(prices).length;
      showStatus(`Successfully updated prices for ${updatedCount} ticker${updatedCount !== 1 ? 's' : ''}`, 'success');

      console.log('Price update complete. Updated prices for:', Object.keys(prices));
      setPricesLoaded(true);

    } catch (error) {
      console.error('Error fetching price data:', error);
      const errorMessage = `Failed to load price data: ${error instanceof Error ? error.message : String(error)}`;
      setPriceUpdateError(errorMessage);
      showStatus(errorMessage, 'error');
    } finally {
      // setIsUpdatingPrices(false);
    }
  }, [API_BASE_URL, API_TOKEN, stakingItems, showStatus]);

  // Update staking items with latest prices
  const updateStakingPrices = (prices: PriceData, returns: ReturnData, date: string, currentItems: StakingItem[]) => {
    const updatedItems = currentItems.map(item => {
      const ticker = item.ticker.toLowerCase();
      if (prices[ticker] !== undefined) {
        return {
          ...item,
          price: prices[ticker].toString(),
          return30d: returns[ticker] !== undefined ? returns[ticker].toString() : item.return30d,
          priceLastUpdated: date
        };
      }
      return item;
    });

    setStakingItems(updatedItems);
  };  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: value
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editItem) return;

    const { name, value } = e.target;
    setEditItem({
      ...editItem,
      [name]: value
    });
  };

  const startEditing = (index: number) => {
    setEditIndex(index);
    setEditItem({...stakingItems[index]});
  };

  const cancelEditing = () => {
    setEditIndex(null);
    setEditItem(null);
  };

  const saveEdit = () => {
    if (editIndex === null || !editItem) return;

    const updatedItems = [...stakingItems];
    updatedItems[editIndex] = editItem;
    setStakingItems(updatedItems);
    setEditIndex(null);
    setEditItem(null);
  };

  // Replace the existing addStakingItem function
  const addStakingItem = async () => {
    if (!newItem.ticker) {
      alert('Please enter a ticker symbol');
      return;
    }

    // Check for duplicates
    const isDuplicate = stakingItems.some(item =>
      item.ticker.toLowerCase() === newItem.ticker.toLowerCase() &&
      item.account.toLowerCase() === newItem.account.toLowerCase()
    );

    if (isDuplicate) {
      const confirmMessage = `An item with ticker "${newItem.ticker}" and account "${newItem.account}" already exists. Add anyway?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    try {
      // Check if we have a price for this ticker
      const ticker = newItem.ticker.toLowerCase();
      const price = priceData[ticker] !== undefined ? priceData[ticker].toString() : newItem.price;
      const return30d = returnData[ticker] !== undefined ? returnData[ticker].toString() : undefined;

      const newStakingItem = {
        ...newItem,
        username: user?.name || 'Unknown User',
        price,
        return30d,
        priceLastUpdated: priceData[ticker] !== undefined ? priceUpdateDate : undefined
      };

      // Add to local state
      const updatedItems = [...stakingItems, newStakingItem];
      setStakingItems(updatedItems);

      // Reset form
      setNewItem({
        username: '',
        account: '',
        ticker: '',
        stakedQuantity: '0',
        unclaimedQuantity: '0',
        price: '0',
        stakingUrl: ''
      });

      // Hide form after successful add
      setShowForm(false);

    } catch (error) {
      console.error('Error adding item:', error);
      alert(`Failed to add item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Replace the existing removeStakingItem function
  const removeStakingItem = async (index: number) => {
    // Show confirmation dialog
    const itemToDelete = stakingItems[index];
    const confirmMessage = `Are you sure you want to delete ${itemToDelete.ticker} from ${itemToDelete.account}?`;

    if (!window.confirm(confirmMessage)) {
      return; // User cancelled
    }

    try {
      // Remove from local state first
      const updatedItems = stakingItems.filter((_, i) => i !== index);
      setStakingItems(updatedItems);

      // Also sync the updated list to API immediately
      if (user?.name) {
        await saveStakingToAPI(updatedItems);
        console.log('Successfully deleted item and synced with API');
      }

    } catch (error) {
      console.error('Error deleting item:', error);

      // Show error message but don't revert the deletion from UI
      // since the user might want to try syncing again later
      alert(`Item deleted locally, but failed to sync with server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // MODIFY renderEditableCell TO SUPPORT HIDING SENSITIVE VALUES
  const renderEditableCell = (field: keyof StakingItem, item: StakingItem, index: number, isNumeric: boolean = false, hideWhenPrivate: boolean = false) => {
    if (editIndex === index && editItem) {
      return (
        <Input
          type={isNumeric ? "number" : "text"}
          name={field}
          value={editItem[field]}
          onChange={handleEditChange}
          step={isNumeric ? "any" : undefined}
          className="h-8 text-xs"
        />
      );
    } else {
      return (
        <div
          onClick={() => startEditing(index)}
          className="cursor-pointer hover:bg-accent rounded px-1 py-1"
        >
          {isNumeric
            ? (field === 'price' ? '$' : '') +
              (hideWhenPrivate && hideValues
                ? '***'
                : formatNumber(parseFloat(item[field] || '0'), field === 'price' ? 2 : 4))
            : item[field]
          }
        </div>
      );
    }
  };

  const formatNumber = (value: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  // Replace the fetchStakingData function with this corrected version
  const fetchStakingData = useCallback(async () => {
    if (!user?.name) {
      console.log('No user logged in, skipping API fetch');
      return [];
    }

    try {
      const username = encodeURIComponent(user.name);
      const response = await fetch(`${API_BASE_URL}/staking?username=${username}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response:', data);

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

      // Migrate data structure if needed
      const migratedData = migrateDataStructure(apiData);

      setStakingItems(migratedData);

      return migratedData;
    } catch (error) {
      console.error('Error fetching staking data from API:', error);

      // No fallback - just throw the error
      throw error;
    }
  }, [user?.name, API_BASE_URL, API_TOKEN]);

  // Add this function to handle data migration
  const migrateDataStructure = (items: any[]): StakingItem[] => {
    return items.map(item => {
      // If the item doesn't have username, add it
      if (!item.username) {
        return {
          username: user?.name || 'Legacy User',
          ...item
        };
      }
      return item;
    });
  };

  // Replace the existing useEffect that saves data (around line 533)
  useEffect(() => {
    if (stakingItems.length > 0) {
      // Save to API immediately
      if (user?.name) {
        saveStakingToAPI(stakingItems).catch(error => {
          console.warn('Failed to sync with API:', error);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakingItems, user?.name]); // Exclude saveStakingToAPI to prevent infinite loops


  // Replace the existing saveStakingToAPI function
  const saveStakingToAPI = useCallback(async (data: StakingItem[], showSuccessMessage: boolean = false) => {
    if (!user?.name) {
      console.log('No user logged in, skipping API save');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/staking`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.name,
          data: data
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save to API: ${response.status} ${response.statusText}`);
      }

      console.log('Successfully saved to API');

      if (showSuccessMessage) {
        alert('Data successfully synced with server!');
      }

      return true;
    } catch (error) {
      console.error('Error saving to API:', error);
      throw error; // Re-throw so calling functions can handle it
    }
  }, [user?.name, API_BASE_URL, API_TOKEN]);

  // Add a refresh button function
  const refreshFromAPI = async () => {
    setIsLoading(true);
    try {
      await fetchStakingData();
      showStatus('Data refreshed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showStatus(`Failed to refresh: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // StakingTable component for reusable table rendering
  const StakingTable: React.FC<{
    title: string;
    items: Array<{ item: StakingItem; idx: number }>;
    calculatedValues: Array<{ totalQuantity: number; itemValue: number }>;
    totalValue: number;
    hideValues: boolean;
    editIndex: number | null;
    editItem: StakingItem | null;
    onStartEditing: (index: number) => void;
    onSaveEdit: () => void;
    onCancelEditing: () => void;
    onRemoveItem: (index: number) => void;
    onEditChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }> = ({
    title,
    items,
    calculatedValues,
    totalValue,
    hideValues,
    editIndex,
    editItem,
    onStartEditing,
    onSaveEdit,
    onCancelEditing,
    onRemoveItem,
    onEditChange
  }) => {
    if (items.length === 0) return null;

    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Staked</TableHead>
                <TableHead>Unclaimed</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>30d Return</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(({ item, idx }) => {
                const { totalQuantity, itemValue } = calculatedValues[idx];
                const percentOfTotal = totalValue > 0 ? (itemValue / totalValue) * 100 : 0;

                return (
                  <TableRow key={idx}>
                    <TableCell>
                      {editIndex === idx ? (
                        <div className="flex space-x-1">
                          <Button
                            onClick={onSaveEdit}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={onCancelEditing}
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => onRemoveItem(idx)}
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{renderEditableCell('ticker', item, idx)}</TableCell>
                    <TableCell>{renderEditableCell('stakedQuantity', item, idx, true, true)}</TableCell>
                    <TableCell>{renderEditableCell('unclaimedQuantity', item, idx, true, true)}</TableCell>
                    <TableCell>{hideValues ? '***' : formatNumber(totalQuantity, 4)}</TableCell>
                    <TableCell>{renderEditableCell('price', item, idx, true)}</TableCell>
                    <TableCell>
                      {item.return30d ? (
                        <Badge variant={parseFloat(item.return30d) >= 0 ? "default" : "destructive"} className={cn(
                          parseFloat(item.return30d) >= 0
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : ""
                        )}>
                          {parseFloat(item.return30d) >= 0 ? '+' : ''}{formatNumber(parseFloat(item.return30d), 2)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{hideValues ? '***' : `$${formatNumber(itemValue)}`}</TableCell>
                    <TableCell>{formatNumber(percentOfTotal, 1)}%</TableCell>
                    <TableCell>
                      {editIndex === idx && editItem ? (
                        <Input
                          type="text"
                          name="stakingUrl"
                          value={editItem.stakingUrl}
                          onChange={onEditChange}
                          placeholder="https://..."
                          className="h-8 text-xs"
                        />
                      ) : (
                        item.stakingUrl ? (
                          <a
                            href={item.stakingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Visit
                          </a>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onStartEditing(idx)}
                            className="h-6 text-xs text-muted-foreground hover:text-foreground"
                          >
                            Add
                          </Button>
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      {editIndex === idx && editItem ? (
                        <Input
                          type="text"
                          name="account"
                          value={editItem.account}
                          onChange={onEditChange}
                          className="h-8 text-xs"
                        />
                      ) : (
                        <div
                          onClick={() => onStartEditing(idx)}
                          className="cursor-pointer hover:bg-accent rounded px-1 py-1 text-xs"
                          title={item.account ? `Full account: ${item.account}` : 'No account specified'}
                        >
                          {item.account && item.account.length > 12
                            ? item.account.substring(0, 12) + '...'
                            : item.account || 'N/A'
                          }
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={6} className="font-medium">
                  <strong>Total {title} Value:</strong>
                </TableCell>
                <TableCell colSpan={5} className="font-medium">
                  <strong>{hideValues ? '***' : `$${formatNumber(totalValue)}`}</strong>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    );
  };

  // Add this button to your UI near the other action buttons
  // Move this function INSIDE the Staking component, before the return statement
  const updateAllItemsWithUsername = () => {
    const updatedItems = stakingItems.map(item => ({
      ...item,
      username: item.username || user?.name || 'Unknown User'
    }));

    setStakingItems(updatedItems);

    alert(`Updated ${updatedItems.length} items with username: ${user?.name}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Crypto Staking</h1>
          <div className="flex gap-2 flex-wrap">
            {/* Sync button */}
            <Button
              onClick={refreshFromAPI}
              disabled={!user || isLoading}
              variant="outline"
              size="sm"
              title="Get latest data from server"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Data
            </Button>

            {/* Refresh Prices button */}
            <Button
              onClick={() => fetchPriceData()}
              disabled={stakingItems.length === 0}
              variant="outline"
              size="sm"
              title="Update prices for all staking items"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Prices
            </Button>

            {/* Update username button (conditional) */}
            {user && stakingItems.some(item => !item.username) && (
              <Button
                onClick={updateAllItemsWithUsername}
                variant="outline"
                size="sm"
                title="Add username to existing items"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Items
              </Button>
            )}

            {/* Hide values toggle */}
            <Button
              onClick={() => setHideValues(!hideValues)}
              variant="ghost"
              size="sm"
              title={hideValues ? "Show values" : "Hide values"}
            >
              {hideValues ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Values
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Values
                </>
              )}
            </Button>

            {/* Add form toggle */}
            <Button
              onClick={() => setShowForm(!showForm)}
              variant="ghost"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {showForm ? 'Hide Form' : 'Add Item'}
            </Button>
          </div>
        </div>

      {priceUpdateError && (
        <Card className="mb-6 border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{priceUpdateError}</p>
          </CardContent>
        </Card>
      )}

      {priceUpdateDate && (
        <p className="text-sm text-muted-foreground mb-6">
          Price data last updated: {priceUpdateDate}
        </p>
      )}

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Asset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  name="username"
                  value={user?.name || 'Not logged in'}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticker">Ticker</Label>
                <Input
                  id="ticker"
                  type="text"
                  name="ticker"
                  value={newItem.ticker}
                  onChange={handleInputChange}
                  placeholder="BTC"
                />
                {newItem.ticker && priceData[newItem.ticker.toLowerCase()] && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Price: ${formatNumber(priceData[newItem.ticker.toLowerCase()])}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="account">Account</Label>
                <Input
                  id="account"
                  type="text"
                  name="account"
                  value={newItem.account}
                  onChange={handleInputChange}
                  placeholder="Kraken"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stakedQuantity">Staked Quantity</Label>
                <Input
                  id="stakedQuantity"
                  type="number"
                  name="stakedQuantity"
                  value={newItem.stakedQuantity}
                  onChange={handleInputChange}
                  step="any"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unclaimedQuantity">Unclaimed Quantity</Label>
                <Input
                  id="unclaimedQuantity"
                  type="number"
                  name="unclaimedQuantity"
                  value={newItem.unclaimedQuantity}
                  onChange={handleInputChange}
                  step="any"
                />
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="stakingUrl">Staking URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="stakingUrl"
                    type="text"
                    name="stakingUrl"
                    value={newItem.stakingUrl}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button type="button" onClick={addStakingItem}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center my-8">
          <div className="inline-flex items-center space-x-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-muted-foreground">
              {user ? `Loading staking data for ${user.name}...` : 'Loading staking data...'}
            </span>
          </div>
        </div>
      ) : stakingItems.length === 0 ? (
        <Card className="border-yellow-500/20 bg-yellow-500/10">
          <CardContent className="pt-6">
            <p className="text-sm">
              {user
                ? `No staking assets found for ${user.name}. ${Object.keys(priceData).length} prices loaded.`
                : 'Please log in to view staking data.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="combined" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="combined">Combined</TabsTrigger>
            <TabsTrigger value="personal">Personal Accounts</TabsTrigger>
            <TabsTrigger value="solo">Solo Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="combined">
            <StakingTable
              title="All Holdings"
              items={sortedCombinedItems}
              calculatedValues={combinedCalculatedValues}
              totalValue={combinedTotalValue}
              hideValues={hideValues}
              editIndex={editIndex}
              editItem={editItem}
              onStartEditing={startEditing}
              onSaveEdit={saveEdit}
              onCancelEditing={cancelEditing}
              onRemoveItem={(idx) => {
                // Find the original index in the full stakingItems array
                const originalIndex = stakingItems.findIndex(item =>
                  item.account === combinedItems[idx].account &&
                  item.ticker === combinedItems[idx].ticker
                );
                if (originalIndex !== -1) {
                  removeStakingItem(originalIndex);
                }
              }}
              onEditChange={handleEditChange}
            />

            {combinedItems.length === 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/10">
                <CardContent className="pt-6">
                  <p className="text-sm">No staking assets found.</p>
                </CardContent>
              </Card>
            )}

            {/* Combined Treemap */}
            {pricesLoaded && combinedItems.length > 0 && (
              <div className="mb-8">
                <StakingTreemap
                  title="30D Return"
                  items={combinedItems}
                  calculatedValues={combinedCalculatedValues}
                  isDark={isDark}
                  hideValues={hideValues}
                />
              </div>
            )}

            {!pricesLoaded && combinedItems.length > 0 && (
              <div className="mb-8 text-center">
                <div className="inline-flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">
                    Loading price data for charts...
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="personal">
            <StakingTable
              title="Personal Accounts"
              items={sortedOtherItems}
              calculatedValues={otherCalculatedValues}
              totalValue={otherTotalValue}
              hideValues={hideValues}
              editIndex={editIndex}
              editItem={editItem}
              onStartEditing={startEditing}
              onSaveEdit={saveEdit}
              onCancelEditing={cancelEditing}
              onRemoveItem={(idx) => {
                // Find the original index in the full stakingItems array
                const originalIndex = stakingItems.findIndex(item =>
                  item.account === otherItems[idx].account &&
                  item.ticker === otherItems[idx].ticker
                );
                if (originalIndex !== -1) {
                  removeStakingItem(originalIndex);
                }
              }}
              onEditChange={handleEditChange}
            />

            {otherItems.length === 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/10">
                <CardContent className="pt-6">
                  <p className="text-sm">No personal staking assets found.</p>
                </CardContent>
              </Card>
            )}

            {/* Personal Accounts Treemap */}
            {pricesLoaded && otherItems.length > 0 && (
              <div className="mb-8">
                <StakingTreemap
                  title="30D Return"
                  items={otherItems}
                  calculatedValues={otherCalculatedValues}
                  isDark={isDark}
                  hideValues={hideValues}
                />
              </div>
            )}

            {!pricesLoaded && otherItems.length > 0 && (
              <div className="mb-8 text-center">
                <div className="inline-flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">
                    Loading price data for charts...
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="solo">
            <StakingTable
              title="Solo Accounts"
              items={sortedSoloItems}
              calculatedValues={soloCalculatedValues}
              totalValue={soloTotalValue}
              hideValues={hideValues}
              editIndex={editIndex}
              editItem={editItem}
              onStartEditing={startEditing}
              onSaveEdit={saveEdit}
              onCancelEditing={cancelEditing}
              onRemoveItem={(idx) => {
                // Find the original index in the full stakingItems array
                const originalIndex = stakingItems.findIndex(item =>
                  item.account === soloItems[idx].account &&
                  item.ticker === soloItems[idx].ticker
                );
                if (originalIndex !== -1) {
                  removeStakingItem(originalIndex);
                }
              }}
              onEditChange={handleEditChange}
            />

            {soloItems.length === 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/10">
                <CardContent className="pt-6">
                  <p className="text-sm">No solo staking assets found.</p>
                </CardContent>
              </Card>
            )}

            {/* Solo Accounts Treemap */}
            {pricesLoaded && soloItems.length > 0 && (
              <div className="mb-8">
                <StakingTreemap
                  title="30D Return"
                  items={soloItems}
                  calculatedValues={soloCalculatedValues}
                  isDark={isDark}
                  hideValues={hideValues}
                />
              </div>
            )}

            {!pricesLoaded && soloItems.length > 0 && (
              <div className="mb-8 text-center">
                <div className="inline-flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">
                    Loading price data for charts...
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {statusMessage && (
        <Card className={cn(
          "mt-6",
          statusMessage.type === 'success'
            ? 'border-green-500/20 bg-green-500/10'
            : 'border-destructive/20 bg-destructive/10'
        )}>
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

export default Staking;
