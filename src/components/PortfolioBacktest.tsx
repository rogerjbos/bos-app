import React, { useEffect, useState } from 'react';
import { FaSort, FaSortDown, FaSortUp, FaSync } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useRequestToken } from '../hooks/useRequestToken';
import { getAuthHeaders } from '../lib/api';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Types for the portfolio backtest data
interface PortfolioBacktestData {
  universe: string;
  sector: string;
  cagr_price: number;
  cagr_tr: number;
  total_return_pct: number;
  initial_value: number;
  final_value: number;
  realized_pnl: number;
  unrealized_pnl: number;
  commissions: number;
  total_trades: number;
  winning_trades: number;
  win_rate_pct: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  profit_factor: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  avg_holding_days: number;
  portfolio_size: number;
  stop_loss_pct: number;
  lookback_days: number;
  signal_date: string;
  start_date: string;
  priority_strategy: string;
  signals: string;
  [key: string]: any;
}

type SortDirection = 'asc' | 'desc' | null;

const PortfolioBacktest: React.FC = () => {
  const { user } = useAuth();

  // Data states
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [fileContent, setFileContent] = useState<PortfolioBacktestData[]>([]);

  // Loading states
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting states
  const [contentSortColumn, setContentSortColumn] = useState<string>('cagr_tr');
  const [contentSortDirection, setContentSortDirection] = useState<SortDirection>('desc');

  // Filter states
  const [universeFilter, setUniverseFilter] = useState<string>('');
  const [sectorFilter, setSectorFilter] = useState<string>('');

  // Get available models
  const fetchModels = async () => {
    setLoadingModels(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio-backtest/models`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setError('Session expired. Please refresh the page to sign in again.');
          return;
        }
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      // Strip .csv extension from model names if present
      const modelsWithoutExt = data.map((model: string) => model.replace(/\.csv$/, ''));
      setModels(modelsWithoutExt);

      // Auto-select the first (most recent) model
      if (modelsWithoutExt.length > 0 && !selectedModel) {
        setSelectedModel(modelsWithoutExt[0]);
      }
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(`Failed to load models: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingModels(false);
    }
  };

  // Get file content
  // Drops out-of-order content responses when the selected model changes fast.
  const beginContent = useRequestToken();

  const fetchFileContent = async (model: string) => {
    if (!model) return;

    const isCurrent = beginContent();
    setLoadingContent(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio-backtest/${model}/content`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setError('Session expired. Please refresh the page to sign in again.');
          return;
        }
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      const data = await response.json();
      if (!isCurrent()) return;
      setFileContent(data);
    } catch (err) {
      if (!isCurrent()) return;
      console.error('Error fetching file content:', err);
      setError(`Failed to load file content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      if (isCurrent()) setLoadingContent(false);
    }
  };

  // Sorting function
  const sortData = <T,>(data: T[], column: string, direction: SortDirection): T[] => {
    if (!direction) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as any)[column];
      const bVal = (b as any)[column];

      if (aVal === null || aVal === undefined) return direction === 'asc' ? -1 : 1;
      if (bVal === null || bVal === undefined) return direction === 'asc' ? 1 : -1;

      // Try to parse as numbers if they look like numbers
      let aNum = typeof aVal === 'number' ? aVal : parseFloat(String(aVal));
      let bNum = typeof bVal === 'number' ? bVal : parseFloat(String(bVal));

      if (!isNaN(aNum) && !isNaN(bNum) && isFinite(aNum) && isFinite(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  };

  const handleContentSort = (column: string) => {
    const newDirection = contentSortColumn === column && contentSortDirection === 'asc' ? 'desc' : 'asc';
    setContentSortColumn(column);
    setContentSortDirection(newDirection);
  };

  // Initialize data when component mounts
  useEffect(() => {
    fetchModels();
  }, []);

  // Load file content when model changes
  useEffect(() => {
    if (selectedModel) {
      fetchFileContent(selectedModel);
    }
  }, [selectedModel]);

  // Get unique values for filters
  const uniqueUniverses = Array.from(new Set(fileContent.map(row => row.universe))).sort();
  const uniqueSectors = Array.from(new Set(fileContent.map(row => row.sector))).sort();

  // Filter and sort data for table
  const filteredContent = fileContent.filter(row => {
    const matchesUniverse = !universeFilter || row.universe === universeFilter;
    const matchesSector = !sectorFilter || row.sector === sectorFilter;
    return matchesUniverse && matchesSector;
  });

  const sortedFileContent = sortData(filteredContent as any[], contentSortColumn, contentSortDirection);

  // Build sector -> signals -> universe -> cagr_price lookup from full fileContent (all universes)
  const cagrLookup: Record<string, Record<string, Record<string, number>>> = {};
  for (const row of fileContent) {
    if (!cagrLookup[row.sector]) cagrLookup[row.sector] = {};
    if (!cagrLookup[row.sector][row.signals]) cagrLookup[row.sector][row.signals] = {};
    const val = parseFloat(String(row.cagr_price));
    if (!isNaN(val)) cagrLookup[row.sector][row.signals][row.universe] = val;
  }
  const UNIVERSES = ['Micro', 'SC', 'MC', 'LC'];

  // Format model name for display (extract date from results_YYYYMMDD and preserve suffix)
  const formatModelName = (model: string): string => {
    // Model should already have .csv extension stripped, but double-check
    const modelWithoutExt = model.replace(/\.csv$/, '');
    const match = modelWithoutExt.match(/results_(\d{8})(.*)$/);
    if (match) {
      const dateStr = match[1];
      const suffix = match[2]; // e.g., "_2" or ""
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return suffix ? `${year}-${month}-${day}${suffix}` : `${year}-${month}-${day}`;
    }
    return model;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Portfolio Backtest Results</h1>
          <button
            onClick={() => {
              fetchModels();
              if (selectedModel) {
                fetchFileContent(selectedModel);
              }
            }}
            disabled={loadingModels || loadingContent}
            className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaSync className={`mr-2 ${loadingModels || loadingContent ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Model Selection and Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Results Date
            </label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                setFileContent([]);
                setUniverseFilter('');
                setSectorFilter('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingModels}
            >
              <option value="">Select a date...</option>
              {models.map(model => (
                <option key={model} value={model}>{formatModelName(model)}</option>
              ))}
            </select>
            {loadingModels && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading models...</span>}
          </div>

          {selectedModel && fileContent.length > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Universe
                </label>
                <select
                  value={universeFilter}
                  onChange={(e) => setUniverseFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Universes</option>
                  {uniqueUniverses.map(universe => (
                    <option key={universe} value={universe}>{universe}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Sector
                </label>
                <select
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sectors</option>
                  {uniqueSectors.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Statistics Summary */}
        {selectedModel && fileContent.length > 0 && (
          <div className="mb-6">
            {(universeFilter || sectorFilter) && (
              <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredContent.length} of {fileContent.length} backtests
                {universeFilter && ` (Universe: ${universeFilter})`}
                {sectorFilter && ` (Sector: ${sectorFilter})`}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Backtests</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{filteredContent.length}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg CAGR (Price)</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredContent.length > 0 ? (filteredContent.reduce((sum, row) => sum + parseFloat(String(row.cagr_price || 0)), 0) / filteredContent.length).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg CAGR (TR)</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredContent.length > 0 ? (filteredContent.reduce((sum, row) => sum + parseFloat(String(row.cagr_tr || 0)), 0) / filteredContent.length).toFixed(2) : '0.00'}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Win Rate</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredContent.length > 0 ? (filteredContent.reduce((sum, row) => sum + parseFloat(String(row.win_rate_pct || 0)), 0) / filteredContent.length).toFixed(1) : '0.0'}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Sharpe Ratio</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredContent.length > 0 ? (filteredContent.reduce((sum, row) => sum + parseFloat(String(row.sharpe_ratio || 0)), 0) / filteredContent.length).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Content Table */}
        {selectedModel && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Results for {formatModelName(selectedModel)}
            </h2>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                    <tr>
                      {Object.keys(sortedFileContent[0] || {}).map((column, colIndex) => (
                        <th
                          key={column}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                            colIndex < 2 ? 'sticky z-20 bg-gray-50 dark:bg-gray-700' : ''
                          }`}
                          style={colIndex < 2 ? { left: colIndex === 0 ? '0px' : '120px', minWidth: colIndex === 0 ? '120px' : '100px' } : {}}
                          onClick={() => handleContentSort(column)}
                        >
                          <div className="flex items-center">
                            {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            {contentSortColumn === column && (
                              contentSortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                            )}
                            {contentSortColumn !== column && <FaSort className="ml-1 opacity-50" />}
                          </div>
                        </th>
                      ))}
                      {UNIVERSES.map(u => (
                        <th
                          key={`cagr_price_${u}`}
                          className="px-6 py-3 text-left text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20"
                        >
                          CAGR {u}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loadingContent ? (
                      <tr>
                        <td colSpan={Object.keys(sortedFileContent[0] || {}).length + UNIVERSES.length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading content...
                        </td>
                      </tr>
                    ) : sortedFileContent.length === 0 ? (
                      <tr>
                        <td colSpan={(Object.keys(sortedFileContent[0] || {}).length || 1) + UNIVERSES.length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No content found
                        </td>
                      </tr>
                    ) : (
                      sortedFileContent.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {Object.entries(row).map(([column, value], cellIndex) => {
                            let displayValue = value;

                            // Try to parse as number if it's a string that looks like a number
                            // Skip certain columns to preserve their original format
                            if (typeof value === 'string' &&
                                !column.toLowerCase().includes('date') &&
                                !column.toLowerCase().includes('strategy') &&
                                !column.toLowerCase().includes('signals') &&
                                column !== 'universe' &&
                                column !== 'sector') {
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && isFinite(numValue)) {
                                displayValue = numValue;
                              }
                            }

                            return (
                              <td
                                key={cellIndex}
                                className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${
                                  cellIndex < 2 ? 'sticky z-10 bg-white dark:bg-gray-800 font-medium text-gray-900 dark:text-white' : ''
                                }`}
                                style={cellIndex < 2 ? { left: cellIndex === 0 ? '0px' : '120px', minWidth: cellIndex === 0 ? '120px' : '100px' } : {}}
                              >
                                {typeof displayValue === 'number' ? displayValue.toFixed(2) : String(displayValue)}
                              </td>
                            );
                          })}
                          {UNIVERSES.map(u => {
                            const val = cagrLookup[row.sector]?.[row.signals]?.[u];
                            return (
                              <td
                                key={`cagr_price_${u}`}
                                className="px-6 py-4 whitespace-nowrap text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/10"
                              >
                                {val !== undefined ? val.toFixed(2) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!selectedModel && !loadingModels && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Select a results date to view portfolio backtest data
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioBacktest;
