"use client";

import { useEffect, useState } from "react";
import {
  Info,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Check,
  MessageCircle,
} from "lucide-react";
import { fmtMoney, isWindowOpen, PREMARKET_KEY } from "@/lib/trading";
import {
  JournalTrade,
  JOURNAL_EVENT,
  BALANCE_EVENT,
  loadTrades,
  fetchTrades,
  loadStartingBalance,
  fetchStartingBalance,
  sumPnl,
  isWin,
  isLive,
  closedTrades,
  tradesOnDay,
} from "@/lib/journal";
import {
  TRADING_KEY,
  ROUTINE_KEY,
  ACCOUNT_KEY,
  DEFAULT_TRADING,
  DEFAULT_ROUTINE,
  DEFAULT_ACCOUNT,
  routineDayKey,
  loadSetting,
  loadRaw,
  hydrateSettings,
  SETTINGS_EVENT,
  SettingsChange,
} from "@/lib/settings";

// ---------------------------------------------------------------------------
// Dashboard — the trading command center. All figures are derived from the
// logged trades (Supabase-backed journal store) + the account balance and
// guardrails from Settings.
// ---------------------------------------------------------------------------

const RANGES = ["Today", "7D", "30D", "90D", "YTD", "ALL"] as const;
type Range = (typeof RANGES)[number];

function rangeStart(range: Range): number {
  const now = new Date();
  switch (range) {
    case "ALL":
      return 0;
    case "Today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    case "YTD":
      return new Date(now.getFullYear(), 0, 1).getTime();
    case "7D":
      return now.getTime() - 7 * 864e5;
    case "30D":
      return now.getTime() - 30 * 864e5;
    case "90D":
      return now.getTime() - 90 * 864e5;
  }
}

function usd(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function mean(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

export default function DashboardPage() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [balance, setBalance] = useState(0);
  const [prefs, setPrefs] = useState(DEFAULT_TRADING);
  const [routine, setRoutine] = useState(DEFAULT_ROUTINE);
  const [account, setAccount] = useState(DEFAULT_ACCOUNT);
  const [premarket, setPremarket] = useState<{ day?: string; completed?: string[] }>({});
  const [range, setRange] = useState<Range>("30D");

  // Reads localStorage / current time — gate to after mount to avoid a
  // hydration mismatch, then reconcile from Supabase via change events.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setTrades(loadTrades());
    setBalance(loadStartingBalance());
    setPrefs(loadSetting(TRADING_KEY, DEFAULT_TRADING));
    setRoutine(loadSetting(ROUTINE_KEY, DEFAULT_ROUTINE));
    setAccount(loadSetting(ACCOUNT_KEY, DEFAULT_ACCOUNT));
    setPremarket(loadRaw(PREMARKET_KEY, {}));
    fetchTrades();
    fetchStartingBalance();
    hydrateSettings();

    const onTrades = (e: Event) => setTrades((e as CustomEvent<JournalTrade[]>).detail);
    const onBalance = (e: Event) => setBalance((e as CustomEvent<number>).detail);
    const onSettings = (e: Event) => {
      const { key, value } = (e as CustomEvent<SettingsChange>).detail;
      if (key === TRADING_KEY) setPrefs({ ...DEFAULT_TRADING, ...value });
      else if (key === ROUTINE_KEY) setRoutine({ ...DEFAULT_ROUTINE, ...value });
      else if (key === ACCOUNT_KEY) setAccount({ ...DEFAULT_ACCOUNT, ...value });
      else if (key === PREMARKET_KEY) setPremarket(value || {});
    };
    window.addEventListener(JOURNAL_EVENT, onTrades);
    window.addEventListener(BALANCE_EVENT, onBalance);
    window.addEventListener(SETTINGS_EVENT, onSettings);
    return () => {
      window.removeEventListener(JOURNAL_EVENT, onTrades);
      window.removeEventListener(BALANCE_EVENT, onBalance);
      window.removeEventListener(SETTINGS_EVENT, onSettings);
    };
  }, []);
  if (!mounted) return null;

  // ---- derived metrics -----------------------------------------------------
  // Stats only count finished trades; live ones are in-progress.
  const closed = closedTrades(trades);
  const start = rangeStart(range);
  const inRange = closed.filter((t) => t.ts >= start);

  const accountBalance = balance + sumPnl(closed); // current, all-time
  const rangePnl = sumPnl(inRange);
  const wins = inRange.filter(isWin);
  const losses = inRange.filter((t) => !isWin(t));
  const winRate = inRange.length ? (wins.length / inRange.length) * 100 : 0;
  const avgR = mean(inRange.map((t) => t.rMultiple));
  const avgWinR = mean(wins.map((t) => t.rMultiple));
  const avgLossR = mean(losses.map((t) => t.rMultiple));
  const grossProfit = wins.reduce((s, t) => s + t.netPnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const today = new Date();
  const todayAll = tradesOnDay(trades, today); // started today (for the count)
  const todayClosedPnl = sumPnl(closedTrades(todayAll));
  const dayKey = routineDayKey(routine.resetTime, account.timezone);
  const routineDone =
    premarket.day === dayKey && Array.isArray(premarket.completed)
      ? premarket.completed.length
      : 0;

  // Equity curve: baseline (balance + PnL before the range) then each trade.
  const before = closed.filter((t) => t.ts < start);
  const ordered = inRange.slice().sort((a, b) => a.ts - b.ts);
  const baseline = balance + sumPnl(before);
  const curve: { v: number; ts: number }[] = [{ v: baseline, ts: start || (ordered[0]?.ts ?? today.getTime()) }];
  let running = baseline;
  for (const t of ordered) {
    running += t.netPnl;
    curve.push({ v: running, ts: t.ts });
  }
  if (curve.length === 1) curve.push({ v: baseline, ts: today.getTime() });

  return (
    <div className="min-h-screen px-6 py-6 pb-10">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105">
            <Info size={15} /> Pre-Market Routine {routineDone}/{routine.steps.length}
          </button>
          <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  range === r ? "bg-brand text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Account Balance" value={usd(accountBalance)} />
        <KpiCard
          label="Total Closed Net PnL"
          info
          value={fmtMoney(rangePnl)}
          valueClass={rangePnl < 0 ? "text-red-500" : "text-emerald-500"}
        />
        <KpiCard
          label="Win Rate"
          value={
            <span className="flex items-center gap-1.5">
              {winRate.toFixed(1)}%
              {inRange.length > 0 &&
                (winRate >= 50 ? (
                  <ArrowUpRight size={20} className="text-emerald-500" />
                ) : (
                  <ArrowDownRight size={20} className="text-red-500" />
                ))}
            </span>
          }
        />
        <AvgRCard avgR={avgR} avgWinR={avgWinR} avgLossR={avgLossR} winRate={winRate} />
        <ProfitFactorCard value={profitFactor} />
      </div>

      {/* Main grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        {/* Left: balance chart + recent trades */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold text-gray-900">Account Balance</h2>
              <span className="text-sm text-gray-400">{range}</span>
            </div>
            <BalanceChart curve={curve} />
          </div>

          <RecentTrades trades={trades} />
        </div>

        {/* Right: edge score + discipline summary */}
        <div className="space-y-4">
          <EdgeScore closed={closed.length} required={30} />
          <DisciplineSummary
            maxTrades={prefs.maxTradesPerDay}
            tradesToday={todayAll.length}
            windowStart={prefs.windowStart}
            windowEnd={prefs.windowEnd}
            closedPnl={todayClosedPnl}
            maxLoss={prefs.maxDailyLoss}
            maxProfit={prefs.maxDailyProfit}
          />
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// KPI cards
// ===========================================================================

function KpiCard({
  label,
  value,
  valueClass = "text-gray-900",
  info,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  info?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        {label} {info && <Info size={12} />}
      </div>
      <div className={`mt-3 text-3xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

function AvgRCard({
  avgR,
  avgWinR,
  avgLossR,
  winRate,
}: {
  avgR: number;
  avgWinR: number;
  avgLossR: number;
  winRate: number;
}) {
  const fmtR = (r: number) => `${r >= 0 ? "+" : ""}${r.toFixed(2)}R`;
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Avg R Per Trade
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-3xl font-bold text-gray-900">
          {fmtR(avgR)}
          {avgR >= 0 ? (
            <ArrowUpRight size={20} className="text-emerald-500" />
          ) : (
            <ArrowDownRight size={20} className="text-red-500" />
          )}
        </span>
        <div className="text-right text-sm font-semibold leading-tight">
          <div className="flex gap-2">
            <span className="text-emerald-500">{fmtR(avgWinR)}</span>
            <span className="text-red-500">{fmtR(avgLossR)}</span>
          </div>
          <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-gray-100">
            <span className="bg-emerald-400" style={{ width: `${winRate}%` }} />
            <span className="flex-1 bg-red-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfitFactorCard({ value }: { value: number }) {
  const finite = Number.isFinite(value);
  const emoji = value >= 2 ? "🚀" : value >= 1 ? "🙂" : "😕";
  const ratio = finite ? value / (value + 1) : 1;
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Profit Factor
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-3xl font-bold text-gray-900">
          {finite ? value.toFixed(2) : "∞"} <span className="text-xl">{emoji}</span>
        </span>
        <Donut greenRatio={ratio} />
      </div>
    </div>
  );
}

function Donut({ greenRatio }: { greenRatio: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const green = c * greenRatio;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f87171" strokeWidth="6" />
      <circle
        cx="26"
        cy="26"
        r={r}
        fill="none"
        stroke="#34d399"
        strokeWidth="6"
        strokeDasharray={`${green} ${c - green}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ===========================================================================
// Account-balance chart (dynamic, from the equity curve)
// ===========================================================================

function kfmt(v: number): string {
  return Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`;
}

function BalanceChart({ curve }: { curve: { v: number; ts: number }[] }) {
  const W = 820;
  const H = 260;
  const values = curve.map((p) => p.v);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo || Math.abs(hi) || 1000) * 0.08;
  const min = lo - pad;
  const max = hi + pad;

  const x = (i: number) => (i / (curve.length - 1 || 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * H;

  const line = curve.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.v)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const up = values[values.length - 1] >= values[0];
  const stroke = up ? "#10b981" : "#ef4444";
  const fill = up ? "#34d399" : "#f87171";

  const yTicks = Array.from({ length: 6 }, (_, i) => max - (i / 5) * (max - min));
  const labelIdx = Array.from({ length: Math.min(6, curve.length) }, (_, i) =>
    Math.round((i / (Math.min(6, curve.length) - 1 || 1)) * (curve.length - 1)),
  );
  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { month: "short", day: "2-digit" });

  return (
    <div className="flex gap-3">
      <div className="flex w-14 shrink-0 flex-col justify-between py-1 text-right text-xs text-gray-400">
        {yTicks.map((t, i) => (
          <span key={i}>{kfmt(t)}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fill} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#balFill)" />
          <path d={line} fill="none" stroke={stroke} strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          {labelIdx.map((idx, i) => (
            <span key={i}>{fmtDate(curve[idx].ts)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Recent trades
// ===========================================================================

function RecentTrades({ trades }: { trades: JournalTrade[] }) {
  const recent = trades.slice().sort((a, b) => b.ts - a.ts).slice(0, 6);
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Recent Trades</h2>
        <span className="text-sm font-semibold text-gray-400">{trades.length} total</span>
      </div>
      {recent.length === 0 ? (
        <div className="py-14 text-center text-sm text-gray-400">No trades logged yet.</div>
      ) : (
        <div className="space-y-1">
          {recent.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-[1.4fr_1fr_0.9fr_0.7fr_1fr] items-center gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 truncate font-semibold text-gray-800">
                <span>{t.flag}</span>
                {t.symbol}
              </span>
              <span className="text-gray-500">
                {new Date(t.ts).toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
              </span>
              <span
                className={
                  t.direction === "Buy" ? "font-semibold text-emerald-500" : "font-semibold text-red-500"
                }
              >
                {t.direction === "Buy" ? "↑" : "↓"} {t.direction}
              </span>
              <span className="text-right tabular-nums text-gray-500">
                {isLive(t) ? "—" : t.rMultiple ? `${t.rMultiple > 0 ? "+" : ""}${t.rMultiple}R` : "—"}
              </span>
              {isLive(t) ? (
                <span className="flex items-center justify-end gap-1 text-right text-xs font-bold uppercase text-amber-500">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Live
                </span>
              ) : (
                <span
                  className={`text-right font-semibold tabular-nums ${
                    t.netPnl < 0 ? "text-red-500" : "text-emerald-500"
                  }`}
                >
                  {fmtMoney(t.netPnl)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Edge Score
// ===========================================================================

function EdgeScore({ closed, required }: { closed: number; required: number }) {
  const enough = closed >= required;
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-900">Edge Score</h2>
        <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
          Beta
        </span>
        <Info size={14} className="text-gray-300" />
      </div>
      <div className="flex flex-col items-center py-8 text-center">
        <PieChart size={56} className="text-gray-200" strokeWidth={1.5} />
        <div className="mt-4 text-lg font-bold text-gray-800">
          {enough ? "Building your score…" : "No score yet"}
        </div>
        <p className="mt-1 text-sm text-gray-400">
          Need {required} closed trades to generate an EdgeScore.
          <br />
          Current: {Math.min(closed, required)}/{required}
        </p>
      </div>
    </div>
  );
}

// ===========================================================================
// Today's Discipline Summary
// ===========================================================================

function DisciplineSummary({
  maxTrades,
  tradesToday,
  windowStart,
  windowEnd,
  closedPnl,
  maxLoss,
  maxProfit,
}: {
  maxTrades: number;
  tradesToday: number;
  windowStart: string;
  windowEnd: string;
  closedPnl: number;
  maxLoss: number;
  maxProfit: number;
}) {
  const windowOpen = isWindowOpen(windowStart, windowEnd);
  const span = maxLoss + maxProfit;
  const pct = span > 0 ? ((closedPnl + maxLoss) / span) * 100 : 50;
  const violation = closedPnl <= -maxLoss;
  const atLimit = tradesToday >= maxTrades;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-gray-900">Todays Discipline Summary</h2>

      {/* Trades dots */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Trades:</span>
        <div className="flex gap-1.5">
          {Array.from({ length: maxTrades }).map((_, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-full ${i < tradesToday ? "bg-red-400" : "bg-gray-200"}`}
            />
          ))}
        </div>
        <span className="ml-auto text-sm text-gray-400">
          {Math.min(tradesToday, maxTrades)}/{maxTrades}
        </span>
      </div>

      {/* Trading window */}
      <div className="flex items-center justify-between border-t border-gray-100 py-3.5">
        <span className="text-sm text-gray-500">
          Trading Window{" "}
          <span className="font-semibold text-gray-700">
            {windowStart} - {windowEnd}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
              windowOpen ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
            }`}
          >
            {windowOpen ? "Open" : "Closed"}
          </span>
          <Info size={14} className="text-gray-300" />
        </span>
      </div>

      {/* Closed PnL */}
      <div className="border-t border-gray-100 pt-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-gray-500">
            Today&apos;s Closed PnL <Info size={13} className="text-gray-300" />
          </span>
          <span className={`text-2xl font-bold ${closedPnl < 0 ? "text-red-500" : "text-gray-900"}`}>
            {closedPnl === 0 ? "$0.00" : fmtMoney(closedPnl)}
          </span>
        </div>
        <div className="relative mt-3 h-2 rounded-full bg-gray-100">
          <div className="absolute left-1/2 top-1/2 h-3 w-px -translate-y-1/2 bg-gray-300" />
          <div
            className={`h-full rounded-full ${closedPnl < 0 ? "bg-red-400" : "bg-emerald-400"}`}
            style={{
              width: `${Math.abs(pct - 50)}%`,
              marginLeft: closedPnl < 0 ? `${Math.min(pct, 50)}%` : "50%",
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>-${maxLoss.toLocaleString()}</span>
          <span>0</span>
          <span>${maxProfit >= 1000 ? `${maxProfit / 1000}K` : maxProfit}</span>
        </div>
      </div>

      {/* Max loss / profit */}
      <div className="mt-3.5 flex justify-between border-t border-gray-100 pt-3.5 text-sm">
        <div>
          <span className="text-gray-400">Max Loss </span>
          <span className="font-semibold text-gray-700">
            ${maxLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Max Profit </span>
          <span className="font-semibold text-gray-700">
            ${maxProfit >= 1000 ? `${maxProfit / 1000}K` : maxProfit}
          </span>
          <Info size={13} className="text-gray-300" />
        </div>
      </div>

      {/* Status callouts */}
      <div
        className={`mt-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
          violation ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {violation ? (
          <>Max loss hit. Stop trading for today.</>
        ) : (
          <>
            <Check size={16} /> No rule violations today
          </>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
        <MessageCircle size={16} />{" "}
        {atLimit
          ? "Daily trade limit reached — review, don't force it."
          : `${Math.max(0, maxTrades - tradesToday)} of ${maxTrades} trades left — proceed with discipline.`}
      </div>
    </div>
  );
}
