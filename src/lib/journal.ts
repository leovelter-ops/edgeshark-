// ---------------------------------------------------------------------------
// Journal trade store. Trades and the starting balance live in Supabase
// (public.trades, public.user_settings — see supabase/migrations/0005,0006).
// localStorage is a write-through cache so reads are instant and the app keeps
// working offline / before the tables exist. A custom event keeps open pages in
// sync within the tab; every mutation writes the cache + dispatches the event
// optimistically, then persists to Supabase in the background.
// ---------------------------------------------------------------------------

import { createClient } from "@/lib/supabase/client";
import { fetchUserSettings, patchUserSettings } from "@/lib/userSettings";

export const JOURNAL_KEY = "edgeflo_journal_trades";
export const JOURNAL_EVENT = "edgeflo-journal-change";

// Starting account balance — set once by the user, then the running equity is
// derived by adding cumulative realized PnL from logged trades.
export const BALANCE_KEY = "edgeflo_starting_balance";
export const BALANCE_EVENT = "edgeflo-balance-change";
export const DEFAULT_BALANCE = 10000;

// Lazily-created browser Supabase client (shared singleton).
let _db: ReturnType<typeof createClient> | null = null;
function db() {
  return (_db ??= createClient());
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

// ---- row <-> app mappers --------------------------------------------------

interface TradeRow {
  id: string;
  symbol: string;
  flag: string | null;
  direction: "Buy" | "Sell";
  net_pnl: number | string;
  r_multiple: number | string;
  emotion: string | null;
  note: string | null;
  plan_followed: boolean;
  executed_at: string;
}

function rowToTrade(r: TradeRow): JournalTrade {
  return {
    id: r.id,
    symbol: r.symbol,
    flag: r.flag ?? "",
    direction: r.direction,
    netPnl: Number(r.net_pnl),
    rMultiple: Number(r.r_multiple),
    emotion: r.emotion ?? "",
    note: r.note ?? "",
    planFollowed: r.plan_followed,
    ts: new Date(r.executed_at).getTime(),
  };
}

function tradeToRow(t: JournalTrade) {
  return {
    id: t.id,
    symbol: t.symbol,
    flag: t.flag,
    direction: t.direction,
    net_pnl: t.netPnl,
    r_multiple: t.rMultiple,
    emotion: t.emotion,
    note: t.note,
    plan_followed: t.planFollowed,
    executed_at: new Date(t.ts).toISOString(),
  };
}

// ---- trades ---------------------------------------------------------------

/** Synchronous cache read (localStorage) for instant first paint. */
export function loadTrades(): JournalTrade[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    return raw ? (JSON.parse(raw) as JournalTrade[]) : [];
  } catch {
    return [];
  }
}

function cacheTrades(next: JournalTrade[]): void {
  try {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent<JournalTrade[]>(JOURNAL_EVENT, { detail: next }),
  );
}

/** Pull trades from Supabase, refresh the cache, and notify listeners. */
export async function fetchTrades(): Promise<JournalTrade[]> {
  try {
    const { data, error } = await db()
      .from("trades")
      .select("*")
      .order("executed_at", { ascending: false });
    if (error) throw error;
    const trades = (data as TradeRow[]).map(rowToTrade);
    cacheTrades(trades);
    return trades;
  } catch {
    // Table missing or offline — keep whatever is cached.
    return loadTrades();
  }
}

/** Append a trade: optimistic cache + event, then persist to Supabase. */
export async function addTrade(t: JournalTrade): Promise<void> {
  cacheTrades([...loadTrades(), t]);
  try {
    await db().from("trades").insert(tradeToRow(t));
  } catch {
    /* stays in cache; will reconcile on next fetchTrades */
  }
}

/** Remove a trade: optimistic cache + event, then delete in Supabase. */
export async function deleteTrade(id: string): Promise<void> {
  cacheTrades(loadTrades().filter((t) => t.id !== id));
  try {
    await db().from("trades").delete().eq("id", id);
  } catch {
    /* ignore */
  }
}

// ---- starting balance (public.user_settings, single row for now) ----------

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

function cacheBalance(n: number): void {
  try {
    localStorage.setItem(BALANCE_KEY, String(n));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<number>(BALANCE_EVENT, { detail: n }));
}

/** Read the starting balance from Supabase, refresh cache, notify listeners. */
export async function fetchStartingBalance(): Promise<number> {
  const row = await fetchUserSettings();
  const n = row ? Number(row.starting_balance) : NaN;
  if (Number.isFinite(n)) {
    cacheBalance(n);
    return n;
  }
  return loadStartingBalance();
}

/** Persist the starting balance: optimistic cache + event, then patch the row. */
export async function saveStartingBalance(n: number): Promise<void> {
  cacheBalance(n);
  await patchUserSettings({ starting_balance: n });
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
