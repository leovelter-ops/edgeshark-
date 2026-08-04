"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Plus,
  ChevronsRight,
  Info,
  Check,
  Search,
  Trash2,
} from "lucide-react";
import { fmtMoney } from "@/lib/trading";
import {
  JournalTrade,
  JOURNAL_EVENT,
  BALANCE_EVENT,
  loadTrades,
  fetchTrades,
  loadStartingBalance,
  fetchStartingBalance,
  deleteTrade,
  tradesOnDay,
  tradesInMonth,
  tradesInWeek,
  sumPnl,
  isWin,
  isLive,
  closedTrades,
} from "@/lib/journal";

// ---------------------------------------------------------------------------
// Journal — calendar-driven trade journal. Trades are logged from the Trading
// page (Log Trade) into the shared journal store and rendered here.
// ---------------------------------------------------------------------------

type Unit = "$" | "%" | "R";

export default function JournalPage() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(() => new Date(today));
  const [unit, setUnit] = useState<Unit>("$");
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [balance, setBalance] = useState(0);

  // Dates are computed from `new Date()`, which differs between the server and
  // client render — gate the date-driven UI to after mount to avoid a
  // hydration mismatch. Trades load client-side too.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setTrades(loadTrades());
    setBalance(loadStartingBalance());
    fetchTrades();
    fetchStartingBalance();
    const onTrades = (e: Event) =>
      setTrades((e as CustomEvent<JournalTrade[]>).detail);
    const onBalance = (e: Event) => setBalance((e as CustomEvent<number>).detail);
    window.addEventListener(JOURNAL_EVENT, onTrades);
    window.addEventListener(BALANCE_EVENT, onBalance);
    return () => {
      window.removeEventListener(JOURNAL_EVENT, onTrades);
      window.removeEventListener(BALANCE_EVENT, onBalance);
    };
  }, []);
  if (!mounted) return null;

  // Stats/calendar count finished trades only; the day list still shows live ones.
  const closed = closedTrades(trades);
  const isToday = sameDay(selected, today);
  const dayTrades = tradesOnDay(trades, selected);
  const dayPnl = sumPnl(closedTrades(dayTrades));

  return (
    <div className="min-h-screen px-6 py-6 pb-10">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Journal</h1>
        <div className="flex items-center gap-3">
          <UnitToggle unit={unit} onChange={setUnit} />
          <button
            onClick={() => router.push("/trading")}
            className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:brightness-105"
          >
            <Plus size={16} /> Add Manual Trade
          </button>
          <button className="text-gray-300 hover:text-gray-500">
            <ChevronsRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        {/* Left column: calendar + summaries */}
        <div className="min-w-0 space-y-4">
          <Calendar
            cursor={cursor}
            today={today}
            selected={selected}
            trades={closed}
            unit={unit}
            balance={balance}
            onSelect={setSelected}
            onPrev={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
            }
            onNext={() =>
              setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
            }
            onThisMonth={() =>
              setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <MonthlySummary
              trades={tradesInMonth(closed, cursor.getFullYear(), cursor.getMonth())}
            />
            <WeeklyBreakdown trades={tradesInWeek(closed, selected)} />
          </div>
        </div>

        {/* Right column: selected-day detail */}
        <DayDetail
          date={selected}
          isToday={isToday}
          trades={dayTrades}
          pnl={dayPnl}
          unit={unit}
          balance={balance}
          onDelete={(id) => {
            deleteTrade(id);
          }}
          onOpen={(id) => router.push(`/journal/${id}`)}
          onPrev={() =>
            setSelected(
              new Date(
                selected.getFullYear(),
                selected.getMonth(),
                selected.getDate() - 1,
              ),
            )
          }
          onNext={() =>
            setSelected(
              new Date(
                selected.getFullYear(),
                selected.getMonth(),
                selected.getDate() + 1,
              ),
            )
          }
          onToday={() => setSelected(new Date(today))}
        />
      </div>
    </div>
  );
}

// ===========================================================================
// Helpers
// ===========================================================================

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Format a value according to the active $/%/R unit toggle. `balance` scales %. */
function fmtUnit(pnl: number, r: number, unit: Unit, balance: number): string {
  if (unit === "R") {
    const sign = r < 0 ? "-" : "+";
    return `${sign}${Math.abs(r).toFixed(2)}R`;
  }
  if (unit === "%") {
    const pct = balance > 0 ? (pnl / balance) * 100 : 0;
    const sign = pct < 0 ? "-" : "+";
    return `${sign}${Math.abs(pct).toFixed(2)}%`;
  }
  return fmtMoney(pnl);
}

function fmtUnitShort(pnl: number, r: number, unit: Unit, balance: number): string {
  if (unit === "R") return `${r < 0 ? "-" : "+"}${Math.abs(r).toFixed(2)}R`;
  if (unit === "%")
    return `${pnl < 0 ? "-" : "+"}${Math.abs(balance > 0 ? (pnl / balance) * 100 : 0).toFixed(2)}%`;
  const sign = pnl < 0 ? "-" : "+";
  const abs = Math.abs(pnl);
  return abs >= 1000
    ? `${sign}$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`
    : `${sign}$${abs}`;
}

function hhmm(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ===========================================================================
// Unit toggle
// ===========================================================================

function UnitToggle({
  unit,
  onChange,
}: {
  unit: Unit;
  onChange: (u: Unit) => void;
}) {
  const units: Unit[] = ["$", "%", "R"];
  return (
    <div className="flex items-center gap-1 rounded-lg bg-brand-soft p-1">
      {units.map((u) => (
        <button
          key={u}
          onClick={() => onChange(u)}
          className={`h-8 w-9 rounded-md text-sm font-semibold transition ${
            unit === u
              ? "bg-brand text-white shadow-sm"
              : "text-brand/70 hover:text-brand"
          }`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

// ===========================================================================
// Calendar
// ===========================================================================

function Calendar({
  cursor,
  today,
  selected,
  trades,
  unit,
  balance,
  onSelect,
  onPrev,
  onNext,
  onThisMonth,
}: {
  cursor: Date;
  today: Date;
  selected: Date;
  trades: JournalTrade[];
  unit: Unit;
  balance: number;
  onSelect: (d: Date) => void;
  onPrev: () => void;
  onNext: () => void;
  onThisMonth: () => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  // Monday-first grid: how many leading days from the previous month.
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const start = new Date(year, month, 1 - firstDow);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return d;
  });

  const viewingThisMonth =
    year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onPrev}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <ChevronRight size={16} />
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {MONTHS[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onThisMonth}
            disabled={viewingThisMonth}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            This Month
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50">
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-1 text-sm font-medium text-gray-400">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const isToday = sameDay(d, today);
          const isSelected = sameDay(d, selected);
          const dayTrades = tradesOnDay(trades, d);
          const hasTrade = dayTrades.length > 0;
          const pnl = sumPnl(dayTrades);
          const avgR = dayTrades.length
            ? dayTrades.reduce((s, t) => s + t.rMultiple, 0) / dayTrades.length
            : 0;
          const positive = pnl >= 0;

          return (
            <button
              key={i}
              onClick={() => onSelect(new Date(d))}
              className={`relative flex h-24 flex-col rounded-xl border p-2 text-left transition ${
                isSelected ? "border-brand ring-1 ring-brand" : "border-transparent"
              } ${
                hasTrade
                  ? positive
                    ? "bg-emerald-50/70 hover:bg-emerald-50"
                    : "bg-red-50/70 hover:bg-red-50"
                  : inMonth
                    ? "bg-gray-50/70 hover:bg-gray-100"
                    : "bg-transparent hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-sm font-semibold ${
                    inMonth ? "text-gray-500" : "text-gray-300"
                  }`}
                >
                  {d.getDate()}
                </span>
                {isToday && (
                  <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Today
                  </span>
                )}
              </div>
              {hasTrade && (
                <div className="mt-auto">
                  <div className="text-[11px] font-medium text-gray-500">
                    {dayTrades.length} {dayTrades.length === 1 ? "Trade" : "Trades"}
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      positive ? "text-emerald-500" : "text-red-500"
                    }`}
                  >
                    {fmtUnitShort(pnl, avgR, unit, balance)}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===========================================================================
// Day detail (right rail)
// ===========================================================================

function DayDetail({
  date,
  isToday,
  trades,
  pnl,
  unit,
  balance,
  onDelete,
  onOpen,
  onPrev,
  onNext,
  onToday,
}: {
  date: Date;
  isToday: boolean;
  trades: JournalTrade[];
  pnl: number;
  unit: Unit;
  balance: number;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const [tab, setTab] = useState<"all" | "wins" | "losses">("all");
  const [query, setQuery] = useState("");

  // Stats only over finished trades; the list still shows live ones.
  const done = closedTrades(trades);
  const wins = done.filter((t) => isWin(t)).length;
  const losses = done.length - wins;
  const winRate = done.length ? (wins / done.length) * 100 : 0;
  const avgR = done.length
    ? done.reduce((s, t) => s + t.rMultiple, 0) / done.length
    : 0;
  const planFollowed = done.length > 0 && done.every((t) => t.planFollowed);

  const rows = trades
    .filter((t) =>
      tab === "wins" ? !isLive(t) && isWin(t) : tab === "losses" ? !isLive(t) && !isWin(t) : true,
    )
    .filter((t) => t.symbol.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => b.ts - a.ts);

  const long = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      {/* Date nav */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={onNext}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <ChevronRight size={15} />
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {long}
            {isToday && (
              <span className="ml-1 font-semibold text-gray-400"> · Today</span>
            )}
          </h2>
        </div>
        <button
          onClick={onToday}
          className="rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-50"
        >
          Today
        </button>
      </div>

      {/* Net PnL */}
      <div
        className={`text-4xl font-extrabold ${
          pnl < 0 ? "text-red-500" : pnl > 0 ? "text-emerald-500" : "text-gray-900"
        }`}
      >
        {fmtUnit(pnl, avgR, unit, balance)}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        Net PnL
      </div>

      {/* Win rate / Average R */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <StatBig label="Win Rate" value={`${winRate.toFixed(1)}%`} />
        <StatBig
          label="Average R"
          value={`${avgR >= 0 ? "" : "-"}${Math.abs(avgR).toFixed(2)}R`}
        />
      </div>

      {/* Totals */}
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
        <StatSmall label="Total Trades" value={<>{done.length}</>} />
        <StatSmall label="Wins" value={<span className="text-emerald-500">{wins}</span>} />
        <StatSmall label="Losses" value={<span className="text-red-500">{losses}</span>} />
      </div>

      {/* Checklist rows */}
      <div className="mt-5 space-y-0 border-t border-gray-100 pt-2 text-sm">
        <DetailRow label="Plan Followed">
          {trades.length === 0 ? (
            <span className="font-medium text-gray-400">—</span>
          ) : planFollowed ? (
            <span className="flex items-center gap-1 font-semibold text-emerald-500">
              Yes <Check size={15} />
            </span>
          ) : (
            <span className="font-semibold text-red-500">No</span>
          )}
        </DetailRow>
        <DetailRow label="Trades Journaled">
          <span className="font-medium text-gray-700">{trades.length}</span>
        </DetailRow>
      </div>

      {/* Trades */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg font-bold text-gray-900">Trades</h3>
          <span className="text-xs text-gray-400">Logged from the Trading page</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            <FilterTab label="All" active={tab === "all"} onClick={() => setTab("all")} />
            <FilterTab label="Wins" active={tab === "wins"} onClick={() => setTab("wins")} />
            <FilterTab label="Losses" active={tab === "losses"} onClick={() => setTab("losses")} />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Instrument"
              className="w-full min-w-0 text-sm outline-none"
            />
            <Search size={15} className="text-gray-400" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1.3fr_0.7fr_0.9fr_0.6fr_0.9fr_auto] gap-2 px-1 text-xs font-semibold text-gray-400">
          <span>Instrument</span>
          <span>Time</span>
          <span>Direction</span>
          <span>Emo</span>
          <span className="text-right">Net PnL</span>
          <span />
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No trades for this day.
          </div>
        ) : (
          <div className="mt-1 space-y-1">
            {rows.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(t.id)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(t.id)}
                title="Open trade detail"
                className="group grid cursor-pointer grid-cols-[1.3fr_0.7fr_0.9fr_0.6fr_0.9fr_auto] items-center gap-2 rounded-lg px-1 py-2.5 text-left text-sm outline-none transition hover:bg-gray-50 focus:bg-gray-50"
              >
                <span className="flex items-center gap-2 truncate font-semibold text-gray-800">
                  <span>{t.flag}</span>
                  {t.symbol}
                  {isLive(t) && (
                    <span className="flex items-center gap-1 rounded bg-amber-50 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-500">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-amber-500" />
                      Live
                    </span>
                  )}
                </span>
                <span className="text-gray-500">{hhmm(t.ts)}</span>
                <span
                  className={
                    t.direction === "Buy"
                      ? "font-semibold text-emerald-500"
                      : "font-semibold text-red-500"
                  }
                >
                  {t.direction === "Buy" ? "↑" : "↓"} {t.direction}
                </span>
                <span className="truncate text-xs text-gray-500">
                  {t.entryEmotion || t.emotion || "—"}
                </span>
                {isLive(t) ? (
                  <span className="text-right text-xs font-bold uppercase text-amber-500">Live</span>
                ) : (
                  <span
                    className={`text-right font-semibold ${
                      t.netPnl < 0 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {fmtUnitShort(t.netPnl, t.rMultiple, unit, balance)}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(t.id);
                  }}
                  title="Delete trade"
                  className="rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBig({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xl font-extrabold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </div>
    </div>
  );
}

function StatSmall({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2.5 last:border-0">
      <span className="text-gray-500">{label}</span>
      {children}
    </div>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1 text-sm font-semibold transition ${
        active ? "bg-brand text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

// ===========================================================================
// Monthly summary
// ===========================================================================

const R_BUCKETS = ["<-2R", "-1R", "0R", "1R", "2R", ">2R"];

function bucketIndex(r: number): number {
  if (r < -1.5) return 0;
  if (r < -0.5) return 1;
  if (r <= 0.5) return 2;
  if (r <= 1.5) return 3;
  if (r <= 2.5) return 4;
  return 5;
}

function MonthlySummary({ trades }: { trades: JournalTrade[] }) {
  const wins = trades.filter((t) => isWin(t));
  const losses = trades.filter((t) => !isWin(t));
  const pnl = sumPnl(trades);
  const avgR = trades.length
    ? trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length
    : 0;
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length ? sumPnl(wins) / wins.length : 0;
  const avgLoss = losses.length ? sumPnl(losses) / losses.length : 0;
  const best = trades.length ? Math.max(...trades.map((t) => t.netPnl)) : 0;
  const worst = trades.length ? Math.min(...trades.map((t) => t.netPnl)) : 0;

  const buckets = R_BUCKETS.map((_, i) =>
    trades.filter((t) => bucketIndex(t.rMultiple) === i).length,
  );
  const maxBucket = Math.max(1, ...buckets);

  const money = (n: number): [string, string] => [
    fmtMoney(n),
    n < 0 ? "text-red-500" : n > 0 ? "text-emerald-500" : "text-gray-800",
  ];

  const stats: [string, string, string?][] = [
    ["Monthly P&L", ...money(pnl)],
    ["Expectancy", `${avgR >= 0 ? "" : "-"}${Math.abs(avgR).toFixed(2)}R`],
    ["Win rate", `${winRate.toFixed(1)}%`],
    ["Avg Win", ...money(avgWin)],
    ["Avg Loss", ...money(avgLoss)],
    ["Best trade", ...money(best)],
    ["Worst trade", ...money(worst)],
    ["Total trades", String(trades.length)],
    ["", `${wins.length}W/${losses.length}L`],
  ];

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Monthly Summary</h3>
      {trades.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          No trades logged this month.
        </div>
      ) : (
        <div className="flex gap-5">
          {/* R-distribution bar chart */}
          <div className="flex flex-col items-center">
            <div className="flex h-32 items-end gap-1.5">
              {buckets.map((count, i) => (
                <div key={i} className="flex h-full flex-col items-center justify-end gap-1">
                  <div
                    className="w-4 rounded-t bg-brand"
                    style={{
                      height: `${count ? Math.max(4, (count / maxBucket) * 100) : 2}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1 flex gap-1.5 text-[9px] text-gray-400">
              {R_BUCKETS.map((b) => (
                <span key={b} className="w-4 text-center">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Stat list */}
          <div className="flex-1 space-y-1.5 text-sm">
            {stats.map(([label, value, cls], i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-400">{label}</span>
                <span className={`font-semibold ${cls ?? "text-gray-800"}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Weekly breakdown
// ===========================================================================

function WeeklyBreakdown({ trades }: { trades: JournalTrade[] }) {
  const pnl = sumPnl(trades);
  const days = new Set(trades.map((t) => new Date(t.ts).toDateString())).size;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-1.5">
        <h3 className="text-lg font-bold text-gray-900">Weekly Breakdown</h3>
        <Info size={14} className="text-gray-300" />
      </div>
      <div className="rounded-xl border border-brand/15 bg-brand-soft/40 p-4">
        <div className="text-xs font-medium text-brand">Selected week</div>
        <span className="mt-2 inline-block rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
          {days} {days === 1 ? "day" : "days"} traded
        </span>
        <div
          className={`mt-3 text-2xl font-bold ${
            pnl < 0 ? "text-red-500" : pnl > 0 ? "text-emerald-500" : "text-gray-900"
          }`}
        >
          {fmtMoney(pnl)}
        </div>
      </div>
    </div>
  );
}
