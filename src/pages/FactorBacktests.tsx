import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

// Mirrors the FactorBacktest pydantic model served by the data-api-server
// (GET /api/factor_backtests). Nullable numeric columns come back as number | null.
interface FactorBacktest {
  insert_at: string;
  factor: string;
  fwd: string;
  horizon_months: number;
  sector: string;
  start: string;
  end: string;
  nt: number;
  min_mcap: number;
  max_mcap: number;
  min_dolvol: number;
  max_ret: number;
  n_periods: number;
  nobs: number | null;
  periods_per_year: number | null;
  ew_spread: number | null;
  cw_spread: number | null;
  cw_long_spread: number | null;
  sharpe: number | null;
  hitrate: number | null;
  l_sharpe: number | null;
  l_hitrate: number | null;
  ic_mean: number | null;
  ic_median: number | null;
  ic_sd: number | null;
  ic_tstat: number | null;
  ic_n: number;
  ic_hitrate: number | null;
  consistency: number | null;
  spread_tstat: number | null;
  spread_ann: number | null;
  vol_ann: number | null;
  sharpe_ann: number | null;
  max_drawdown: number | null;
  skew: number | null;
  kurtosis: number | null;
  best_period: number | null;
  worst_period: number | null;
  turnover: number | null;
  monotonicity: number | null;
}

type SortDir = 'asc' | 'desc';

// Curated set of columns to display, in order. `pct` formats as a percentage.
interface ColumnDef {
  key: keyof FactorBacktest;
  label: string;
  numeric: boolean;
  decimals?: number;
  pct?: boolean;
  tstat?: boolean; // color by statistical significance
}

const COLUMNS: ColumnDef[] = [
  { key: 'factor', label: 'Factor', numeric: false },
  { key: 'min_mcap', label: 'Cap', numeric: false },
  { key: 'fwd', label: 'Fwd', numeric: false },
  { key: 'horizon_months', label: 'Horizon (mo)', numeric: true, decimals: 0 },
  { key: 'nt', label: 'Tiles', numeric: true, decimals: 0 },
  { key: 'ic_mean', label: 'IC Mean', numeric: true, decimals: 4 },
  { key: 'ic_tstat', label: 'IC t-stat', numeric: true, decimals: 2, tstat: true },
  { key: 'ic_hitrate', label: 'IC Hit%', numeric: true, pct: true, decimals: 1 },
  { key: 'ew_spread', label: 'EW Spread', numeric: true, pct: true, decimals: 2 },
  { key: 'cw_spread', label: 'CW Spread', numeric: true, pct: true, decimals: 2 },
  { key: 'spread_ann', label: 'Spread (ann)', numeric: true, pct: true, decimals: 2 },
  { key: 'spread_tstat', label: 'Spread t-stat', numeric: true, decimals: 2, tstat: true },
  { key: 'sharpe_ann', label: 'Sharpe (ann)', numeric: true, decimals: 2 },
  { key: 'vol_ann', label: 'Vol (ann)', numeric: true, pct: true, decimals: 2 },
  { key: 'max_drawdown', label: 'Max DD', numeric: true, pct: true, decimals: 2 },
  { key: 'hitrate', label: 'Hit%', numeric: true, pct: true, decimals: 1 },
  { key: 'monotonicity', label: 'Monoton.', numeric: true, decimals: 2 },
  { key: 'turnover', label: 'Turnover', numeric: true, pct: true, decimals: 1 },
  { key: 'consistency', label: 'Consist.', numeric: true, decimals: 2 },
];

const ALL = '__all__';

// Format a market cap bound (already in $millions) into a compact label.
const fmtMcap = (v: number): string => {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  return `$${v.toFixed(0)}M`;
};

// Format a market-cap universe. `max_mcap === 0` (or falsy) means no upper
// bound; `min_mcap === 0` means no lower bound.
const fmtMcapRange = (min: number, max: number): string => {
  if (!max) return `≥ ${fmtMcap(min)}`;
  if (!min) return `≤ ${fmtMcap(max)}`;
  return `${fmtMcap(min)}–${fmtMcap(max)}`;
};

// Stable key identifying a market-cap universe (min/max pair).
const mcapKey = (min: number, max: number): string => `${min}|${max}`;

const formatCell = (value: FactorBacktest[keyof FactorBacktest], col: ColumnDef): string => {
  if (value === null || value === undefined) return '—';
  if (!col.numeric) return String(value);
  const n = value as number;
  if (col.pct) return `${(n * 100).toFixed(col.decimals ?? 2)}%`;
  return n.toFixed(col.decimals ?? 2);
};

// Color t-stat cells green/red by significance (|t| >= ~2 is significant at 5%).
const tstatColor = (value: number | null): string => {
  if (value === null) return '';
  const a = Math.abs(value);
  if (a >= 2) return value > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold';
  if (a >= 1) return value > 0 ? 'text-emerald-700/70 dark:text-emerald-500/70' : 'text-red-700/70 dark:text-red-500/70';
  return 'text-gray-500 dark:text-gray-500';
};

const FactorBacktests: React.FC = () => {
  const [data, setData] = useState<FactorBacktest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [factorFilter, setFactorFilter] = useState<string>(ALL);
  const [fwdFilter, setFwdFilter] = useState<string>(ALL);
  const [horizonFilter, setHorizonFilter] = useState<string>(ALL);
  const [mcapFilter, setMcapFilter] = useState<string>(ALL);
  // Empty string until data loads, then defaults to the most recent insert_at.
  const [insertFilter, setInsertFilter] = useState<string>('');

  const [sortKey, setSortKey] = useState<keyof FactorBacktest>('ic_tstat');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/factor_backtests`, {
          headers: { ...getAuthHeaders() },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `Request failed: ${response.status}`);
        }
        const rows: FactorBacktest[] = await response.json();
        setData(rows);
        // Default the insert_at selector to the most recent run.
        const latest = rows.reduce<string>(
          (acc, r) => (r.insert_at > acc ? r.insert_at : acc),
          '',
        );
        setInsertFilter(latest);
      } catch (err) {
        console.error('Error loading factor backtests:', err);
        setError(err instanceof Error ? err.message : 'Failed to load factor backtests');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Distinct values for the filter dropdowns, derived from the loaded data.
  const factors = useMemo(
    () => Array.from(new Set(data.map((d) => d.factor))).sort(),
    [data],
  );
  const fwds = useMemo(
    () => Array.from(new Set(data.map((d) => d.fwd))).sort(),
    [data],
  );
  const horizons = useMemo(
    () => Array.from(new Set(data.map((d) => d.horizon_months))).sort((a, b) => a - b),
    [data],
  );
  // Distinct market-cap universes, largest floor first.
  const mcaps = useMemo(() => {
    const seen = new Map<string, { key: string; min: number; max: number }>();
    for (const d of data) {
      const key = mcapKey(d.min_mcap, d.max_mcap);
      if (!seen.has(key)) seen.set(key, { key, min: d.min_mcap, max: d.max_mcap });
    }
    return Array.from(seen.values()).sort((a, b) => b.min - a.min || a.max - b.max);
  }, [data]);
  // Distinct insert_at run dates, newest first.
  const insertDates = useMemo(
    () => Array.from(new Set(data.map((d) => d.insert_at))).sort((a, b) => b.localeCompare(a)),
    [data],
  );

  const filteredSorted = useMemo(() => {
    const filtered = data.filter(
      (d) =>
        (factorFilter === ALL || d.factor === factorFilter) &&
        (fwdFilter === ALL || d.fwd === fwdFilter) &&
        (horizonFilter === ALL || String(d.horizon_months) === horizonFilter) &&
        (mcapFilter === ALL || mcapKey(d.min_mcap, d.max_mcap) === mcapFilter) &&
        (insertFilter === '' || d.insert_at === insertFilter),
    );

    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // Nulls always sort to the bottom regardless of direction
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [data, factorFilter, fwdFilter, horizonFilter, mcapFilter, insertFilter, sortKey, sortDir]);

  const toggleSort = (key: keyof FactorBacktest) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const selectClass =
    'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Factor Backtests
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Single-factor backtest statistics from <code>tiingo.factor_backtests</code> — information
        coefficients, long/short spreads, annualized risk/return, and drawdowns. Click a column
        header to sort.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Factor
          </label>
          <select
            value={factorFilter}
            onChange={(e) => setFactorFilter(e.target.value)}
            className={selectClass}
          >
            <option value={ALL}>All factors</option>
            {factors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Forward Return
          </label>
          <select
            value={fwdFilter}
            onChange={(e) => setFwdFilter(e.target.value)}
            className={selectClass}
          >
            <option value={ALL}>All horizons</option>
            {fwds.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rebalance Horizon
          </label>
          <select
            value={horizonFilter}
            onChange={(e) => setHorizonFilter(e.target.value)}
            className={selectClass}
          >
            <option value={ALL}>All</option>
            {horizons.map((h) => (
              <option key={h} value={String(h)}>
                {h} month{h === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Market Cap
          </label>
          <select
            value={mcapFilter}
            onChange={(e) => setMcapFilter(e.target.value)}
            className={selectClass}
          >
            <option value={ALL}>All caps</option>
            {mcaps.map((m) => (
              <option key={m.key} value={m.key}>
                {fmtMcapRange(m.min, m.max)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Run Date
          </label>
          <select
            value={insertFilter}
            onChange={(e) => setInsertFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All dates</option>
            {insertDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">Loading factor backtests…</div>
      ) : (
        <div className="mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {filteredSorted.length}
            </span>{' '}
            backtest{filteredSorted.length === 1 ? '' : 's'}
            {filteredSorted.length > 0 && (() => {
              const universes = Array.from(
                new Set(filteredSorted.map((d) => mcapKey(d.min_mcap, d.max_mcap))),
              );
              const universeLabel =
                universes.length === 1
                  ? fmtMcapRange(filteredSorted[0].min_mcap, filteredSorted[0].max_mcap)
                  : `${universes.length} cap ranges`;
              const dates = Array.from(new Set(filteredSorted.map((d) => d.insert_at)));
              return (
                <span className="ml-3">
                  universe {universeLabel}
                  {' · '}
                  {filteredSorted[0].start} → {filteredSorted[0].end}
                  {dates.length === 1 && (
                    <span className="ml-3 text-gray-500 dark:text-gray-500">run {dates[0]}</span>
                  )}
                </span>
              );
            })()}
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={`p-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        col.numeric ? 'text-right' : 'text-left'
                      } ${col.key === COLUMNS[0].key ? 'sticky left-0 bg-gray-50 dark:bg-gray-900 z-10' : ''}`}
                      title="Click to sort"
                    >
                      {col.label}
                      {sortKey === col.key && (
                        <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((row, i) => (
                  <tr
                    key={`${row.factor}-${row.fwd}-${row.horizon_months}-${row.min_mcap}-${i}`}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    {COLUMNS.map((col) => {
                      const raw = row[col.key];
                      const isTstat = col.tstat === true;
                      const colorClass = isTstat
                        ? tstatColor(raw as number | null)
                        : 'text-gray-900 dark:text-gray-100';
                      // The Cap column combines min_mcap/max_mcap into one range label.
                      const content =
                        col.key === 'min_mcap'
                          ? fmtMcapRange(row.min_mcap, row.max_mcap)
                          : formatCell(raw, col);
                      return (
                        <td
                          key={col.key}
                          className={`p-2 whitespace-nowrap ${
                            col.numeric ? 'text-right tabular-nums' : 'text-left'
                          } ${colorClass} ${
                            col.key === COLUMNS[0].key
                              ? 'sticky left-0 bg-white dark:bg-gray-950 font-medium'
                              : ''
                          }`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredSorted.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="p-6 text-center text-gray-500 dark:text-gray-400"
                    >
                      No backtests match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FactorBacktests;

