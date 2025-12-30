import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import React, { useEffect, useState } from 'react';
import { FaSort, FaSortDown, FaSortUp, FaSync } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY;

// Types for the file data
interface FileInfo {
  name: string;
  type: 'decisions' | 'performance';
  asset_type: 'stocks' | 'crypto';
  level: 'summary' | 'symbol' | 'strategy';
  symbol?: string;
  strategy?: string;
}

interface DecisionData {
  date: string;
  ticker: string;
  strategy: string;
  decision: string;
  confidence: number;
  price: number;
  [key: string]: any;
}

interface PerformanceData {
  date: string;
  strategy: string;
  cumulative_return: number;
  daily_return: number;
  [key: string]: any;
}

type SortDirection = 'asc' | 'desc' | null;
type ViewMode = 'overview' | 'symbols' | 'strategies';

const Backtester: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'stocks' | 'crypto'>('stocks');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [cameFromStrategies, setCameFromStrategies] = useState<boolean>(false);
  const [previousSymbol, setPreviousSymbol] = useState<string>('');

  // Data states
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<DecisionData[] | PerformanceData[]>([]);

  // Loading states
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sorting states
  const [filesSortColumn, setFilesSortColumn] = useState<string>('name');
  const [filesSortDirection, setFilesSortDirection] = useState<SortDirection>('asc');
  const [contentSortColumn, setContentSortColumn] = useState<string>('date');
  const [contentSortDirection, setContentSortDirection] = useState<SortDirection>('desc');

  // Helper function to get a valid access token (refresh if expired)
  const getValidAccessToken = async (): Promise<string | null> => {
    // For API key authentication, we don't need tokens
    return API_KEY;
  };

  // Get available models
  const fetchModels = async () => {
    setLoadingModels(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/backtester/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      setModels(data);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError(`Failed to load models: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingModels(false);
    }
  };

  // Get available files for a model
  const fetchFiles = async (model: string) => {
    if (!model) return;

    setLoadingFiles(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/backtester/${model}/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      const data: FileInfo[] = await response.json();
      // Filter by active tab and categorize files
      const categorizedFiles = data
        .filter(file => file.asset_type === activeTab)
        .map(file => {
          let level: 'summary' | 'symbol' | 'strategy' = 'strategy';
          let symbol: string | undefined;
          let strategy: string | undefined;

          // Check if it's a summary file (level 1)
          if (file.name === `${activeTab}_testing.csv`) {
            level = 'summary';
          }
          // Check if it's a symbol file (level 2) - just symbol name, no "decision"
          else if (!file.name.includes('_') && file.name.endsWith('.csv') && !file.name.includes('decision')) {
            level = 'symbol';
            symbol = file.name.replace('.csv', '');
          }
          // Check if it's a decision file (level 3)
          else if (file.name.includes('decision')) {
            level = 'strategy';
            // Extract symbol and strategy from filename like "uni_adx_indicator_decisions.csv"
            const parts = file.name.replace('_decisions.csv', '').split('_');
            if (parts.length >= 2) {
              symbol = parts[0];
              strategy = parts.slice(1).join('_');
            }
          }

          return {
            ...file,
            level,
            symbol,
            strategy
          };
        });

      setFiles(categorizedFiles);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(`Failed to load files: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Get file content
  const fetchFileContent = async (model: string, filename: string) => {
    if (!model || !filename) return;

    setLoadingContent(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/backtester/${model}/files/${filename}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.status}`);
      }

      const data = await response.json();
      setFileContent(data);
    } catch (err) {
      console.error('Error fetching file content:', err);
      setError(`Failed to load file content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingContent(false);
    }
  };

  // Sorting functions
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

  const handleFilesSort = (column: string) => {
    const newDirection = filesSortColumn === column && filesSortDirection === 'asc' ? 'desc' : 'asc';
    setFilesSortColumn(column);
    setFilesSortDirection(newDirection);
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

  // Load files when model or tab changes
  useEffect(() => {
    if (selectedModel) {
      fetchFiles(selectedModel);
      setSelectedFile('');
      setFileContent([]);
    }
  }, [selectedModel, activeTab]);

  // Auto-select summary file when files are loaded (only for overview mode)
  useEffect(() => {
    if (files.length > 0 && !selectedFile && viewMode === 'overview') {
      const summaryFile = files.find(f => f.level === 'summary');
      if (summaryFile) {
        setSelectedFile(summaryFile.name);
      }
    }
  }, [files, selectedFile, viewMode]);

  // Auto-load symbol file when symbol is selected in strategies mode
  useEffect(() => {
    if (viewMode === 'strategies' && selectedSymbol && files.length > 0) {
      const symbolFile = files.find(f => f.level === 'symbol' && f.symbol === selectedSymbol);
      if (symbolFile && symbolFile.name !== selectedFile) {
        setSelectedFile(symbolFile.name);
      }
    }
  }, [viewMode, selectedSymbol, files, selectedFile]);

  // Load file content when file is selected
  useEffect(() => {
    if (selectedModel && selectedFile) {
      fetchFileContent(selectedModel, selectedFile);
    }
  }, [selectedFile]);

  // Reset cameFromStrategies and previousSymbol when view mode changes away from overview
  useEffect(() => {
    if (viewMode !== 'overview') {
      setCameFromStrategies(false);
      setPreviousSymbol('');
    }
  }, [viewMode]);

  // Sorted data for tables
  const sortedFiles = sortData(files, filesSortColumn, filesSortDirection);
  const sortedFileContent = sortData(fileContent, contentSortColumn, contentSortDirection);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Backtester Analysis</h1>
          <button
            onClick={() => {
              if (selectedModel) {
                fetchFiles(selectedModel);
                if (selectedFile) {
                  fetchFileContent(selectedModel, selectedFile);
                }
              }
            }}
            disabled={loadingFiles || loadingContent || !selectedModel}
            className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaSync className={`mr-2 ${loadingFiles || loadingContent ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Model Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setSelectedFile('');
              setFileContent([]);
            }}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loadingModels}
          >
            <option value="">Select a model...</option>
            {models.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          {loadingModels && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading models...</span>}
        </div>

        {/* Asset Type Selection */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'stocks' | 'crypto');
            setSelectedFile('');
            setFileContent([]);
            setViewMode('overview');
            setSelectedSymbol('');
          }}>
            <TabsList className="mb-4">
              <TabsTrigger value="stocks">Stocks</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* View Mode Selection */}
        {selectedModel && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              View Mode
            </label>
            <select
              value={viewMode}
              onChange={(e) => {
                const newViewMode = e.target.value as 'overview' | 'symbols' | 'strategies';
                setViewMode(newViewMode);
                setSelectedFile(''); // Clear selected file for all view modes
                setFileContent([]);
                if (newViewMode !== 'strategies') {
                  setSelectedSymbol('');
                }
              }}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overview">Overview (Summary Files)</option>
              <option value="symbols">By Symbol</option>
              <option value="strategies">By Strategy</option>
            </select>
          </div>
        )}

        {/* Symbol Selection for Strategies View */}
        {viewMode === 'strategies' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Symbol
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => {
                setSelectedSymbol(e.target.value);
                setSelectedFile('');
                setFileContent([]);
              }}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a symbol...</option>
              {Array.from(new Set(files.filter(f => f.level === 'strategy' && f.symbol).map(f => f.symbol!))).sort().map(symbol => (
                <option key={symbol} value={symbol}>{symbol.toUpperCase()}</option>
              ))}
            </select>
          </div>
        )}

        {/* Files Table */}
        {selectedModel && (!selectedFile || viewMode !== 'overview') && !(viewMode === 'strategies' && selectedSymbol) && viewMode !== 'symbols' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {activeTab === 'stocks' ? 'Stock' : 'Crypto'} Files - {selectedModel}
              {viewMode === 'overview' && ' (Summary)'}
              {viewMode === 'symbols' && ' (By Symbol)'}
              {viewMode === 'strategies' && selectedSymbol && ` (Strategies for ${selectedSymbol.toUpperCase()})`}
              {viewMode === 'strategies' && !selectedSymbol && ' (Select a Symbol)'}
            </h2>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleFilesSort('name')}
                      >
                        <div className="flex items-center">
                          File Name
                          {filesSortColumn === 'name' && (
                            filesSortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                          )}
                          {filesSortColumn !== 'name' && <FaSort className="ml-1 opacity-50" />}
                        </div>
                      </th>
                      {viewMode === 'strategies' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Strategy
                        </th>
                      )}
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleFilesSort('type')}
                      >
                        <div className="flex items-center">
                          Type
                          {filesSortColumn === 'type' && (
                            filesSortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                          )}
                          {filesSortColumn !== 'type' && <FaSort className="ml-1 opacity-50" />}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleFilesSort('size')}
                      >
                        <div className="flex items-center">
                          Size (KB)
                          {filesSortColumn === 'size' && (
                            filesSortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                          )}
                          {filesSortColumn !== 'size' && <FaSort className="ml-1 opacity-50" />}
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        onClick={() => handleFilesSort('modified')}
                      >
                        <div className="flex items-center">
                          Modified
                          {filesSortColumn === 'modified' && (
                            filesSortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                          )}
                          {filesSortColumn !== 'modified' && <FaSort className="ml-1 opacity-50" />}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loadingFiles ? (
                      <tr>
                        <td colSpan={viewMode === 'strategies' ? 6 : 5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading files...
                        </td>
                      </tr>
                    ) : (() => {
                      // Filter files based on view mode
                      let displayFiles = sortedFiles;
                      if (viewMode === 'overview') {
                        displayFiles = sortedFiles.filter(f => f.level === 'summary');
                      } else if (viewMode === 'symbols') {
                        // For symbols mode, don't show files - we'll show a symbol list below
                        displayFiles = [];
                      } else if (viewMode === 'strategies' && selectedSymbol) {
                        displayFiles = sortedFiles.filter(f => f.level === 'strategy' && f.symbol === selectedSymbol);
                      } else if (viewMode === 'strategies' && !selectedSymbol) {
                        displayFiles = []; // Show no files until symbol is selected
                      }

                      return displayFiles.length === 0 ? (
                        <tr>
                          <td colSpan={viewMode === 'strategies' ? 6 : 5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            {viewMode === 'strategies' && !selectedSymbol ? 'Select a symbol to view strategies' : 'No files found'}
                          </td>
                        </tr>
                      ) : (
                        displayFiles.map((file) => (
                          <tr
                            key={file.name}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                              selectedFile === file.name ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => setSelectedFile(file.name)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {file.name}
                            </td>
                            {viewMode === 'strategies' && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {file.strategy || 'Unknown'}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                file.type === 'decisions'
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                                  : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                              }`}>
                                {file.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {(file.size / 1024).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(file.modified).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(file.name);
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Symbols Table - shown in symbols mode */}
        {viewMode === 'symbols' && selectedModel && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {activeTab === 'stocks' ? 'Stock' : 'Crypto'} Symbols - {selectedModel}
            </h2>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Symbol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Strategies
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      // Get unique symbols from strategy files
                      const symbols = Array.from(new Set(
                        files.filter(f => f.level === 'strategy' && f.symbol).map(f => f.symbol!)
                      )).sort();

                      return symbols.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            No symbols found
                          </td>
                        </tr>
                      ) : (
                        symbols.map((symbol) => {
                          const symbolStrategies = files.filter(f => f.level === 'strategy' && f.symbol === symbol);
                          return (
                            <tr key={symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                {symbol.toUpperCase()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {symbolStrategies.length}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                <button
                                  onClick={() => {
                                    setSelectedSymbol(symbol);
                                    setViewMode('strategies');
                                  }}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                >
                                  View Strategies
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* File Content Table */}
        {selectedFile && (
          <div>
            {cameFromStrategies && (
              <div className="mb-4">
                <button
                  onClick={() => {
                    setViewMode('strategies');
                    setSelectedSymbol(previousSymbol); // Restore the previous symbol
                    setCameFromStrategies(false);
                    setSelectedFile('');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ← Back to Strategy Overview
                </button>
              </div>
            )}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {viewMode === 'strategies' && selectedSymbol
                ? `${selectedSymbol.toUpperCase()} Strategy Performance`
                : `${selectedFile} Content`}
            </h2>
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                    <tr>
                      {Object.keys(sortedFileContent[0] || {}).map((column, colIndex) => (
                        <th
                          key={column}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                            colIndex < 2 ? 'sticky z-20 bg-gray-50 dark:bg-gray-700' : ''
                          }`}
                          style={colIndex < 2 ? { left: colIndex === 0 ? '0px' : '160px' } : {}}
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
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loadingContent ? (
                      <tr>
                        <td colSpan={Object.keys(sortedFileContent[0] || {}).length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading content...
                        </td>
                      </tr>
                    ) : sortedFileContent.length === 0 ? (
                      <tr>
                        <td colSpan={Object.keys(sortedFileContent[0] || {}).length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No content found
                        </td>
                      </tr>
                    ) : (
                      sortedFileContent.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {Object.entries(row).map(([column, value], cellIndex) => {
                            let displayValue = value;

                            // Try to parse as number if it's a string that looks like a number
                            // Skip date columns to preserve their original format
                            if (typeof value === 'string' && !column.toLowerCase().includes('date')) {
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && isFinite(numValue)) {
                                displayValue = numValue;
                              }
                            }

                            // In strategies mode, make strategy-related columns clickable
                            if (viewMode === 'strategies' &&
                                (column.toLowerCase() === 'strategy' || column.toLowerCase() === 'ticker') &&
                                selectedSymbol) {
                              return (
                                <td
                                  key={cellIndex}
                                  className={`px-6 py-4 whitespace-nowrap text-sm ${
                                    cellIndex < 2 ? 'sticky z-10 bg-white dark:bg-gray-800' : ''
                                  }`}
                                  style={cellIndex < 2 ? { left: cellIndex === 0 ? '0px' : '160px' } : {}}
                                >
                                  <button
                                    onClick={() => {
                                      // Find the decisions file for this strategy
                                      const strategyValue = String(value);
                                      console.log('Looking for strategy:', strategyValue, 'for symbol:', selectedSymbol);
                                      console.log('Available strategy files:', files.filter(f => f.level === 'strategy' && f.symbol === selectedSymbol));

                                      // Try exact match first
                                      let strategyFile = files.find(f =>
                                        f.level === 'strategy' &&
                                        f.symbol === selectedSymbol &&
                                        f.strategy === strategyValue
                                      );

                                      // If no exact match, try partial match
                                      if (!strategyFile) {
                                        strategyFile = files.find(f =>
                                          f.level === 'strategy' &&
                                          f.symbol === selectedSymbol &&
                                          f.strategy && f.strategy.includes(strategyValue)
                                        );
                                      }

                                      // If still no match, try filename contains strategy
                                      if (!strategyFile) {
                                        strategyFile = files.find(f =>
                                          f.level === 'strategy' &&
                                          f.symbol === selectedSymbol &&
                                          f.name.includes(strategyValue)
                                        );
                                      }

                                      if (strategyFile) {
                                        console.log('Found strategy file:', strategyFile.name);
                                        // Change to overview mode and load the file
                                        setViewMode('overview');
                                        setSelectedFile(strategyFile.name);
                                        setPreviousSymbol(selectedSymbol); // Remember the symbol for back navigation
                                        setSelectedSymbol(''); // Clear symbol selection
                                        setCameFromStrategies(true); // Track that we came from strategies mode
                                      } else {
                                        console.log('No strategy file found for:', strategyValue);
                                        // Fallback: try to find any strategy file for this symbol
                                        const anyStrategyFile = files.find(f =>
                                          f.level === 'strategy' &&
                                          f.symbol === selectedSymbol
                                        );
                                        if (anyStrategyFile) {
                                          console.log('Using fallback strategy file:', anyStrategyFile.name);
                                          setViewMode('overview');
                                          setSelectedFile(anyStrategyFile.name);
                                          setPreviousSymbol(selectedSymbol); // Remember the symbol for back navigation
                                          setSelectedSymbol('');
                                          setCameFromStrategies(true); // Track that we came from strategies mode
                                        }
                                      }
                                    }}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 underline"
                                  >
                                    {String(displayValue)}
                                  </button>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={cellIndex}
                                className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 ${
                                  cellIndex < 2 ? 'sticky z-10 bg-white dark:bg-gray-800' : ''
                                }`}
                                style={cellIndex < 2 ? { left: cellIndex === 0 ? '0px' : '160px' } : {}}
                              >
                                {typeof displayValue === 'number' ? displayValue.toFixed(1) : String(displayValue)}
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
      </div>
    </div>
  );
};

export default Backtester;
