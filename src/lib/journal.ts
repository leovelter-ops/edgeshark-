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

export interface TradeCharts {
  htf?: string; // scaled data URL
  mtf?: string;
  ltf?: string;
}

// Shared emotion vocabulary for entry/exit emotion (Start/Finish + detail view).
export const EMOTIONS = [
  "Focused",
  "Calm",
  "Confident",
  "Disciplined",
  "Anxious",
  "Fearful",
  "Greedy",
  "FOMO",
  "Frustrated",
  "Excited",
  "Bored",
];

export type TradeStatus = "live" | "closed";

export interface JournalTrade {
  id: string;
  symbol: string; // "EURUSD"
  flag: string; // emoji
  direction: "Buy" | "Sell";
  status: TradeStatus; // "live" once started, "closed" once finished
  netPnl: number; // realized $, sign = win/loss (0 while live)
  rMultiple: number; // R multiple (0 if unknown)
  emotion: string; // legacy single emotion; entry/exit live in the fields below
  note: string;
  planFollowed: boolean;
  ts: number; // start/execution time (epoch ms)

  // ---- detail fields (Journal trade-detail view; all optional) ----
  entryPrice?: number | null;
  exitPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  lots?: number | null;
  session?: string | null;
  durationMin?: number | null;
  commission?: number | null;
  swap?: number | null;
  planIntended?: string | null;
  entryConfluences?: string[];
  tradeManagement?: string | null;
  mistakes?: string[];
  entryEmotion?: string | null;
  exitEmotion?: string | null;
  charts?: TradeCharts; // omitted from the list cache; loaded via fetchTrade
}

// ---- row <-> app mappers --------------------------------------------------

// Lightweight columns for the list views (calendar, dashboard, trading). Only
// the base fields — the detail fields + heavy `charts` blob are loaded on demand
// via fetchTrade(). Keeping this to the 0005 columns also means the list keeps
// working even before the 0007 detail migration is applied.
const LIST_COLUMNS =
  "id,symbol,flag,direction,net_pnl,r_multiple,emotion,note,plan_followed,executed_at";

/* eslint-disable @typescript-eslint/no-explicit-any */
type TradeRow = Record<string, any>;

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

function rowToTrade(r: TradeRow): JournalTrade {
  return {
    id: r.id,
    symbol: r.symbol,
    flag: r.flag ?? "",
    direction: r.direction,
    status: r.status === "live" ? "live" : "closed",
    netPnl: Number(r.net_pnl),
    rMultiple: Number(r.r_multiple),
    emotion: r.emotion ?? "",
    note: r.note ?? "",
    planFollowed: r.plan_followed,
    ts: new Date(r.executed_at).getTime(),
    entryPrice: num(r.entry_price),
    exitPrice: num(r.exit_price),
    stopLoss: num(r.stop_loss),
    takeProfit: num(r.take_profit),
    lots: num(r.lots),
    session: r.session ?? null,
    durationMin: num(r.duration_min),
    commission: num(r.commission),
    swap: num(r.swap),
    planIntended: r.plan_intended ?? null,
    entryConfluences: r.entry_confluences ?? [],
    tradeManagement: r.trade_management ?? null,
    mistakes: r.mistakes ?? [],
    entryEmotion: r.entry_emotion ?? null,
    exitEmotion: r.exit_emotion ?? null,
    charts: r.charts ?? undefined,
  };
}

// App field -> DB column. Used to translate an insert or a partial patch.
const COLUMN: Record<string, string> = {
  symbol: "symbol",
  flag: "flag",
  direction: "direction",
  status: "status",
  netPnl: "net_pnl",
  rMultiple: "r_multiple",
  emotion: "emotion",
  note: "note",
  planFollowed: "plan_followed",
  entryPrice: "entry_price",
  exitPrice: "exit_price",
  stopLoss: "stop_loss",
  takeProfit: "take_profit",
  lots: "lots",
  session: "session",
  durationMin: "duration_min",
  commission: "commission",
  swap: "swap",
  planIntended: "plan_intended",
  entryConfluences: "entry_confluences",
  tradeManagement: "trade_management",
  mistakes: "mistakes",
  entryEmotion: "entry_emotion",
  exitEmotion: "exit_emotion",
  charts: "charts",
};

/** Map an app-shaped patch to a DB row patch (only the provided keys). */
function tradePatchToRow(patch: Partial<JournalTrade>): TradeRow {
  const row: TradeRow = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === "id") continue;
    if (k === "ts") {
      row.executed_at = new Date(v as number).toISOString();
    } else if (COLUMN[k]) {
      row[COLUMN[k]] = v;
    }
  }
  return row;
}

function tradeToRow(t: JournalTrade): TradeRow {
  return { id: t.id, ...tradePatchToRow(t) };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
      .select(LIST_COLUMNS)
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

/** Fetch a single full trade (including chart images) by id. */
export async function fetchTrade(id: string): Promise<JournalTrade | null> {
  try {
    const { data, error } = await db()
      .from("trades")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToTrade(data as TradeRow) : null;
  } catch {
    // Offline / table missing — fall back to the lightweight cached row.
    return loadTrades().find((t) => t.id === id) ?? null;
  }
}

/**
 * Patch a trade's detail fields. Updates the list cache optimistically (minus
 * the heavy `charts` blob) + fires the change event, then persists to Supabase.
 */
export async function updateTrade(
  id: string,
  patch: Partial<JournalTrade>,
): Promise<void> {
  const forCache = { ...patch };
  delete forCache.charts; // keep the list cache lightweight
  cacheTrades(loadTrades().map((t) => (t.id === id ? { ...t, ...forCache } : t)));
  try {
    await db().from("trades").update(tradePatchToRow(patch)).eq("id", id);
  } catch {
    /* stays in cache */
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

export function isLive(t: JournalTrade): boolean {
  return t.status === "live";
}

/** Only finished trades — the ones that count toward performance stats. */
export function closedTrades(trades: JournalTrade[]): JournalTrade[] {
  return trades.filter((t) => t.status !== "live");
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
