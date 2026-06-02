import React, { useState } from 'react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

interface ErcResult {
  weights: number[];
  risk: number;
  mctr: number[];
  risk_contrib: number[];
  relative_contrib: number[];
  iterations: number;
  converged: boolean;
}

interface CorrelationResult {
  symbols: string[];
  matrix: number[][];
  num_observations: number;
  start_date: string;
  end_date: string;
  erc?: ErcResult | null;
}

// Parse a comma/space/newline separated list of symbols into a clean array,
// applying a case transform (stocks -> uppercase, crypto -> lowercase) so the
// user can type symbols in any case.
const parseSymbols = (raw: string, transform: (s: string) => string): string[] =>
  raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(transform);

// Map a correlation value in [-1, 1] to a background color (red -> white -> green).
const cellColor = (value: number): string => {
  const v = Math.max(-1, Math.min(1, value));
  if (v >= 0) {
    // white -> green
    const t = v; // 0..1
    const r = Math.round(255 - t * (255 - 22));
    const g = Math.round(255 - t * (255 - 163));
    const b = Math.round(255 - t * (255 - 74));
    return `rgb(${r}, ${g}, ${b})`;
  }
  // white -> red
  const t = -v; // 0..1
  const r = Math.round(255 - t * (255 - 220));
  const g = Math.round(255 - t * (255 - 38));
  const b = Math.round(255 - t * (255 - 38));
  return `rgb(${r}, ${g}, ${b})`;
};

// Format a Date as YYYY-MM-DD (local time) for <input type="date"> values.
const toISODate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Defaults matching the Rust binary: end = today, start = one year before.
const defaultEndDate = (): string => toISODate(new Date());
const defaultStartDate = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return toISODate(d);
};

const Correlation: React.FC = () => {
  const [stocksInput, setStocksInput] = useState('AAPL, MSFT');
  const [cryptoInput, setCryptoInput] = useState('btc');
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(defaultEndDate());
  const [includeErc, setIncludeErc] = useState(true);
  const [result, setResult] = useState<CorrelationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCorrelation = async () => {
    const stocks = parseSymbols(stocksInput, (s) => s.toUpperCase());
    const crypto = parseSymbols(cryptoInput, (s) => s.toLowerCase());

    if (stocks.length + crypto.length < 2) {
      setError('Enter at least two symbols total to build a correlation matrix.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/analysis/correlation`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stocks,
          crypto,
          start_date: startDate || null,
          end_date: endDate || null,
          erc: includeErc,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Request failed: ${response.status}`);
      }

      const data: CorrelationResult = await response.json();
      setResult(data);
    } catch (err) {
      console.error('Error running correlation:', err);
      setError(err instanceof Error ? err.message : 'Failed to run correlation');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      runCorrelation();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Correlation Matrix
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Enter stock and/or crypto symbols (comma or space separated) to compute
        their daily-return correlation matrix.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stocks
          </label>
          <input
            type="text"
            value={stocksInput}
            onChange={(e) => setStocksInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="AAPL, MSFT, NVDA"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Crypto
          </label>
          <input
            type="text"
            value={cryptoInput}
            onChange={(e) => setCryptoInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="btc, eth, sol"
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={defaultEndDate()}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={includeErc}
            onChange={(e) => setIncludeErc(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          Compute Equal Risk Contribution (risk-parity) weights
        </label>
      </div>

      <button
        onClick={runCorrelation}
        disabled={loading}
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Computing…' : 'Compute Correlation'}
      </button>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
            <span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {result.num_observations}
              </span>{' '}
              observations
            </span>
            <span>
              {result.start_date} → {result.end_date}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-2 sticky left-0 bg-gray-50 dark:bg-gray-900" />
                  {result.symbols.map((sym) => (
                    <th
                      key={sym}
                      className="p-2 font-semibold text-gray-700 dark:text-gray-300 text-center whitespace-nowrap"
                    >
                      {sym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.matrix.map((row, i) => (
                  <tr key={result.symbols[i]}>
                    <th className="p-2 font-semibold text-gray-700 dark:text-gray-300 text-right whitespace-nowrap sticky left-0 bg-gray-50 dark:bg-gray-900">
                      {result.symbols[i]}
                    </th>
                    {row.map((value, j) => (
                      <td
                        key={`${i}-${j}`}
                        className="p-2 text-center tabular-nums border border-gray-200 dark:border-gray-700"
                        style={{ backgroundColor: cellColor(value), color: '#111' }}
                        title={`${result.symbols[i]} / ${result.symbols[j]}: ${value.toFixed(4)}`}
                      >
                        {value.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.erc && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Equal Risk Contribution Weights
              </h2>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <span>
                  portfolio risk{' '}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {(result.erc.risk * 100).toFixed(2)}%
                  </span>
                </span>
                <span>
                  {result.erc.converged
                    ? `converged in ${result.erc.iterations} iterations`
                    : `did not converge (${result.erc.iterations} iterations)`}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr className="text-gray-700 dark:text-gray-300">
                      <th className="p-2 text-left font-semibold">Symbol</th>
                      <th className="p-2 text-right font-semibold">Weight</th>
                      <th className="p-2 text-right font-semibold whitespace-nowrap">
                        Risk Contribution
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.symbols
                      .map((sym, i) => ({
                        sym,
                        weight: result.erc!.weights[i],
                        relContrib: result.erc!.relative_contrib[i],
                      }))
                      .sort((a, b) => b.weight - a.weight)
                      .map(({ sym, weight, relContrib }) => (
                        <tr
                          key={sym}
                          className="border-t border-gray-200 dark:border-gray-700"
                        >
                          <th className="p-2 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            {sym}
                          </th>
                          <td className="p-2 text-right tabular-nums text-gray-900 dark:text-gray-100">
                            {(weight * 100).toFixed(2)}%
                          </td>
                          <td className="p-2 text-right tabular-nums text-gray-600 dark:text-gray-400">
                            {(relContrib * 100).toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Correlation;
