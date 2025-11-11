import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import * as echarts from 'echarts';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FaExternalLinkAlt, FaPlusSquare, FaSave, FaTimes, FaTrash, FaUndo } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';


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
  return7d?: string;
  return30d?: string;
  return60d?: string;
  return90d?: string;
  return120d?: string;
}

// Interface for price data from CSV
interface PriceData {
  [symbol: string]: number;
}

// Interface for return data from API
interface ReturnData {
  [symbol: string]: number;
}

// Define constants at the top of your component
const APP_VERSION = '1.0.0';

// API configuration (similar to Ranks.tsx)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY;
const StakingTableContent: React.FC<{
  filteredStakingItems: Array<{ item: StakingItem; idx: number }>;
  filteredCalculatedValues: Array<{ totalQuantity: number; itemValue: number }>;
  filteredTotalValue: number;
  activeTab: 'combined' | 'ledger' | 'solo' | 'deleted';
  selectedReturnPeriod: '7d' | '30d' | '60d' | '90d' | '120d';
  hideValues: boolean;
  editIndex: number | null;
  editItem: StakingItem | null;
  setEditItem: React.Dispatch<React.SetStateAction<StakingItem | null>>;
  renderEditableCell: (field: keyof StakingItem, item: StakingItem, index: number, isNumeric?: boolean, hideWhenPrivate?: boolean) => React.ReactNode;
  saveEdit: () => void;
  cancelEditing: () => void;
  removeStakingItem: (index: number) => void;
  startEditing: (index: number) => void;
  formatNumber: (value: number, decimals?: number) => string;
}> = ({
  filteredStakingItems,
  filteredCalculatedValues,
  filteredTotalValue,
  activeTab,
  selectedReturnPeriod,
  hideValues,
  editIndex,
  editItem,
  setEditItem,
  renderEditableCell,
  saveEdit,
  cancelEditing,
  removeStakingItem,
  startEditing,
  formatNumber
}) => (
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
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{selectedReturnPeriod} Return</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">%</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Link</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredStakingItems.map(({ item, idx }) => {
            const { totalQuantity, itemValue } = filteredCalculatedValues[filteredStakingItems.findIndex(f => f.idx === idx)];
            const percentOfTotal = filteredTotalValue > 0 ? (itemValue / filteredTotalValue) * 100 : 0;

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
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{renderEditableCell('stakedQuantity', item, idx, true, true)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{renderEditableCell('unclaimedQuantity', item, idx, true, true)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{hideValues ? '***' : formatNumber(totalQuantity, 2)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">
                  {renderEditableCell('price', item, idx, true)}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">
                  {(() => {
                    const returnValue = (() => {
                      switch (selectedReturnPeriod) {
                        case '7d': return item.return7d;
                        case '30d': return item.return30d;
                        case '60d': return item.return60d;
                        case '90d': return item.return90d;
                        case '120d': return item.return120d;
                        default: return undefined;
                      }
                    })();
                    return returnValue ? (
                      <span className={parseFloat(returnValue) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {parseFloat(returnValue) >= 0 ? '+' : ''}{formatNumber(parseFloat(returnValue), 2)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    );
                  })()}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white text-right">{hideValues ? '***' : `$${formatNumber(itemValue)}`}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{formatNumber(percentOfTotal, 1)}%</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                  {editIndex === idx && editItem ? (
                    <input
                      type="text"
                      name="stakingUrl"
                      value={editItem.stakingUrl}
                      onChange={(e) => editItem && setEditItem({...editItem, stakingUrl: e.target.value})}
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
                      onChange={(e) => editItem && setEditItem({...editItem, account: e.target.value})}
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
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <td colSpan={6} className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white">
              <strong>Total {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Value:</strong>
            </td>
            <td colSpan={4} className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white">
              <strong>{hideValues ? '***' : `$${formatNumber(filteredTotalValue)}`}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

// Treemap component for staking data
const StakingTreemap: React.FC<{
  title: string;
  items: StakingItem[];
  calculatedValues: Array<{ totalQuantity: number; itemValue: number }>;
  isDark: boolean;
  hideValues: boolean;
  selectedReturnPeriod: '7d' | '30d' | '60d' | '90d' | '120d';
}> = ({ title, items, calculatedValues, isDark, hideValues, selectedReturnPeriod }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current, isDark ? 'dark' : 'light');

    // Helper function to get return value for selected period
    const getReturnValue = (item: StakingItem, period: '7d' | '30d' | '60d' | '90d' | '120d'): number => {
      switch (period) {
        case '7d': return item.return7d ? parseFloat(item.return7d) : 0;
        case '30d': return item.return30d ? parseFloat(item.return30d) : 0;
        case '60d': return item.return60d ? parseFloat(item.return60d) : 0;
        case '90d': return item.return90d ? parseFloat(item.return90d) : 0;
        case '120d': return item.return120d ? parseFloat(item.return120d) : 0;
        default: return 0;
      }
    };

    // Prepare data for treemap with color based on selected return period
    const data = items.map((item, idx) => {
      const { itemValue } = calculatedValues[idx];
      const returnValue = getReturnValue(item, selectedReturnPeriod);

      // Calculate color based on return
      let color: string;
      if (returnValue > 0) {
        // Green shades for positive returns (brighter = better performance)
        const intensity = Math.min(returnValue / 50, 1); // Scale based on return percentage
        const greenValue = Math.floor(100 + (intensity * 155)); // Range: 100-255
        color = `rgb(0, ${greenValue}, 0)`;
      } else if (returnValue < 0) {
        // Red shades for negative returns (brighter = worse performance)
        const intensity = Math.min(Math.abs(returnValue) / 50, 1); // Scale based on loss percentage
        const redValue = Math.floor(100 + (intensity * 155)); // Range: 100-255
        color = `rgb(${redValue}, 0, 0)`;
      } else {
        // Neutral gray for zero returns
        color = 'rgb(128, 128, 128)';
      }

      return {
        name: item.ticker,
        value: itemValue,
        returnValue: returnValue,
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
        text: `${title} Return`,
        left: 'center',
        textStyle: {
          color: isDark ? '#ffffff' : '#000000'
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? '#374151' : '#d1d5db',
        textStyle: {
          color: isDark ? '#ffffff' : '#000000',
          fontSize: 12
        },
        formatter: (params: any) => {
          const data = params.data;
          const valueDisplay = hideValues ? '***' : `$${data.value.toLocaleString()}`;
          const quantityDisplay = hideValues ? '***' : data.quantity.toFixed(4);
          return `${data.name}<br/>Value: ${valueDisplay}<br/>Quantity: ${quantityDisplay}<br/>${selectedReturnPeriod} Return: ${data.returnValue.toFixed(2)}%<br/>Account: ${data.account}`;
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
  }, [title, items, calculatedValues, isDark, hideValues, selectedReturnPeriod]);

  return <div ref={chartRef} style={{ width: '100%', height: '400px' }} />;
};

const DeletedStakingTableContent: React.FC<{
  filteredStakingItems: Array<{ item: StakingItem; idx: number }>;
  filteredCalculatedValues: Array<{ totalQuantity: number; itemValue: number }>;
  filteredTotalValue: number;
  selectedReturnPeriod: '7d' | '30d' | '60d' | '90d' | '120d';
  hideValues: boolean;
  restoreStakingItems: (index: number) => void;
  formatNumber: (value: number, decimals?: number) => string;
}> = ({
  filteredStakingItems,
  filteredCalculatedValues,
  filteredTotalValue,
  selectedReturnPeriod,
  hideValues,
  restoreStakingItems,
  formatNumber
}) => (
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
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{selectedReturnPeriod} Return</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">%</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredStakingItems.map(({ item, idx }) => {
            const { totalQuantity, itemValue } = filteredCalculatedValues[filteredStakingItems.findIndex(f => f.idx === idx)];
            const percentOfTotal = filteredTotalValue > 0 ? (itemValue / filteredTotalValue) * 100 : 0;

            return (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-2 py-2 whitespace-nowrap text-xs">
                  <button
                    onClick={() => restoreStakingItems(idx)}
                    className="inline-flex items-center px-1 py-1 border border-transparent text-xs rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {FaUndo({ style: { fontSize: '10px' } })}
                  </button>
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">{item.ticker}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{hideValues ? '***' : formatNumber(parseFloat(item.stakedQuantity || '0'), 2)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{hideValues ? '***' : formatNumber(parseFloat(item.unclaimedQuantity || '0'), 2)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{hideValues ? '***' : formatNumber(totalQuantity, 2)}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{hideValues ? '***' : `$${formatNumber(parseFloat(item.price || '0'), 2)}`}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">
                  {(() => {
                    const returnValue = (() => {
                      switch (selectedReturnPeriod) {
                        case '7d': return item.return7d;
                        case '30d': return item.return30d;
                        case '60d': return item.return60d;
                        case '90d': return item.return90d;
                        case '120d': return item.return120d;
                        default: return undefined;
                      }
                    })();
                    return returnValue ? (
                      <span className={parseFloat(returnValue) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {parseFloat(returnValue) >= 0 ? '+' : ''}{formatNumber(parseFloat(returnValue), 2)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    );
                  })()}
                </td>
                <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white text-right">{hideValues ? '***' : `$${formatNumber(itemValue)}`}</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white text-right">{formatNumber(percentOfTotal, 1)}%</td>
                <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-900 dark:text-white">{item.account}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <td colSpan={6} className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white">
              <strong>Total Deleted Value:</strong>
            </td>
            <td colSpan={4} className="px-2 py-2 text-xs font-medium text-gray-900 dark:text-white">
              <strong>{hideValues ? '***' : `$${formatNumber(filteredTotalValue)}`}</strong>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
);

const Staking: React.FC = () => {
  // Get the authenticated user and authentication status
  const { user, isAuthenticated, walletAddress } = useAuth();

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

  // Add return period selector state
  const [selectedReturnPeriod, setSelectedReturnPeriod] = useState<'7d' | '30d' | '60d' | '90d' | '120d'>('30d');

  // Add tab selector state
  const [activeTab, setActiveTab] = useState<'combined' | 'ledger' | 'solo' | 'deleted'>('combined');

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

  // Theme detection for heatmaps
  const [isDark, setIsDark] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Add prices loaded state
  const [pricesLoaded, setPricesLoaded] = useState(false);

  // Add deleted staking items state
  const [deletedStakingItems, setDeletedStakingItems] = useState<StakingItem[]>(() => {
    const saved = storage.load('deletedStakingData');
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return [];
  });

  // Filter staking items based on active tab
  const filteredStakingItems = useMemo(() => {
    if (activeTab === 'combined') {
      return sortedStakingItems;
    } else if (activeTab === 'ledger') {
      return sortedStakingItems.filter(({ item }) => !item.account.toLowerCase().startsWith('solo'));
    } else if (activeTab === 'solo') {
      return sortedStakingItems.filter(({ item }) => item.account.toLowerCase().startsWith('solo'));
    } else if (activeTab === 'deleted') {
      // For deleted tab, we need to sort deleted items by their value
      return deletedStakingItems
        .map((item, idx) => {
          const totalQuantity = parseFloat(item.stakedQuantity || '0') + parseFloat(item.unclaimedQuantity || '0');
          const itemValue = totalQuantity * parseFloat(item.price || '0');
          const percentOfTotal = deletedStakingItems.reduce((sum, delItem) => {
            const delTotalQuantity = parseFloat(delItem.stakedQuantity || '0') + parseFloat(delItem.unclaimedQuantity || '0');
            return sum + (delTotalQuantity * parseFloat(delItem.price || '0'));
          }, 0) > 0 ? (itemValue / deletedStakingItems.reduce((sum, delItem) => {
            const delTotalQuantity = parseFloat(delItem.stakedQuantity || '0') + parseFloat(delItem.unclaimedQuantity || '0');
            return sum + (delTotalQuantity * parseFloat(delItem.price || '0'));
          }, 0)) * 100 : 0;
          return { item, idx, percentOfTotal };
        })
        .sort((a, b) => b.percentOfTotal - a.percentOfTotal)
        .map(({ item, idx }) => ({ item, idx }));
    }
    return sortedStakingItems;
  }, [sortedStakingItems, activeTab, deletedStakingItems]);

  // Calculate filtered totals
  const filteredCalculatedValues = useMemo(() => {
    if (activeTab === 'deleted') {
      return deletedStakingItems.map(item => {
        const totalQuantity = parseFloat(item.stakedQuantity || '0') + parseFloat(item.unclaimedQuantity || '0');
        const itemValue = totalQuantity * parseFloat(item.price || '0');
        return { totalQuantity, itemValue };
      });
    }
    return filteredStakingItems.map(({ idx }) => calculatedValues[idx]);
  }, [filteredStakingItems, calculatedValues, activeTab, deletedStakingItems]);

  const filteredTotalValue = useMemo(() => {
    return filteredCalculatedValues.reduce((sum, { itemValue }) => sum + itemValue, 0);
  }, [filteredCalculatedValues]);

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
        if (user) {
          // For SIWS, we work with local storage only
        }

        // Always load prices (if API available)
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

  // Listen for theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const fetchPriceData = useCallback(async () => {
    if (!isAuthenticated) {
      setPriceUpdateError('User not authenticated');
      setPricesLoaded(true);
      return;
    }

    setPriceUpdateError(null);
    try {
      // Get unique symbols from staking items
      const symbols = [...new Set(stakingItems.map(item => item.ticker))];

      if (symbols.length === 0) {
        setPricesLoaded(true);
        return;
      }

      // Fetch price and return data from API
      const username = user?.name || walletAddress || '';
      const response = await fetch(`${API_BASE_URL}/prices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch staking data: ${response.status}`);
      }

      const data = await response.json();

      // Update staking items with the fetched data
      if (data.prices && data.returns) {
        const updatedItems = stakingItems.map(item => {
          const symbol = item.ticker.toLowerCase();
          const price = data.prices[symbol];
          const return30d = data.returns[symbol];

          if (price !== undefined) {
            return {
              ...item,
              price: price.toString(),
              return30d: return30d !== undefined ? return30d.toString() : item.return30d,
              priceLastUpdated: new Date().toISOString()
            };
          }
          return item;
        });

        setStakingItems(updatedItems);
        storage.save('stakingData', updatedItems);
        setPriceUpdateDate(new Date().toLocaleString());
        showStatus('Staking data updated successfully', 'success');
      }
    } catch (err) {
      console.error('Error fetching staking data:', err);
      setPriceUpdateError(`Failed to load staking data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      showStatus('Failed to load staking data - working in offline mode', 'error');
    } finally {
      setPricesLoaded(true);
    }
  }, [isAuthenticated, user?.name, walletAddress, stakingItems, showStatus]);

  // Update staking items with latest prices and returns
  const updateStakingPrices = (prices: PriceData, returns: ReturnData, date: string) => {
    const updatedItems = stakingItems.map(item => {
      const ticker = item.ticker.toLowerCase();
      if (prices[ticker] !== undefined) {
        return {
          ...item,
          price: prices[ticker].toString(),
          return7d: returns[`${ticker}_7d`] !== undefined ? returns[`${ticker}_7d`].toString() : item.return7d,
          return30d: returns[`${ticker}_30d`] !== undefined ? returns[`${ticker}_30d`].toString() : item.return30d,
          return60d: returns[`${ticker}_60d`] !== undefined ? returns[`${ticker}_60d`].toString() : item.return60d,
          return90d: returns[`${ticker}_90d`] !== undefined ? returns[`${ticker}_90d`].toString() : item.return90d,
          return120d: returns[`${ticker}_120d`] !== undefined ? returns[`${ticker}_120d`].toString() : item.return120d,
          priceLastUpdated: date
        };
      }
      return item;
    });

    setStakingItems(updatedItems);
  };

  // Helper function to format numbers
  const formatNumber = (value: number, decimals: number = 2): string => {
    if (isNaN(value)) return '0';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Handle input changes for the new item form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Add a new staking item
  const addStakingItem = () => {
    if (!newItem.ticker || !newItem.account) {
      showStatus('Please fill in ticker and account', 'error');
      return;
    }

    const itemToAdd: StakingItem = {
      ...newItem,
      username: user?.name || '',
      price: newItem.price || '0',
      return7d: newItem.return7d || '0',
      return30d: newItem.return30d || '0',
      return60d: newItem.return60d || '0',
      return90d: newItem.return90d || '0',
      return120d: newItem.return120d || '0',
    };

    const updatedItems = [...stakingItems, itemToAdd];
    setStakingItems(updatedItems);
    storage.save('stakingData', updatedItems);

    // Reset form
    setNewItem({
      account: '',
      ticker: '',
      stakedQuantity: '0',
      unclaimedQuantity: '0',
      price: '0',
      stakingUrl: ''
    });

    showStatus('Staking item added successfully', 'success');
  };

  // Remove a staking item
  const removeStakingItem = (index: number) => {
    const itemToRemove = stakingItems[index];
    const updatedDeletedItems = [...deletedStakingItems, itemToRemove];
    setDeletedStakingItems(updatedDeletedItems);
    storage.save('deletedStakingData', updatedDeletedItems);

    const updatedItems = stakingItems.filter((_, i) => i !== index);
    setStakingItems(updatedItems);
    storage.save('stakingData', updatedItems);

    showStatus('Item moved to deleted', 'success');
  };

  // Restore deleted staking items
  const restoreStakingItems = (index: number) => {
    const itemToRestore = deletedStakingItems[index];
    const updatedItems = [...stakingItems, itemToRestore];
    setStakingItems(updatedItems);
    storage.save('stakingData', updatedItems);

    const updatedDeletedItems = deletedStakingItems.filter((_, i) => i !== index);
    setDeletedStakingItems(updatedDeletedItems);
    storage.save('deletedStakingData', updatedDeletedItems);

    showStatus('Item restored successfully', 'success');
  };

  // Start editing an item
  const startEditing = (index: number) => {
    setEditIndex(index);
    setEditItem({ ...stakingItems[index] });
  };

  // Save edit
  const saveEdit = () => {
    if (editIndex !== null && editItem) {
      const updatedItems = [...stakingItems];
      updatedItems[editIndex] = { ...editItem, username: user?.name || '' };
      setStakingItems(updatedItems);
      storage.save('stakingData', updatedItems);
      setEditIndex(null);
      setEditItem(null);
      showStatus('Item updated successfully', 'success');
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditIndex(null);
    setEditItem(null);
  };

  // Render editable cell
  const renderEditableCell = (field: keyof StakingItem, item: StakingItem, index: number, isNumeric?: boolean, hideWhenPrivate?: boolean) => {
    if (editIndex === index && editItem) {
      return (
        <input
          type={isNumeric ? "number" : "text"}
          name={field}
          value={editItem[field] || ''}
          onChange={(e) => editItem && setEditItem({...editItem, [field]: e.target.value})}
          step={isNumeric ? "any" : undefined}
          className={`w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 ${hideWhenPrivate && hideValues ? 'blur-sm' : ''}`}
        />
      );
    } else {
      const value = item[field];
      let displayValue: string;
      if (hideWhenPrivate && hideValues) {
        displayValue = '***';
      } else if (value) {
        if (isNumeric && (field === 'stakedQuantity' || field === 'unclaimedQuantity' || field === 'price')) {
          displayValue = field === 'price' ? `$${formatNumber(parseFloat(value), 2)}` : formatNumber(parseFloat(value), 2);
        } else {
          displayValue = value;
        }
      } else {
        displayValue = 'N/A';
      }
      return (
        <div
          onClick={() => startEditing(index)}
          className="cursor-pointer editable-cell hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-1 py-1"
          title={value ? `Click to edit ${field}` : `No ${field} specified`}
        >
          {displayValue}
        </div>
      );
    }
  };

  // Refresh from API (placeholder for SIWS)
  const refreshFromAPI = () => {
    showStatus('SIWS mode - no API sync available', 'success');
  };

  // Update all items with username
  const updateAllItemsWithUsername = () => {
    const updatedItems = stakingItems.map(item => ({
      ...item,
      username: user?.name || ''
    }));
    setStakingItems(updatedItems);
    storage.save('stakingData', updatedItems);
    showStatus('All items updated with username', 'success');
  };

  // Add this button to your UI near the other action buttons
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staking Value</h1>
        <div className="flex gap-2 flex-wrap">
          {/* Return period selector */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">Return:</span>
            {(['7d', '30d', '60d', '90d', '120d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedReturnPeriod(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  selectedReturnPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {period}
              </button>
            ))}
          </div>

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
                  value={user?.name || 'Not logged in'}
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
          {isAuthenticated
            ? `No staking assets found${user ? ` for ${user.name}` : walletAddress ? ` for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}. ${Object.keys(priceData).length} prices loaded.`
            : 'Please log in to view staking data.'
          }
        </div>
      ) : (
        <div>
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'combined' | 'ledger' | 'solo' | 'deleted')} className="mb-6">
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="combined">
                Combined ({stakingItems.length})
              </TabsTrigger>
              <TabsTrigger value="ledger">
                Ledger ({stakingItems.filter(item => !item.account.toLowerCase().startsWith('solo')).length})
              </TabsTrigger>
              <TabsTrigger value="solo">
                Solo ({stakingItems.filter(item => item.account.toLowerCase().startsWith('solo')).length})
              </TabsTrigger>
              <TabsTrigger value="deleted">
                Deleted ({deletedStakingItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="combined" className="mt-6">
              <StakingTableContent
                filteredStakingItems={filteredStakingItems}
                filteredCalculatedValues={filteredCalculatedValues}
                filteredTotalValue={filteredTotalValue}
                activeTab={activeTab}
                selectedReturnPeriod={selectedReturnPeriod}
                hideValues={hideValues}
                editIndex={editIndex}
                editItem={editItem}
                setEditItem={setEditItem}
                renderEditableCell={renderEditableCell}
                saveEdit={saveEdit}
                cancelEditing={cancelEditing}
                removeStakingItem={removeStakingItem}
                startEditing={startEditing}
                formatNumber={formatNumber}
              />
            </TabsContent>

            <TabsContent value="ledger" className="mt-6">
              <StakingTableContent
                filteredStakingItems={filteredStakingItems}
                filteredCalculatedValues={filteredCalculatedValues}
                filteredTotalValue={filteredTotalValue}
                activeTab={activeTab}
                selectedReturnPeriod={selectedReturnPeriod}
                hideValues={hideValues}
                editIndex={editIndex}
                editItem={editItem}
                setEditItem={setEditItem}
                renderEditableCell={renderEditableCell}
                saveEdit={saveEdit}
                cancelEditing={cancelEditing}
                removeStakingItem={removeStakingItem}
                startEditing={startEditing}
                formatNumber={formatNumber}
              />
            </TabsContent>

            <TabsContent value="solo" className="mt-6">
              <StakingTableContent
                filteredStakingItems={filteredStakingItems}
                filteredCalculatedValues={filteredCalculatedValues}
                filteredTotalValue={filteredTotalValue}
                activeTab={activeTab}
                selectedReturnPeriod={selectedReturnPeriod}
                hideValues={hideValues}
                editIndex={editIndex}
                editItem={editItem}
                setEditItem={setEditItem}
                renderEditableCell={renderEditableCell}
                saveEdit={saveEdit}
                cancelEditing={cancelEditing}
                removeStakingItem={removeStakingItem}
                startEditing={startEditing}
                formatNumber={formatNumber}
              />
            </TabsContent>

            <TabsContent value="deleted" className="mt-6">
              <DeletedStakingTableContent
                filteredStakingItems={filteredStakingItems}
                filteredCalculatedValues={filteredCalculatedValues}
                filteredTotalValue={filteredTotalValue}
                selectedReturnPeriod={selectedReturnPeriod}
                hideValues={hideValues}
                restoreStakingItems={restoreStakingItems}
                formatNumber={formatNumber}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Staking Performance Treemap */}
      {pricesLoaded && filteredStakingItems.length > 0 && activeTab !== 'deleted' && (
        <div className="mb-8">
          <StakingTreemap
            title={`${selectedReturnPeriod} Return - ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
            items={filteredStakingItems.map(({ item }) => item)}
            calculatedValues={filteredCalculatedValues}
            isDark={isDark}
            hideValues={hideValues}
            selectedReturnPeriod={selectedReturnPeriod}
          />
        </div>
      )}

      {!pricesLoaded && filteredStakingItems.length > 0 && (
        <div className="mb-8 text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              Loading price data for charts...
            </span>
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
