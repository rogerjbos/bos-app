import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, authFetch, getAuthHeaders } from '../lib/api';

// Mirrors EtfPerformanceRow / EtfPerformanceResponse served by the
// data-api-server (GET /api/etf_performance).
interface EtfRow {
  symbol: string;
  name: string;
  category: string; // 'Broad' | 'Sector' | 'Industry' | 'Country'
  latest_close: number | null;
  latest_date: string | null;
  ret_1d: number | null;
  ret_7d: number | null;
  ret_30d: number | null;
  ret_90d: number | null;
  ret_365d: number | null;
  ret_ytd: number | null;
  pct_from_52w_high: number | null;
}

interface EtfResponse {
  as_of: string | null;
  fetched_at: string;
  rows: EtfRow[];
}

type SortDir = 'asc' | 'desc';
type SortKey = keyof EtfRow;
type RetKey = 'ret_1d' | 'ret_7d' | 'ret_30d' | 'ret_90d' | 'ret_ytd' | 'ret_365d';

const CATEGORIES = ['Broad', 'Sector', 'Industry', 'Country'] as const;
const ALL = '__all__';

// Heatmap scale per horizon: |return| at which the cell reaches full tint.
// Longer horizons move more, so they need a wider scale to stay comparable.
const RET_COLUMNS: { key: RetKey; label: string; scale: number }[] = [
  { key: 'ret_1d', label: '1D', scale: 3 },
  { key: 'ret_7d', label: '7D', scale: 6 },
  { key: 'ret_30d', label: '30D', scale: 10 },
  { key: 'ret_90d', label: '90D', scale: 18 },
  { key: 'ret_ytd', label: 'YTD', scale: 25 },
  { key: 'ret_365d', label: '1Y', scale: 40 },
];

const fmtRet = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

// Diverging tint: emerald for gains, red for losses, transparent (the surface)
// at zero. The signed number stays in default ink, so color is never the only
// encoding.
const heatStyle = (v: number | null | undefined, scale: number): React.CSSProperties | undefined => {
  if (v === null || v === undefined) return undefined;
  const alpha = Math.min(Math.abs(v) / scale, 1) * 0.35;
  const rgb = v >= 0 ? '16,185,129' : '239,68,68';
  return { backgroundColor: `rgba(${rgb},${alpha.toFixed(3)})` };
};

const retTextClass = (v: number | null | undefined): string =>
  v === null || v === undefined
    ? 'text-gray-400 dark:text-gray-500'
    : v >= 0
      ? 'text-emerald-800 dark:text-emerald-300'
      : 'text-red-800 dark:text-red-300';

const StatTile: React.FC<{ label: string; name: string; symbol: string; value: number | null; sub?: string }> = ({
  label,
  name,
  symbol,
  value,
}) => (
  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
    <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
    <div className={`mt-1 text-2xl font-bold tabular-nums ${retTextClass(value)}`}>{fmtRet(value)}</div>
    <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 truncate" title={`${name} (${symbol})`}>
      {name} · {symbol}
    </div>
  </div>
);

const EtfPerformancePage: React.FC = () => {
  const [data, setData] = useState<EtfResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [rankBy, setRankBy] = useState<RetKey>('ret_30d');
  const [sortKey, setSortKey] = useState<SortKey>('ret_30d');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const load = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const qs = refresh ? '?refresh=true' : '';
      const response = await authFetch(`${API_BASE_URL}/etf_performance${qs}`, {
        headers: { ...getAuthHeaders() },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Request failed: ${response.status}`);
      }
      setData((await response.json()) as EtfResponse);
    } catch (err) {
      console.error('Error loading ETF performance:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ETF performance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = data?.rows ?? [];

  // Best/worst per category on the chosen ranking horizon.
  const leaders = useMemo(() => {
    return CATEGORIES.filter((c) => c !== 'Broad').map((cat) => {
      const inCat = rows.filter((r) => r.category === cat && r[rankBy] !== null);
      const sorted = [...inCat].sort((a, b) => (b[rankBy] as number) - (a[rankBy] as number));
      return { category: cat, best: sorted[0], worst: sorted[sorted.length - 1] };
    });
  }, [rows, rankBy]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toUpperCase();
    const filtered = rows.filter((r) => {
      if (categoryFilter !== ALL && r.category !== categoryFilter) return false;
      if (q && !r.symbol.toUpperCase().includes(q) && !r.name.toUpperCase().includes(q)) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, categoryFilter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'symbol' || key === 'name' || key === 'category' ? 'asc' : 'desc');
    }
  };

  const rankLabel = RET_COLUMNS.find((c) => c.key === rankBy)?.label ?? '';
  const headerClass = (numeric: boolean, active: boolean) =>
    `p-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 ${
      numeric ? 'text-right' : 'text-left'
    } ${active ? 'text-blue-600 dark:text-blue-400' : ''}`;

  const sortArrow = (key: SortKey) =>
    sortKey === key ? <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '▲' : '▼'}</span> : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ETF Performance</h1>
        {data && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            prices as of {data.as_of ?? '—'} ·{' '}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
            >
              {refreshing ? 'refreshing…' : 'refresh'}
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Trailing returns for {rows.length || '~100'} broad-market, sector, industry, and country ETFs — a
        one-glance map of what&apos;s leading and lagging. Click any column to sort; cell shading scales
        with the size of the move.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">Loading ETF performance…</div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">Leaders &amp; laggards by</span>
            <select
              value={rankBy}
              onChange={(e) => setRankBy(e.target.value as RetKey)}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {RET_COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label} return
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            {leaders.map(({ category, best, worst }) => (
              <React.Fragment key={category}>
                {best && (
                  <StatTile label={`Best ${category} · ${rankLabel}`} name={best.name} symbol={best.symbol} value={best[rankBy]} />
                )}
                {worst && (
                  <StatTile label={`Worst ${category} · ${rankLabel}`} name={worst.name} symbol={worst.symbol} value={worst[rankBy]} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {[ALL, ...CATEGORIES].map((cat) => {
              const count = cat === ALL ? rows.length : rows.filter((r) => r.category === cat).length;
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {cat === ALL ? 'All' : cat} <span className={active ? 'opacity-80' : 'opacity-60'}>{count}</span>
                </button>
              );
            })}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or ticker…"
              className="ml-auto w-56 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    onClick={() => toggleSort('symbol')}
                    className={`${headerClass(false, sortKey === 'symbol')} sticky left-0 bg-gray-50 dark:bg-gray-900 z-10`}
                  >
                    Ticker{sortArrow('symbol')}
                  </th>
                  <th onClick={() => toggleSort('name')} className={headerClass(false, sortKey === 'name')}>
                    Name{sortArrow('name')}
                  </th>
                  <th onClick={() => toggleSort('category')} className={headerClass(false, sortKey === 'category')}>
                    Category{sortArrow('category')}
                  </th>
                  <th onClick={() => toggleSort('latest_close')} className={headerClass(true, sortKey === 'latest_close')}>
                    Close{sortArrow('latest_close')}
                  </th>
                  {RET_COLUMNS.map((c) => (
                    <th key={c.key} onClick={() => toggleSort(c.key)} className={headerClass(true, sortKey === c.key)}>
                      {c.label}
                      {sortArrow(c.key)}
                    </th>
                  ))}
                  <th
                    onClick={() => toggleSort('pct_from_52w_high')}
                    title="Distance below the trailing 52-week high"
                    className={headerClass(true, sortKey === 'pct_from_52w_high')}
                  >
                    vs 52w High{sortArrow('pct_from_52w_high')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((row) => (
                  <tr
                    key={row.symbol}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="p-2 whitespace-nowrap font-medium sticky left-0 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
                      {row.symbol}
                    </td>
                    <td className="p-2 whitespace-nowrap text-gray-900 dark:text-gray-100">{row.name}</td>
                    <td className="p-2 whitespace-nowrap text-gray-500 dark:text-gray-400">{row.category}</td>
                    <td className="p-2 whitespace-nowrap text-right tabular-nums text-gray-900 dark:text-gray-100">
                      {row.latest_close === null ? '—' : row.latest_close.toFixed(2)}
                    </td>
                    {RET_COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        style={heatStyle(row[c.key], c.scale)}
                        className="p-2 whitespace-nowrap text-right tabular-nums text-gray-900 dark:text-gray-100"
                      >
                        {fmtRet(row[c.key])}
                      </td>
                    ))}
                    <td
                      style={heatStyle(row.pct_from_52w_high, 25)}
                      className="p-2 whitespace-nowrap text-right tabular-nums text-gray-900 dark:text-gray-100"
                    >
                      {fmtRet(row.pct_from_52w_high)}
                    </td>
                  </tr>
                ))}
                {filteredSorted.length === 0 && (
                  <tr>
                    <td colSpan={5 + RET_COLUMNS.length} className="p-6 text-center text-gray-500 dark:text-gray-400">
                      No ETFs match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Returns use dividend-adjusted closes from Tiingo, measured from the most recent trading day back
            7/30/90/365 calendar days (nearest prior trading day). YTD is from the last close of the prior
            year. Data is cached server-side for a few hours — use refresh to force a refetch.
          </p>
        </>
      )}
    </div>
  );
};

export default EtfPerformancePage;
