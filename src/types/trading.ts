// Kraken bot trading symbols configuration types
export interface KrakenBotSymbol {
  symbol: string;
  entry_amount: number;
  entry_threshold: number;
  exit_amount: number;
  exit_threshold: number;
  max_amount: number;
}

export type KrakenBotSymbolsConfig = KrakenBotSymbol[];

// Schwab bot trading symbols configuration types
export interface SchwabBotSymbol {
  symbol: string;
  account_hash: string;
  entry_amount: number;
  entry_threshold: number;
  exit_amount: number;
  exit_threshold: number;
  max_weight: number;
  strategy: string;
  api: string;
}

export type SchwabBotSymbolsConfig = SchwabBotSymbol[];
