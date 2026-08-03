// ---------------------------------------------------------------------------
// Trading Center demo data + types. Prices are simulated (demo mode). Guardrail
// limits and the trading window are read from the Settings page, so the two
// stay in sync.
// ---------------------------------------------------------------------------

export const PINS_KEY = "edgeflo_trading_pins";
export const POSITIONS_KEY = "edgeflo_trading_positions";
export const PREMARKET_KEY = "edgeflo_trading_premarket";

export type InstrumentKind = "Forex" | "Metals" | "Crypto" | "Indices";

export interface Instrument {
  symbol: string; // "EURUSD"
  tvSymbol: string; // TradingView symbol, e.g. "FX:EURUSD"
  name: string; // "Euro / US Dollar"
  flag: string; // emoji
  kind: InstrumentKind;
  last: number;
  changePct: number;
  digits: number;
}

export const INSTRUMENTS: Instrument[] = [
  { symbol: "EURUSD", tvSymbol: "FX:EURUSD", name: "Euro / US Dollar", flag: "🇪🇺", kind: "Forex", last: 1.23695, changePct: 17.8, digits: 5 },
  { symbol: "GBPUSD", tvSymbol: "FX:GBPUSD", name: "British Pound / US Dollar", flag: "🇬🇧", kind: "Forex", last: 1.2712, changePct: 0.42, digits: 4 },
  { symbol: "USDJPY", tvSymbol: "FX:USDJPY", name: "US Dollar / Japanese Yen", flag: "🇯🇵", kind: "Forex", last: 156.82, changePct: -0.31, digits: 2 },
  { symbol: "AUDUSD", tvSymbol: "FX:AUDUSD", name: "Australian Dollar / US Dollar", flag: "🇦🇺", kind: "Forex", last: 0.6584, changePct: 0.18, digits: 4 },
  { symbol: "XAUUSD", tvSymbol: "OANDA:XAUUSD", name: "Gold / US Dollar", flag: "🥇", kind: "Metals", last: 2338.15, changePct: 0.86, digits: 2 },
  { symbol: "BTCUSD", tvSymbol: "BITSTAMP:BTCUSD", name: "Bitcoin / US Dollar", flag: "₿", kind: "Crypto", last: 67230.5, changePct: -1.24, digits: 1 },
  { symbol: "US500", tvSymbol: "OANDA:SPX500USD", name: "S&P 500 Index", flag: "🇺🇸", kind: "Indices", last: 5487.2, changePct: 0.55, digits: 1 },
  { symbol: "NAS100", tvSymbol: "OANDA:NAS100USD", name: "Nasdaq 100 Index", flag: "🇺🇸", kind: "Indices", last: 19845.7, changePct: 0.92, digits: 1 },
];

export type PositionStatus = "open" | "closed";

export interface Position {
  id: string;
  symbol: string;
  side: "Buy" | "Sell";
  volume: number;
  entry: number;
  openedAt: number;
  closedAt?: number;
  status: PositionStatus;
  pnl: number;
}

export function fmtMoney(n: number): string {
  const sign = n < 0 ? "-" : "+";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtPrice(n: number, digits: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Is "now" inside the [start,end] HH:MM window? */
export function isWindowOpen(start: string, end: string): boolean {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return e >= s ? mins >= s && mins <= e : mins >= s || mins <= e;
}
