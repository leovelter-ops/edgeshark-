"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Plus,
  ChevronsRight,
  Info,
  Check,
  Search,
  Pencil,
} from "lucide-react";
import { fmtMoney } from "@/lib/trading";

// ---------------------------------------------------------------------------
// Journal — calendar-driven trade journal (demo mode). Everything here is
// simulated data so the page renders the same for every visitor.
// ---------------------------------------------------------------------------

const ACCOUNT_BALANCE = 100_000;

interface DemoTrade {
  instrument: string;
  flag: string;
  time: string;
  direction: "Buy" | "Sell";
  emotions: string;
  netPnl: number;
  rMultiple: number;
  win: boolean;
}

// The single demo trade lives on "today" so the calendar + detail panel agree.
const DEMO_TRADES: DemoTrade[] = [
  {
    instrument: "EURUSD",
    flag: "🇪🇺",
    time: "19:13",
    direction: "Buy",
    emotions: "-",
    netPnl: -1000,
    rMultiple: -1,
    win: false,
  },
];

type Unit = "$" | "%" | "R";

export default function JournalPage() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(() => new Date(today));
  const [unit, setUnit] = useState<Unit>("$");

  // Dates are computed from `new Date()`, which differs between the server and
  // client render — gate the date-driven UI to after mount to avoid a
  // hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isToday = sameDay(selected, today);
  // Only "today" carries the demo trade.
  const dayTrades = isToday ? DEMO_TRADES : [];
  const dayPnl = dayTrades.reduce((s, t) => s + t.netPnl, 0);

  return (
    <div className="min-h-screen px-6 py-6 pb-24">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Journal</h1>
        <div className="flex items-center gap-3">
          <UnitToggle unit={unit} onChange={setUnit} />
          <button className="flex items-center gap-2 rounded-lg border border-brand/30 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition hover:brightness-105">
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
            <MonthlySummary />
            <WeeklyBreakdown />
          </div>
        </div>

        {/* Right column: selected-day detail */}
        <DayDetail
          date={selected}
          isToday={isToday}
          trades={dayTrades}
          pnl={dayPnl}
          unit={unit}
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

      {/* Demo banner */}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2">
        <span className="flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg">
          <Info size={13} /> Demo mode: simulated data
        </span>
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

/** Format a value according to the active $/%/R unit toggle. */
function fmtUnit(pnl: number, r: number, unit: Unit): string {
  if (unit === "R") {
    const sign = r < 0 ? "-" : "+";
    return `${sign}${Math.abs(r).toFixed(2)}R`;
  }
  if (unit === "%") {
    const pct = (pnl / ACCOUNT_BALANCE) * 100;
    const sign = pct < 0 ? "-" : "+";
    return `${sign}${Math.abs(pct).toFixed(2)}%`;
  }
  return fmtMoney(pnl);
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
  onSelect,
  onPrev,
  onNext,
  onThisMonth,
}: {
  cursor: Date;
  today: Date;
  selected: Date;
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
          <span className="text-sm text-gray-400">Time displayed in UTC</span>
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
          const hasTrade = isToday; // only today carries the demo trade

          return (
            <button
              key={i}
              onClick={() => onSelect(new Date(d))}
              className={`relative flex h-24 flex-col rounded-xl border p-2 text-left transition ${
                isSelected
                  ? "border-brand ring-1 ring-brand"
                  : "border-transparent"
              } ${
                hasTrade
                  ? "bg-red-50/70 hover:bg-red-50"
                  : inMonth
                    ? "bg-gray-50/70 hover:bg-gray-100"
                    : "bg-transparent hover:bg-gray-50"
              }`}
            >
              {hasTrade ? (
                <>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-white">
                    Today {d.getDate()}
                  </span>
                  <div className="mt-auto">
                    <div className="text-[11px] font-medium text-gray-500">
                      1 Trades
                    </div>
                    <div className="text-sm font-bold text-red-500">
                      {fmtMoney(-1000)}
                    </div>
                  </div>
                </>
              ) : (
                <span
                  className={`text-sm font-semibold ${
                    inMonth ? "text-gray-500" : "text-gray-300"
                  }`}
                >
                  {d.getDate()}
                </span>
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
  onPrev,
  onNext,
  onToday,
}: {
  date: Date;
  isToday: boolean;
  trades: DemoTrade[];
  pnl: number;
  unit: Unit;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const [tab, setTab] = useState<"all" | "wins" | "losses">("all");
  const [query, setQuery] = useState("");

  const wins = trades.filter((t) => t.win).length;
  const losses = trades.length - wins;
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;
  const avgR = trades.length
    ? trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length
    : 0;

  const rows = trades
    .filter((t) =>
      tab === "wins" ? t.win : tab === "losses" ? !t.win : true,
    )
    .filter((t) => t.instrument.toLowerCase().includes(query.toLowerCase()));

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
        {fmtUnit(pnl, avgR, unit)}
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
        <StatSmall
          label="Total Trades"
          value={<>{trades.length}<span className="text-gray-300"> / 5</span></>}
        />
        <StatSmall
          label="Wins"
          value={<span className="text-emerald-500">{wins}</span>}
        />
        <StatSmall
          label="Losses"
          value={<span className="text-red-500">{losses}</span>}
        />
      </div>

      {/* Checklist rows */}
      <div className="mt-5 space-y-0 border-t border-gray-100 pt-2 text-sm">
        <DetailRow label="Plan Followed">
          <span className="flex items-center gap-1 font-semibold text-emerald-500">
            Yes <Check size={15} />
          </span>
        </DetailRow>
        <DetailRow label="Guardrail Violations">
          <span className="flex items-center gap-1 font-semibold text-gray-700">
            {isToday ? 1 : 0} <ChevronDown size={14} className="text-gray-300" />
          </span>
        </DetailRow>
        <DetailRow label="Pre-Market Routine">
          <span className="flex items-center gap-1 font-medium text-gray-500">
            In Progress 1/3{" "}
            <ChevronDown size={14} className="text-gray-300" />
          </span>
        </DetailRow>
        <DetailRow label="Trades Journaled">
          <span className="flex items-center gap-1 font-medium text-emerald-500">
            Completed {trades.length}/{trades.length || 0}
            <ChevronDown size={14} className="text-gray-300" />
          </span>
        </DetailRow>
      </div>

      {/* Note */}
      <div className="mt-4 border-t border-gray-100 pt-4">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Note
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-gray-700">
            {isToday ? "Demo daily note." : "No note for this day."}
          </span>
          <button className="text-gray-300 hover:text-gray-500">
            <Pencil size={15} />
          </button>
        </div>
      </div>

      {/* Trades */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg font-bold text-gray-900">Trades</h3>
          <span className="text-xs text-gray-400">Tap a trade to see details</span>
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

        <div className="mt-3 grid grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_0.9fr] gap-2 px-1 text-xs font-semibold text-gray-400">
          <span>Instrument</span>
          <span>Time</span>
          <span>Direction</span>
          <span>Emotions</span>
          <span className="text-right">Net PnL</span>
        </div>

        {rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No trades for this day.
          </div>
        ) : (
          <div className="mt-1 space-y-1">
            {rows.map((t, i) => (
              <button
                key={i}
                className="grid w-full grid-cols-[1.4fr_0.8fr_0.9fr_0.8fr_0.9fr] items-center gap-2 rounded-lg px-1 py-2.5 text-left text-sm transition hover:bg-gray-50"
              >
                <span className="flex items-center gap-2 truncate font-semibold text-gray-800">
                  <span>{t.flag}</span>
                  {t.instrument}
                </span>
                <span className="text-gray-500">{t.time}</span>
                <span
                  className={
                    t.direction === "Buy"
                      ? "font-semibold text-emerald-500"
                      : "font-semibold text-red-500"
                  }
                >
                  {t.direction === "Buy" ? "↑" : "↓"} {t.direction}
                </span>
                <span className="text-gray-400">{t.emotions}</span>
                <span
                  className={`text-right font-semibold ${
                    t.netPnl < 0 ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {fmtUnitShort(t.netPnl, t.rMultiple, unit)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function fmtUnitShort(pnl: number, r: number, unit: Unit): string {
  if (unit === "R") return `${r < 0 ? "-" : "+"}${Math.abs(r).toFixed(2)}R`;
  if (unit === "%")
    return `${pnl < 0 ? "-" : "+"}${Math.abs((pnl / ACCOUNT_BALANCE) * 100).toFixed(2)}%`;
  const sign = pnl < 0 ? "-" : "+";
  const abs = Math.abs(pnl);
  return abs >= 1000
    ? `${sign}$${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}K`
    : `${sign}$${abs}`;
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

function MonthlySummary() {
  const stats: [string, string, string?][] = [
    ["Monthly P&L", "-$1,000.00", "text-red-500"],
    ["Expectancy", "1.00R"],
    ["Win rate", "0.0%"],
    ["Avg Win", "$0.00"],
    ["Avg Loss", "-$1,000.00", "text-red-500"],
    ["Best trade", "-$1,000.00", "text-red-500"],
    ["Worst trade", "-$1,000.00", "text-red-500"],
    ["Total trades", "1"],
    ["", "0W/1L"],
  ];

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-gray-900">Monthly Summary</h3>
      <div className="flex gap-5">
        {/* Distribution bar chart (single R bucket populated) */}
        <div className="flex flex-col items-center">
          <div className="flex h-32 items-end gap-1.5">
            {["<-2R", "-1R", "0R", "1R", "2R", ">2R"].map((b) => (
              <div key={b} className="flex flex-col items-center gap-1">
                <div
                  className="w-4 rounded-t bg-brand"
                  style={{ height: b === "-1R" ? "100%" : "2px" }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1.5 text-[9px] text-gray-400">
            {["<-2R", "-1R", "0R", "1R", "2R", ">2R"].map((b) => (
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
              <span className={`font-semibold ${cls ?? "text-gray-800"}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Weekly breakdown
// ===========================================================================

function WeeklyBreakdown() {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-1.5">
        <h3 className="text-lg font-bold text-gray-900">Weekly Breakdown</h3>
        <Info size={14} className="text-gray-300" />
      </div>
      <div className="rounded-xl border border-brand/15 bg-brand-soft/40 p-4">
        <div className="text-xs font-medium text-brand">Current</div>
        <span className="mt-2 inline-block rounded-md bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
          2 days
        </span>
        <div className="mt-3 text-2xl font-bold text-red-500">-$1,000.00</div>
      </div>
    </div>
  );
}
