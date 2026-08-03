// ---------------------------------------------------------------------------
// Journal trade store. Trades are logged manually from the Trading page and
// persisted in localStorage (no dedicated Supabase table yet), so the Journal
// calendar and the Trading risk panel read the same data. A custom event keeps
// open pages in sync within the tab.
// ---------------------------------------------------------------------------

export const JOURNAL_KEY = "edgeflo_journal_trades";
export const JOURNAL_EVENT = "edgeflo-journal-change";

// Starting account balance — set once by the user, then the running equity is
// derived by adding cumulative realized PnL from logged trades.
export const BALANCE_KEY = "edgeflo_starting_balance";
export const BALANCE_EVENT = "edgeflo-balance-change";
export const DEFAULT_BALANCE = 10000;

export function loadStartingBalance(): number {
  if (typeof window === "undefined") return DEFAULT_BALANCE;
  try {
    const raw = localStorage.getItem(BALANCE_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BALANCE;
  } catch {
    return DEFAULT_BALANCE;
  }
}

/** Persist the starting balance and notify listeners. */
export function saveStartingBalance(n: number): void {
  try {
    localStorage.setItem(BALANCE_KEY, String(n));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<number>(BALANCE_EVENT, { detail: n }));
}

export interface JournalTrade {
  id: string;
  symbol: string; // "EURUSD"
  flag: string; // emoji
  direction: "Buy" | "Sell";
  netPnl: number; // realized $, sign = win/loss
  rMultiple: number; // R multiple (0 if unknown)
  emotion: string; // "" or an emoji
  note: string;
  planFollowed: boolean;
  ts: number; // execution time (epoch ms)
}

export function loadTrades(): JournalTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? (JSON.parse(raw) as JournalTrade[]) : [];
  } catch {
    return [];
  }
}

function persist(next: JournalTrade[]): void {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent<JournalTrade[]>(JOURNAL_EVENT, { detail: next }),
  );
}

/** Append a trade and notify listeners. Returns the new list. */
export function addTrade(t: JournalTrade): JournalTrade[] {
  const next = [...loadTrades(), t];
  persist(next);
  return next;
}

/** Remove a trade by id and notify listeners. Returns the new list. */
export function deleteTrade(id: string): JournalTrade[] {
  const next = loadTrades().filter((t) => t.id !== id);
  persist(next);
  return next;
}

export function isWin(t: JournalTrade): boolean {
  return t.netPnl >= 0;
}

// ---- date helpers ---------------------------------------------------------

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function tradesOnDay(trades: JournalTrade[], day: Date): JournalTrade[] {
  return trades.filter((t) => sameDay(new Date(t.ts), day));
}

export function tradesInMonth(
  trades: JournalTrade[],
  year: number,
  month: number,
): JournalTrade[] {
  return trades.filter((t) => {
    const d = new Date(t.ts);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/** Monday-first week [start, end] containing `ref`. */
export function weekBounds(ref: Date): { start: Date; end: Date } {
  const dow = (ref.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dow);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59);
  return { start, end };
}

export function tradesInWeek(trades: JournalTrade[], ref: Date): JournalTrade[] {
  const { start, end } = weekBounds(ref);
  return trades.filter((t) => t.ts >= start.getTime() && t.ts <= end.getTime());
}

export function sumPnl(trades: JournalTrade[]): number {
  return trades.reduce((s, t) => s + t.netPnl, 0);
}
