import React, { useCallback, useEffect, useState } from 'react';
import { FaPlusSquare, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { KrakenBotSymbol, KrakenBotSymbolsConfig } from '../types/trading';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

const TradingConfig: React.FC = () => {
  // Get the authenticated user
  const { user } = useAuth();

  const [tradingSymbols, setTradingSymbols] = useState<KrakenBotSymbolsConfig>([]);

  const [newItem, setNewItem] = useState<KrakenBotSymbol>({
    symbol: '',
    entry_amount: 0,
    entry_threshold: 0,
    exit_amount: 0,
    exit_threshold: 0
  });

  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<KrakenBotSymbol | null>(null);
  const [statusMessage, setStatusMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function
  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        if (user) {
          await fetchTradingConfig();
        }
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
  }, [user]);

  const fetchTradingConfig = useCallback(async () => {
    if (!user?.name) {
      console.log('No user logged in, skipping API fetch');
      return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/kraken-bot-symbols`, {
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

      setTradingSymbols(apiData);
      return apiData;
    } catch (error) {
      console.error('Error fetching trading config from API:', error);
      throw error;
    }
  }, [user?.name, API_BASE_URL, API_TOKEN]);

  const saveTradingConfigToAPI = useCallback(async (data: KrakenBotSymbolsConfig) => {
    if (!user?.name) {
      console.log('No user logged in, skipping API save');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/kraken-bot-symbols`, {
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
      return true;
    } catch (error) {
      console.error('Error saving to API:', error);
      throw error;
    }
  }, [user?.name, API_BASE_URL, API_TOKEN]);

  // Auto-save when tradingSymbols changes
  useEffect(() => {
    if (tradingSymbols.length > 0) {
      saveTradingConfigToAPI(tradingSymbols).catch(error => {
        console.warn('Failed to sync with API:', error);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradingSymbols]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem({
      ...newItem,
      [name]: name === 'symbol' ? value : parseFloat(value) || 0
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

  const startEditing = (index: number) => {
    setEditIndex(index);
    setEditItem({...tradingSymbols[index]});
  };

  const cancelEditing = () => {
    setEditIndex(null);
    setEditItem(null);
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
        exit_threshold: 0
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
          {isNumeric ? (item[field] as number).toFixed(1) : item[field]}
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
      await fetchTradingConfig();
      showStatus('Configuration refreshed successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showStatus(`Failed to refresh: ${errorMessage}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trading Configuration</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={refreshFromAPI}
              disabled={!user || isLoading}
              title="Get latest configuration from server"
              className="inline-flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
            >
              🔄 Sync Config
            </button>

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

        {showForm && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Trading Symbol</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Symbol
                  </label>
                  <input
                    id="symbol"
                    type="text"
                    name="symbol"
                    value={newItem.symbol}
                    onChange={handleInputChange}
                    placeholder="BTC/USD"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="entry_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Entry Amount
                  </label>
                  <input
                    id="entry_amount"
                    type="number"
                    name="entry_amount"
                    value={newItem.entry_amount}
                    onChange={handleInputChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="entry_threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Entry Threshold
                  </label>
                  <input
                    id="entry_threshold"
                    type="number"
                    name="entry_threshold"
                    value={newItem.entry_threshold}
                    onChange={handleInputChange}
                    step="0.1"
                    min="-100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="exit_amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Exit Amount
                  </label>
                  <input
                    id="exit_amount"
                    type="number"
                    name="exit_amount"
                    value={newItem.exit_amount}
                    onChange={handleInputChange}
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="exit_threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Exit Threshold
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="exit_threshold"
                      type="number"
                      name="exit_threshold"
                      value={newItem.exit_threshold}
                      onChange={handleInputChange}
                      step="0.1"
                      min="-100"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addTradingSymbol}
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
                {user ? `Loading trading configuration...` : 'Loading configuration...'}
              </span>
            </div>
          </div>
        ) : tradingSymbols.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded">
            {user
              ? 'No trading symbols configured.'
              : 'Please log in to view trading configuration.'
            }
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300"></th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Symbol</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Entry Amount</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Entry Threshold</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Exit Amount</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Exit Threshold</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {tradingSymbols.map((item, idx) => (
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
                            onClick={() => removeTradingSymbol(idx)}
                            className="inline-flex items-center px-1 py-1 border border-transparent text-xs rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            {FaTrash({ style: { fontSize: '10px' } })}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">{renderEditableCell('symbol', item, idx, false)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{renderEditableCell('entry_amount', item, idx)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{renderEditableCell('entry_threshold', item, idx)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{renderEditableCell('exit_amount', item, idx)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{renderEditableCell('exit_threshold', item, idx)}</td>
                    </tr>
                  ))}
                </tbody>
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

export default TradingConfig;
