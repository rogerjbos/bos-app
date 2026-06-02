import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import React, { useEffect, useState } from 'react';
import { FaSort, FaSortDown, FaSortUp, FaSync } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { getAuthHeaders } from '../lib/api';
import PriceChart from './PriceChart';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Types for the file data
interface FileInfo {
  name: string;
  type: 'decisions' | 'performance';
  asset_type: 'stocks' | 'crypto';
  level?: 'summary' | 'symbol' | 'strategy'; // Optional, computed
  symbol?: string; // Optional, computed
  strategy?: string; // Optional, computed
  size?: number; // Optional, not returned by API
  modified?: string; // Optional, not returned by API
  rowCount?: number; // Optional, fetched lazily for summary files
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
  const [selectedFileInfo, setSelectedFileInfo] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<DecisionData[] | PerformanceData[]>([]);
  const [resultsContent, setResultsContent] = useState<any[]>([]);

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

  // Optional universe filter applied to the file content view
  const [universeFilter, setUniverseFilter] = useState<string>('');
  // Optional variant filter (_ls / _lo / _so suffix on the strategy column)
  const [variantFilter, setVariantFilter] = useState<string>('');

  // Get available models
  const fetchModels = async () => {
    setLoadingModels(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/backtester/models`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
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
          ...getAuthHeaders(),
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
          // If the API already provides strategy/symbol (new parquet format), use them directly
          if (file.strategy && file.symbol) {
            return { ...file, level: 'strategy' as const };
          }

          let level: 'summary' | 'symbol' | 'strategy' = 'strategy';
          let symbol: string | undefined;
          let strategy: string | undefined;

          // Check if it's a summary file (level 1)
          if (file.name.toLowerCase() === `${activeTab}_testing.csv` ||
              (activeTab === 'stocks' &&
               (file.name === 'LC_testing.csv' ||
                file.name === 'MC_testing.csv' ||
                file.name === 'SC_testing.csv' ||
                file.name === 'Micro_testing.csv'))) {
            level = 'summary';
          }
          // Check if it's a symbol file (level 2) - just symbol name, no "decision"
          else if (!file.name.includes('_') && file.name.endsWith('.csv') && !file.name.includes('decision')) {
            level = 'symbol';
            symbol = file.name.replace('.csv', '');
          }
          // Check if it's a decision file (level 3) - old flat CSV format
          else if (file.name.includes('decision')) {
            level = 'strategy';
            const parts = file.name.replace('_decisions.csv', '').split('_');
            if (parts.length >= 2) {
              symbol = parts[0];
              strategy = parts.slice(1).join('_');
            }
          }

          return { ...file, level, symbol, strategy };
        });

      setFiles(categorizedFiles);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(`Failed to load files: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Auto-load results.csv to power By Symbol / By Strategy views
  const fetchResultsContent = async (model: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/backtester/${model}/files/results.csv`, {
        method: 'GET',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setResultsContent(data);
      } else {
        setResultsContent([]);
      }
    } catch {
      setResultsContent([]);
    }
  };

  // Get file content
  const fetchFileContent = async (model: string, filename: string, strategy?: string) => {
    if (!model || !filename) return;

    setLoadingContent(true);
    setError(null);
    try {
      const params = strategy ? `?strategy=${encodeURIComponent(strategy)}` : '';
      const response = await fetch(`${API_BASE_URL}/backtester/${model}/files/${filename}${params}`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
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
      fetchResultsContent(selectedModel);
      setSelectedFile('');
      setSelectedFileInfo(null);
      setFileContent([]);
      setResultsContent([]);
    }
  }, [selectedModel, activeTab]);

  // Lazily fetch row counts for summary files so the user can see which file is most complete
  useEffect(() => {
    if (!selectedModel) return;
    const pending = files.filter(f => f.level === 'summary' && f.rowCount === undefined);
    if (pending.length === 0) return;

    let cancelled = false;
    Promise.all(pending.map(async (file) => {
      try {
        const response = await fetch(`${API_BASE_URL}/backtester/${selectedModel}/files/${file.name}`, {
          method: 'GET',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          const data = await response.json();
          return { name: file.name, count: Array.isArray(data) ? data.length : 0 };
        }
      } catch {
        // ignore - leave rowCount undefined
      }
      return { name: file.name, count: -1 };
    })).then(results => {
      if (cancelled) return;
      setFiles(prev => prev.map(f => {
        const r = results.find(rr => rr.name === f.name);
        return r ? { ...f, rowCount: r.count } : f;
      }));
    });

    return () => { cancelled = true; };
  }, [selectedModel, files]);

  // Reset universe filter when the user switches to a different file
  useEffect(() => {
    setUniverseFilter('');
    setVariantFilter('');
  }, [selectedFile, selectedSymbol, viewMode]);

  // Auto-select summary file when files are loaded (only for overview mode)
  // Only auto-select if there's exactly one summary file
  useEffect(() => {
    if (files.length > 0 && !selectedFile && viewMode === 'overview') {
      const summaryFiles = files.filter(f => f.level === 'summary');
      // Only auto-select if there's exactly one summary file
      if (summaryFiles.length === 1) {
        setSelectedFile(summaryFiles[0].name);
        setSelectedFileInfo(summaryFiles[0]);
      }
      // If there are multiple summary files, let the user choose
    }
  }, [files, selectedFile, viewMode]);

  // Auto-load symbol file when symbol is selected in strategies mode
  useEffect(() => {
    if (viewMode === 'strategies' && selectedSymbol) {
      if (resultsContent.length > 0) {
        // New format: filter results.csv by ticker and show as content directly
        // (do NOT set selectedFile - that would trigger fetchFileContent and overwrite)
        const filtered = resultsContent.filter(r => r.ticker === selectedSymbol);
        setFileContent(filtered as any);
      } else {
        // Old format: load the per-symbol file
        const symbolFile = files.find(f => f.level === 'symbol' && f.symbol === selectedSymbol);
        if (symbolFile && symbolFile.name !== selectedFile) {
          setSelectedFile(symbolFile.name);
        }
      }
    }
  }, [viewMode, selectedSymbol, resultsContent]);

  // Load file content when file is selected
  useEffect(() => {
    if (selectedModel && selectedFile) {
      fetchFileContent(selectedModel, selectedFile, selectedFileInfo?.strategy);
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
  const sortedFileContent = sortData(fileContent as any[], contentSortColumn, contentSortDirection);

  // Distinct universes available in the current file content, used to populate the optional filter
  const availableUniverses = Array.from(new Set(
    (fileContent as any[])
      .map(r => r?.universe)
      .filter(u => u !== undefined && u !== null && u !== '')
  )).sort() as string[];

  // Detect _ls / _lo / _so suffix from the strategy column to populate the variant filter
  const getVariant = (row: any): string | null => {
    const s = String(row?.strategy ?? '');
    const match = s.match(/_(ls|lo|so)$/);
    return match ? match[1] : null;
  };
  // Shorten long strategy tokens so the _ls / _lo / _so suffix stays visible in narrow columns
  const strategyAbbreviations: Array<[RegExp, string]> = [
    [/\bcontrarian\b/gi, 'cont'],
    [/\bstochastic\b/gi, 'stoc'],
  ];
  const abbreviateStrategy = (s: string): string =>
    strategyAbbreviations.reduce((acc, [re, repl]) => acc.replace(re, repl), s);
  const variantLabels: Record<string, string> = {
    ls: 'Long/Short (_ls)',
    lo: 'Long Only (_lo)',
    so: 'Short Only (_so)',
  };
  const availableVariants = Array.from(new Set(
    (fileContent as any[])
      .map(getVariant)
      .filter((v): v is string => v !== null)
  )).sort();

  const filteredFileContent = sortedFileContent
    .filter((row: any) => !universeFilter || row.universe === universeFilter)
    .filter((row: any) => !variantFilter || getVariant(row) === variantFilter);

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

        {/* Controls Row */}
        <div className="mb-6 flex flex-wrap gap-4 items-end">
          {/* Asset Type Tabs */}
          <div className="flex-shrink-0">
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value as 'stocks' | 'crypto');
              setSelectedFile('');
              setFileContent([]);
              setViewMode('overview');
              setSelectedSymbol('');
            }}>
              <TabsList>
                <TabsTrigger value="stocks">Stocks</TabsTrigger>
                <TabsTrigger value="crypto">Crypto</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Model Selection */}
          <div className="flex-1 min-w-0">
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loadingModels}
            >
              <option value="">Select a model...</option>
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            {loadingModels && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading models...</span>}
          </div>

          {/* View Mode Selection */}
          {selectedModel && (
            <div className="flex-1 min-w-0">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="overview">Overview (Summary Files)</option>
                <option value="symbols">By Symbol</option>
                <option value="strategies">By Strategy</option>
              </select>
            </div>
          )}

          {/* Symbol Selection for Strategies View */}
          {viewMode === 'strategies' && (
            <div className="flex-1 min-w-0">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a symbol...</option>
                {Array.from(new Set(
                  resultsContent.length > 0
                    ? resultsContent.filter(r => r.ticker).map(r => r.ticker as string)
                    : files.filter(f => f.level === 'strategy' && f.symbol).map(f => f.symbol!)
                )).sort().map(symbol => (
                  <option key={symbol} value={symbol}>{symbol.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Files Table */}
        {selectedModel && (!selectedFile || viewMode !== 'overview') && !(viewMode === 'strategies' && selectedSymbol) && viewMode !== 'symbols' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {activeTab === 'stocks' ? 'Stock' : 'Crypto'} Files - {selectedModel}
              {viewMode === 'overview' && ' (Summary)'}
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
                        onClick={() => handleFilesSort('rowCount')}
                      >
                        <div className="flex items-center">
                          Rows
                          {filesSortColumn === 'rowCount' && (
                            filesSortDirection === 'asc' ? <FaSortUp className="ml-1" /> : <FaSortDown className="ml-1" />
                          )}
                          {filesSortColumn !== 'rowCount' && <FaSort className="ml-1 opacity-50" />}
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
                        <td colSpan={viewMode === 'strategies' ? 5 : 4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading files...
                        </td>
                      </tr>
                    ) : (() => {
                      // Filter files based on view mode
                      let displayFiles = sortedFiles;
                      if (viewMode === 'overview') {
                        displayFiles = sortedFiles.filter(f => f.level === 'summary');
                      } else if (viewMode === 'strategies' && selectedSymbol) {
                        displayFiles = sortedFiles.filter(f => f.level === 'strategy' && f.symbol === selectedSymbol);
                      } else if (viewMode === 'strategies' && !selectedSymbol) {
                        displayFiles = []; // Show no files until symbol is selected
                      }

                      return displayFiles.length === 0 ? (
                        <tr>
                          <td colSpan={viewMode === 'strategies' ? 5 : 4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            {viewMode === 'strategies' && !selectedSymbol ? 'Select a symbol to view strategies' : 'No files found'}
                          </td>
                        </tr>
                      ) : (
                        displayFiles.map((file) => (
                          <tr
                            key={`${file.strategy || ''}-${file.name}`}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                              selectedFile === file.name && selectedFileInfo?.strategy === file.strategy ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => { setSelectedFile(file.name); setSelectedFileInfo(file); }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {file.symbol || file.name}
                            </td>
                            {viewMode === 'strategies' && (
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {file.strategy ? abbreviateStrategy(file.strategy) : 'Unknown'}
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
                              {file.rowCount === undefined
                                ? '…'
                                : file.rowCount < 0
                                  ? '—'
                                  : file.rowCount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(file.name);
                                  setSelectedFileInfo(file);
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
                      // Get unique symbols from results.csv content (new format) or file metadata (old format)
                      const symbols = Array.from(new Set(
                        resultsContent.length > 0
                          ? resultsContent.filter(r => r.ticker).map(r => r.ticker as string)
                          : files.filter(f => f.level === 'strategy' && f.symbol).map(f => f.symbol!)
                      )).sort();

                      return symbols.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            No symbols found
                          </td>
                        </tr>
                      ) : (
                        symbols.map((symbol) => {
                          const symbolStrategies = resultsContent.length > 0
                            ? resultsContent.filter(r => r.ticker === symbol)
                            : files.filter(f => f.level === 'strategy' && f.symbol === symbol);
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
        {(selectedFile || (viewMode === 'strategies' && selectedSymbol && fileContent.length > 0)) && (
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

            {/* Price Chart - show when viewing a specific decision file */}
            {selectedFile && fileContent.length > 0 && files.find(f => f.name === selectedFile)?.type === 'decisions' && (
              <div className="mb-8">
                <PriceChart
                  symbol={selectedSymbol || 'UNKNOWN'}
                  decisions={fileContent as DecisionData[]}
                  assetType={activeTab}
                  apiBaseUrl={API_BASE_URL}
                />
              </div>
            )}

            {/* Optional filters — shown only when the data has a column with multiple values */}
            {(availableUniverses.length > 1 || availableVariants.length > 1) && (
              <div className="mb-4 flex flex-wrap items-center gap-6">
                {availableUniverses.length > 1 && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filter by Universe
                    </label>
                    <select
                      value={universeFilter}
                      onChange={(e) => setUniverseFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All ({sortedFileContent.length})</option>
                      {availableUniverses.map(u => {
                        const count = sortedFileContent.filter((r: any) => r.universe === u).length;
                        return <option key={u} value={u}>{u} ({count})</option>;
                      })}
                    </select>
                  </div>
                )}
                {availableVariants.length > 1 && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filter by Variant
                    </label>
                    <select
                      value={variantFilter}
                      onChange={(e) => setVariantFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All ({sortedFileContent.length})</option>
                      {availableVariants.map(v => {
                        const count = sortedFileContent.filter((r: any) => getVariant(r) === v).length;
                        return <option key={v} value={v}>{variantLabels[v] || v} ({count})</option>;
                      })}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                    <tr>
                      {Object.keys(filteredFileContent[0] || {}).map((column, colIndex) => (
                        <th
                          key={column}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                            colIndex < 2 ? 'sticky z-20 bg-gray-50 dark:bg-gray-700' : ''
                          }`}
                          style={colIndex < 2 ? { left: colIndex === 0 ? '0px' : '200px', minWidth: colIndex === 0 ? '200px' : '160px' } : {}}
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
                        <td colSpan={Object.keys(filteredFileContent[0] || {}).length} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading content...
                        </td>
                      </tr>
                    ) : filteredFileContent.length === 0 ? (
                      <tr>
                        <td colSpan={Object.keys(filteredFileContent[0] || {}).length || 1} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          No content found
                        </td>
                      </tr>
                    ) : (
                      filteredFileContent.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          {Object.entries(row).map(([column, value], cellIndex) => {
                            let displayValue: any = value;

                            // Try to parse as number if it's a string that looks like a number
                            // Skip date columns to preserve their original format
                            if (typeof value === 'string' && !column.toLowerCase().includes('date')) {
                              const numValue = parseFloat(value);
                              if (!isNaN(numValue) && isFinite(numValue)) {
                                displayValue = numValue;
                              }
                            }

                            // Abbreviate long strategy tokens so the _ls/_lo/_so suffix stays visible
                            if (column.toLowerCase() === 'strategy' && typeof displayValue === 'string') {
                              displayValue = abbreviateStrategy(displayValue);
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
                                  style={cellIndex < 2 ? { left: cellIndex === 0 ? '0px' : '200px', minWidth: cellIndex === 0 ? '200px' : '160px' } : {}}
                                >
                                  <button
                                    onClick={() => {
                                      const strategyValue = String(value);
                                      const parquetName = `${selectedSymbol}.parquet`;
                                      const fileInfo: FileInfo = {
                                        name: parquetName,
                                        type: 'decisions',
                                        asset_type: 'stocks',
                                        strategy: strategyValue,
                                        symbol: selectedSymbol,
                                        level: 'strategy',
                                      };
                                      setViewMode('overview');
                                      setSelectedFile(parquetName);
                                      setSelectedFileInfo(fileInfo);
                                      setPreviousSymbol(selectedSymbol);
                                      setSelectedSymbol('');
                                      setCameFromStrategies(true);
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
                                style={cellIndex < 2 ? { left: cellIndex === 0 ? '0px' : '200px', minWidth: cellIndex === 0 ? '200px' : '160px' } : {}}
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
