import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import * as echarts from 'echarts';
import React, { useEffect, useMemo, useState } from 'react';
import { FaChartLine, FaSync } from 'react-icons/fa';
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

  // Calculate returns for all periods (held and non-held) - for period chart
  const tradeReturns = useMemo(() => {
    const returns: Array<{
      periodType: 'held' | 'not_held';
      startDate: string;
      endDate: string;
      return: number;
      duration: number; // days
      periodLabel: string;
    }> = [];

    if (filteredDecisions.length === 0) return returns;

    const sortedDecisions = filteredDecisions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const currentAssetType = activeTab;
    const ticker = sortedDecisions[0].ticker;

    // Helper function to calculate cumulative return for a date range
    const calculateCumulativeReturn = (startDate: Date, endDate: Date) => {
      let cumulativeReturn = 0;

      if (currentAssetType === 'stocks') {
        const stockReturns = returnsData as StockReturns[];
        const periodReturns = stockReturns
          .filter(r => r.symbol === ticker &&
                      new Date(r.date) >= startDate &&
                      new Date(r.date) <= endDate &&
                      r.daily_return !== null &&
                      r.daily_return !== undefined)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (periodReturns.length > 0) {
          const logReturns = periodReturns.map(r => Math.log(1 + (r.daily_return || 0) / 100));
          const sumLogReturns = logReturns.reduce((sum, val) => sum + val, 0);
          cumulativeReturn = (Math.exp(sumLogReturns) - 1) * 100;
        }
      } else {
        const cryptoReturns = returnsData as CryptoReturns[];
        const periodReturns = cryptoReturns
          .filter(r => r.baseCurrency === ticker &&
                      new Date(r.date) >= startDate &&
                      new Date(r.date) <= endDate &&
                      r.daily_return !== null &&
                      r.daily_return !== undefined)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (periodReturns.length > 0) {
          const logReturns = periodReturns.map(r => Math.log(1 + (r.daily_return || 0) / 100));
          const sumLogReturns = logReturns.reduce((sum, val) => sum + val, 0);
          cumulativeReturn = (Math.exp(sumLogReturns) - 1) * 100;
        }
      }

      return cumulativeReturn;
    };

    // Calculate non-held period from start of data to first decision
    const firstDecisionDate = new Date(sortedDecisions[0].date);
    const dataStartDate = new Date(Math.min(...filteredDecisions.map(d => new Date(d.date).getTime())));

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
      const decisionDate = new Date(decision.date);

      // If we have a gap between decisions and position was held, calculate held period return
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

      // If we have a gap between decisions and position was NOT held, calculate non-held period return
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

      // Update position status
      if (decision.action.toLowerCase() === 'buy') {
        positionHeld = true;
      } else if (decision.action.toLowerCase() === 'sell') {
        positionHeld = false;
      }

      lastPositionChange = decisionDate;
    }

    // Handle the final period if position is still held
    const lastDecision = sortedDecisions[sortedDecisions.length - 1];
    const lastDecisionDate = new Date(lastDecision.date);
    const endDate = new Date(); // Current date as end

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

    return returns;
  }, [filteredDecisions, returnsData, activeTab]);

  // Calculate daily returns with period classification - for daily chart
  const dailyReturns = useMemo(() => {
    const dailyData: Array<{
      date: string;
      dailyReturn: number;
      periodType: 'held' | 'not_held';
      timestamp: number;
    }> = [];

    if (filteredDecisions.length === 0 || returnsData.length === 0) return dailyData;

    const sortedDecisions = filteredDecisions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const currentAssetType = activeTab;
    const ticker = sortedDecisions[0].ticker;

    // Get all daily returns for this ticker
    let allDailyReturns: Array<{date: string, daily_return: number}> = [];
    if (currentAssetType === 'stocks') {
      const stockReturns = returnsData as StockReturns[];
      allDailyReturns = stockReturns
        .filter(r => r.symbol === ticker && r.daily_return !== null && r.daily_return !== undefined)
        .map(r => ({date: r.date, daily_return: r.daily_return!}))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else {
      const cryptoReturns = returnsData as CryptoReturns[];
      allDailyReturns = cryptoReturns
        .filter(r => r.baseCurrency === ticker && r.daily_return !== null && r.daily_return !== undefined)
        .map(r => ({date: r.date, daily_return: r.daily_return!}))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    if (allDailyReturns.length === 0) return dailyData;

    // Create periods based on decisions
    const periods: Array<{
      startDate: Date;
      endDate: Date;
      type: 'held' | 'not_held';
    }> = [];

    // Add initial non-held period if there's a gap
    const firstDecisionDate = new Date(sortedDecisions[0].date);
    const dataStartDate = new Date(allDailyReturns[0].date);

    if (firstDecisionDate > dataStartDate) {
      periods.push({
        startDate: dataStartDate,
        endDate: firstDecisionDate,
        type: 'not_held'
      });
    }

    // Process decisions to create periods
    let positionHeld = false;
    let lastPositionChange = firstDecisionDate;

    for (let i = 0; i < sortedDecisions.length; i++) {
      const decision = sortedDecisions[i];
      const decisionDate = new Date(decision.date);

      // If we have a gap between decisions and position was held, add held period
      if (positionHeld && decisionDate > lastPositionChange) {
        periods.push({
          startDate: lastPositionChange,
          endDate: decisionDate,
          type: 'held'
        });
      }

      // If we have a gap between decisions and position was NOT held, add non-held period
      if (!positionHeld && decisionDate > lastPositionChange) {
        periods.push({
          startDate: lastPositionChange,
          endDate: decisionDate,
          type: 'not_held'
        });
      }

      // Update position status
      if (decision.action.toLowerCase() === 'buy') {
        positionHeld = true;
      } else if (decision.action.toLowerCase() === 'sell') {
        positionHeld = false;
      }

      lastPositionChange = decisionDate;
    }

    // Handle the final period if position is still held
    const lastDecision = sortedDecisions[sortedDecisions.length - 1];
    const lastDecisionDate = new Date(lastDecision.date);
    const dataEndDate = new Date(allDailyReturns[allDailyReturns.length - 1].date);

    if (positionHeld && dataEndDate > lastDecisionDate) {
      periods.push({
        startDate: lastDecisionDate,
        endDate: dataEndDate,
        type: 'held'
      });
    }

    // Now classify each daily return into a period
    allDailyReturns.forEach(daily => {
      const dailyDate = new Date(daily.date);
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

    return dailyData.sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredDecisions, returnsData, activeTab]);



  // Create ECharts daily returns bar chart
  const createDailyReturnsChart = (containerId: string) => {
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

    const option = {
      title: {
        text: `${selectedTicker} Daily Returns`,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const day = dailyReturns[params.dataIndex];
          const date = new Date(day.timestamp).toLocaleDateString();
          const periodType = day.periodType === 'held' ? 'Held' : 'Not Held';
          return `${date}<br/>${periodType}<br/>Daily Return: ${day.dailyReturn.toFixed(2)}%`;
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        name: 'Date',
        nameLocation: 'middle',
        nameGap: 30,
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
      yAxis: {
        type: 'value',
        name: 'Daily Return (%)',
        nameLocation: 'middle',
        nameGap: 50
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: [0], start: 0, end: 100 },
        { type: 'slider', xAxisIndex: [0], start: 0, end: 100, height: 20, bottom: 6 }
      ],
      series: [{
        type: 'bar',
        data: chartData,
        barWidth: '80%',
        itemStyle: {
          borderRadius: [2, 2, 0, 0]
        }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  // Create ECharts daily returns chart with buy/sell lines
  const createDailyReturnsWithLinesChart = (containerId: string) => {
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

    // Create markLines for buy/sell decisions
    const markLines = filteredDecisions.map((decision) => ({
      xAxis: new Date(decision.date).getTime(),
      lineStyle: {
        color: decision.action.toLowerCase() === 'buy' ? '#10B981' : '#EF4444',
        width: 2,
        type: 'solid'
      },
      label: {
        show: true,
        position: 'top',
        formatter: decision.action.toUpperCase(),
        color: decision.action.toLowerCase() === 'buy' ? '#10B981' : '#EF4444',
        fontSize: 12,
        fontWeight: 'bold'
      }
    }));

    const option = {
      title: {
        text: `${selectedTicker} Daily Returns with Buy/Sell Signals`,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const day = dailyReturns[params.dataIndex];
          const date = new Date(day.timestamp).toLocaleDateString();
          const periodType = day.periodType === 'held' ? 'Held' : 'Not Held';
          return `${date}<br/>${periodType}<br/>Daily Return: ${day.dailyReturn.toFixed(2)}%`;
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        name: 'Date',
        nameLocation: 'middle',
        nameGap: 30,
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
      yAxis: {
        type: 'value',
        name: 'Daily Return (%)',
        nameLocation: 'middle',
        nameGap: 50
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: [0], start: 0, end: 100 },
        { type: 'slider', xAxisIndex: [0], start: 0, end: 100, height: 20, bottom: 6 }
      ],
      series: [{
        type: 'bar',
        data: chartData,
        barWidth: '80%',
        itemStyle: {
          borderRadius: [2, 2, 0, 0]
        },
        markLine: {
          data: markLines
        }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  // Create ECharts period returns bar chart
  const createPeriodReturnsChart = (containerId: string) => {
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
      title: {
        text: `${selectedTicker} Period Returns`,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const trade = tradeReturns[params.dataIndex];
          return `${trade.periodLabel}<br/>Return: ${params.value.toFixed(2)}%<br/>Start: ${trade.startDate}<br/>End: ${trade.endDate}<br/>Duration: ${trade.duration} days`;
        }
      },
      grid: {
        left: '5%',
        right: '5%',
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
  const createDailyReturnsWithShadingChart = (containerId: string) => {
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

    // Create markLines for buy/sell decisions
    const markLines = filteredDecisions.map((decision) => ({
      xAxis: new Date(decision.date).getTime(),
      lineStyle: {
        color: decision.action.toLowerCase() === 'buy' ? '#10B981' : '#EF4444',
        width: 2,
        type: 'solid'
      },
      label: {
        show: true,
        position: 'top',
        formatter: decision.action.toUpperCase(),
        color: decision.action.toLowerCase() === 'buy' ? '#10B981' : '#EF4444',
        fontSize: 12,
        fontWeight: 'bold'
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
          let color = 'rgba(156,163,175,0.12)'; // slightly darker grey for non-held

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
  let color = 'rgba(156,163,175,0.12)';
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
      title: {
        text: `${selectedTicker} Daily Returns with Position Shading`,
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const day = dailyReturns[params.dataIndex];
          const date = new Date(day.timestamp).toLocaleDateString();
          const periodType = day.periodType === 'held' ? 'Held' : 'Not Held';
          return `${date}<br/>${periodType}<br/>Daily Return: ${day.dailyReturn.toFixed(2)}%`;
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        name: 'Date',
        nameLocation: 'middle',
        nameGap: 30,
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
      yAxis: {
        type: 'value',
        name: 'Daily Return (%)',
        nameLocation: 'middle',
        nameGap: 50
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: [0], start: 0, end: 100 },
        { type: 'slider', xAxisIndex: [0], start: 0, end: 100, height: 20, bottom: 6 }
      ],
      series: [
        {
          type: 'bar',
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
        }
      ]
    };

    chart.setOption(option);
    return chart;
  };

  // Create a small, aligned bar chart showing position state per day (green/red/grey)
  const createPositionBarsChart = (containerId: string) => {
    const chartDom = document.getElementById(containerId);
    if (!chartDom) return;

    const chart = echarts.init(chartDom);

    // Colors should match other charts
    const colorHeldPos = 'rgba(16,185,129,1)';
    const colorHeldNeg = 'rgba(239,68,68,1)';
    const colorNotHeld = 'rgba(156,163,175,1)';

    // Build data: color bars using buy/sell decision intervals
    const sorted = [...dailyReturns].sort((a, b) => a.timestamp - b.timestamp);
    const decisionsSorted = [...filteredDecisions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let decIndex = 0;
    let state: 'held' | 'not_held' = 'not_held';

    const data = sorted.map((d) => {
      const t = d.timestamp;

      // advance decisions up to current timestamp
      while (decIndex < decisionsSorted.length && new Date(decisionsSorted[decIndex].date).getTime() <= t) {
        const action = (decisionsSorted[decIndex].action || '').toString().toLowerCase();
        if (action === 'buy') state = 'held';
        if (action === 'sell') state = 'not_held';
        decIndex += 1;
      }

      const color = state === 'held' ? colorHeldPos : colorNotHeld;
      return {
        value: [d.timestamp, 1],
        itemStyle: { color }
      };
    });

    const option = {
      grid: {
        left: '5%',
        right: '5%',
        top: '8%',
        bottom: '8%'
      },
      xAxis: {
        type: 'time',
        axisLabel: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      dataZoom: [
        { type: 'inside', xAxisIndex: [0], start: 0, end: 100 }
      ],
      yAxis: {
        type: 'value',
        show: false,
        min: 0,
        max: 1
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const idx = params.dataIndex;
          const day = sorted[idx];
          const date = new Date(day.timestamp).toLocaleDateString();
          const periodType = day.periodType === 'held' ? 'Held' : 'Not Held';
          return `${date}<br/>${periodType}`;
        }
      },
      series: [{
        type: 'bar',
        barGap: 0,
        barWidth: '70%',
        data,
        silent: true
      }]
    };

    chart.setOption(option);
    return chart;
  };

  // Initialize charts when data changes
  useEffect(() => {
    if (filteredDecisions.length > 0) {
      const dailyChart = createDailyReturnsChart('daily-returns-chart');
      const dailyWithLinesChart = createDailyReturnsWithLinesChart('daily-returns-lines-chart');
      const dailyWithShadingChart = createDailyReturnsWithShadingChart('daily-returns-shading-chart');
      const dailyShadingBarsChart = createPositionBarsChart('daily-returns-shading-bars-chart');
      const periodChart = createPeriodReturnsChart('period-returns-chart');

      // Group charts so zoom/pan are synchronized
      try {
        const groupName = 'backtesterGroup';
        if (dailyChart) (dailyChart as any).group = groupName;
        if (dailyWithLinesChart) (dailyWithLinesChart as any).group = groupName;
        if (dailyWithShadingChart) (dailyWithShadingChart as any).group = groupName;
        if (dailyShadingBarsChart) (dailyShadingBarsChart as any).group = groupName;
        if (periodChart) (periodChart as any).group = groupName;
        echarts.connect(groupName);
      } catch (e) {
        // ignore if echarts.connect fails in some environments
        // console.warn('echarts group connect failed', e);
      }

      return () => {
        dailyChart?.dispose();
        dailyWithLinesChart?.dispose();
        dailyWithShadingChart?.dispose();
        dailyShadingBarsChart?.dispose();
        periodChart?.dispose();
      };
    }
  }, [filteredDecisions, dailyReturns, tradeReturns, selectedTicker, selectedStrategy]);

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
          <div className="grid grid-cols-1 gap-8 mb-8">
            {/* Daily Returns Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FaChartLine className="mr-2" />
                Daily Returns
              </h3>
              <div id="daily-returns-chart" className="w-full h-80"></div>
            </div>

            {/* Daily Returns Chart with Buy/Sell Lines */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FaChartLine className="mr-2" />
                Daily Returns with Buy/Sell Signals
              </h3>
              <div id="daily-returns-lines-chart" className="w-full h-80"></div>
            </div>

            {/* Daily Returns Chart with Position Shading */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FaChartLine className="mr-2" />
                Daily Returns with Position Shading
              </h3>
              <div id="daily-returns-shading-chart" className="w-full h-80"></div>
              {/* Small position bars chart aligned with shading chart */}
              <div id="daily-returns-shading-bars-chart" className="w-full h-28 mt-4"></div>
            </div>

            {/* Period Returns Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <FaChartLine className="mr-2" />
                Period Returns
              </h3>
              <div id="period-returns-chart" className="w-full h-80"></div>
            </div>
          </div>
        )}



        {/* Summary Statistics */}
        {(dailyReturns.length > 0 || tradeReturns.length > 0) && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Days</h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{dailyReturns.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Held Days</h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {dailyReturns.filter(d => d.periodType === 'held').length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Periods</h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tradeReturns.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Held Periods</h4>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {tradeReturns.filter(t => t.periodType === 'held').length}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Backtester;
