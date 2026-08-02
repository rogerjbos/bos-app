import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { ThemeContext } from '../context/ThemeContext';
import { API_BASE_URL, authFetch, getAuthHeaders } from '../lib/api';

// Mirrors FactorDefinition / FactorHistoryMeta / FactorHistoryResponse served by the
// data-api-server (GET /api/factor_history, GET /api/factor_tickers).
interface FactorDefinition {
  key: string;
  label: string;
  group: string;
  description: string;
  fmt: 'percent' | 'ratio' | 'price' | 'currency_mm' | 'number';
  higher_is_better: boolean | null;
  n_obs: number;
  latest: number | null;
  latest_percentile: number | null;
}

interface FactorMeta {
  ticker: string;
  permaTicker: string;
  name: string;
  sector: string;
  industry: string;
  sicSector: string;
  sicIndustry: string;
  location: string;
  companyWebsite: string;
  secFilingWebsite: string;
  reportingCurrency: string;
  cik: number | null;
  isActive: boolean;
  isADR: boolean;
  statementLastUpdated: string | null;
  first_period: string | null;
  last_period: string | null;
  n_periods: number;
  latest_mcap: number | null;
  latest_price: number | null;
}

interface FactorHistory {
  meta: FactorMeta;
  groups: string[];
  factors: FactorDefinition[];
  periods: string[];
  datadates: (string | null)[];
  quarters: (string | null)[];
  values: Record<string, (number | null)[]>;
  percentiles: Record<string, (number | null)[]>;
  percentile_universe: number | null;
}

interface TickerSuggestion {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  isActive: boolean;
}

type SortKey = 'group' | 'label' | 'latest_percentile' | 'n_obs';
type SortDir = 'asc' | 'desc';
type Mode = 'value' | 'percentile';

const ALL = '__all__';

// Validated chart palette (slot 1 blue, slot 2 orange), stepped per mode against the
// page's own surfaces — white in light, gray-900 in dark.
const SERIES = { light: '#2a78d6', dark: '#3987e5' };
const ACCENT = { light: '#eb6834', dark: '#d95926' };
const GRID = { light: '#e1e0d9', dark: '#2c2c2a' };
const MUTED = '#898781';

const RANGES: { label: string; years: number | null }[] = [
  { label: 'All', years: null },
  { label: '20Y', years: 20 },
  { label: '10Y', years: 10 },
  { label: '5Y', years: 5 },
  { label: '3Y', years: 3 },
];

// ---------------------------------------------------------------- formatting

const fmtMoneyMM = (v: number): string => {
  // Values arrive in millions of the reporting currency.
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}T`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(2)}B`;
  return `$${v.toFixed(0)}M`;
};

const fmtValue = (v: number | null | undefined, fmt: FactorDefinition['fmt']): string => {
  if (v === null || v === undefined) return '—';
  switch (fmt) {
    case 'percent':
      return `${(v * 100).toFixed(2)}%`;
    case 'price':
      return `$${v.toFixed(2)}`;
    case 'currency_mm':
      return fmtMoneyMM(v);
    default:
      return Math.abs(v) >= 1000
        ? v.toLocaleString(undefined, { maximumFractionDigits: 0 })
        : v.toFixed(2);
  }
};

const fmtPct = (v: number | null | undefined): string =>
  v === null || v === undefined ? '—' : `${v.toFixed(0)}`;

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const [y, m] = iso.split('-');
  return `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m)]} ${y}`;
};

// ------------------------------------------------------------------ sparkline

/**
 * Inline SVG sparkline. One series, 2px, no axes — the table cells beside it carry
 * the numbers. Nulls break the line into segments rather than being interpolated
 * across, so gaps in coverage stay visible. 53 of these render far cheaper than 53
 * chart instances.
 */
const Sparkline: React.FC<{
  values: (number | null)[];
  color: string;
  width?: number;
  height?: number;
}> = ({ values, color, width = 132, height = 28 }) => {
  const pad = 2;
  const segments = useMemo(() => {
    const present = values.filter((v): v is number => v !== null);
    if (present.length < 2) return { paths: [] as string[], zeroY: null as number | null };

    const min = Math.min(...present);
    const max = Math.max(...present);
    const span = max - min || 1;
    const x = (i: number) => pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2);
    const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);

    const paths: string[] = [];
    let current: string[] = [];
    values.forEach((v, i) => {
      if (v === null) {
        if (current.length > 1) paths.push(current.join(' '));
        current = [];
        return;
      }
      current.push(`${current.length === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    });
    if (current.length > 1) paths.push(current.join(' '));

    // Only draw a zero rule when the series actually straddles it.
    const zeroY = min < 0 && max > 0 ? y(0) : null;
    return { paths, zeroY };
  }, [values, width, height]);

  if (segments.paths.length === 0) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">no data</span>;
  }

  return (
    <svg width={width} height={height} className="block" aria-hidden="true">
      {segments.zeroY !== null && (
        <line
          x1={pad}
          x2={width - pad}
          y1={segments.zeroY}
          y2={segments.zeroY}
          stroke={MUTED}
          strokeWidth={1}
          opacity={0.5}
        />
      )}
      {segments.paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
};

// ------------------------------------------------------------ percentile cell

/**
 * Percentile rank as a bar plus its number. The number is always present, so rank is
 * never carried by bar length alone; the tick marks the 50th percentile.
 */
const PercentileBar: React.FC<{ value: number | null; color: string }> = ({ value, color }) => {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 dark:text-gray-500">—</span>;
  }
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums text-gray-900 dark:text-gray-100 w-7 text-right">{fmtPct(value)}</span>
      <div className="relative h-2.5 w-16 rounded-sm bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-sm"
          style={{ width: `${Math.max(value, 1.5)}%`, backgroundColor: color }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-gray-400 dark:bg-gray-500" />
      </div>
    </div>
  );
};

// ------------------------------------------------------------------- the page

const FactorHistoryPage: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const series = isDark ? SERIES.dark : SERIES.light;
  const accent = isDark ? ACCENT.dark : ACCENT.light;
  const grid = isDark ? GRID.dark : GRID.light;

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<FactorHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rangeYears, setRangeYears] = useState<number | null>(10);
  const [groupFilter, setGroupFilter] = useState<string>(ALL);
  const [factorSearch, setFactorSearch] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);
  const [mode, setMode] = useState<Mode>('value');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('group');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ---------------------------------------------------------------- fetching

  const loadTicker = useCallback(async (ticker: string) => {
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const response = await authFetch(
        `${API_BASE_URL}/factor_history?ticker=${encodeURIComponent(ticker)}`,
        { headers: { ...getAuthHeaders() } },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Request failed: ${response.status}`);
      }
      const payload = (await response.json()) as FactorHistory;
      setData(payload);
      setQuery(payload.meta.ticker);
      // Land on the first factor that actually has history for this name.
      const firstWithData = payload.factors.find((f) => f.n_obs > 0);
      setSelectedKey(firstWithData ? firstWithData.key : null);
    } catch (err) {
      console.error('Error loading factor history:', err);
      setError(err instanceof Error ? err.message : 'Failed to load factor history');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced type-ahead. The abort guard keeps a slow early response from
  // overwriting the suggestions for a later keystroke.
  useEffect(() => {
    const term = query.trim();
    if (!term || !showSuggestions) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await authFetch(
          `${API_BASE_URL}/factor_tickers?search=${encodeURIComponent(term)}&limit=8`,
          { headers: { ...getAuthHeaders() }, signal: controller.signal },
        );
        if (!response.ok) return;
        setSuggestions((await response.json()) as TickerSuggestion[]);
        setHighlight(0);
      } catch {
        // Aborted or offline — leave the previous suggestions in place.
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, showSuggestions]);

  // Load a default name so the page is never an empty shell on first visit.
  useEffect(() => {
    loadTicker('IBM');
  }, [loadTicker]);

  // Dismiss the suggestion list on an outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = suggestions[highlight];
      loadTicker(pick ? pick.ticker : query.trim().toUpperCase());
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // ------------------------------------------------------- derived time slice

  // The API returns full history; the range control trims it client-side so switching
  // horizons is instant and never refetches.
  const sliceStart = useMemo(() => {
    if (!data || rangeYears === null || data.periods.length === 0) return 0;
    const last = new Date(data.periods[data.periods.length - 1]);
    const cutoff = new Date(last);
    cutoff.setFullYear(cutoff.getFullYear() - rangeYears);
    const iso = cutoff.toISOString().slice(0, 10);
    const idx = data.periods.findIndex((p) => p >= iso);
    return idx < 0 ? 0 : idx;
  }, [data, rangeYears]);

  const periods = useMemo(
    () => (data ? data.periods.slice(sliceStart) : []),
    [data, sliceStart],
  );

  const seriesFor = useCallback(
    (key: string): (number | null)[] => (data ? (data.values[key] || []).slice(sliceStart) : []),
    [data, sliceStart],
  );

  const percentileFor = useCallback(
    (key: string): (number | null)[] =>
      data ? (data.percentiles[key] || []).slice(sliceStart) : [],
    [data, sliceStart],
  );

  /** Value from `back` periods before the end of the visible window, if covered. */
  const valueAgo = useCallback(
    (key: string, back: number): number | null => {
      const s = seriesFor(key);
      const idx = s.length - 1 - back;
      return idx >= 0 ? s[idx] : null;
    },
    [seriesFor],
  );

  // --------------------------------------------------------------- table rows

  interface Row {
    def: FactorDefinition;
    values: (number | null)[];
    percentiles: (number | null)[];
    latest: number | null;
    latestPercentile: number | null;
    oneYearAgo: number | null;
    fiveYearAgo: number | null;
    min: number | null;
    max: number | null;
    nObs: number;
  }

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return data.factors.map((def) => {
      const values = seriesFor(def.key);
      const percentiles = percentileFor(def.key);
      const present = values.filter((v): v is number => v !== null);
      let latest: number | null = null;
      let latestPercentile: number | null = null;
      for (let i = values.length - 1; i >= 0; i -= 1) {
        if (values[i] !== null) {
          latest = values[i];
          latestPercentile = percentiles[i] ?? null;
          break;
        }
      }
      return {
        def,
        values,
        percentiles,
        latest,
        latestPercentile,
        // Periods are monthly, so 12 and 60 steps back are 1 and 5 years.
        oneYearAgo: valueAgo(def.key, 12),
        fiveYearAgo: valueAgo(def.key, 60),
        min: present.length ? Math.min(...present) : null,
        max: present.length ? Math.max(...present) : null,
        nObs: present.length,
      };
    });
  }, [data, seriesFor, percentileFor, valueAgo]);

  const visibleRows = useMemo(() => {
    const q = factorSearch.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (!showEmpty && r.nObs === 0) return false;
      if (groupFilter !== ALL && r.def.group !== groupFilter) return false;
      if (q && !r.def.label.toLowerCase().includes(q) && !r.def.key.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    const groupOrder = data ? data.groups : [];
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === 'group') {
        const ga = groupOrder.indexOf(a.def.group);
        const gb = groupOrder.indexOf(b.def.group);
        if (ga !== gb) return (ga - gb) * dir;
        return 0; // catalog order within a group is deliberate
      }
      if (sortKey === 'label') return a.def.label.localeCompare(b.def.label) * dir;
      const av = sortKey === 'n_obs' ? a.nObs : a.latestPercentile;
      const bv = sortKey === 'n_obs' ? b.nObs : b.latestPercentile;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return (av - bv) * dir;
    });
  }, [rows, factorSearch, groupFilter, showEmpty, sortKey, sortDir, data]);

  const selected = useMemo(
    () => rows.find((r) => r.def.key === selectedKey) ?? null,
    [rows, selectedKey],
  );

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'latest_percentile' || key === 'n_obs' ? 'desc' : 'asc');
    }
  };

  // ------------------------------------------------------------ chart options

  // Value and percentile are different scales and are never plotted on one pair of
  // axes — they get two stacked charts sharing an x-axis range instead.
  const baseChart = useCallback(
    (name: string, points: [string, number | null][], color: string, percentAxis: boolean) => ({
      animation: false,
      grid: { left: 8, right: 16, top: 28, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.97)',
        borderColor: grid,
        borderWidth: 1,
        textStyle: { color: isDark ? '#f3f4f6' : '#111827', fontSize: 12 },
        axisPointer: { type: 'line', lineStyle: { color: MUTED, width: 1 } },
        valueFormatter: (v: number) =>
          percentAxis ? `${v?.toFixed(0)}` : fmtValue(v, selected?.def.fmt ?? 'number'),
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: grid } },
        axisTick: { show: false },
        axisLabel: { color: MUTED, fontSize: 11 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: !percentAxis,
        min: percentAxis ? 0 : undefined,
        max: percentAxis ? 100 : undefined,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: MUTED,
          fontSize: 11,
          formatter: (v: number) =>
            percentAxis ? `${v}` : fmtValue(v, selected?.def.fmt ?? 'number'),
        },
        splitLine: { lineStyle: { color: grid, width: 1 } },
      },
      series: [
        {
          name,
          type: 'line',
          data: points,
          showSymbol: false,
          connectNulls: false,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          // A median reference makes a percentile chart readable without a second series.
          markLine: percentAxis
            ? {
                silent: true,
                symbol: 'none',
                data: [{ yAxis: 50 }],
                lineStyle: { color: MUTED, width: 1, type: 'solid' as const },
                label: { formatter: 'median', color: MUTED, fontSize: 10, position: 'insideEndTop' as const },
              }
            : undefined,
        },
      ],
    }),
    [isDark, grid, selected],
  );

  const valueOption = useMemo(() => {
    if (!selected) return null;
    const points = periods.map((p, i) => [p, selected.values[i]] as [string, number | null]);
    return baseChart(selected.def.label, points, series, false);
  }, [selected, periods, baseChart, series]);

  const percentileOption = useMemo(() => {
    if (!selected) return null;
    const points = periods.map((p, i) => [p, selected.percentiles[i]] as [string, number | null]);
    return baseChart(`${selected.def.label} percentile`, points, accent, true);
  }, [selected, periods, baseChart, accent]);

  // --------------------------------------------------------------- rendering

  const meta = data?.meta;
  const headerClass = (numeric: boolean, active: boolean) =>
    `p-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 ${
      numeric ? 'text-right' : 'text-left'
    } ${active ? 'text-blue-600 dark:text-blue-400' : ''}`;
  const sortArrow = (key: SortKey) =>
    sortKey === key ? <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '▲' : '▼'}</span> : null;

  let lastGroup = '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Factor History</h1>
      <p className="mt-1 mb-4 text-sm text-gray-600 dark:text-gray-400">
        Monthly history of every value, quality, growth, yield and risk factor for a single stock.
        Each factor also carries its cross-sectional percentile — where the stock ranked against
        every company covered that month — which is what turns a raw level into a readable signal.
      </p>

      {/* ---------------------------------------------------------- ticker search */}
      <div ref={searchBoxRef} className="relative max-w-md mb-6">
        <label htmlFor="factor-ticker" className="sr-only">
          Ticker or company name
        </label>
        <input
          id="factor-ticker"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={onSearchKeyDown}
          placeholder="Search a ticker or company name…"
          autoComplete="off"
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
            {suggestions.map((s, i) => (
              <li key={s.ticker}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => loadTicker(s.ticker)}
                  className={`w-full text-left px-3 py-2 text-sm ${
                    i === highlight ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">{s.ticker}</span>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">{s.name}</span>
                  {!s.isActive && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">(delisted)</span>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {s.sector}
                    {s.industry ? ` · ${s.industry}` : ''}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading factor history…</div>
      )}

      {!loading && data && meta && (
        <>
          {/* ------------------------------------------------------ company profile */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 mb-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{meta.name}</h2>
              <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">{meta.ticker}</span>
              {!meta.isActive && (
                <span className="rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                  Delisted
                </span>
              )}
              {meta.isADR && (
                <span className="rounded-full border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                  ADR
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Sector</div>
                <div className="text-gray-900 dark:text-gray-100">{meta.sector || '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Industry</div>
                <div className="text-gray-900 dark:text-gray-100">{meta.industry || '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Market Cap</div>
                <div className="text-gray-900 dark:text-gray-100 tabular-nums">
                  {meta.latest_mcap === null ? '—' : fmtMoneyMM(meta.latest_mcap)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Price</div>
                <div className="text-gray-900 dark:text-gray-100 tabular-nums">
                  {meta.latest_price === null ? '—' : `$${meta.latest_price.toFixed(2)}`}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Location</div>
                <div className="text-gray-900 dark:text-gray-100">{meta.location || '—'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Coverage</div>
                <div className="text-gray-900 dark:text-gray-100">
                  {meta.n_periods} months
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {fmtDate(meta.first_period)} – {fmtDate(meta.last_period)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              {meta.sicSector && <span>SIC: {meta.sicSector} · {meta.sicIndustry}</span>}
              {meta.cik !== null && <span>CIK {meta.cik}</span>}
              {meta.reportingCurrency && <span>Reports in {meta.reportingCurrency}</span>}
              {meta.companyWebsite && (
                <a
                  href={meta.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Website
                </a>
              )}
              {meta.secFilingWebsite && (
                <a
                  href={meta.secFilingWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  SEC filings
                </a>
              )}
            </div>
          </div>

          {meta.n_periods === 0 ? (
            <div className="rounded-md border border-gray-200 dark:border-gray-700 px-4 py-6 text-sm text-gray-600 dark:text-gray-400">
              No factor history is available for {meta.ticker}.
            </div>
          ) : (
            <>
              {/* ------------------------------------------------------ detail charts */}
              {selected && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 mb-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {selected.def.label}
                      </h3>
                      <p className="mt-0.5 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                        {selected.def.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {RANGES.map((r) => (
                        <button
                          key={r.label}
                          onClick={() => setRangeYears(r.years)}
                          className={`rounded-md px-2.5 py-1 text-sm font-medium border transition-colors ${
                            rangeYears === r.years
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Value · latest {fmtValue(selected.latest, selected.def.fmt)}
                      </div>
                      {valueOption && (
                        <ReactECharts
                          option={valueOption}
                          notMerge
                          style={{ height: 260, width: '100%' }}
                        />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Percentile vs all covered stocks · latest {fmtPct(selected.latestPercentile)}
                      </div>
                      {percentileOption && (
                        <ReactECharts
                          option={percentileOption}
                          notMerge
                          style={{ height: 260, width: '100%' }}
                        />
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Value and percentile are separate plots on their own scales — they are never
                    overlaid on shared axes.
                    {data.percentile_universe
                      ? ` ${data.percentile_universe.toLocaleString()} stocks ranked in the latest month.`
                      : ''}
                  </p>
                </div>
              )}

              {/* ----------------------------------------------------------- controls */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button
                  onClick={() => setGroupFilter(ALL)}
                  className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                    groupFilter === ALL
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  All <span className="opacity-70">{rows.filter((r) => showEmpty || r.nObs > 0).length}</span>
                </button>
                {data.groups.map((g) => {
                  const count = rows.filter((r) => r.def.group === g && (showEmpty || r.nObs > 0)).length;
                  const active = groupFilter === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setGroupFilter(g)}
                      className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {g} <span className={active ? 'opacity-80' : 'opacity-60'}>{count}</span>
                    </button>
                  );
                })}
                <input
                  value={factorSearch}
                  onChange={(e) => setFactorSearch(e.target.value)}
                  placeholder="Filter factors…"
                  className="ml-auto w-48 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600 dark:text-gray-400">Sparkline shows</span>
                  {(['value', 'percentile'] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`rounded-md px-2.5 py-1 font-medium border transition-colors ${
                        mode === m
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {m === 'value' ? 'Value' : 'Percentile'}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={showEmpty}
                    onChange={(e) => setShowEmpty(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Show factors with no data for this stock
                </label>
              </div>

              {/* -------------------------------------------------------- factor table */}
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th onClick={() => toggleSort('label')} className={headerClass(false, sortKey === 'label')}>
                        Factor{sortArrow('label')}
                      </th>
                      <th onClick={() => toggleSort('group')} className={headerClass(false, sortKey === 'group')}>
                        Group{sortArrow('group')}
                      </th>
                      <th className="p-2 text-right font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        Latest
                      </th>
                      <th
                        onClick={() => toggleSort('latest_percentile')}
                        title="Cross-sectional rank against every stock covered in the same month"
                        className={headerClass(true, sortKey === 'latest_percentile')}
                      >
                        %ile{sortArrow('latest_percentile')}
                      </th>
                      <th className="p-2 text-right font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        1Y ago
                      </th>
                      <th className="p-2 text-right font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        5Y ago
                      </th>
                      <th className="p-2 text-right font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        Min
                      </th>
                      <th className="p-2 text-right font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        Max
                      </th>
                      <th className="p-2 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        History
                      </th>
                      <th onClick={() => toggleSort('n_obs')} className={headerClass(true, sortKey === 'n_obs')}>
                        Obs{sortArrow('n_obs')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => {
                      const showGroupHeader = sortKey === 'group' && r.def.group !== lastGroup;
                      if (showGroupHeader) lastGroup = r.def.group;
                      const isSelected = r.def.key === selectedKey;
                      return (
                        <React.Fragment key={r.def.key}>
                          {showGroupHeader && (
                            <tr className="bg-gray-50 dark:bg-gray-900/60">
                              <td
                                colSpan={10}
                                className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700"
                              >
                                {r.def.group}
                              </td>
                            </tr>
                          )}
                          <tr
                            onClick={() => setSelectedKey(r.def.key)}
                            title={r.def.description}
                            className={`border-t border-gray-200 dark:border-gray-700 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <td className="p-2 whitespace-nowrap font-medium text-gray-900 dark:text-gray-100">
                              {r.def.label}
                              {r.def.higher_is_better !== null && (
                                <span
                                  className="ml-1.5 text-xs text-gray-400 dark:text-gray-500"
                                  title={
                                    r.def.higher_is_better
                                      ? 'Historically, higher values have been the favourable end'
                                      : 'Historically, lower values have been the favourable end'
                                  }
                                >
                                  {r.def.higher_is_better ? '↑ better' : '↓ better'}
                                </span>
                              )}
                            </td>
                            <td className="p-2 whitespace-nowrap text-gray-500 dark:text-gray-400">
                              {r.def.group}
                            </td>
                            <td className="p-2 whitespace-nowrap text-right tabular-nums text-gray-900 dark:text-gray-100">
                              {fmtValue(r.latest, r.def.fmt)}
                            </td>
                            <td className="p-2 whitespace-nowrap text-right tabular-nums">
                              <PercentileBar value={r.latestPercentile} color={series} />
                            </td>
                            <td className="p-2 whitespace-nowrap text-right tabular-nums text-gray-600 dark:text-gray-400">
                              {fmtValue(r.oneYearAgo, r.def.fmt)}
                            </td>
                            <td className="p-2 whitespace-nowrap text-right tabular-nums text-gray-600 dark:text-gray-400">
                              {fmtValue(r.fiveYearAgo, r.def.fmt)}
                            </td>
                            <td className="p-2 whitespace-nowrap text-right tabular-nums text-gray-600 dark:text-gray-400">
                              {fmtValue(r.min, r.def.fmt)}
                            </td>
                            <td className="p-2 whitespace-nowrap text-right tabular-nums text-gray-600 dark:text-gray-400">
                              {fmtValue(r.max, r.def.fmt)}
                            </td>
                            <td className="p-2">
                              <Sparkline
                                values={mode === 'value' ? r.values : r.percentiles}
                                color={mode === 'value' ? series : accent}
                              />
                            </td>
                            <td className="p-2 whitespace-nowrap text-right tabular-nums text-gray-500 dark:text-gray-400">
                              {r.nObs}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    {visibleRows.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-6 text-center text-gray-500 dark:text-gray-400">
                          No factors match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Factor values come from tiingo.factors, joined to the company profile in
                tiingo.fundamentals_list. Periods are month-end; Min, Max, 1Y ago and 5Y ago are
                measured over the selected range, and the sparkline spans that same window. Click a
                row to chart it.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default FactorHistoryPage;
