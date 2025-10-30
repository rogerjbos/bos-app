import * as echarts from 'echarts';
import React, { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';

interface RankData {
  date?: string;
  industry?: string;
  isADR: boolean;
  isActive: boolean;
  mcap: number;
  name: string;
  permaTicker: string;
  rankFundamental: number;
  rankTechnical: number;
  reportingCurrency: string;
  sector: number;
  statementLastUpdated: string;
  tag: string;
  td__Resistance: number;
  td__Support: number;
  tec_riskRangeHigh: number;
  tec_riskRangeInd: number;
  tec_riskRangeLow: number;
  ticker: string;
  // OHLC data fields
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

interface OHLCVData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const upColor = '#00da3c';
const downColor = '#ec0000';

function splitData(rawData: OHLCVData[]) {
  let categoryData: string[] = [];
  let values: number[][] = [];
  let volumes: (string | number)[][] = [];

  for (let i = 0; i < rawData.length; i++) {
    const item = rawData[i];
    categoryData.push(item.date);
    values.push([item.open, item.close, item.low, item.high]);
    volumes.push([i, item.volume, item.close > item.open ? 1 : -1]);
  }

  return {
    categoryData: categoryData,
    values: values,
    volumes: volumes
  };
}

function calculateMA(dayCount: number, data: { values: number[][] }) {
  var result: (number | string)[] = [];
  for (var i = 0, len = data.values.length; i < len; i++) {
    if (i < dayCount) {
      result.push('-');
      continue;
    }
    var sum = 0;
    for (var j = 0; j < dayCount; j++) {
      sum += data.values[i - j][1]; // close price
    }
    result.push(+(sum / dayCount).toFixed(3));
  }
  return result;
}

function alignRankDataWithOHLC(ohlcDates: string[], rankData: RankData[]) {
  // Create a map of date -> rank data for quick lookup
  const rankMap = new Map<string, { fundamental: number | null, technical: number | null }>();
  rankData.forEach(item => {
    if (item.date) {
      rankMap.set(item.date, {
        fundamental: typeof item.rankFundamental === 'number' ? item.rankFundamental : null,
        technical: typeof item.rankTechnical === 'number' ? item.rankTechnical : null
      });
    }
  });

  // Align rank data with OHLC dates
  const fundamentalData: (number | null)[] = [];
  const technicalData: (number | null)[] = [];

  ohlcDates.forEach(date => {
    const rankInfo = rankMap.get(date);
    fundamentalData.push(rankInfo?.fundamental ?? null);
    technicalData.push(rankInfo?.technical ?? null);
  });

  return { fundamentalData, technicalData };
}

interface CandlestickChartProps {
  data: OHLCVData[];
  symbol: string;
  rankData?: RankData[];
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, symbol, rankData = [] }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chartData = splitData(data);
    const rankAlignedData = alignRankDataWithOHLC(chartData.categoryData, rankData);

    const option = {
      animation: false,
      legend: {
        bottom: 10,
        left: 'center',
        data: [`${symbol.toUpperCase()}`, 'MA5', 'MA10', 'MA20', 'MA30', 'Rank Fundamental', 'Rank Technical']
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        textStyle: {
          color: '#000'
        },
        position: function (pos: number[], params: any, el: any, elRect: any, size: any) {
          const obj: Record<string, number> = {
            top: 10
          };
          obj[['left', 'right'][+(pos[0] < size.viewSize[0] / 2)]] = 30;
          return obj;
        }
      },
      axisPointer: {
        link: [
          {
            xAxisIndex: 'all'
          }
        ],
        label: {
          backgroundColor: '#777'
        }
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: false
          },
          brush: {
            type: ['lineX', 'clear']
          }
        }
      },
      brush: {
        xAxisIndex: 'all',
        brushLink: 'all',
        outOfBrush: {
          colorAlpha: 0.1
        }
      },
      visualMap: {
        show: false,
        seriesIndex: 5,
        dimension: 2,
        pieces: [
          {
            value: 1,
            color: downColor
          },
          {
            value: -1,
            color: upColor
          }
        ]
      },
      grid: [
        {
          left: '10%',
          right: '8%',
          height: '50%'
        },
        {
          left: '10%',
          right: '8%',
          top: '63%',
          height: '16%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: chartData.categoryData,
          boundaryGap: false,
          axisLine: { onZero: false },
          splitLine: { show: false },
          min: 'dataMin',
          max: 'dataMax',
          axisPointer: {
            z: 100
          }
        },
        {
          type: 'category',
          gridIndex: 1,
          data: chartData.categoryData,
          boundaryGap: false,
          axisLine: { onZero: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          min: 'dataMin',
          max: 'dataMax'
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true,
            areaStyle: {
              color: ['rgba(255, 255, 255, 0.02)', 'rgba(0, 0, 0, 0.02)']
            }
          }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        },
        {
          type: 'value',
          name: 'Rank',
          nameLocation: 'middle',
          nameGap: 30,
          position: 'right',
          min: 1,
          max: 10,
          axisLabel: {
            formatter: '{value}'
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 0,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '85%',
          start: 0,
          end: 100
        }
      ],
      series: [
        {
          name: `${symbol.toUpperCase()}`,
          type: 'candlestick',
          data: chartData.values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: undefined,
            borderColor0: undefined
          }
        },
        {
          name: 'MA5',
          type: 'line',
          data: calculateMA(5, chartData),
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA10',
          type: 'line',
          data: calculateMA(10, chartData),
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA20',
          type: 'line',
          data: calculateMA(20, chartData),
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'MA30',
          type: 'line',
          data: calculateMA(30, chartData),
          smooth: true,
          lineStyle: {
            opacity: 0.5
          }
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: chartData.volumes
        },
        {
          name: 'Rank Fundamental',
          type: 'line',
          yAxisIndex: 2,
          data: rankAlignedData.fundamentalData,
          smooth: false,
          lineStyle: {
            color: '#ffcccc',
            width: 2,
            opacity: 0.4
          },
          itemStyle: {
            color: '#ffcccc',
            opacity: 0.4
          },
          connectNulls: false
        },
        {
          name: 'Rank Technical',
          type: 'line',
          yAxisIndex: 2,
          data: rankAlignedData.technicalData,
          smooth: false,
          lineStyle: {
            color: '#b0e0e6',
            width: 2,
            opacity: 0.4
          },
          itemStyle: {
            color: '#b0e0e6',
            opacity: 0.4
          },
          connectNulls: false
        }
      ]
    };

    chartInstance.current.setOption(option, true);

    // Cleanup
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [data, symbol, rankData]);

  return (
    <div className="w-full">
      <div ref={chartRef} className="w-full h-[500px]" />
    </div>
  );
};

interface RanksTabProps {
  title: string;
  ticker: string;
  setTicker: (ticker: string) => void;
  isLoading: boolean;
  error: string | null;
  rankData: RankData[];
  ohlcvData: OHLCVData[];
  onTickerChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFetchData: (ticker: string) => void;
  formatNumber: (value: number, decimals?: number) => string;
}

const RanksTab: React.FC<RanksTabProps> = ({
  title,
  ticker,
  setTicker,
  isLoading,
  error,
  rankData,
  ohlcvData,
  onTickerChange,
  onSubmit,
  onFetchData,
  formatNumber,
}) => {

  // Generate chart title with company info
  const generateChartTitle = () => {
    if (rankData.length === 0) return `${ticker.toUpperCase()} Price Chart`;

    const firstItem = rankData[0];
    const tickerUpper = firstItem.ticker?.toUpperCase() || ticker.toUpperCase();
    const sector = firstItem.sector || 'N/A';
    const industry = firstItem.industry || 'N/A';
    const isActive = firstItem.isActive ? 'Active' : 'Inactive';
    const isADR = firstItem.isADR ? 'ADR' : 'Local';
    const reportingCurrency = firstItem.reportingCurrency || 'N/A';

    return `${tickerUpper} - ${sector} (${industry}) - ${isActive} - ${isADR} - ${reportingCurrency}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2">
                <Label htmlFor="ticker">Symbol</Label>
                <Input
                  id="ticker"
                  type="text"
                  value={ticker}
                  onChange={onTickerChange}
                  placeholder="Enter symbol (e.g., AMZN)"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Button
                  type="submit"
                  disabled={isLoading || !ticker.trim()}
                  className="w-full"
                >
                  {isLoading ? 'Loading...' : 'Search'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">Fetching rank data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candlestick Chart */}
      {!isLoading && !error && ohlcvData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{generateChartTitle()}</CardTitle>
          </CardHeader>
          <CardContent>
            <CandlestickChart data={ohlcvData} symbol={ticker} rankData={rankData} />
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!isLoading && !error && (
        <>
          {rankData.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  No rank data found for ticker: {ticker.toUpperCase()}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Rank Fundamental</TableHead>
                      <TableHead>Rank Technical</TableHead>
                      <TableHead>Resistance</TableHead>
                      <TableHead>Support</TableHead>
                      <TableHead>Range High</TableHead>
                      <TableHead>Range Low</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRankData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.date || 'N/A'}</TableCell>
                        <TableCell>{item.tag}</TableCell>
                        <TableCell>{typeof item.rankFundamental === 'number' ? formatNumber(item.rankFundamental) : 'N/A'}</TableCell>
                        <TableCell>{typeof item.rankTechnical === 'number' ? formatNumber(item.rankTechnical) : 'N/A'}</TableCell>
                        <TableCell>{typeof item.td__Resistance === 'number' ? formatNumber(item.td__Resistance) : 'N/A'}</TableCell>
                        <TableCell>{typeof item.td__Support === 'number' ? formatNumber(item.td__Support) : 'N/A'}</TableCell>
                        <TableCell>{typeof item.tec_riskRangeHigh === 'number' ? formatNumber(item.tec_riskRangeHigh) : 'N/A'}</TableCell>
                        <TableCell>{typeof item.tec_riskRangeLow === 'number' ? formatNumber(item.tec_riskRangeLow) : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

const Ranks: React.FC = () => {
  // Separate state for stocks and crypto
  const [stockData, setStockData] = useState<RankData[]>([]);
  const [cryptoData, setCryptoData] = useState<RankData[]>([]);
  const [stockOHLCVData, setStockOHLCVData] = useState<OHLCVData[]>([]);
  const [cryptoOHLCVData, setCryptoOHLCVData] = useState<OHLCVData[]>([]);
  const [stockTicker, setStockTicker] = useState('amzn');
  const [cryptoTicker, setCryptoTicker] = useState('btc');
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);
  const [isLoadingCrypto, setIsLoadingCrypto] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  // API configuration (similar to Staking.tsx)
  const API_BASE_URL = import.meta.env.DEV
    ? '/api'
    : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000/api');
  const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

  const fetchRankData = async (selectedTicker: string, isCrypto: boolean = false) => {
    const setIsLoading = isCrypto ? setIsLoadingCrypto : setIsLoadingStocks;
    const setError = isCrypto ? setCryptoError : setStockError;
    const setData = isCrypto ? setCryptoData : setStockData;
    const setOHLCVData = isCrypto ? setCryptoOHLCVData : setStockOHLCVData;

    setIsLoading(true);
    setError(null);

    const fullUrl = `${API_BASE_URL}/ranks?ticker=${selectedTicker}`;

    try {
      const response = await fetch(fullUrl, {
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

      // Handle the response based on your API structure
      let rankData: RankData[] = [];
      if (Array.isArray(data)) {
        rankData = data;
      } else if (data.data && Array.isArray(data.data)) {
        rankData = data.data;
      } else {
        // If single object, wrap in array
        rankData = [data];
      }

      setData(rankData);

      // Extract OHLC data from rank data for candlestick chart
      const ohlcvData: OHLCVData[] = rankData
        .filter(item => item.open !== null && item.high !== null && item.low !== null && item.close !== null && item.volume !== null)
        .map(item => ({
          date: item.date || '',
          open: item.open!,
          high: item.high!,
          low: item.low!,
          close: item.close!,
          volume: item.volume!
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setOHLCVData(ohlcvData);

    } catch (err) {
      console.error('Error fetching rank data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setData([]);
      setOHLCVData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load initial data on component mount only
  useEffect(() => {
    fetchRankData(stockTicker, false);
    fetchRankData(cryptoTicker, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - we only want this to run on mount

  const handleStockTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStockTicker(e.target.value.toLowerCase());
  };

  const handleCryptoTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCryptoTicker(e.target.value.toLowerCase());
  };

  const handleStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stockTicker.trim()) {
      fetchRankData(stockTicker.trim(), false);
    }
  };

  const handleCryptoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cryptoTicker.trim()) {
      fetchRankData(cryptoTicker.trim(), true);
    }
  };

  const formatNumber = (value: number, decimals: number = 2): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Ranks</h1>
        </div>

        <Tabs defaultValue="stocks" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="stocks">Stocks</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
          </TabsList>

          <TabsContent value="stocks">
            <RanksTab
              title="Stock Ranks"
              ticker={stockTicker}
              setTicker={setStockTicker}
              isLoading={isLoadingStocks}
              error={stockError}
              rankData={stockData}
              ohlcvData={stockOHLCVData}
              onTickerChange={handleStockTickerChange}
              onSubmit={handleStockSubmit}
              onFetchData={(ticker) => fetchRankData(ticker, false)}
              formatNumber={formatNumber}
            />
          </TabsContent>

          <TabsContent value="crypto">
            <RanksTab
              title="Crypto Ranks"
              ticker={cryptoTicker}
              setTicker={setCryptoTicker}
              isLoading={isLoadingCrypto}
              error={cryptoError}
              rankData={cryptoData}
              ohlcvData={cryptoOHLCVData}
              onTickerChange={handleCryptoTickerChange}
              onSubmit={handleCryptoSubmit}
              onFetchData={(ticker) => fetchRankData(ticker, true)}
              formatNumber={formatNumber}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Ranks;
