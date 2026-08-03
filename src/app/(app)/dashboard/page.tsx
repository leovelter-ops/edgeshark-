"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, ArrowUpRight, Play, ChevronRight, PieChart, Check, MessageCircle } from "lucide-react";
import { fmtMoney, isWindowOpen } from "@/lib/trading";
import {
  TRADING_KEY,
  ROUTINE_KEY,
  DEFAULT_TRADING,
  DEFAULT_ROUTINE,
  loadSetting,
} from "@/lib/settings";

// ---------------------------------------------------------------------------
// Dashboard — the trading command center (demo mode). Guardrail figures come
// from Settings so they stay in sync; performance numbers are simulated.
// ---------------------------------------------------------------------------

const RANGES = ["Today", "7D", "30D", "90D", "YTD", "ALL"] as const;
type Range = (typeof RANGES)[number];

// Demo account-balance equity curve (flat, then a late run-up).
const BALANCE_CURVE = [3.0, 3.0, 3.0, 3.0, 3.0, 3.0, 3.02, 3.15, 3.6, 4.4, 5.5];
const CURVE_LABELS = [
  "Jul 04", "Jul 07", "Jul 10", "Jul 14", "Jul 17",
  "Jul 20", "Jul 23", "Jul 27", "Jul 30", "Aug 03",
];

export default function DashboardPage() {
  const prefs = useMemo(() => loadSetting(TRADING_KEY, DEFAULT_TRADING), []);
  const routine = useMemo(() => loadSetting(ROUTINE_KEY, DEFAULT_ROUTINE), []);
  const [range, setRange] = useState<Range>("30D");

  // Reads localStorage / current time — gate to after mount to avoid a
  // hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen px-6 py-6 pb-24">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105">
            <Info size={15} /> Pre-Market Routine {routineProgress()}/{routine.steps.length}
          </button>
          <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  range === r
                    ? "bg-brand text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
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
        <KpiCard label="Account Balance" value="$10,000.00" />
        <KpiCard label="Total Closed Net PnL" info value="+$100.00" valueClass="text-emerald-500" />
        <KpiCard
          label="Win Rate"
          value={
            <span className="flex items-center gap-1.5">
              0.60% <ArrowUpRight size={20} className="text-emerald-500" />
            </span>
          }
        />
        <AvgRCard />
        <ProfitFactorCard value={2.0} />
      </div>

      {/* Main grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
        {/* Left: balance chart + recent trades */}
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Account Balance</h2>
            <BalanceChart values={BALANCE_CURVE} labels={CURVE_LABELS} />
          </div>

          <RecentTrades />
        </div>

        {/* Right: edge score + discipline summary */}
        <div className="space-y-4">
          <EdgeScore closed={10} required={30} />
          <DisciplineSummary
            maxTrades={prefs.maxTradesPerDay}
            tradesToday={0}
            windowStart={prefs.windowStart}
            windowEnd={prefs.windowEnd}
            closedPnl={0}
            maxLoss={prefs.maxDailyLoss}
            maxProfit={prefs.maxDailyProfit}
          />
        </div>
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

// How many pre-market steps are done today (mirrors the Trading page banner).
function routineProgress(): number {
  try {
    const raw = JSON.parse(localStorage.getItem("edgeflo_trading_premarket") || "{}");
    if (raw.date === new Date().toDateString()) return raw.done || 0;
  } catch {
    /* ignore */
  }
  return 1;
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

function AvgRCard() {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Avg R Per Trade
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-3xl font-bold text-gray-900">
          1.00R <ArrowUpRight size={20} className="text-emerald-500" />
        </span>
        <div className="text-right text-sm font-semibold leading-tight">
          <div className="flex gap-2">
            <span className="text-emerald-500">+1.00R</span>
            <span className="text-red-500">+1.00R</span>
          </div>
          <div className="mt-1 flex h-1 overflow-hidden rounded-full">
            <span className="flex-1 bg-emerald-400" />
            <span className="flex-1 bg-red-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfitFactorCard({ value }: { value: number }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
        Profit Factor
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-3xl font-bold text-gray-900">
          {value.toFixed(2)} <span className="text-xl">🙂</span>
        </span>
        <Donut greenRatio={value / (value + 1)} />
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
// Account-balance chart
// ===========================================================================

function BalanceChart({ values, labels }: { values: number[]; labels: string[] }) {
  const W = 820;
  const H = 260;
  const min = 2.5;
  const max = 5.5;
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - ((v - min) / (max - min)) * H;

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  const yTicks = [5.5, 5, 4.5, 4, 3.5, 3, 2.5];

  return (
    <div className="flex gap-3">
      {/* Y axis */}
      <div className="flex w-12 shrink-0 flex-col justify-between py-1 text-right text-xs text-gray-400">
        {yTicks.map((t) => (
          <span key={t}>${t % 1 === 0 ? `${t}K` : `${t.toFixed(2)}K`}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-64 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#balFill)" />
          <path d={line} fill="none" stroke="#10b981" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Recent trades
// ===========================================================================

function RecentTrades() {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Recent Trades</h2>
        <button className="flex items-center gap-1 text-sm font-semibold text-brand hover:brightness-110">
          All Trades <ChevronRight size={16} />
        </button>
      </div>
      <div className="py-14 text-center text-sm text-gray-400">No data</div>
    </div>
  );
}

// ===========================================================================
// Edge Score
// ===========================================================================

function EdgeScore({ closed, required }: { closed: number; required: number }) {
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
        <div className="mt-4 text-lg font-bold text-gray-800">No score yet</div>
        <p className="mt-1 text-sm text-gray-400">
          Need {required} closed trades to generate an EdgeScore.
          <br />
          Current: {closed}/{required}
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
              className={`h-3 w-3 rounded-full ${
                i < tradesToday ? "bg-red-400" : "bg-gray-200"
              }`}
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
          <span className="font-semibold text-gray-700">${maxLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600">
        {violation ? (
          <>Max loss hit. Stop trading for today.</>
        ) : (
          <>
            <Check size={16} /> No rule violations today
          </>
        )}
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-brand-soft px-4 py-3 text-sm font-medium text-brand">
        <MessageCircle size={16} /> You have full trade allocation — proceed with discipline.
      </div>
    </div>
  );
}
