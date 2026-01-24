import * as echarts from 'echarts';
import React, { useEffect, useRef } from 'react';

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface DecisionData {
  date: string;
  ticker: string;
  strategy: string;
  decision: string;
  confidence: number;
  price: number;
}

interface PriceChartProps {
  symbol: string;
  decisions: DecisionData[];
  assetType: 'stocks' | 'crypto';
  apiKey: string;
  apiBaseUrl: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ symbol, decisions, assetType, apiKey, apiBaseUrl }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // API configuration
  const API_BASE_URL = apiBaseUrl;
  const API_KEY = apiKey;

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Fetch price data and render chart
    fetchPriceData();

    // Handle window resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [symbol, assetType, decisions]);

  const fetchPriceData = async () => {
    try {
      // Extract symbol from decision data
      const chartSymbol = decisions && decisions.length > 0 && decisions[0].ticker ? decisions[0].ticker : symbol;

      // Check if this is decision data (4 fields) or performance data (24+ fields)
      const isDecisionData = decisions.length > 0 && decisions[0] && Object.keys(decisions[0]).length === 4;

      let startDate: string;
      let endDate: string;

      if (isDecisionData && decisions.length > 0) {
        // For decision data, find the date range from decisions
        const decisionDates = decisions
          .map(d => d.date)
          .filter(date => date)
          .map(date => new Date(date.split('T')[0])) // Remove time part
          .filter(date => !isNaN(date.getTime()))
          .sort((a, b) => a.getTime() - b.getTime());

        if (decisionDates.length > 0) {
          const earliestDecision = decisionDates[0];
          const latestDecision = decisionDates[decisionDates.length - 1];

          // Add buffer: 30 days before earliest decision, 30 days after latest decision
          const bufferDays = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
          const startDateObj = new Date(earliestDecision.getTime() - bufferDays);
          const endDateObj = new Date(latestDecision.getTime() + bufferDays);

          startDate = startDateObj.toISOString().split('T')[0];
          endDate = endDateObj.toISOString().split('T')[0];

          console.log('Fetching price data for decision range:', startDate, 'to', endDate);
          console.log('Earliest decision:', earliestDecision.toISOString().split('T')[0], 'Latest decision:', latestDecision.toISOString().split('T')[0]);
          console.log('Total decision dates found:', decisionDates.length);
        } else {
          // Fallback to last year if no valid decision dates
          endDate = new Date().toISOString().split('T')[0];
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
      } else {
        // For performance data or no decisions, use last year
        endDate = new Date().toISOString().split('T')[0];
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }

      const endpoint = assetType === 'stocks' ? 'stock_prices' : 'crypto_prices';
      const response = await fetch(`${API_BASE_URL}/${endpoint}?ticker=${chartSymbol}&start_date=${startDate}&end_date=${endDate}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch price data: ${response.status}`);
      }

      const data = await response.json();

      // Transform the data to match our expected format
      const transformedData = data.map((item: any) => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));

      console.log('API returned', data.length, 'price records');
      if (transformedData.length > 0) {
        console.log('First price date:', transformedData[0].date, 'Last price date:', transformedData[transformedData.length - 1].date);
      }

      renderChart(transformedData, isDecisionData);
    } catch (err) {
      console.error('Error fetching price data:', err);
      // Render empty chart or show error
      renderChart([], isDecisionData);
    }
  };

  const renderChart = (priceData: PriceData[] = [], isDecisionData: boolean = false) => {
    if (!chartInstance.current) return;

    // Extract symbol from decision data
    let chartSymbol = symbol; // Default fallback
    if (decisions && decisions.length > 0 && decisions[0]) {
      if (isDecisionData) {
        // For decision files, use ticker field
        chartSymbol = decisions[0].ticker || decisions[0].symbol || symbol;
      } else {
        // For performance files, use ticker field
        chartSymbol = decisions[0].ticker || decisions[0].symbol || symbol;
      }
    }

    // Prepare candlestick data
    const dates: string[] = [];
    const candlestickData: (string | number)[][] = [];

    priceData.forEach((item) => {
      dates.push(item.date);
      candlestickData.push([
        item.open,
        item.close,
        item.low,
        item.high
      ]);
    });

    console.log('Price data dates (first 5):', dates.slice(0, 5));
    console.log('Price data dates (last 5):', dates.slice(-5));
    console.log('Total price data points:', dates.length);
    console.log('Total decisions:', decisions.length);
    if (decisions.length > 0) {
      console.log('First decision:', decisions[0]);
      console.log('Decision fields:', Object.keys(decisions[0]));
    }

    // Prepare buy/sell markers as vertical lines
    const buyMarkLines: any[] = [];
    const sellMarkLines: any[] = [];

    if (isDecisionData) {
      // Handle decision files (ticker, strategy, date, action)
      console.log('Processing decision data with', decisions.length, 'decisions');
      decisions.forEach((decision, index) => {
        if (!decision) return; // Skip null decisions

        const decisionDate = decision.date || decision.Date || decision.DATE;
        const decisionValue = decision.action || decision.Action || decision.ACTION;

        if (!decisionDate || !decisionValue) {
          console.log('Missing required fields for decision', index, ':', { date: decisionDate, action: decisionValue });
          return;
        }

        const decisionDateStr = decisionDate.split('T')[0]; // Match date part only
        let dateIndex = dates.indexOf(decisionDateStr);

        // If decision date is not found in price data, place it at the end of the chart
        if (dateIndex === -1) {
          dateIndex = dates.length - 1; // Place at the last available price data point
          console.log('Decision date', decisionDateStr, 'not found in price data, placing at end of chart (index:', dateIndex, ')');
        }

        console.log('Processing decision:', index, 'Action:', decisionValue, 'Date:', decisionDateStr, 'Index:', dateIndex);

        if (dateIndex !== -1) {
          const isBuy = decisionValue.toLowerCase().includes('buy') || decisionValue.toLowerCase() === 'buy';
          const markLine = {
            xAxis: dateIndex, // Use index for categorical axis
            lineStyle: {
              color: isBuy ? '#00C49F' : '#FF6B6B',
              width: 2,
              type: 'solid',
              opacity: 0.5
            },
            label: {
              show: true,
              position: 'top',
              formatter: isBuy ? 'BUY' : 'SELL',
              color: isBuy ? '#00C49F' : '#FF6B6B',
              fontSize: 10,
              fontWeight: 'bold'
            }
          };

          if (isBuy) {
            buyMarkLines.push(markLine);
          } else {
            sellMarkLines.push(markLine);
          }
        }
      });
    } else {
      // Handle performance data (24+ fields) - don't extract individual decisions
      console.log('Performance data detected - not extracting individual buy/sell signals');
    }

    const option = {
      backgroundColor: 'transparent',
      title: {
        text: `${chartSymbol.toUpperCase()} Price Chart`,
        left: 'center',
        textStyle: {
          color: '#e5e7eb',
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#777',
        textStyle: {
          color: '#fff'
        },
        formatter: function (params: any) {
          const data = params[0];
          return `
            <div style="font-size: 14px; margin-bottom: 8px;">${data.name}</div>
            <div style="font-size: 12px;">
              Open: ${data.data[0]}<br/>
              Close: ${data.data[1]}<br/>
              Low: ${data.data[2]}<br/>
              High: ${data.data[3]}
            </div>
          `;
        }
      },
      legend: {
        data: ['Price'],
        textStyle: {
          color: '#e5e7eb'
        },
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#6b7280'
          }
        },
        axisLabel: {
          color: '#9ca3af',
          formatter: function (value: string) {
            // Format date for display
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }
        }
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: {
          lineStyle: {
            color: '#6b7280'
          }
        },
        axisLabel: {
          color: '#9ca3af'
        },
        splitLine: {
          lineStyle: {
            color: '#374151'
          }
        }
      },
      dataZoom: [
        {
          type: 'inside',
          start: 80,
          end: 100
        },
        {
          show: true,
          type: 'slider',
          top: '90%',
          start: 80,
          end: 100,
          textStyle: {
            color: '#9ca3af'
          },
          handleStyle: {
            color: '#3b82f6'
          }
        }
      ],
      series: [
        {
          name: 'Price',
          type: 'candlestick',
          data: candlestickData,
          markLine: {
            symbol: ['none', 'none'],
            label: {
              show: true,
              position: 'top',
              fontSize: 10,
              fontWeight: 'bold'
            },
            lineStyle: {
              width: 2,
              type: 'solid',
              opacity: 0.5
            },
            data: [
              ...buyMarkLines,
              ...sellMarkLines
            ]
          },
          itemStyle: {
            color: '#00C49F',      // Green for rising
            color0: '#FF6B6B',     // Red for falling
            borderColor: '#00C49F',
            borderColor0: '#FF6B6B'
          },
          emphasis: {
            itemStyle: {
              borderWidth: 2
            }
          }
        }
      ]
    };

    console.log('PriceChart: Setting chart option with dates:', dates.length, 'buy marklines:', buyMarkLines.length, 'sell marklines:', sellMarkLines.length);
    chartInstance.current.setOption(option);
  };

  return (
    <div className="w-full">
      <div
        ref={chartRef}
        className="w-full h-96 bg-gray-800 dark:bg-gray-900 rounded-lg"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};

export default PriceChart;
