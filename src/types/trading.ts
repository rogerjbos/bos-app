// Kraken bot trading symbols configuration types
export interface KrakenBotSymbol {
  symbol: string;
  entry_amount: number;
  entry_threshold: number;
  exit_amount: number;
  exit_threshold: number;
}

export type KrakenBotSymbolsConfig = KrakenBotSymbol[];
