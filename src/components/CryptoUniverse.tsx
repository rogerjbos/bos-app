import ReactECharts from 'echarts-for-react';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE_URL } from '../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SparkPoint {
  date: string;
  close: number;
}

interface CryptoUniverseItem {
  rank: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_id: number;
  price: number | null;
  market_cap: number | null;
  percent_change_24h: number | null;
  percent_change_7d: number | null;
  percent_change_30d: number | null;
  sparkline: SparkPoint[];
}

interface BreadthPoint {
  date: string;
  advances: number;
  declines: number;
  total: number;
  ratio: number | null;
}

type TabKey = '50' | '100' | '200' | 'polkadot';

// ── Sparkline SVG ─────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: SparkPoint[]; positive: boolean }> = ({ data, positive }) => {
  if (!data || data.length < 2) {
    return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  }

  const W = 80;
  const H = 24;
  const closes = data.map(d => d.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const points = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1)) * W;
      const y = H - ((c - min) / range) * (H - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={W} height={H} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtPrice = (n: number | null) => {
  if (n === null || n === undefined) return '—';
  if (n >= 1) return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
};

const fmtMcap = (n: number | null) => {
  if (n === null || n === undefined) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
};

const PctCell: React.FC<{ value: number | null }> = ({ value }) => {
  if (value === null || value === undefined) return <span className="text-gray-400">—</span>;
  const pos = value >= 0;
  return (
    <span className={pos ? 'text-green-500' : 'text-red-500'}>
      {pos ? '+' : ''}{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
    </span>
  );
};

// ── Breadth Chart ─────────────────────────────────────────────────────────────
const BreadthChart: React.FC<{ data: BreadthPoint[] }> = ({ data }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const dates = data.map(d => d.date);
  const advances = data.map(d => d.advances);
  const declines = data.map(d => d.declines);
  const ratios = data.map(d => d.ratio);

  const textColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const date = params[0]?.axisValue ?? '';
        let html = `<div style="font-weight:600;margin-bottom:4px">${date}</div>`;
        for (const p of params) {
          const color = p.color;
          const val = typeof p.value === 'number' ? p.value.toLocaleString() : p.value;
          html += `<div style="display:flex;gap:8px;align-items:center">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${color}"></span>
            <span>${p.seriesName}:</span><span style="font-weight:600">${val}</span>
          </div>`;
        }
        return html;
      },
    },
    legend: {
      data: ['Advances', 'Declines', 'Advance %'],
      textStyle: { color: textColor },
      top: 0,
    },
    grid: { left: 60, right: 60, top: 36, bottom: 40 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        color: textColor,
        fontSize: 11,
        rotate: 30,
        formatter: (v: string) => v.slice(5), // show MM-DD
      },
      axisLine: { lineStyle: { color: gridColor } },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Count',
        nameTextStyle: { color: textColor, fontSize: 11 },
        axisLabel: { color: textColor, fontSize: 11 },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { lineStyle: { color: gridColor } },
      },
      {
        type: 'value',
        name: 'Adv %',
        min: 0,
        max: 100,
        nameTextStyle: { color: textColor, fontSize: 11 },
        axisLabel: { color: textColor, fontSize: 11, formatter: '{value}%' },
        axisLine: { lineStyle: { color: gridColor } },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Advances',
        type: 'bar',
        stack: 'breadth',
        data: advances,
        itemStyle: { color: '#22c55e' },
        emphasis: { itemStyle: { color: '#16a34a' } },
      },
      {
        name: 'Declines',
        type: 'bar',
        stack: 'breadth',
        data: declines,
        itemStyle: { color: '#ef4444' },
        emphasis: { itemStyle: { color: '#dc2626' } },
      },
      {
        name: 'Advance %',
        type: 'line',
        yAxisIndex: 1,
        data: ratios,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#f59e0b', width: 2 },
        itemStyle: { color: '#f59e0b' },
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '260px', width: '100%' }}
      theme={isDark ? 'dark' : undefined}
    />
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const CryptoUniverse: React.FC = () => {
  const [topData, setTopData] = useState<CryptoUniverseItem[]>([]);
  const [polkadotData, setPolkadotData] = useState<CryptoUniverseItem[]>([]);
  const [breadthData, setBreadthData] = useState<BreadthPoint[]>([]);
  const [breadthLoading, setBreadthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('50');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load: fetch coin lists (breadth fetched after, once we have symbols)
  useEffect(() => {
    const fetchCoins = async () => {
      setLoading(true);
      setError(null);
      try {
        const [topRes, dotRes] = await Promise.all([
          fetch(`${API_BASE_URL}/crypto/universe/top?limit=200`),
          fetch(`${API_BASE_URL}/crypto/universe/polkadot`),
        ]);
        if (!topRes.ok) throw new Error(`Top fetch failed: ${topRes.status}`);
        if (!dotRes.ok) throw new Error(`Polkadot fetch failed: ${dotRes.status}`);
        const [topJson, dotJson] = await Promise.all([topRes.json(), dotRes.json()]);
        setTopData(topJson);
        setPolkadotData(dotJson);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchCoins();
  }, []);

  // Re-fetch breadth whenever tab or coin lists change
  useEffect(() => {
    if (topData.length === 0 && polkadotData.length === 0) return;

    const tabSymbols =
      activeTab === 'polkadot'
        ? polkadotData.map(c => c.symbol)
        : topData.slice(0, Number(activeTab)).map(c => c.symbol);

    if (tabSymbols.length === 0) return;

    const params = new URLSearchParams({ days: '90' });
    tabSymbols.forEach(s => params.append('symbols', s));

    setBreadthLoading(true);
    fetch(`${API_BASE_URL}/crypto/universe/breadth?${params}`)
      .then(r => { if (!r.ok) throw new Error(`Breadth fetch failed: ${r.status}`); return r.json(); })
      .then(json => setBreadthData(json))
      .catch(e => console.error('Breadth fetch error:', e))
      .finally(() => setBreadthLoading(false));
  }, [activeTab, topData, polkadotData]);

  const displayData = useMemo(() => {
    if (activeTab === 'polkadot') {
      return polkadotData.filter(
        coin => !(coin.symbol === 'HDX' && /home depot/i.test(coin.name))
      );
    }
    return topData.slice(0, Number(activeTab));
  }, [activeTab, topData, polkadotData]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: '50', label: 'Top 50' },
    { key: '100', label: 'Top 100' },
    { key: '200', label: 'Top 200' },
    { key: 'polkadot', label: 'Polkadot' },
  ];

  const tabClass = (key: TabKey) =>
    `px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
      activeTab === key
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-gray-500 dark:text-gray-400">
        Loading crypto breadth...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-red-500">
        Error: {error}
      </div>
    );
  }

  // Summary stats for today
  const latest = breadthData[breadthData.length - 1];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Crypto Breadth
      </h1>

      {/* Breadth Chart */}
      {(breadthData.length > 0 || breadthLoading) && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
              Market Breadth — Advance / Decline · {activeTab === 'polkadot' ? 'Polkadot' : `Top ${activeTab}`} (90 days)
              {breadthLoading && <span className="ml-2 text-xs text-gray-400 font-normal">updating…</span>}
            </h2>
            {latest && (
              <div className="flex gap-4 text-sm">
                <span className="text-green-500 font-medium">
                  ▲ {latest.advances.toLocaleString()} advancing
                </span>
                <span className="text-red-500 font-medium">
                  ▼ {latest.declines.toLocaleString()} declining
                </span>
                <span className="text-amber-500 font-medium">
                  {latest.ratio?.toFixed(1)}% advance rate
                </span>
              </div>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <BreadthChart data={breadthData} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            className={tabClass(t.key)}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">24h %</th>
              <th className="hidden sm:table-cell px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">7d %</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">30d %</th>
              <th className="hidden md:table-cell px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Market Cap</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">30d Chart</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
            {displayData.map(coin => (
              <tr
                key={coin.cmc_id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-100"
              >
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {coin.rank}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <img
                      src={`https://s2.coinmarketcap.com/static/img/coins/32x32/${coin.cmc_id}.png`}
                      alt={coin.symbol}
                      width={20}
                      height={20}
                      className="rounded-full flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{coin.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{coin.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white whitespace-nowrap">
                  {fmtPrice(coin.price)}
                </td>
                <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                  <PctCell value={coin.percent_change_24h} />
                </td>
                <td className="hidden sm:table-cell px-4 py-3 text-right text-sm whitespace-nowrap">
                  <PctCell value={coin.percent_change_7d} />
                </td>
                <td className="px-4 py-3 text-right text-sm whitespace-nowrap">
                  <PctCell value={coin.percent_change_30d} />
                </td>
                <td className="hidden md:table-cell px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {fmtMcap(coin.market_cap)}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Sparkline
                    data={coin.sparkline}
                    positive={(coin.percent_change_30d ?? 0) >= 0}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
        Prices & rankings from
      </p> */}
    </div>
  );
};

export default CryptoUniverse;
