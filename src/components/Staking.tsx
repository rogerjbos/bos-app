import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaTrash, FaExternalLinkAlt, FaSave, FaTimes, FaPlusSquare } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useWalletAuthContext } from '../providers/WalletAuthProvider';


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
}

// Interface for price data from CSV
interface PriceData {
  [symbol: string]: number;
}

// Define constants at the top of your component
const APP_VERSION = '1.0.0';

// API configuration (similar to Ranks.tsx)
// In dev use relative path so Vite proxy can forward requests and avoid CORS/preflight issues.
const API_BASE_URL = import.meta.env.DEV 
  ? '/api'
  : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000/api');
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

const Staking: React.FC = () => {
  // Get the authenticated user
  const { user } = useAuth();
  const walletAuth = useWalletAuthContext();
  
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
  const [isLoading, setIsLoading] = useState(true);
  
  // ADD HIDE VALUES STATE HERE
  const [hideValues, setHideValues] = useState(() => {
    const saved = storage.load('hideStakingValues');
    return saved === true;
  });

  // Add this state
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

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
      const accessToken = walletAuth?.getAccessToken ? walletAuth.getAccessToken() : null;
      const tokenForRequest = accessToken || API_TOKEN || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (tokenForRequest) {
        headers['Authorization'] = `Bearer ${tokenForRequest}`;
      }

      // The backend exposes separate endpoints for latest crypto/stock prices.
      // Call both and merge results into a single price map.
      const cryptoRes = await fetch(`${API_BASE_URL}/latest_crypto_price`, { method: 'GET', headers });
      const stockRes = await fetch(`${API_BASE_URL}/latest_stock_price`, { method: 'GET', headers });

      if (!cryptoRes.ok && !stockRes.ok) {
        // If both fail, prefer crypto error message
        const err = cryptoRes.ok ? await stockRes.text() : await cryptoRes.text();
        throw new Error(`Failed to fetch price data: ${err}`);
      }

      const cryptoData = cryptoRes.ok ? await cryptoRes.json() : [];
      const stockData = stockRes.ok ? await stockRes.json() : [];

      const prices: PriceData = {};
      let latestDate = '';

      // cryptoData is expected to be an array of objects with symbol/baseCurrency and close
      for (const item of cryptoData || []) {
        const sym = (item.baseCurrency || item.symbol || item.ticker || '').toString().toLowerCase();
        const close = Number(item.close ?? item.latestPrice ?? 0);
        if (sym) prices[sym] = close;
        if (!latestDate && item.date) latestDate = item.date;
      }

      // stockData is expected to be an array of objects with symbol and close
      for (const item of stockData || []) {
        const sym = (item.symbol || '').toString().toLowerCase();
        const close = Number(item.close ?? item.latestPrice ?? 0);
        if (sym) prices[sym] = close;
        if (!latestDate && item.date) latestDate = item.date;
      }

      setPriceData(prices);
      setPriceUpdateDate(latestDate);

      // Update staking item prices
      updateStakingPrices(prices, latestDate);

    } catch (error) {
      console.error('Error fetching price data:', error);
      setPriceUpdateError(`Failed to load price data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // setIsUpdatingPrices(false);
    }
  }, [API_BASE_URL, API_TOKEN]);
  
  // Update staking items with latest prices
  const updateStakingPrices = (prices: PriceData, date: string) => {
    const updatedItems = stakingItems.map(item => {
      const ticker = item.ticker.toLowerCase();
      if (prices[ticker] !== undefined) {
        return {
          ...item,
          price: prices[ticker].toString(),
          priceLastUpdated: date
        };
      }
      return item;
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
        username: user?.name || user?.address || 'Unknown User',
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
    if (!user?.name) {
      console.log('No user logged in, skipping API fetch');
      return [];
    }

    try {
      const username = encodeURIComponent(user.name);
      const accessToken = walletAuth?.getAccessToken ? walletAuth.getAccessToken() : null;
      const tokenForRequest = accessToken || API_TOKEN || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (tokenForRequest) {
        headers['Authorization'] = `Bearer ${tokenForRequest}`;
      }

      const response = await fetch(`${API_BASE_URL}/staking?username=${username}`, {
        method: 'GET',
        headers,
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
      storage.save('stakingData', migratedData);
      
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
          username: user?.name || user?.address || 'Legacy User',
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
        if (user?.name) {
          saveStakingToAPI(stakingItems).catch(error => {
            console.warn('Failed to sync with API:', error);
          });
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stakingItems, user?.name]); // Exclude storage and saveStakingToAPI to prevent infinite loops


  // Replace the existing saveStakingToAPI function
  const saveStakingToAPI = useCallback(async (data: StakingItem[], showSuccessMessage: boolean = false) => {
    if (!user?.name) {
      console.log('No user logged in, skipping API save');
      return false;
    }

    try {
      const accessToken = walletAuth?.getAccessToken ? walletAuth.getAccessToken() : null;
      const tokenForRequest = accessToken || API_TOKEN || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (tokenForRequest) {
        headers['Authorization'] = `Bearer ${tokenForRequest}`;
      }

      const response = await fetch(`${API_BASE_URL}/staking`, {
        method: 'POST',
        headers,
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

  // Move this function INSIDE the Staking component, before the return statement
  const updateAllItemsWithUsername = () => {
    const updatedItems = stakingItems.map(item => ({
      ...item,
      username: item.username || user?.name || user?.address || 'Unknown User'
    }));
    
    setStakingItems(updatedItems);
    storage.save('stakingData', updatedItems);
    
    alert(`Updated ${updatedItems.length} items with username: ${user?.name}`);
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
                  value={user?.name || user?.address || 'Not logged in'}
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
              {user ? `Loading staking data for ${user.name}...` : 'Loading staking data...'}
            </span>
          </div>
        </div>
      ) : stakingItems.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded">
          {user 
            ? `No staking assets found for ${user.name}. ${Object.keys(priceData).length} prices loaded.`
            : 'Please log in to view staking data.'
          }
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300"></th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticker</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Staked</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unclaimed</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">%</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Site</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedStakingItems.map(({ item, idx }) => {
                  const { totalQuantity, itemValue } = calculatedValues[idx];
                  const percentOfTotal = totalValue > 0 ? (itemValue / totalValue) * 100 : 0;

                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 py-2 whitespace-nowrap text-xs">
                        {editIndex === idx ? (
                          <div className="flex space-x-1">
                            <button
                              onClick={saveEdit}
                              className="inline-flex items-center px-1 py-1 border border-transparent text-xs rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                            >
                              {FaSave({ style: { fontSize: '10px' } })}
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="inline-flex items-center px-1 py-1 border border-transparent text-xs rounded text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-500"
                            >
                              {FaTimes({ style: { fontSize: '10px' } })}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => removeStakingItem(idx)}
                            className="inline-flex items-center px-1 py-1 border border-transparent text-xs rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            {FaTrash({ style: { fontSize: '10px' } })}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">{renderEditableCell('ticker', item, idx)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{renderEditableCell('stakedQuantity', item, idx, true, true)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{renderEditableCell('unclaimedQuantity', item, idx, true, true)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{hideValues ? '***' : formatNumber(totalQuantity, 4)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                        {renderEditableCell('price', item, idx, true)}
                        {/* {item.priceLastUpdated && (
                          <div className="text-gray-500 dark:text-gray-400 text-xs">{item.priceLastUpdated}</div>
                        )} */}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">{hideValues ? '***' : `$${formatNumber(itemValue)}`}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{formatNumber(percentOfTotal, 1)}%</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                        {editIndex === idx && editItem ? (
                          <input
                            type="text"
                            name="stakingUrl"
                            value={editItem.stakingUrl}
                            onChange={handleEditChange}
                            placeholder="https://..."
                            className="w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          item.stakingUrl ? (
                            <a href={item.stakingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs">
                              {FaExternalLinkAlt({ style: { fontSize: '10px' } })} Visit
                            </a>
                          ) : (
                            <div 
                              onClick={() => startEditing(idx)}
                              className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 editable-cell text-xs"
                            >
                              Add
                            </div>
                          )
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                        {editIndex === idx && editItem ? (
                          <input
                            type="text"
                            name="account"
                            value={editItem.account}
                            onChange={handleEditChange}
                            className="w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <div 
                            onClick={() => startEditing(idx)}
                            className="cursor-pointer editable-cell hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-1 py-1"
                            title={item.account ? `Full account: ${item.account}` : 'No account specified'}
                          >
                            {item.account && item.account.length > 12 
                              ? item.account.substring(0, 12) + '...'
                              : item.account || 'N/A'
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">{item.username || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <td colSpan={6} className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white">
                    <strong>Total Staking Value:</strong>
                  </td>
                  <td colSpan={5} className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white">
                    <strong>{hideValues ? '***' : `$${formatNumber(totalValue)}`}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
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