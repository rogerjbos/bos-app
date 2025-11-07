import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import * as echarts from 'echarts';
import React, { useEffect, useMemo, useState } from 'react';
import { FaChartLine, FaSync, FaTable } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useWalletAuthContext } from '../providers/WalletAuthProvider';

// Types for the decision data
interface Decision {
  ticker: string;
  strategy: string;
  date: string;
  action: string;
}

// // Types for returns data
interface CryptoReturns {
  date: string;
  baseCurrency: string;
  quoteCurrency: string;
  daily_return?: number;
}

interface StockReturns {
  date: string;
  symbol: string;
  daily_return?: number;
}

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const Backtester: React.FC = () => {
  const { user } = useAuth();
  const { getAccessToken, refreshToken } = useWalletAuthContext();
  const [activeTab, setActiveTab] = useState<'stocks' | 'crypto'>('stocks');

  // Data states
  const [stockTickers, setStockTickers] = useState<string[]>([]);
  const [cryptoTickers, setCryptoTickers] = useState<string[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [returnsData, setReturnsData] = useState<CryptoReturns[] | StockReturns[]>([]);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');

  // Loading states
  const [loadingTickers, setLoadingTickers] = useState(false);
  const [loadingDecisions, setLoadingDecisions] = useState(false);
  const [loadingReturns, setLoadingReturns] = useState(false);

  // Error states
  const [error, setError] = useState<string>('');

  // Helper function to get a valid access token (refresh if expired)
  const getValidAccessToken = async (): Promise<string | null> => {
    const token = getAccessToken();
    if (!token) return null;

    try {
      // Decode token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;

      // If token expires within 5 minutes, refresh it
      if (payload.exp && payload.exp - currentTime < 300) {
        const refreshedUser = await refreshToken();
        if (refreshedUser) {
          const newToken = getAccessToken();
          return newToken;
        } else {
          return null;
        }
      }

      return token;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return null;
    }
  };

  // Get available tickers
  const fetchTickers = async (assetType: 'stocks' | 'crypto') => {
    setLoadingTickers(true);
    setError('');
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(`${API_BASE_URL}/backtester_decisions/${assetType}/tickers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${assetType} tickers`);
      }
      const data = await response.json();
      if (assetType === 'stocks') {
        setStockTickers(data);
      } else {
        setCryptoTickers(data);
      }
    } catch (err) {
      setError(`Failed to load ${assetType} tickers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingTickers(false);
    }
  };

  // Get decision data for a ticker
  const fetchDecisions = async (assetType: 'stocks' | 'crypto', ticker: string) => {
    setLoadingDecisions(true);
    setError('');
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(`${API_BASE_URL}/backtester_decisions/${assetType}/${ticker}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${assetType} decisions for ${ticker}`);
      }
      const data: Decision[] = await response.json();
      setDecisions(data);

      // Extract unique strategies
      const uniqueStrategies = [...new Set(data.map(d => d.strategy))].sort();
      setStrategies(uniqueStrategies);
      setSelectedStrategy(uniqueStrategies[0] || '');
    } catch (err) {
      setError(`Failed to load decisions: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingDecisions(false);
    }
  };

  // Get returns data for analysis
  const fetchReturnsData = async (assetType: 'stocks' | 'crypto', ticker: string) => {
    setLoadingReturns(true);
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const endpoint = assetType === 'stocks' ? 'stock_returns' : 'crypto_returns';
      const paramName = assetType === 'stocks' ? 'symbols' : 'baseCurrencies';
      const url = `${API_BASE_URL}/${endpoint}?${paramName}=${encodeURIComponent(ticker)}`;

      // Get data for the entire period covered by the decision data
      const endDate = new Date().toISOString().split('T')[0];
      // Find the earliest date from the decision data
      const minDecisionDate = filteredDecisions.length > 0
        ? filteredDecisions.reduce((min, decision) =>
            new Date(decision.date) < new Date(min) ? decision.date : min,
            filteredDecisions[0].date
          )
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // fallback to 1 year back
      const startDate = minDecisionDate;
      const fullUrl = `${url}&start_date=${startDate}&end_date=${endDate}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch returns data`);
      }
      const data = await response.json();
      setReturnsData(data);
    } catch (err) {
      console.warn(`Failed to load returns data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Don't set error state for returns data as it's not critical
    } finally {
      setLoadingReturns(false);
    }
  };

  // Initialize data when component mounts
  useEffect(() => {
    fetchTickers('stocks');
    fetchTickers('crypto');
  }, []);

  // Load decisions when ticker changes
  useEffect(() => {
    if (selectedTicker) {
      fetchDecisions(activeTab, selectedTicker);
      fetchReturnsData(activeTab, selectedTicker);
    }
  }, [selectedTicker, activeTab]);

  // Filter decisions by selected strategy
  const filteredDecisions = useMemo(() => {
    if (!selectedStrategy) return decisions;
    return decisions.filter(d => d.strategy === selectedStrategy);
  }, [decisions, selectedStrategy]);

  // Calculate returns for buy-sell pairs
  const tradeReturns = useMemo(() => {
    const returns: Array<{
      buyDate: string;
      sellDate: string;
      buyPrice?: number;
      sellPrice?: number;
      return: number;
      duration: number; // days
    }> = [];

    const buys: Decision[] = [];
    const currentAssetType = activeTab;

    for (const decision of filteredDecisions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      if (decision.action.toLowerCase() === 'buy') {
        buys.push(decision);
      } else if (decision.action.toLowerCase() === 'sell' && buys.length > 0) {
        const buy = buys.pop()!;
        const buyDate = new Date(buy.date);
        const sellDate = new Date(decision.date);
        const duration = Math.ceil((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));

        let tradeReturn = 0;

        // Calculate cumulative return using daily returns data
        if (currentAssetType === 'stocks') {
          const stockReturns = returnsData as StockReturns[];
          // Filter returns data for the period between buy and sell dates
          const periodReturns = stockReturns
            .filter(r => r.symbol === decision.ticker &&
                        new Date(r.date) >= buyDate &&
                        new Date(r.date) <= sellDate &&
                        r.daily_return !== null &&
                        r.daily_return !== undefined)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (periodReturns.length > 0) {
            // Calculate cumulative return: exp(sum(log(1+daily_return))) - 1
            const logReturns = periodReturns.map(r => Math.log(1 + (r.daily_return || 0) / 100));
            const sumLogReturns = logReturns.reduce((sum, val) => sum + val, 0);
            tradeReturn = (Math.exp(sumLogReturns) - 1) * 100;
          }
        } else {
          const cryptoReturns = returnsData as CryptoReturns[];
          // Filter returns data for the period between buy and sell dates
          const periodReturns = cryptoReturns
            .filter(r => r.baseCurrency === decision.ticker &&
                        new Date(r.date) >= buyDate &&
                        new Date(r.date) <= sellDate &&
                        r.daily_return !== null &&
                        r.daily_return !== undefined)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (periodReturns.length > 0) {
            // Calculate cumulative return: exp(sum(log(1+daily_return))) - 1
            const logReturns = periodReturns.map(r => Math.log(1 + (r.daily_return || 0) / 100));
            const sumLogReturns = logReturns.reduce((sum, val) => sum + val, 0);
            tradeReturn = (Math.exp(sumLogReturns) - 1) * 100;
          }
        }

        returns.push({
          buyDate: buy.date,
          sellDate: decision.date,
          buyPrice: undefined, // Not using individual prices anymore
          sellPrice: undefined,
          return: tradeReturn,
          duration
        });
      }
    }

    return returns;
  }, [filteredDecisions, returnsData, activeTab]);

  // Create ECharts timeline visualization
  const createTimelineChart = (containerId: string) => {
    const chartDom = document.getElementById(containerId);
    if (!chartDom) return;

    const chart = echarts.init(chartDom);

    // Prepare data for timeline
    const timelineData = filteredDecisions.map((decision, index) => ({
      name: `${decision.action.toUpperCase()} ${decision.date}`,
      value: [new Date(decision.date).getTime(), decision.action === 'buy' ? 1 : -1],
      itemStyle: {
        color: decision.action === 'buy' ? '#10b981' : '#ef4444'
      }
    }));

    const option = {
      title: {
        text: `${selectedTicker} - ${selectedStrategy} Trading Timeline`,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const date = new Date(params.value[0]).toLocaleDateString();
          const action = params.value[1] === 1 ? 'BUY' : 'SELL';
          return `${action} on ${date}`;
        }
      },
      xAxis: {
        type: 'time',
        name: 'Date',
        nameLocation: 'middle',
        nameGap: 30
      },
      yAxis: {
        type: 'category',
        data: [''],
        axisLabel: {
          show: false
        }
      },
      series: [{
        type: 'scatter',
        data: timelineData,
        symbolSize: 12,
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff'
        }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  // Create ECharts returns bar chart
  const createReturnsChart = (containerId: string) => {
    const chartDom = document.getElementById(containerId);
    if (!chartDom) return;

    const chart = echarts.init(chartDom);

    const returnsData = tradeReturns.map((trade, index) => ({
      name: `Trade ${index + 1}`,
      value: trade.return,
      itemStyle: {
        color: trade.return >= 0 ? '#10b981' : '#ef4444'
      }
    }));

    const option = {
      title: {
        text: `${selectedTicker} Trade Returns`,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const trade = tradeReturns[params.dataIndex];
          return `Return: ${params.value.toFixed(2)}%<br/>Buy: ${trade.buyDate}<br/>Sell: ${trade.sellDate}<br/>Duration: ${trade.duration} days`;
        }
      },
      xAxis: {
        type: 'category',
        data: returnsData.map(d => d.name)
      },
      yAxis: {
        type: 'value',
        name: 'Return (%)',
        nameLocation: 'middle',
        nameGap: 50
      },
      series: [{
        type: 'bar',
        data: returnsData,
        itemStyle: {
          borderRadius: [2, 2, 0, 0]
        }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  // Initialize charts when data changes
  useEffect(() => {
    if (filteredDecisions.length > 0) {
      const timelineChart = createTimelineChart('timeline-chart');
      const returnsChart = createReturnsChart('returns-chart');

      return () => {
        timelineChart?.dispose();
        returnsChart?.dispose();
      };
    }
  }, [filteredDecisions, tradeReturns, selectedTicker, selectedStrategy]);

  const currentTickers = activeTab === 'stocks' ? stockTickers : cryptoTickers;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Backtester Analysis</h1>
          <button
            onClick={() => {
              fetchTickers(activeTab);
              if (selectedTicker) {
                fetchDecisions(activeTab, selectedTicker);
                fetchReturnsData(activeTab, selectedTicker);
              }
            }}
            disabled={loadingTickers || loadingDecisions || loadingReturns}
            className="inline-flex items-center px-4 py-2 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-md text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaSync className={`mr-2 ${loadingTickers || loadingDecisions ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Asset Type Selection */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'stocks' | 'crypto');
            setSelectedTicker('');
            setDecisions([]);
            setStrategies([]);
            setSelectedStrategy('');
          }}>
            <TabsList className="mb-4">
              <TabsTrigger value="stocks">Stocks</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
            </TabsList>

            <TabsContent value="stocks" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Stock Ticker
                  </label>
                  <select
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingTickers}
                  >
                    <option value="">Select a ticker...</option>
                    {stockTickers.map(ticker => (
                      <option key={ticker} value={ticker}>{ticker}</option>
                    ))}
                  </select>
                </div>

                {strategies.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Strategy
                    </label>
                    <select
                      value={selectedStrategy}
                      onChange={(e) => setSelectedStrategy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {strategies.map(strategy => (
                        <option key={strategy} value={strategy}>{strategy}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-end">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {loadingDecisions && <span>Loading decisions...</span>}
                    {loadingReturns && <span>Loading returns data...</span>}
                    {decisions.length > 0 && !loadingDecisions && !loadingReturns && (
                      <span>{filteredDecisions.length} decisions loaded</span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="crypto" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Crypto Ticker
                  </label>
                  <select
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingTickers}
                  >
                    <option value="">Select a ticker...</option>
                    {cryptoTickers.map(ticker => (
                      <option key={ticker} value={ticker}>{ticker}</option>
                    ))}
                  </select>
                </div>

                {strategies.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Strategy
                    </label>
                    <select
                      value={selectedStrategy}
                      onChange={(e) => setSelectedStrategy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {strategies.map(strategy => (
                        <option key={strategy} value={strategy}>{strategy}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-end">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {loadingDecisions && <span>Loading decisions...</span>}
                    {loadingReturns && <span>Loading returns data...</span>}
                    {decisions.length > 0 && !loadingDecisions && !loadingReturns && (
                      <span>{filteredDecisions.length} decisions loaded</span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Charts Section */}
        {filteredDecisions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FaChartLine className="mr-2" />
                Trading Timeline
              </h3>
              <div id="timeline-chart" className="w-full h-80"></div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FaChartLine className="mr-2" />
                Trade Returns
              </h3>
              <div id="returns-chart" className="w-full h-80"></div>
            </div>
          </div>
        )}

        {/* Data Table */}
        {filteredDecisions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <FaTable className="mr-2" />
                Decision Data - {selectedTicker} ({selectedStrategy})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Strategy
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDecisions.map((decision, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(decision.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          decision.action.toLowerCase() === 'buy'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {decision.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {decision.strategy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        {tradeReturns.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Trades</h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tradeReturns.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Winning Trades</h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {tradeReturns.filter(t => t.return > 0).length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Losing Trades</h4>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {tradeReturns.filter(t => t.return < 0).length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Return</h4>
              <p className={`text-2xl font-bold ${
                tradeReturns.reduce((sum, t) => sum + t.return, 0) / tradeReturns.length >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {(tradeReturns.reduce((sum, t) => sum + t.return, 0) / tradeReturns.length).toFixed(2)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Backtester;
