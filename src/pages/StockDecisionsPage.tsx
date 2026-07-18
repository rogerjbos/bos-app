import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Mirrors StockDecision / StockDecisionsResponse served by the data-api-server
// (GET /api/stock_decisions).
interface StockDecision {
  ticker: string;
  universe: string;
  buy_strategies: string[];
  sell_strategies: string[];
  name: string | null;
  close: number | null;
  mcap: number | null;
  sector: string | null;
  industry: string | null;
  avgdolvol: number | null;
  rank_fundamental: number | null;
  rank_technical: number | null;
  risk_range_low: number | null;
  risk_range_high: number | null;
  atr_21: number | null;
  side: number | null;
  sharpe_ratio: number | null;
  sortino_ratio: number | null;
  max_drawdown: number | null;
  calmar_ratio: number | null;
  win_loss_ratio: number | null;
  profit_per_trade: number | null;
  expectancy: number | null;
  profit_factor: number | null;
  risk_reward: number | null;
  ivol: number | null;
  predicted_beta: number | null;
  risk_contribution: number | null;
  kelly: number | null;
}

interface StockDecisionsResponse {
  decision_date: string;
  ranks_date: string;
  strategy_date: string;
  risk_dates: Record<string, string>;
  available_dates: string[];
  universes: string[];
  rows: StockDecision[];
}

// A decision row enriched with client-side derived fields.
interface BoardRow extends StockDecision {
  nBuy: number;
  nSell: number;
  net: number;
  held: boolean;
  score: number;
}

type SortDir = 'asc' | 'desc';
type SortKey = keyof BoardRow;

const ALL = '__all__';
const N_STRATEGIES = 9; // three families x {long-only, long-short, short-only}

const fmt = (v: number | null | undefined, decimals = 2): string =>
  v === null || v === undefined ? '—' : v.toFixed(decimals);

const fmtPct = (v: number | null | undefined, decimals = 1): string =>
  v === null || v === undefined ? '—' : `${(v * 100).toFixed(decimals)}%`;

// Percentile rank (0..1) of each value within the board; nulls get 0.5 so they
// neither help nor hurt the composite score.
const percentiles = (values: (number | null)[]): number[] => {
  const present = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v !== null && Number.isFinite(x.v as number));
  const sorted = [...present].sort((a, b) => a.v - b.v);
  const rank = new Map<number, number>();
  sorted.forEach((x, pos) => rank.set(x.i, sorted.length > 1 ? pos / (sorted.length - 1) : 0.5));
  return values.map((_, i) => rank.get(i) ?? 0.5);
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Composite attractiveness score (0-100), the "systematic" ordering of the board.
 *
 * Layer weights follow the six-layer stack:
 *   35% signal consensus (net buy fraction across the 9 strategies)
 *   20% fundamental decile, 10% technical decile (1-10, 10 = best)
 *   20% distribution safety (lower idiosyncratic vol percentile is better)
 *   15% sizing quality (Kelly fraction percentile from strategy win/loss stats)
 */
const computeScores = (rows: (StockDecision & { nBuy: number; nSell: number; net: number })[]): number[] => {
  const kellyPct = percentiles(rows.map((r) => r.kelly));
  const ivolPct = percentiles(rows.map((r) => r.ivol));
  return rows.map((r, i) => {
    const signal01 = (r.net / N_STRATEGIES + 1) / 2;
    const fund01 = r.rank_fundamental === null ? 0.5 : (clamp(r.rank_fundamental, 1, 10) - 1) / 9;
    const tech01 = r.rank_technical === null ? 0.5 : (clamp(r.rank_technical, 1, 10) - 1) / 9;
    const quality01 = kellyPct[i];
    const safety01 = 1 - ivolPct[i];
    return 100 * (0.35 * signal01 + 0.2 * fund01 + 0.1 * tech01 + 0.15 * quality01 + 0.2 * safety01);
  });
};

const scoreColor = (score: number): string => {
  if (score >= 70) return 'text-emerald-600 dark:text-emerald-400 font-semibold';
  if (score >= 55) return 'text-emerald-700/70 dark:text-emerald-500/70';
  if (score <= 30) return 'text-red-600 dark:text-red-400 font-semibold';
  if (score <= 45) return 'text-red-700/70 dark:text-red-500/70';
  return 'text-gray-700 dark:text-gray-300';
};

const SignalBadge: React.FC<{ row: BoardRow }> = ({ row }) => {
  const title = [
    ...row.buy_strategies.map((s) => `buy: ${s}`),
    ...row.sell_strategies.map((s) => `sell: ${s}`),
  ].join('\n');
  if (row.nBuy > 0 && row.nSell === 0) {
    return (
      <span
        title={title}
        className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
      >
        BUY {row.nBuy}/{N_STRATEGIES}
      </span>
    );
  }
  if (row.nSell > 0 && row.nBuy === 0) {
    return (
      <span
        title={title}
        className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
      >
        SELL {row.nSell}/{N_STRATEGIES}
      </span>
    );
  }
  return (
    <span
      title={title}
      className="inline-block rounded px-1.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
    >
      MIXED {row.nBuy}B/{row.nSell}S
    </span>
  );
};

const StatTile: React.FC<{ label: string; value: string; sub?: string; tone?: 'buy' | 'sell' | 'warn' | 'neutral' }> = ({
  label,
  value,
  sub,
  tone = 'neutral',
}) => {
  const toneClass =
    tone === 'buy'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'sell'
        ? 'text-red-600 dark:text-red-400'
        : tone === 'warn'
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-gray-900 dark:text-gray-100';
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
    </div>
  );
};

// Column metadata for the decision table, grouped by stack layer.
interface ColumnDef {
  key: SortKey;
  label: string;
  numeric: boolean;
  render?: (row: BoardRow) => React.ReactNode;
  title?: string;
}

interface ColumnGroup {
  label: string;
  columns: ColumnDef[];
}

const COLUMN_GROUPS: ColumnGroup[] = [
  {
    label: '',
    columns: [
      { key: 'ticker', label: 'Ticker', numeric: false },
      { key: 'universe', label: 'Univ', numeric: false },
      { key: 'sector', label: 'Sector', numeric: false },
      { key: 'close', label: 'Close', numeric: true, render: (r) => fmt(r.close) },
      {
        key: 'avgdolvol',
        label: '$Vol (M)',
        numeric: true,
        title: 'Average daily dollar volume ($M) — liquidity',
        render: (r) => fmt(r.avgdolvol, 1),
      },
    ],
  },
  {
    label: 'Signal',
    columns: [
      { key: 'net', label: 'Consensus', numeric: true, title: 'Buy minus sell signals across the 9 strategies', render: (r) => <SignalBadge row={r} /> },
      { key: 'side', label: 'Side', numeric: true, title: 'Latest strategy position signal (negative = short)', render: (r) => (r.side === null ? '—' : String(r.side)) },
      { key: 'rank_fundamental', label: 'F-Rank', numeric: true, title: 'Fundamental decile, 10 = best', render: (r) => fmt(r.rank_fundamental, 0) },
      { key: 'rank_technical', label: 'T-Rank', numeric: true, title: 'Technical decile, 10 = best', render: (r) => fmt(r.rank_technical, 0) },
    ],
  },
  {
    label: 'Distribution / Risk',
    columns: [
      { key: 'ivol', label: 'iVol', numeric: true, title: 'Idiosyncratic volatility from the risk model', render: (r) => fmt(r.ivol) },
      { key: 'predicted_beta', label: 'Beta', numeric: true, title: 'Predicted beta', render: (r) => fmt(r.predicted_beta) },
      { key: 'risk_contribution', label: 'Risk Contrib', numeric: true, title: 'Marginal contribution to universe risk', render: (r) => fmt(r.risk_contribution) },
      { key: 'max_drawdown', label: 'Max DD', numeric: true, title: 'Strategy max drawdown (magnitude)', render: (r) => fmt(r.max_drawdown, 1) },
    ],
  },
  {
    label: 'Strategy Quality',
    columns: [
      { key: 'win_loss_ratio', label: 'W/L', numeric: true, title: 'Win/loss ratio (magnitude)', render: (r) => fmt(r.win_loss_ratio) },
      { key: 'profit_factor', label: 'PF', numeric: true, title: 'Profit factor (magnitude)', render: (r) => fmt(r.profit_factor) },
      { key: 'expectancy', label: 'Expect.', numeric: true, title: 'Expectancy per trade', render: (r) => fmt(r.expectancy) },
    ],
  },
  {
    label: 'Sizing',
    columns: [
      { key: 'kelly', label: 'Kelly ½', numeric: true, title: 'Half of the Kelly fraction implied by W/L and profit factor — a ceiling, not a target', render: (r) => (r.kelly === null ? '—' : fmtPct(r.kelly / 2)) },
      { key: 'score', label: 'Score', numeric: true, title: 'Composite 0-100: 35% consensus, 20% F-rank, 10% T-rank, 20% low iVol, 15% Kelly', render: (r) => <span className={scoreColor(r.score)}>{r.score.toFixed(0)}</span> },
    ],
  },
];

const FLAT_COLUMNS: ColumnDef[] = COLUMN_GROUPS.flatMap((g) => g.columns);

// The six-layer stack this dashboard is organized around (Shannon -> Lo).
const STACK: { layer: string; teacher: string; here: string }[] = [
  { layer: '1 · Signal', teacher: 'Shannon, Simons', here: 'Consensus across 9 independent strategies plus fundamental/technical deciles. Demand agreement before acting.' },
  { layer: '2 · Distribution', teacher: 'Mandelbrot, Knight', here: 'Idiosyncratic vol, predicted beta and historical max drawdown tell you how fat the tail is before you own it.' },
  { layer: '3 · Sizing', teacher: 'Kelly, Thorp', here: 'The Kelly ½ column is a ceiling derived from win/loss and profit factor. Half-Kelly survives estimation error; full Kelly rarely does.' },
  { layer: '4 · Compounding', teacher: 'Hamming, Munger', here: 'Expectancy and profit factor only compound if you keep taking the signals — including the boring ones.' },
  { layer: '5 · Discipline', teacher: 'Feynman, Livermore', here: 'Held positions with sell consensus are flagged. The dashboard exists so the exit is as systematic as the entry.' },
  { layer: '6 · Adaptation', teacher: 'Lo, Derman', here: 'Every column has an as-of date in the header. Stale inputs are how a model quietly dies.' },
];

const StockDecisionsPage: React.FC = () => {
  const { walletAddress } = useAuth();

  const [data, setData] = useState<StockDecisionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heldSymbols, setHeldSymbols] = useState<Set<string>>(new Set());

  const [dateFilter, setDateFilter] = useState<string>('');
  const [universeFilter, setUniverseFilter] = useState<string>(ALL);
  const [sectorFilter, setSectorFilter] = useState<string>(ALL);
  const [actionFilter, setActionFilter] = useState<string>(ALL);
  const [minConsensus, setMinConsensus] = useState<number>(1);
  const [heldOnly, setHeldOnly] = useState(false);
  const [tickerSearch, setTickerSearch] = useState('');
  const [showStack, setShowStack] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Load the decision board (refetches when the user picks a different date).
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = dateFilter ? `?date=${encodeURIComponent(dateFilter)}` : '';
        const response = await fetch(`${API_BASE_URL}/stock_decisions${qs}`, {
          headers: { ...getAuthHeaders() },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `Request failed: ${response.status}`);
        }
        const payload: StockDecisionsResponse = await response.json();
        setData(payload);
        if (!dateFilter && payload.decision_date) setDateFilter(payload.decision_date);
      } catch (err) {
        console.error('Error loading stock decisions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load stock decisions');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  // Holdings overlay: union of stock portfolio + watchlist symbols. Optional —
  // failures (e.g. no wallet session) just leave the overlay empty.
  useEffect(() => {
    if (!walletAddress) return;
    const loadHoldings = async () => {
      const symbols = new Set<string>();
      for (const endpoint of ['portfolios', 'watchlists']) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/${endpoint}?username=${encodeURIComponent(walletAddress)}`,
            { headers: { ...getAuthHeaders() } },
          );
          if (!res.ok) continue;
          const lists: { type: string; symbols: string[] }[] = await res.json();
          for (const list of lists || []) {
            if (list.type === 'crypto') continue;
            for (const s of list.symbols || []) symbols.add(s.toUpperCase());
          }
        } catch {
          // overlay is best-effort
        }
      }
      setHeldSymbols(symbols);
    };
    loadHoldings();
  }, [walletAddress]);

  // Derive consensus counts + composite score for every row.
  const board: BoardRow[] = useMemo(() => {
    if (!data) return [];
    const base = data.rows.map((r) => {
      const nBuy = r.buy_strategies.length;
      const nSell = r.sell_strategies.length;
      return { ...r, nBuy, nSell, net: nBuy - nSell };
    });
    const scores = computeScores(base);
    return base.map((r, i) => ({
      ...r,
      held: heldSymbols.has(r.ticker.toUpperCase()),
      score: scores[i],
    }));
  }, [data, heldSymbols]);

  const sectors = useMemo(
    () => Array.from(new Set(board.map((r) => r.sector).filter((s): s is string => !!s))).sort(),
    [board],
  );

  const filteredSorted = useMemo(() => {
    const search = tickerSearch.trim().toUpperCase();
    const filtered = board.filter((r) => {
      if (universeFilter !== ALL && r.universe !== universeFilter) return false;
      if (sectorFilter !== ALL && r.sector !== sectorFilter) return false;
      if (actionFilter === 'buy' && !(r.nBuy > 0 && r.nSell === 0)) return false;
      if (actionFilter === 'sell' && !(r.nSell > 0 && r.nBuy === 0)) return false;
      if (actionFilter === 'mixed' && !(r.nBuy > 0 && r.nSell > 0)) return false;
      if (Math.max(r.nBuy, r.nSell) < minConsensus) return false;
      if (heldOnly && !r.held) return false;
      if (search && !r.ticker.toUpperCase().includes(search)) return false;
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
  }, [board, universeFilter, sectorFilter, actionFilter, minConsensus, heldOnly, tickerSearch, sortKey, sortDir]);

  const stats = useMemo(() => {
    const buys = board.filter((r) => r.nBuy > 0 && r.nSell === 0);
    const sells = board.filter((r) => r.nSell > 0 && r.nBuy === 0);
    const mixed = board.filter((r) => r.nBuy > 0 && r.nSell > 0);
    const heldSells = board.filter((r) => r.held && r.nSell > 0);
    const strongBuys = buys.filter((r) => r.nBuy >= 3);
    return { buys, sells, mixed, heldSells, strongBuys };
  }, [board]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const selectClass =
    'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="max-w-[110rem] mx-auto px-4 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Decisions</h1>
        {data && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            decisions {data.decision_date} · ranks {data.ranks_date} · strategy {data.strategy_date} · risk{' '}
            {Object.values(data.risk_dates)[0] ?? '—'}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Every ticker with a buy/sell signal on the decision date, enriched with rankings, risk-model
        estimates, and strategy quality — ordered by a composite score so entries <em>and</em> exits stay
        systematic.{' '}
        <button
          onClick={() => setShowStack((s) => !s)}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showStack ? 'Hide' : 'Show'} the six-layer stack
        </button>
      </p>

      {showStack && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {STACK.map((s) => (
            <div
              key={s.layer}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3"
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {s.layer}
                <span className="ml-2 font-normal text-xs text-gray-500 dark:text-gray-400">{s.teacher}</span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">{s.here}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatTile label="Pure buy signals" value={String(stats.buys.length)} sub={`${stats.strongBuys.length} with 3+ strategies agreeing`} tone="buy" />
        <StatTile label="Pure sell signals" value={String(stats.sells.length)} tone="sell" />
        <StatTile label="Mixed signals" value={String(stats.mixed.length)} tone="warn" />
        <StatTile
          label="Holdings flagged to sell"
          value={String(stats.heldSells.length)}
          sub={heldSymbols.size ? `${heldSymbols.size} symbols in portfolios/watchlists` : 'connect wallet for overlay'}
          tone={stats.heldSells.length > 0 ? 'sell' : 'neutral'}
        />
        <StatTile label="Tickers on the board" value={String(board.length)} sub={`${data?.universes.length ?? 0} universes`} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4 items-end">
        <div>
          <label className={labelClass}>Date</label>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={selectClass}>
            {(data?.available_dates ?? (dateFilter ? [dateFilter] : [])).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Universe</label>
          <select value={universeFilter} onChange={(e) => setUniverseFilter(e.target.value)} className={selectClass}>
            <option value={ALL}>All</option>
            {(data?.universes ?? []).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Sector</label>
          <select value={sectorFilter} onChange={(e) => setSectorFilter(e.target.value)} className={selectClass}>
            <option value={ALL}>All</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Action</label>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className={selectClass}>
            <option value={ALL}>All</option>
            <option value="buy">Buy only</option>
            <option value="sell">Sell only</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Min agreement</label>
          <select
            value={String(minConsensus)}
            onChange={(e) => setMinConsensus(Number(e.target.value))}
            className={selectClass}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={String(n)}>
                {n}+ strategies
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Ticker</label>
          <input
            value={tickerSearch}
            onChange={(e) => setTickerSearch(e.target.value)}
            placeholder="Search…"
            className={selectClass}
          />
        </div>
        <div className="col-span-2 flex items-center gap-2 pb-2">
          <input
            id="held-only"
            type="checkbox"
            checked={heldOnly}
            onChange={(e) => setHeldOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
          />
          <label htmlFor="held-only" className="text-sm text-gray-700 dark:text-gray-300">
            My holdings/watchlist only
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">Loading decision board…</div>
      ) : (
        <div className="mt-2">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span className="font-medium text-gray-900 dark:text-gray-100">{filteredSorted.length}</span>{' '}
            ticker{filteredSorted.length === 1 ? '' : 's'} shown · sorted by{' '}
            {String(sortKey)} {sortDir === 'asc' ? '↑' : '↓'}
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  {COLUMN_GROUPS.map((g, gi) => (
                    <th
                      key={`${g.label}-${gi}`}
                      colSpan={g.columns.length}
                      className={`px-2 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 text-left ${
                        gi > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''
                      }`}
                    >
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  {COLUMN_GROUPS.map((g, gi) =>
                    g.columns.map((col, ci) => (
                      <th
                        key={String(col.key)}
                        onClick={() => toggleSort(col.key)}
                        title={col.title ?? 'Click to sort'}
                        className={`p-2 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          col.numeric ? 'text-right' : 'text-left'
                        } ${gi > 0 && ci === 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''} ${
                          col.key === 'ticker' ? 'sticky left-0 bg-gray-50 dark:bg-gray-900 z-10' : ''
                        }`}
                      >
                        {col.label}
                        {sortKey === col.key && (
                          <span className="ml-1 text-blue-500">{sortDir === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((row) => (
                  <tr
                    key={`${row.ticker}-${row.universe}`}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    {COLUMN_GROUPS.map((g, gi) =>
                      g.columns.map((col, ci) => {
                        let content: React.ReactNode;
                        if (col.key === 'ticker') {
                          content = (
                            <span title={row.name ?? undefined}>
                              {row.ticker}
                              {row.held && (
                                <span
                                  title="In your portfolio/watchlist"
                                  className="ml-1.5 inline-block rounded bg-blue-100 dark:bg-blue-900/50 px-1 text-[10px] font-semibold text-blue-700 dark:text-blue-300 align-middle"
                                >
                                  HELD
                                </span>
                              )}
                            </span>
                          );
                        } else if (col.render) {
                          content = col.render(row);
                        } else {
                          const raw = row[col.key];
                          content = raw === null || raw === undefined ? '—' : String(raw);
                        }
                        return (
                          <td
                            key={String(col.key)}
                            className={`p-2 whitespace-nowrap ${
                              col.numeric ? 'text-right tabular-nums' : 'text-left'
                            } text-gray-900 dark:text-gray-100 ${
                              gi > 0 && ci === 0 ? 'border-l border-gray-100 dark:border-gray-800' : ''
                            } ${
                              col.key === 'ticker'
                                ? 'sticky left-0 bg-white dark:bg-gray-950 font-medium'
                                : ''
                            }`}
                          >
                            {content}
                          </td>
                        );
                      }),
                    )}
                  </tr>
                ))}
                {filteredSorted.length === 0 && (
                  <tr>
                    <td colSpan={FLAT_COLUMNS.length} className="p-6 text-center text-gray-500 dark:text-gray-400">
                      No tickers match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Score = 35% signal consensus + 20% fundamental decile + 10% technical decile + 20% low
            idiosyncratic vol + 15% Kelly percentile. Kelly ½ is a sizing <em>ceiling</em> implied by
            strategy win/loss and profit factor — bet less when uncertainty is unknowable. Strategy
            quality stats are universe-level backtest magnitudes as of their last computed date.
          </p>
        </div>
      )}
    </div>
  );
};

export default StockDecisionsPage;
