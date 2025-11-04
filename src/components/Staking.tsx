import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaTrash, FaExternalLinkAlt, FaSave, FaTimes, FaPlusSquare } from 'react-icons/fa';
import { useWalletAuthContext } from '../providers/WalletAuthProvider';
import * as echarts from 'echarts';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { ExternalLink, Eye, EyeOff, Plus, RefreshCw, Save as SaveIcon, Trash2, X } from 'lucide-react';


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
  }, [items, calculatedValues, isDark, hideValues, title]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
      </CardContent>
    </Card>
  );
};

// StakingTable component
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
  renderEditableCell: (field: keyof StakingItem, item: StakingItem, index: number, isNumeric?: boolean, hideWhenPrivate?: boolean) => React.ReactNode;
  formatNumber: (value: number, decimals?: number) => string;
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
  onEditChange,
  renderEditableCell,
  formatNumber
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
                          <SaveIcon className="h-3 w-3" />
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

// Define constants at the top of your component
const APP_VERSION = '1.0.0';

// API configuration - use proxy in both dev and production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const Staking: React.FC = () => {
  // Get the authenticated user and wallet auth
  const { user, getAccessToken } = useWalletAuthContext();
  
  // Define the storage helper BEFORE any useState that uses it
  const storage = {
    save: (key: string, data: any) => {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      } catch (e) {
        console.error(`Failed to save ${key} to storage:`, e);
        return false;
      }
    },
    load: (key: string) => {
      try {
        const data = localStorage.getItem(key);
        if (!data) return null;
        return JSON.parse(data);
      } catch (e) {
        console.error(`Failed to load ${key} from storage:`, e);
        return null;
      }
    },
    clear: (key: string) => {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        return false;
      }
    }
  };
    
  // Now you can safely use storage in useState initializers
  const [stakingItems, setStakingItems] = useState<StakingItem[]>(() => {
    // Try to load from localStorage immediately during state initialization
    const savedVersion = storage.load('appVersion');
    if (savedVersion !== APP_VERSION) {
      storage.clear('stakingData');
      storage.save('appVersion', APP_VERSION);
      return []; // Return empty array to initialize state
    }

    const saved = storage.load('stakingData');
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    
    return []; // Default to empty array
  });
  
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

  // Sort stakingItems by percent of total value descending
  const sortedStakingItems = useMemo(() => {
    if (stakingItems.length === 0) return [];
    return stakingItems
      .map((item, idx) => {
        const { itemValue } = calculatedValues[idx];
        const percentOfTotal = totalValue > 0 ? (itemValue / totalValue) * 100 : 0;
        return { item, idx, percentOfTotal };
      })
      .sort((a, b) => b.percentOfTotal - a.percentOfTotal)
      .map(({ item, idx }) => ({ item, idx }));
  }, [stakingItems, calculatedValues, totalValue]);

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
  const [priceUpdateDate, setPriceUpdateDate] = useState<string>('');
  const [priceUpdateError, setPriceUpdateError] = useState<string | null>(null);
  const [returnData, setReturnData] = useState<ReturnData>({});
  const [pricesLoaded, setPricesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // ADD HIDE VALUES STATE HERE
  const [hideValues, setHideValues] = useState(() => {
    const saved = storage.load('hideStakingValues');
    return saved === true;
  });

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
      try {
        // Wait for user to be available before fetching data
        if (user) {
          // Only try loading from API if we have no items OR if user changed
          if (stakingItems.length === 0) {
            try {
              await fetchStakingData(); // Changed from fetchBackupData
            } catch (dataError) {
              console.error("Failed to load staking data:", dataError);
              // Fix: Properly handle the unknown error type
              const errorMessage = dataError instanceof Error ? dataError.message : 'Unknown error occurred';
              setPriceUpdateError(`Failed to load staking data: ${errorMessage}`);
            }
          }
        }
        
        // Always load prices
        await fetchPriceData();
        
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
    storage.save('hideStakingValues', hideValues);
  }, [hideValues]);

  const fetchPriceData = useCallback(async () => {
    // setIsUpdatingPrices(true);
    setPriceUpdateError(null);

    try {
      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      // Fetch current prices
      const pricesResponse = await fetch(`${API_BASE_URL}/prices`, {
        method: 'GET',
        headers,
      });

      if (!pricesResponse.ok) {
        throw new Error(`Failed to fetch price data: ${pricesResponse.status} ${pricesResponse.statusText}`);
      }

      const pricesData = await pricesResponse.json();

      // Collect unique symbols from staking items
      const uniqueSymbols = [...new Set(stakingItems.map(item => item.ticker.toLowerCase()))];

      // Fetch historical prices for specific symbols only
      const baseUrl = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : `${window.location.protocol}//${window.location.host}${API_BASE_URL}`;

      const historicalUrl = new URL(`${baseUrl}/crypto_xdays`);
      uniqueSymbols.forEach(symbol => {
        historicalUrl.searchParams.append('baseCurrencies', symbol);
      });

      const historicalResponse = await fetch(historicalUrl.toString(), {
        method: 'GET',
        headers,
      });

      if (!historicalResponse.ok) {
        throw new Error(`Failed to fetch historical data: ${historicalResponse.status} ${historicalResponse.statusText}`);
      }

      const historicalData = await historicalResponse.json();

      // Handle the response based on your API structure
      let prices: PriceData = {};
      let returns: ReturnData = {};
      let date = '';

      if (pricesData.prices && typeof pricesData.prices === 'object') {
        prices = pricesData.prices;
      }

      if (pricesData.last_updated) {
        date = pricesData.last_updated;
      } else if (pricesData.date) {
        date = pricesData.date;
      }

      // Calculate returns from historical data
      if (Array.isArray(historicalData)) {
        historicalData.forEach((item: any) => {
          const symbol = item.baseCurrency?.toLowerCase();
          if (symbol && prices[symbol] !== undefined && item.close_30d !== undefined) {
            const currentPrice = prices[symbol];
            const historicalPrice = item.close_30d;
            const returnPct = ((currentPrice - historicalPrice) / historicalPrice) * 100;
            returns[symbol] = returnPct;
          }
        });
      }

      setPriceData(prices);
      setReturnData(returns);
      setPriceUpdateDate(date);
      setPricesLoaded(true);

      // Update staking item prices
      updateStakingPrices(prices, returns, date);

    } catch (error) {
      console.error('Error fetching price data:', error);
      setPriceUpdateError(`Failed to load price data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // setIsUpdatingPrices(false);
    }
  }, [API_BASE_URL, getAccessToken, stakingItems]);
  
  // Update staking items with latest prices
  const updateStakingPrices = (prices: PriceData, returns: ReturnData, date: string) => {
    const updatedItems = stakingItems.map(item => {
      const ticker = item.ticker.toLowerCase();
      const updatedItem: StakingItem = {
        ...item,
        priceLastUpdated: date
      };

      if (prices[ticker] !== undefined) {
        updatedItem.price = prices[ticker].toString();
      }

      if (returns[ticker] !== undefined) {
        updatedItem.return30d = returns[ticker].toString();
      }

      return updatedItem;
    });
    
    setStakingItems(updatedItems);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      const newStakingItem = {
        ...newItem,
        username: user?.address || 'Unknown User',
        price,
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
      if (user?.address) {
        await saveStakingToAPI(updatedItems);
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
        <input
          type={isNumeric ? "number" : "text"} 
          name={field}
          value={editItem[field]}
          onChange={handleEditChange}
          step={isNumeric ? "any" : undefined}
          className="w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      );
    } else {
      return (
        <div 
          onClick={() => startEditing(index)}
          className="cursor-pointer editable-cell hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-1 py-1"
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
    if (!user?.address) {
      return [];
    }

    try {
      const username = encodeURIComponent(user.address);
      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/staking?username=${username}`, {
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

      // Migrate data structure if needed
      const migratedData = migrateDataStructure(apiData);
      
      setStakingItems(migratedData);
      storage.save('stakingData', migratedData);
      
      return migratedData;
    } catch (error) {
      console.error('Error fetching staking data from API:', error);
      
      // No fallback - just throw the error
      throw error;
    }
  }, [user?.address, API_BASE_URL, getAccessToken]);

  // Add this function to handle data migration
  const migrateDataStructure = (items: any[]): StakingItem[] => {
    return items.map(item => {
      // If the item doesn't have username, add it
      if (!item.username) {
        return {
          username: user?.address || 'Legacy User',
          ...item
        };
      }
      return item;
    });
  };

  // Replace the existing useEffect that saves data (around line 533)
  useEffect(() => {
    if (stakingItems.length > 0) {
      // Save to localStorage immediately
      const timer = setTimeout(() => {
        storage.save('stakingData', stakingItems);
        
        // Also try to save to API (don't block on this)
        if (user?.address) {
          saveStakingToAPI(stakingItems).catch(error => {
            console.warn('Failed to sync with API:', error);
          });
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakingItems, user?.address]); // Exclude storage and saveStakingToAPI to prevent infinite loops


  // Replace the existing saveStakingToAPI function
  const saveStakingToAPI = useCallback(async (data: StakingItem[], showSuccessMessage: boolean = false) => {
    if (!user?.address) {
      return false;
    }

    try {
      const accessToken = getAccessToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${API_BASE_URL}/staking`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          username: user.address,
          data: data
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save to API: ${response.status} ${response.statusText}`);
      }
      
      if (showSuccessMessage) {
        alert('Data successfully synced with server!');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving to API:', error);
      throw error; // Re-throw so calling functions can handle it
    }
  }, [user?.address, API_BASE_URL, getAccessToken]);

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

  // Move this function INSIDE the Staking component, before the return statement
  const updateAllItemsWithUsername = () => {
    const updatedItems = stakingItems.map(item => ({
      ...item,
      username: item.username || user?.address || 'Unknown User'
    }));
    
    setStakingItems(updatedItems);
    storage.save('stakingData', updatedItems);
    
    alert(`Updated ${updatedItems.length} items with username: ${user?.address}`);
  };

  // Add this button to your UI near the other action buttons
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staking Value</h1>
        <div className="flex gap-2 flex-wrap">
          {/* Sync button */}
          <button 
            onClick={refreshFromAPI}
            disabled={!user || isLoading}
            title="Get latest data from server"
            className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
          >
            🔄 Sync Data
          </button>

          {/* Update username button (conditional) */}
          {user && stakingItems.some(item => !item.username) && (
            <button 
              onClick={updateAllItemsWithUsername}
              title="Add username to existing items"
              className="inline-flex items-center px-3 py-2 border border-yellow-300 dark:border-yellow-600 text-sm font-medium rounded-md text-yellow-700 dark:text-yellow-400 bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition duration-150 ease-in-out"
            >
              🔄 Update Items with Username
            </button>
          )}
          
          {/* Hide values toggle */}
          <button 
            onClick={() => setHideValues(!hideValues)}
            title={hideValues ? "Show values" : "Hide values"}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out"
          >
            {hideValues ? "👁️ Show Values" : "🙈 Hide Values"}
          </button>

          {/* Add form toggle */}
          <button 
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none transition duration-150 ease-in-out"
          >
            {FaPlusSquare({ 
              style: { 
                marginRight: showForm ? '8px' : 0,
                fontSize: '0.875rem'
              } 
            })}
            {showForm ? 'Hide Form' : ''}
          </button>
        </div>
      </div>

      {priceUpdateError && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {priceUpdateError}
        </div>
      )}
      
      {priceUpdateDate && (
        <div className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Price data last updated: {priceUpdateDate}
        </div>
      )}

      {showForm && (
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Asset</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={user?.address || 'Not logged in'}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ticker
                </label>
                <input
                  id="ticker"
                  type="text"
                  name="ticker"
                  value={newItem.ticker}
                  onChange={handleInputChange}
                  placeholder="BTC"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {newItem.ticker && priceData[newItem.ticker.toLowerCase()] && (
                  <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                    Price: ${formatNumber(priceData[newItem.ticker.toLowerCase()])}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="account" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account
                </label>
                <input
                  id="account"
                  type="text"
                  name="account"
                  value={newItem.account}
                  onChange={handleInputChange}
                  placeholder="Kraken"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="stakedQuantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Staked Quantity
                </label>
                <input
                  id="stakedQuantity"
                  type="number"
                  name="stakedQuantity"
                  value={newItem.stakedQuantity}
                  onChange={handleInputChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="unclaimedQuantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Unclaimed Quantity
                </label>
                <input
                  id="unclaimedQuantity"
                  type="number"
                  name="unclaimedQuantity"
                  value={newItem.unclaimedQuantity}
                  onChange={handleInputChange}
                  step="any"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-3">
                <label htmlFor="stakingUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Staking URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="stakingUrl"
                    type="text"
                    name="stakingUrl"
                    value={newItem.stakingUrl}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addStakingItem}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
          <div className="text-center my-8">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 dark:text-gray-400">
              {user ? `Loading staking data for ${user.address}...` : 'Loading staking data...'}
            </span>
          </div>
        </div>
      ) : stakingItems.length === 0 ? (
        <Card className="border-yellow-500/20 bg-yellow-500/10">
          <CardContent className="pt-6">
            <p className="text-sm">
              {user
                ? `No staking assets found for ${user.address}. ${Object.keys(priceData).length} prices loaded.`
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
              renderEditableCell={renderEditableCell}
              formatNumber={formatNumber}
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
              renderEditableCell={renderEditableCell}
              formatNumber={formatNumber}
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
              renderEditableCell={renderEditableCell}
              formatNumber={formatNumber}
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
        <div className={`mt-6 px-4 py-3 rounded relative ${
          statusMessage.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' 
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
        }`}>
          <span className="block sm:inline">{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <span className="sr-only">Dismiss</span>
            ×
          </button>
        </div>
      )}
      
      </div>
    </div>
  );
};

export default Staking;