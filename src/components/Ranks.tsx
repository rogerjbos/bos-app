import * as echarts from 'echarts';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaInfoCircle } from 'react-icons/fa';
import { useWalletAuthContext } from '../providers/WalletAuthProvider';
import { abbreviateSectorIndustry } from '../lib/financialUtils';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { ThemeContext } from '../context/ThemeContext';

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
  ibol?: number;
  predicted_beta?: number;
  risk_contribution?: number;
}

interface CryptoRankData {
  date: string;
  baseCurrency: string;
  // Crypto ranks data
  crypto_ranks?: number | null;
  // LPPL score data
  lppl_side?: string | null;
  lppl_pos_conf?: number | null;
  lppl_neg_conf?: number | null;
  // Strategy data
  strategy_side?: string | null;
  strategy_profit_per_trade?: number | null;
  strategy_expectancy?: number | null;
  strategy_profit_factor?: number | null;
  // Price data (OHLCV)
  quoteCurrency?: string | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
  ibol?: number;
  predicted_beta?: number;
  risk_contribution?: number;
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

function alignCryptoRankDataWithOHLC(ohlcDates: string[], cryptoRankData: CryptoRankData[]) {
  // Create a map of date -> crypto rank data for quick lookup
  const rankMap = new Map<string, number | null>();
  cryptoRankData.forEach(item => {
    if (item.date) {
      rankMap.set(item.date, typeof item.crypto_ranks === 'number' ? item.crypto_ranks : null);
    }
  });

  // Align crypto rank data with OHLC dates
  const cryptoRanks: (number | null)[] = [];

  ohlcDates.forEach(date => {
    const rankValue = rankMap.get(date);
    cryptoRanks.push(rankValue ?? null);
  });

  return { cryptoRanks };
}

interface CandlestickChartProps {
  data: OHLCVData[];
  symbol: string;
  rankData?: RankData[];
  cryptoRankData?: CryptoRankData[];
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({ data, symbol, rankData = [], cryptoRankData = [] }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<echarts.ECharts | null>(null);

  // Get theme from context
  const { theme } = React.useContext(ThemeContext);

  // Determine if this is crypto data
  const isCrypto = cryptoRankData.length > 0;

  // Get theme-aware colors for tooltip
  const getThemeColors = useCallback(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    if (theme === 'dark') {
      return {
        textColor: '#ffffff', // white text for dark mode
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // dark background
        borderColor: '#555555' // dark border
      };
    } else {
      return {
        textColor: '#000000', // black text for light mode
        backgroundColor: 'rgba(255, 255, 255, 0.95)', // light background
        borderColor: '#cccccc' // light border
      };
    }
  }, [theme]);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chartData = splitData(data);
    const rankAlignedData = isCrypto
      ? alignCryptoRankDataWithOHLC(chartData.categoryData, cryptoRankData)
      : alignRankDataWithOHLC(chartData.categoryData, rankData);

    // Get theme-aware colors
    const themeColors = getThemeColors();

    // Prepare legend data based on whether this is crypto or stock
    const legendData = isCrypto
      ? [`${symbol.toUpperCase()}`, 'MA5', 'MA10', 'MA20', 'MA30', 'Crypto Rank']
      : [`${symbol.toUpperCase()}`, 'MA5', 'MA10', 'MA20', 'MA30', 'Rank Fundamental', 'Rank Technical'];

    const option = {
      animation: false,
      legend: {
        bottom: 10,
        left: 'center',
        data: legendData,
        textStyle: {
          color: '#fff'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        borderWidth: 1,
        borderColor: themeColors.borderColor,
        backgroundColor: themeColors.backgroundColor,
        padding: 10,
        textStyle: {
          color: themeColors.textColor
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
          },
          axisLabel: {
            color: '#fff'
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
          },
          axisLabel: {
            color: '#fff'
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
            formatter: '{value}',
            color: '#fff'
          },
          nameTextStyle: {
            color: '#fff'
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
        // Conditionally add rank series based on data type
        ...(isCrypto
          ? [
              {
                name: 'Crypto Rank',
                type: 'line',
                yAxisIndex: 2,
                data: (rankAlignedData as { cryptoRanks: (number | null)[] }).cryptoRanks,
                smooth: false,
                lineStyle: {
                  color: '#9370DB',
                  width: 2,
                  opacity: 0.6
                },
                itemStyle: {
                  color: '#9370DB',
                  opacity: 0.6
                },
                connectNulls: false
              }
            ]
          : [
              {
                name: 'Rank Fundamental',
                type: 'line',
                yAxisIndex: 2,
                data: (rankAlignedData as { fundamentalData: (number | null)[], technicalData: (number | null)[] }).fundamentalData,
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
                data: (rankAlignedData as { fundamentalData: (number | null)[], technicalData: (number | null)[] }).technicalData,
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
        )
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
  }, [data, symbol, rankData, cryptoRankData, isCrypto, theme, getThemeColors]);

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
    const sectorAbbrev = abbreviateSectorIndustry(String(firstItem.sector || 'N/A'), 'sector');
    const industryAbbrev = abbreviateSectorIndustry(firstItem.industry || 'N/A', 'industry');
    const isActive = firstItem.isActive ? 'Active' : 'Inactive';
    const isADR = firstItem.isADR ? 'ADR' : 'Local';
    const reportingCurrency = firstItem.reportingCurrency || 'N/A';

    return `${tickerUpper} - ${sectorAbbrev} (${industryAbbrev}) - ${isActive} - ${isADR} - ${reportingCurrency}`;
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
                    {rankData
                      .sort((a, b) => {
                        if (!a.date || !b.date) return 0;
                        return new Date(b.date).getTime() - new Date(a.date).getTime();
                      })
                      .map((item, index) => (
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

const CryptoRanksTab: React.FC<{
  title: string;
  baseCurrency: string;
  setBaseCurrency: (currency: string) => void;
  isLoading: boolean;
  error: string | null;
  cryptoRankData: CryptoRankData[];
  ohlcvData: OHLCVData[];
  onBaseCurrencyChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  formatNumber: (value: number, decimals?: number) => string;
}> = ({
  title,
  baseCurrency,
  setBaseCurrency,
  isLoading,
  error,
  cryptoRankData,
  ohlcvData,
  onBaseCurrencyChange,
  onSubmit,
  formatNumber,
}) => {

  // Generate chart title
  const generateChartTitle = () => {
    if (cryptoRankData.length === 0) return `${baseCurrency.toUpperCase()} Price Chart`;

    const firstItem = cryptoRankData[0];
    const currency = firstItem.baseCurrency?.toUpperCase() || baseCurrency.toUpperCase();
    const quoteCurrency = firstItem.quoteCurrency || 'USD';

    return `${currency}/${quoteCurrency} Price Chart`;
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
                <Label htmlFor="baseCurrency">Base Currency</Label>
                <Input
                  id="baseCurrency"
                  type="text"
                  value={baseCurrency}
                  onChange={onBaseCurrencyChange}
                  placeholder="Enter base currency (e.g., BTC)"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Button
                  type="submit"
                  disabled={isLoading || !baseCurrency.trim()}
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
              <span className="text-muted-foreground">Fetching crypto rank data...</span>
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
            <CandlestickChart data={ohlcvData} symbol={baseCurrency} cryptoRankData={cryptoRankData} />
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!isLoading && !error && (
        <>
          {cryptoRankData.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  No crypto rank data found for base currency: {baseCurrency.toUpperCase()}
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
                      <TableHead>Currency</TableHead>
                      <TableHead>Crypto Rank</TableHead>
                      <TableHead>LPPL Side</TableHead>
                      <TableHead>LPPL Pos Conf</TableHead>
                      <TableHead>LPPL Neg Conf</TableHead>
                      <TableHead>Strategy Side</TableHead>
                      <TableHead>Profit/Trade</TableHead>
                      <TableHead>Expectancy</TableHead>
                      <TableHead>Profit Factor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cryptoRankData
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.baseCurrency}/{item.quoteCurrency || 'USD'}</TableCell>
                        <TableCell>{item.crypto_ranks !== null && item.crypto_ranks !== undefined ? formatNumber(item.crypto_ranks) : 'N/A'}</TableCell>
                        <TableCell>{item.lppl_side || 'N/A'}</TableCell>
                        <TableCell>{item.lppl_pos_conf !== null && item.lppl_pos_conf !== undefined ? formatNumber(item.lppl_pos_conf) : 'N/A'}</TableCell>
                        <TableCell>{item.lppl_neg_conf !== null && item.lppl_neg_conf !== undefined ? formatNumber(item.lppl_neg_conf) : 'N/A'}</TableCell>
                        <TableCell>{item.strategy_side || 'N/A'}</TableCell>
                        <TableCell>{item.strategy_profit_per_trade !== null && item.strategy_profit_per_trade !== undefined ? formatNumber(item.strategy_profit_per_trade) : 'N/A'}</TableCell>
                        <TableCell>{item.strategy_expectancy !== null && item.strategy_expectancy !== undefined ? formatNumber(item.strategy_expectancy) : 'N/A'}</TableCell>
                        <TableCell>{item.strategy_profit_factor !== null && item.strategy_profit_factor !== undefined ? formatNumber(item.strategy_profit_factor) : 'N/A'}</TableCell>
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
  const [cryptoData, setCryptoData] = useState<CryptoRankData[]>([]);
  const [stockOHLCVData, setStockOHLCVData] = useState<OHLCVData[]>([]);
  const [cryptoOHLCVData, setCryptoOHLCVData] = useState<OHLCVData[]>([]);
  const [stockTicker, setStockTicker] = useState('amzn');
  const [cryptoTicker, setCryptoTicker] = useState('btc');
  const [isLoadingStocks, setIsLoadingStocks] = useState(false);
  const [isLoadingCrypto, setIsLoadingCrypto] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [cryptoError, setCryptoError] = useState<string | null>(null);

  // Get wallet auth token
  const { getAccessToken } = useWalletAuthContext();

  // API configuration (similar to Staking.tsx)
  const API_BASE_URL = import.meta.env.DEV
    ? '/api'
    : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4000/api');

  const fetchRankData = async (selectedTicker: string) => {
    setIsLoadingStocks(true);
    setStockError(null);

    const fullUrl = `${API_BASE_URL}/ranks?ticker=${selectedTicker}`;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
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

      setStockData(rankData);

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

      setStockOHLCVData(ohlcvData);

    } catch (err) {
      console.error('Error fetching rank data:', err);
      setStockError(err instanceof Error ? err.message : 'An unknown error occurred');
      setStockData([]);
      setStockOHLCVData([]);
    } finally {
      setIsLoadingStocks(false);
    }
  };

  const fetchCryptoRankData = async (selectedBaseCurrency: string) => {
    setIsLoadingCrypto(true);
    setCryptoError(null);

    // Calculate date range (last 360 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 360 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fullUrl = `${API_BASE_URL}/crypto_ranks?baseCurrency=${selectedBaseCurrency}&start_date=${startDate}&end_date=${endDate}`;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Handle the response based on your API structure
      let cryptoRankData: CryptoRankData[] = [];
      if (Array.isArray(data)) {
        cryptoRankData = data;
      } else if (data.data && Array.isArray(data.data)) {
        cryptoRankData = data.data;
      } else {
        // If single object, wrap in array
        cryptoRankData = [data];
      }

      setCryptoData(cryptoRankData);

      // Extract OHLC data from crypto rank data for candlestick chart
      const ohlcvData: OHLCVData[] = cryptoRankData
        .filter(item => item.open !== null && item.high !== null && item.low !== null && item.close !== null && item.volume !== null)
        .map(item => ({
          date: item.date,
          open: item.open!,
          high: item.high!,
          low: item.low!,
          close: item.close!,
          volume: item.volume!
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setCryptoOHLCVData(ohlcvData);

    } catch (err) {
      console.error('Error fetching crypto rank data:', err);
      setCryptoError(err instanceof Error ? err.message : 'An unknown error occurred');
      setCryptoData([]);
      setCryptoOHLCVData([]);
    } finally {
      setIsLoadingCrypto(false);
    }
  };

  // Load initial data on component mount only
  useEffect(() => {
    fetchRankData(stockTicker);
    fetchCryptoRankData(cryptoTicker);
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
      fetchRankData(stockTicker.trim());
    }
  };

  const handleCryptoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cryptoTicker.trim()) {
      fetchCryptoRankData(cryptoTicker.trim());
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
              onFetchData={(ticker: string) => fetchRankData(ticker)}
              formatNumber={formatNumber}
            />
          </TabsContent>

          <TabsContent value="crypto">
            <CryptoRanksTab
              title="Crypto Ranks"
              baseCurrency={cryptoTicker}
              setBaseCurrency={setCryptoTicker}
              isLoading={isLoadingCrypto}
              error={cryptoError}
              cryptoRankData={cryptoData}
              ohlcvData={cryptoOHLCVData}
              onBaseCurrencyChange={handleCryptoTickerChange}
              onSubmit={handleCryptoSubmit}
              formatNumber={formatNumber}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Ranks;
