import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import * as echarts from 'echarts';
import React, { useEffect, useMemo, useState } from 'react';
import { FaSync } from 'react-icons/fa';
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
  const [datasets, setDatasets] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');

  // Loading states
  const [loadingTickers, setLoadingTickers] = useState(false);
  const [loadingDecisions, setLoadingDecisions] = useState(false);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [loadingDatasets, setLoadingDatasets] = useState(false);

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

  // Get available datasets
  const fetchDatasets = async () => {
    setLoadingDatasets(true);
    setError('');
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(`${API_BASE_URL}/backtester_decisions/datasets`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      const data = await response.json();
      setDatasets(data);
      // Auto-select first dataset if available
      if (data.length > 0 && !selectedDataset) {
        setSelectedDataset(data[0]);
      }
    } catch (err) {
      setError(`Failed to load datasets: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoadingDatasets(false);
    }
  };

  // Get available tickers
  const fetchTickers = async (assetType: 'stocks' | 'crypto', dataset: string) => {
    if (!dataset) return;

    setLoadingTickers(true);
    setError('');
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(`${API_BASE_URL}/backtester_decisions/${assetType}/tickers?dataset=${encodeURIComponent(dataset)}`, {
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
  const fetchDecisions = async (assetType: 'stocks' | 'crypto', ticker: string, dataset: string) => {
    if (!dataset) return;

    setLoadingDecisions(true);
    setError('');
    try {
      const accessToken = await getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(`${API_BASE_URL}/backtester_decisions/${assetType}/${ticker}?dataset=${encodeURIComponent(dataset)}`, {
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
      const minDecisionDate = decisions.length > 0
        ? decisions.reduce((min, decision) =>
            new Date(decision.date + 'T00:00:00Z') < new Date(min + 'T00:00:00Z') ? decision.date : min,
            decisions[0].date
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
    fetchDatasets();
  }, []);

  // Load tickers when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      fetchTickers('stocks', selectedDataset);
      fetchTickers('crypto', selectedDataset);
    }
  }, [selectedDataset]);

  // Load decisions when ticker changes
  useEffect(() => {
    if (selectedTicker && selectedDataset) {
      fetchDecisions(activeTab, selectedTicker, selectedDataset);
    }
  }, [selectedTicker, activeTab, selectedDataset]);

  // Load returns data after decisions are loaded
  useEffect(() => {
    if (selectedTicker && decisions.length > 0) {
      fetchReturnsData(activeTab, selectedTicker);
    }
  }, [selectedTicker, activeTab, decisions.length]);

  // Group decisions by strategy
  const decisionsByStrategy = useMemo(() => {
    const grouped: Record<string, Decision[]> = {};
    decisions.forEach(decision => {
      if (!grouped[decision.strategy]) {
        grouped[decision.strategy] = [];
      }
      grouped[decision.strategy].push(decision);
    });

    console.log('All decisions:', decisions);
    console.log('Decisions by strategy:', grouped);

    return grouped;
  }, [decisions]);

  // Calculate data for each strategy
  const strategyData = useMemo(() => {
    const data: Record<string, {
      tradeReturns: Array<{
        periodType: 'held' | 'not_held';
        startDate: string;
        endDate: string;
        return: number;
        duration: number;
        periodLabel: string;
      }>;
      dailyReturns: Array<{
        date: string;
        dailyReturn: number;
        periodType: 'held' | 'not_held';
        timestamp: number;
      }>;
      overallStats: {
        heldCumulativeReturn: number;
        buyAndHoldReturn: number;
      };
    }> = {};

    Object.entries(decisionsByStrategy).forEach(([strategyName, strategyDecisions]) => {
      // Calculate trade returns for this strategy
      const returns: Array<{
        periodType: 'held' | 'not_held';
        startDate: string;
        endDate: string;
        return: number;
        duration: number;
        periodLabel: string;
      }> = [];

      if (strategyDecisions.length === 0) {
        data[strategyName] = { tradeReturns: returns, dailyReturns: [], overallStats: { heldCumulativeReturn: 0, buyAndHoldReturn: 0 } };
        return;
      }

      // Sort decisions by date
      const sortedDecisions = [...strategyDecisions].sort((a, b) => {
        const dateA = new Date(a.date + 'T00:00:00Z').getTime();
        const dateB = new Date(b.date + 'T00:00:00Z').getTime();
        return dateA - dateB;
      });

      const currentAssetType = activeTab;
      const ticker = sortedDecisions[0].ticker;

      // Helper function to calculate cumulative return for a date range
      const calculateCumulativeReturn = (startDate: Date, endDate: Date) => {
        let cumulativeReturn = 0;

        if (currentAssetType === 'stocks') {
          const stockReturns = returnsData as StockReturns[];
          const periodReturns = stockReturns
            .filter(r => {
              const rDate = new Date(r.date + 'T00:00:00Z');
              return r.symbol === ticker &&
                     rDate >= startDate &&
                     rDate <= endDate &&
                     r.daily_return !== null &&
                     r.daily_return !== undefined;
            })
            .sort((a, b) => {
              const dateA = new Date(a.date + 'T00:00:00Z').getTime();
              const dateB = new Date(b.date + 'T00:00:00Z').getTime();
              return dateA - dateB;
            });

          if (periodReturns.length > 0) {
            const logReturns = periodReturns.map(r => Math.log(1 + (r.daily_return || 0) / 100));
            const sumLogReturns = logReturns.reduce((sum, val) => sum + val, 0);
            cumulativeReturn = (Math.exp(sumLogReturns) - 1) * 100;
          }
        } else {
          const cryptoReturns = returnsData as CryptoReturns[];
          const periodReturns = cryptoReturns
            .filter(r => {
              const rDate = new Date(r.date + 'T00:00:00Z');
              return r.baseCurrency === ticker &&
                     rDate >= startDate &&
                     rDate <= endDate &&
                     r.daily_return !== null &&
                     r.daily_return !== undefined;
            })
            .sort((a, b) => {
              const dateA = new Date(a.date + 'T00:00:00Z').getTime();
              const dateB = new Date(b.date + 'T00:00:00Z').getTime();
              return dateA - dateB;
            });

          if (periodReturns.length > 0) {
            const logReturns = periodReturns.map(r => Math.log(1 + (r.daily_return || 0) / 100));
            const sumLogReturns = logReturns.reduce((sum, val) => sum + val, 0);
            cumulativeReturn = (Math.exp(sumLogReturns) - 1) * 100;
          }
        }

        return cumulativeReturn;
      };

      // Calculate periods for this strategy
      const firstDecisionDate = new Date(sortedDecisions[0].date + 'T00:00:00Z');
      const dataStartDate = new Date(Math.min(...sortedDecisions.map(d => new Date(d.date + 'T00:00:00Z').getTime())));

      if (firstDecisionDate > dataStartDate) {
        const returnValue = calculateCumulativeReturn(dataStartDate, firstDecisionDate);
        const duration = Math.ceil((firstDecisionDate.getTime() - dataStartDate.getTime()) / (1000 * 60 * 60 * 24));

        if (duration > 0) {
          returns.push({
            periodType: 'not_held',
            startDate: dataStartDate.toISOString().split('T')[0],
            endDate: sortedDecisions[0].date,
            return: returnValue,
            duration,
            periodLabel: `Not Held ${returns.filter(r => r.periodType === 'not_held').length + 1}`
          });
        }
      }

      let positionHeld = false;
      let lastPositionChange = firstDecisionDate;

      for (let i = 0; i < sortedDecisions.length; i++) {
        const decision = sortedDecisions[i];
        const decisionDate = new Date(decision.date + 'T00:00:00Z');

        if (positionHeld && decisionDate > lastPositionChange) {
          const returnValue = calculateCumulativeReturn(lastPositionChange, decisionDate);
          const duration = Math.ceil((decisionDate.getTime() - lastPositionChange.getTime()) / (1000 * 60 * 60 * 24));

          if (duration > 0) {
            returns.push({
              periodType: 'held',
              startDate: lastPositionChange.toISOString().split('T')[0],
              endDate: decision.date,
              return: returnValue,
              duration,
              periodLabel: `Held ${returns.filter(r => r.periodType === 'held').length + 1}`
            });
          }
        }

        if (!positionHeld && decisionDate > lastPositionChange) {
          const returnValue = calculateCumulativeReturn(lastPositionChange, decisionDate);
          const duration = Math.ceil((decisionDate.getTime() - lastPositionChange.getTime()) / (1000 * 60 * 60 * 24));

          if (duration > 0) {
            returns.push({
              periodType: 'not_held',
              startDate: lastPositionChange.toISOString().split('T')[0],
              endDate: decision.date,
              return: returnValue,
              duration,
              periodLabel: `Not Held ${returns.filter(r => r.periodType === 'not_held').length + 1}`
            });
          }
        }

        if (decision.action.toLowerCase() === 'buy') {
          positionHeld = true;
        } else if (decision.action.toLowerCase() === 'sell') {
          positionHeld = false;
        }

        lastPositionChange = decisionDate;
      }

      // Handle final period
      const lastDecision = sortedDecisions[sortedDecisions.length - 1];
      const lastDecisionDate = new Date(lastDecision.date + 'T00:00:00Z');
      const endDate = new Date();

      if (positionHeld && endDate > lastDecisionDate) {
        const returnValue = calculateCumulativeReturn(lastDecisionDate, endDate);
        const duration = Math.ceil((endDate.getTime() - lastDecisionDate.getTime()) / (1000 * 60 * 60 * 24));

        if (duration > 0) {
          returns.push({
            periodType: 'held',
            startDate: lastDecision.date,
            endDate: endDate.toISOString().split('T')[0],
            return: returnValue,
            duration,
            periodLabel: `Held ${returns.filter(r => r.periodType === 'held').length + 1}`
          });
        }
      }

      // Calculate daily returns for this strategy
      const dailyData: Array<{
        date: string;
        dailyReturn: number;
        periodType: 'held' | 'not_held';
        timestamp: number;
      }> = [];

      if (strategyDecisions.length > 0 && returnsData.length > 0) {
        let allDailyReturns: Array<{date: string, daily_return: number}> = [];
        if (currentAssetType === 'stocks') {
          const stockReturns = returnsData as StockReturns[];
          allDailyReturns = stockReturns
            .filter(r => r.symbol === ticker && r.daily_return !== null && r.daily_return !== undefined)
            .map(r => ({date: r.date, daily_return: r.daily_return!}))
            .sort((a, b) => {
              const dateA = new Date(a.date + 'T00:00:00Z').getTime();
              const dateB = new Date(b.date + 'T00:00:00Z').getTime();
              return dateA - dateB;
            });
        } else {
          const cryptoReturns = returnsData as CryptoReturns[];
          allDailyReturns = cryptoReturns
            .filter(r => r.baseCurrency === ticker && r.daily_return !== null && r.daily_return !== undefined)
            .map(r => ({date: r.date, daily_return: r.daily_return!}))
            .sort((a, b) => {
              const dateA = new Date(a.date + 'T00:00:00Z').getTime();
              const dateB = new Date(b.date + 'T00:00:00Z').getTime();
              return dateA - dateB;
            });
        }

        if (allDailyReturns.length > 0) {
          // Create periods based on decisions
          const periods: Array<{
            startDate: Date;
            endDate: Date;
            type: 'held' | 'not_held';
          }> = [];

          const firstDecisionDate = new Date(sortedDecisions[0].date + 'T00:00:00Z');
          const dataStartDate = new Date(allDailyReturns[0].date + 'T00:00:00Z');

          if (firstDecisionDate > dataStartDate) {
            periods.push({
              startDate: dataStartDate,
              endDate: firstDecisionDate,
              type: 'not_held'
            });
          }

          let positionHeld = false;
          let lastPositionChange = firstDecisionDate;

          for (let i = 0; i < sortedDecisions.length; i++) {
            const decision = sortedDecisions[i];
            const decisionDate = new Date(decision.date + 'T00:00:00Z');

            if (positionHeld && decisionDate > lastPositionChange) {
              periods.push({
                startDate: lastPositionChange,
                endDate: decisionDate,
                type: 'held'
              });
            }

            if (!positionHeld && decisionDate > lastPositionChange) {
              periods.push({
                startDate: lastPositionChange,
                endDate: decisionDate,
                type: 'not_held'
              });
            }

            if (decision.action.toLowerCase() === 'buy') {
              positionHeld = true;
            } else if (decision.action.toLowerCase() === 'sell') {
              positionHeld = false;
            }

            lastPositionChange = decisionDate;
          }

          const lastDecision = sortedDecisions[sortedDecisions.length - 1];
          const lastDecisionDate = new Date(lastDecision.date + 'T00:00:00Z');
          const dataEndDate = new Date(allDailyReturns[allDailyReturns.length - 1].date + 'T00:00:00Z');

          if (positionHeld && dataEndDate > lastDecisionDate) {
            periods.push({
              startDate: lastDecisionDate,
              endDate: dataEndDate,
              type: 'held'
            });
          }

          // Classify each daily return
          allDailyReturns.forEach(daily => {
            const dailyDate = new Date(daily.date + 'T00:00:00Z');
            const period = periods.find(p =>
              dailyDate >= p.startDate && dailyDate <= p.endDate
            );

            if (period) {
              dailyData.push({
                date: daily.date,
                dailyReturn: daily.daily_return,
                periodType: period.type,
                timestamp: dailyDate.getTime()
              });
            }
          });
        }
      }

      // Calculate overall stats for this strategy
      const heldReturns = returns.filter(t => t.periodType === 'held');
      const heldCumulativeReturn = heldReturns.reduce((sum, period) => sum + period.return, 0);

      let buyAndHoldReturn = 0;
      if (currentAssetType === 'stocks') {
        const stockReturns = returnsData as StockReturns[];
        const sortedStockReturns = stockReturns
          .filter(r => r.symbol === ticker && r.daily_return !== null && r.daily_return !== undefined)
          .sort((a, b) => new Date(a.date + 'T00:00:00Z').getTime() - new Date(b.date + 'T00:00:00Z').getTime());

        if (sortedStockReturns.length > 1) {
          const logReturns = sortedStockReturns.map(r => Math.log(1 + (r.daily_return || 0) / 100));
          const sumLogReturns = logReturns.reduce((sum, val) => sum + val, 0);
          buyAndHoldReturn = (Math.exp(sumLogReturns) - 1) * 100;
        }
      } else {
        const cryptoReturns = returnsData as CryptoReturns[];
        const sortedCryptoReturns = cryptoReturns
          .filter(r => r.baseCurrency === ticker && r.daily_return !== null && r.daily_return !== undefined)
          .sort((a, b) => new Date(a.date + 'T00:00:00Z').getTime() - new Date(b.date + 'T00:00:00Z').getTime());

        if (sortedCryptoReturns.length > 1) {
          const logReturns = sortedCryptoReturns.map(r => Math.log(1 + (r.daily_return || 0) / 100));
          const sumLogReturns = logReturns.reduce((sum, val) => sum + val, 0);
          buyAndHoldReturn = (Math.exp(sumLogReturns) - 1) * 100;
        }
      }

      data[strategyName] = {
        tradeReturns: returns,
        dailyReturns: dailyData.sort((a, b) => a.timestamp - b.timestamp),
        overallStats: {
          heldCumulativeReturn,
          buyAndHoldReturn
        }
      };

      // Debug logging
      console.log(`Strategy: ${strategyName}`);
      console.log(`Decisions:`, sortedDecisions);
      console.log(`Trade Returns:`, returns);
      console.log(`Held Cumulative Return: ${heldCumulativeReturn}`);
      console.log(`Buy & Hold Return: ${buyAndHoldReturn}`);
    });

    return data;
  }, [decisionsByStrategy, returnsData, activeTab]);

  // Create ECharts period returns bar chart
  const createPeriodReturnsChart = (containerId: string, tradeReturns: any[]) => {
    const chartDom = document.getElementById(containerId);
    if (!chartDom) return;

    const chart = echarts.init(chartDom);

    // Calculate proportional bar widths based on duration
    const durations = tradeReturns.map(trade => trade.duration);
    const maxDuration = Math.max(...durations);

    const returnsData = tradeReturns.map((trade) => {
      // Calculate proportional bar width (minimum 20px, maximum 100px)
      const minBarWidth = 20;
      const maxBarWidth = 100;
      const barWidth = maxDuration > 0
        ? minBarWidth + ((trade.duration / maxDuration) * (maxBarWidth - minBarWidth))
        : minBarWidth;

      return {
        name: trade.periodLabel,
        value: trade.return,
        barWidth: Math.round(barWidth),
        itemStyle: {
          color: trade.periodType === 'not_held'
            ? '#9CA3AF' // grey for non-held periods
            : trade.return >= 0
              ? '#10B981' // green for positive held returns
              : '#EF4444' // red for negative held returns
        }
      };
    });

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
          shadowStyle: {
            color: 'rgba(99, 102, 241, 0.1)'
          }
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const trade = tradeReturns[params[0].dataIndex];
          return `${trade.periodLabel}<br/>Return: ${params[0].value.toFixed(2)}%<br/>Start: ${trade.startDate}<br/>End: ${trade.endDate}<br/>Duration: ${trade.duration} days`;
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        top: '10%',
        bottom: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: returnsData.map(d => d.name),
        axisLabel: {
          rotate: 45,
          interval: 0,
          fontSize: 10
        },
        axisPointer: {
          show: true,
          type: 'shadow'
        }
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
        barCategoryGap: '30%',
        itemStyle: {
          borderRadius: [2, 2, 0, 0]
        }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  // Create ECharts daily returns chart with background shading for held periods
  // Combined with cumulative returns line overlay
  const createDailyReturnsWithShadingChart = (containerId: string, dailyReturns: any[], decisions: any[], tradeReturns: any[]) => {
    const chartDom = document.getElementById(containerId);
    if (!chartDom) return;

    const chart = echarts.init(chartDom);

    const chartData = dailyReturns.map((day) => ({
      value: [day.timestamp, day.dailyReturn],
      itemStyle: {
        color: day.periodType === 'not_held'
          ? '#9CA3AF' // grey for non-held periods
          : day.dailyReturn >= 0
            ? '#10B981' // green for positive held returns
            : '#EF4444' // red for negative held returns
      }
    }));

    // Calculate cumulative returns for line overlay
    const sorted = [...dailyReturns].sort((a, b) => a.timestamp - b.timestamp);
    const decisionsSorted = [...decisions].sort((a, b) => new Date(a.date + 'T00:00:00Z').getTime() - new Date(b.date + 'T00:00:00Z').getTime());

    let decIndex = 0;
    let state: 'held' | 'not_held' = 'not_held';
    let cumulativeReturn = 0;

    const cumulativeData = sorted.map((d) => {
      const t = d.timestamp;

      // advance decisions up to current timestamp
      while (decIndex < decisionsSorted.length && new Date(decisionsSorted[decIndex].date + 'T00:00:00Z').getTime() <= t) {
        const action = (decisionsSorted[decIndex].action || '').toString().toLowerCase();
        if (action === 'buy') {
          state = 'held';
          cumulativeReturn = 0; // reset cumulative return at start of holding period
        }
        if (action === 'sell') {
          state = 'not_held';
          cumulativeReturn = 0; // reset for non-holding period
        }
        decIndex += 1;
      }

      // accumulate return during current period
      if (state === 'held') {
        cumulativeReturn += (d.dailyReturn ?? 0);
      }

      return {
        value: [d.timestamp, state === 'held' ? cumulativeReturn : null],
        itemStyle: {
          color: cumulativeReturn >= 0 ? '#10B981' : '#EF4444'
        }
      };
    });

    // Create markLines for buy/sell decisions
    const markLines = decisions.map((decision) => ({
      xAxis: new Date(decision.date + 'T00:00:00Z').getTime(),
      lineStyle: {
        color: decision.action.toLowerCase() === 'buy' ? '#10B981' : '#EF4444',
        width: 1,
        type: 'solid',
        opacity: 0.3
      },
      label: {
        show: true,
        position: 'top',
        formatter: decision.action.toUpperCase(),
        color: decision.action.toLowerCase() === 'buy' ? '#10B981' : '#EF4444',
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: [2, 4],
        borderRadius: 3
      }
    }));

    // Build validated markArea pairs for shading held/non-held periods.
    // Each item is an array of two points: [{ xAxis: start, itemStyle: { color }}, { xAxis: end }]
    const markAreas: any[] = [];
    let currentPeriod: string | null = null;
    let periodStart: number | null = null;
    let periodStartIndex: number | null = null;

    // Sort dailyReturns by timestamp to ensure proper ordering
    const sortedDailyReturns = [...dailyReturns].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sortedDailyReturns.length; i++) {
      const day = sortedDailyReturns[i];

      if (currentPeriod === null) {
        currentPeriod = day.periodType;
        periodStart = Number(day.timestamp);
        periodStartIndex = i;
        continue;
      }

      if (day.periodType !== currentPeriod) {
        const start = Number(periodStart);
        const end = Number(day.timestamp);

        // Validate timestamps
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
          // For held periods, decide green vs red by average daily return over the segment
          let color = 'rgba(147,197,253,0.25)'; // light blue for non-held periods

          if (currentPeriod === 'held') {
            const segment = sortedDailyReturns.slice(periodStartIndex ?? 0, i);
            const avg = segment.reduce((s, d) => s + (d.dailyReturn ?? 0), 0) / (segment.length || 1);
            color = avg >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
          }

          markAreas.push([
            { xAxis: start, itemStyle: { color } },
            { xAxis: end }
          ]);
        }

        // start new period
        currentPeriod = day.periodType;
        periodStart = Number(day.timestamp);
        periodStartIndex = i;
      }
    }

    // Close last period
    if (currentPeriod !== null && periodStart !== null && sortedDailyReturns.length > 0) {
      const lastDay = sortedDailyReturns[sortedDailyReturns.length - 1];
      const start = Number(periodStart);
      const end = Number(lastDay.timestamp);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
  let color = 'rgba(147,197,253,0.25)'; // light blue for non-held periods
        if (currentPeriod === 'held') {
          const segment = sortedDailyReturns.slice(periodStartIndex ?? 0, sortedDailyReturns.length);
          const avg = segment.reduce((s, d) => s + (d.dailyReturn ?? 0), 0) / (segment.length || 1);
          color = avg >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';
        }

        markAreas.push([
          { xAxis: start, itemStyle: { color } },
          { xAxis: end }
        ]);
      }
    }

    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'line',
          lineStyle: {
            color: '#6366F1',
            width: 2,
            type: 'solid'
          },
          label: {
            backgroundColor: '#6366F1'
          }
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const dataIndex = params[0].dataIndex;
          const day = sorted[dataIndex];
          const date = new Date(day.timestamp).toLocaleDateString();
          const periodType = day.periodType === 'held' ? 'Held' : 'Not Held';

          let tooltip = `${date}<br/>${periodType}<br/>`;
          tooltip += `Daily Return: ${day.dailyReturn.toFixed(2)}%<br/>`;

          // Add cumulative return if in held period
          const cumulativeValue = cumulativeData[dataIndex].value[1];
          if (cumulativeValue !== null) {
            tooltip += `Cumulative Return: ${cumulativeValue.toFixed(2)}%`;
          }

          return tooltip;
        }
      },
      axisPointer: {
        link: [{ xAxisIndex: 'all' }],
        label: {
          backgroundColor: '#6366F1'
        }
      },
      grid: {
        left: '5%',
        right: '8%',
        top: '10%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        name: 'Date',
        nameLocation: 'middle',
        nameGap: 30,
        axisPointer: {
          show: true,
          snap: true,
          label: {
            show: true,
            formatter: (params: any) => {
              return new Date(params.value).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
            }
          }
        },
        axisLabel: {
          formatter: (value: number) => {
            return new Date(value).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: '2-digit'
            });
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Daily Return (%)',
          nameLocation: 'middle',
          nameGap: 50,
          position: 'left'
        },
        {
          type: 'value',
          name: 'Cumulative Return (%)',
          nameLocation: 'middle',
          nameGap: 50,
          position: 'right'
        }
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0], start: 0, end: 100 },
        { type: 'slider', xAxisIndex: [0], start: 0, end: 100, height: 20, bottom: 6 }
      ],
      series: [
        {
          name: 'Daily Returns',
          type: 'bar',
          yAxisIndex: 0,
          data: chartData,
          barWidth: '80%',
          itemStyle: {
            borderRadius: [2, 2, 0, 0]
          },
          markLine: {
            data: markLines
          },
          markArea: {
            silent: true,
            data: markAreas
          }
        },
        {
          name: 'Cumulative Returns (Held)',
          type: 'line',
          yAxisIndex: 1,
          data: cumulativeData,
          lineStyle: {
            width: 3,
            type: 'solid'
          },
          showSymbol: false,
          connectNulls: false,
          emphasis: {
            lineStyle: {
              width: 4
            }
          }
        }
      ]
    };

    chart.setOption(option);
    return chart;
  };

  // Initialize charts when data changes
  useEffect(() => {
    if (Object.keys(strategyData).length > 0) {
      const allCharts: any[] = [];

      Object.entries(strategyData).forEach(([strategyName, data]) => {
        const dailyChart = createDailyReturnsWithShadingChart(
          `daily-returns-shading-chart-${strategyName}`,
          data.dailyReturns,
          decisionsByStrategy[strategyName] || [],
          data.tradeReturns
        );

        const periodChart = createPeriodReturnsChart(
          `period-returns-chart-${strategyName}`,
          data.tradeReturns
        );

        if (dailyChart) allCharts.push(dailyChart);
        if (periodChart) allCharts.push(periodChart);
      });

      // Group all charts for synchronization
      try {
        if (allCharts.length > 0) {
          const groupName = 'backtesterGroup';
          allCharts.forEach(chart => {
            (chart as any).group = groupName;
          });
          echarts.connect(groupName);
        }
      } catch (e) {
        // ignore if echarts.connect fails in some environments
      }

      return () => {
        // Cleanup all charts
        Object.keys(strategyData).forEach(strategyName => {
          const dailyElement = document.getElementById(`daily-returns-shading-chart-${strategyName}`);
          const periodElement = document.getElementById(`period-returns-chart-${strategyName}`);
          if (dailyElement) {
            const dailyChart = echarts.getInstanceByDom(dailyElement);
            dailyChart?.dispose();
          }
          if (periodElement) {
            const periodChart = echarts.getInstanceByDom(periodElement);
            periodChart?.dispose();
          }
        });
      };
    }
  }, [strategyData, decisionsByStrategy]);

  const currentTickers = activeTab === 'stocks' ? stockTickers : cryptoTickers;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Backtester Analysis</h1>
          <button
            onClick={() => {
              if (selectedDataset) {
                fetchTickers(activeTab, selectedDataset);
                if (selectedTicker) {
                  fetchDecisions(activeTab, selectedTicker, selectedDataset);
                  fetchReturnsData(activeTab, selectedTicker);
                }
              }
            }}
            disabled={loadingTickers || loadingDecisions || loadingReturns || !selectedDataset}
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

        {/* Dataset Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Dataset
          </label>
          <select
            value={selectedDataset}
            onChange={(e) => {
              setSelectedDataset(e.target.value);
              setSelectedTicker('');
              setDecisions([]);
              setStrategies([]);
            }}
            className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loadingDatasets}
          >
            <option value="">Select a dataset...</option>
            {datasets.map(dataset => (
              <option key={dataset} value={dataset}>{dataset}</option>
            ))}
          </select>
          {loadingDatasets && <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading datasets...</span>}
        </div>

        {/* Asset Type Selection */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'stocks' | 'crypto');
            setSelectedTicker('');
            setDecisions([]);
            setStrategies([]);
          }}>
            <TabsList className="mb-4">
              <TabsTrigger value="stocks">Stocks</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
            </TabsList>

            <TabsContent value="stocks" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Stock Ticker
                  </label>
                  <select
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingTickers || !selectedDataset}
                  >
                    <option value="">Select a ticker...</option>
                    {stockTickers.map(ticker => (
                      <option key={ticker} value={ticker}>{ticker}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {loadingDecisions && <span>Loading decisions...</span>}
                    {loadingReturns && <span>Loading returns data...</span>}
                    {decisions.length > 0 && !loadingDecisions && !loadingReturns && (
                      <span>{decisions.length} decisions loaded</span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="crypto" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Crypto Ticker
                  </label>
                  <select
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingTickers || !selectedDataset}
                  >
                    <option value="">Select a ticker...</option>
                    {cryptoTickers.map(ticker => (
                      <option key={ticker} value={ticker}>{ticker}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {loadingDecisions && <span>Loading decisions...</span>}
                    {loadingReturns && <span>Loading returns data...</span>}
                    {decisions.length > 0 && !loadingDecisions && !loadingReturns && (
                      <span>{decisions.length} decisions loaded</span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Charts Section */}
        {Object.keys(strategyData).length > 0 && (
          <div className="space-y-12">
            {/* Mobile Strategy Navigation */}
            <div className="lg:hidden">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Jump to Strategy</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.keys(strategyData).map((strategyName) => (
                    <button
                      key={strategyName}
                      onClick={() => {
                        const element = document.getElementById(`strategy-section-${strategyName}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors duration-200 truncate"
                    >
                      {strategyName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex">
              {/* Desktop Strategy Navigation Sidebar */}
              <div className="hidden lg:block flex-shrink-0 mr-4">
                <div className="sticky top-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 group hover:p-6 transition-all duration-300 w-12 hover:w-64 overflow-hidden">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                    Strategies
                  </h3>
                  <nav className="space-y-2">
                    {Object.keys(strategyData).map((strategyName) => (
                      <button
                        key={strategyName}
                        onClick={() => {
                          const element = document.getElementById(`strategy-section-${strategyName}`);
                          element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="w-full text-left px-2 py-2 group-hover:px-3 text-xs group-hover:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 truncate"
                        title={strategyName}
                      >
                        <span className="inline group-hover:hidden">{strategyName.substring(0, 3)}...</span>
                        <span className="hidden group-hover:inline">{strategyName}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1">
            {Object.entries(strategyData).map(([strategyName, data]) => (
              <div key={strategyName} id={`strategy-section-${strategyName}`} className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-4">
                  {selectedTicker} - {strategyName}
                </h2>

                {/* Combined Daily Returns Chart with Cumulative Overlay */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div id={`daily-returns-shading-chart-${strategyName}`} className="w-full h-96"></div>
                </div>

                {/* Period Returns Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div id={`period-returns-chart-${strategyName}`} className="w-full h-80"></div>
                </div>

                {/* Strategy Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Days</h4>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.dailyReturns.length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Held Days</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.dailyReturns.filter(d => d.periodType === 'held').length}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Periods</h4>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.tradeReturns.length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Held Periods</h4>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {data.tradeReturns.filter(t => t.periodType === 'held').length}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Held Return</h4>
                    <p className={`text-2xl font-bold ${data.overallStats.heldCumulativeReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {data.overallStats.heldCumulativeReturn.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Buy & Hold</h4>
                    <p className={`text-2xl font-bold ${data.overallStats.buyAndHoldReturn >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {data.overallStats.buyAndHoldReturn.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
      </div>
    </div>
  );
};

export default Backtester;
