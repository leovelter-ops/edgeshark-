"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  ChevronDown,
  Zap,
  Lock,
  ChevronsRight,
  Star,
  Bell,
  ClipboardList,
  Search,
  Pin,
  XCircle,
  X,
  Play,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ArrowRight,
  Clock,
  PencilLine,
  LineChart,
  Flower2,
  ShieldCheck,
  CalendarClock,
  ListTodo,
  BookOpen,
} from "lucide-react";
import {
  INSTRUMENTS,
  Instrument,
  Position,
  PINS_KEY,
  POSITIONS_KEY,
  PREMARKET_KEY,
  fmtMoney,
  fmtPrice,
  isWindowOpen,
} from "@/lib/trading";
import {
  ACCOUNT_KEY,
  TRADING_KEY,
  ROUTINE_KEY,
  DEFAULT_ACCOUNT,
  DEFAULT_TRADING,
  DEFAULT_ROUTINE,
  ROUTINE_ROUTES,
  RoutineSettings,
  RoutineStep,
  routineDayKey,
  loadSetting,
} from "@/lib/settings";
import { Plan } from "@/lib/types";
import { getActivePlan, ACTIVE_PLAN_EVENT } from "@/lib/activePlan";

const STARTING_BALANCE = 10000;

export default function TradingPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [selected, setSelected] = useState<Instrument>(INSTRUMENTS[0]);

  const prefs = useMemo(() => loadSetting(TRADING_KEY, DEFAULT_TRADING), []);
  const routine = useMemo(() => loadSetting(ROUTINE_KEY, DEFAULT_ROUTINE), []);
  const account = useMemo(() => loadSetting(ACCOUNT_KEY, DEFAULT_ACCOUNT), []);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPositions(JSON.parse(localStorage.getItem(POSITIONS_KEY) || "[]"));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: Position[]) => {
    setPositions(next);
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(next));
  };

  const open = positions.filter((p) => p.status === "open");
  const closed = positions.filter((p) => p.status === "closed");
  const openPnl = open.reduce((s, p) => s + p.pnl, 0);
  const closedPnl = closed
    .filter((p) => p.closedAt && sameDay(p.closedAt))
    .reduce((s, p) => s + p.pnl, 0);
  const equity = STARTING_BALANCE + openPnl;

  function placeOrder(side: "Buy" | "Sell", volume: number) {
    const p: Position = {
      id: `p-${Date.now()}`,
      symbol: selected.symbol,
      side,
      volume,
      entry: selected.last,
      openedAt: Date.now(),
      status: "open",
      pnl: 0, // demo: broker closed, no live movement
    };
    persist([...positions, p]);
    setTicketOpen(false);
  }
  function exit(id: string) {
    persist(
      positions.map((p) =>
        p.id === id ? { ...p, status: "closed", closedAt: Date.now() } : p,
      ),
    );
  }
  function exitAll() {
    persist(
      positions.map((p) =>
        p.status === "open" ? { ...p, status: "closed", closedAt: Date.now() } : p,
      ),
    );
  }

  return (
    <div className="min-h-screen px-6 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Trading</h1>
        <div className="flex items-center gap-6">
          <Metric label="Balance" value={`$${STARTING_BALANCE.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
          <Metric
            label="Open PnL"
            value={fmtMoney(openPnl)}
            valueClass={openPnl < 0 ? "text-red-500" : "text-emerald-500"}
            info
          />
          <Metric label="Equity" value={`$${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} info />
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              Margin Health <Info size={12} /> <ChevronDown size={12} />
            </div>
            <span className="mt-1 inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-sm font-semibold text-emerald-600">
              Excellent
            </span>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Zap size={18} />
          </button>
          <button
            onClick={() => setTicketOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <Lock size={14} /> Trade
          </button>
          <button className="text-gray-300 hover:text-gray-500">
            <ChevronsRight size={20} />
          </button>
        </div>
      </div>

      {routine.enableBanner && (
        <PreMarketBanner routine={routine} timezone={account.timezone} />
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        {/* Left: chart + positions */}
        <div className="min-w-0 space-y-4">
          <div className="relative h-[540px] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <TradingViewChart symbol={selected.tvSymbol} />
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow">
                <Info size={13} /> Demo mode: simulated data
              </span>
            </div>
          </div>

          <Positions open={open} closed={closed} onExit={exit} onExitAll={exitAll} />
        </div>

        {/* Right: status + watchlist */}
        <div className="space-y-4">
          <StatusPanel
            tradesToday={open.length + closed.length}
            maxTrades={prefs.maxTradesPerDay}
            windowStart={prefs.windowStart}
            windowEnd={prefs.windowEnd}
            closedPnl={closedPnl}
            maxLoss={prefs.maxDailyLoss}
            maxProfit={prefs.maxDailyProfit}
          />
          <Watchlist selected={selected} onSelect={setSelected} />
        </div>
      </div>

      {ticketOpen && (
        <OrderTicket
          instrument={selected}
          onPlace={placeOrder}
          onClose={() => setTicketOpen(false)}
        />
      )}
    </div>
  );
}

function sameDay(ts: number): boolean {
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function Metric({
  label,
  value,
  valueClass = "text-gray-900",
  info,
}: {
  label: string;
  value: string;
  valueClass?: string;
  info?: boolean;
}) {
  return (
    <div className="text-right">
      <div className="flex items-center gap-1 text-xs text-gray-400">
        {label} {info && <Info size={12} />}
      </div>
      <div className={`mt-0.5 text-lg font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}

// ===========================================================================
// Pre-market banner
// ===========================================================================

// Icon meta for routine steps, mirrored from the Settings > Pre-Market Routine
// editor so the checklist reads the same as what the user configured.
const ROUTINE_ICONS: Record<string, { Icon: React.ElementType; className: string }> = {
  edit: { Icon: PencilLine, className: "bg-red-50 text-red-500" },
  chart: { Icon: LineChart, className: "bg-brand-soft text-brand" },
  meditate: { Icon: Flower2, className: "bg-emerald-50 text-emerald-500" },
  shield: { Icon: ShieldCheck, className: "bg-blue-50 text-blue-500" },
  calendar: { Icon: CalendarClock, className: "bg-amber-50 text-amber-500" },
  checklist: { Icon: ListTodo, className: "bg-blue-50 text-blue-500" },
  book: { Icon: BookOpen, className: "bg-teal-50 text-teal-500" },
};

function PreMarketBanner({
  routine,
  timezone,
}: {
  routine: RoutineSettings;
  timezone: string;
}) {
  const steps = routine.steps;
  const total = steps.length;
  // Which routine period "now" belongs to — flips at resetTime in the account's
  // timezone, so progress from an earlier period reads as reset.
  const dayKey = useMemo(
    () => routineDayKey(routine.resetTime, timezone),
    [routine.resetTime, timezone],
  );

  const [completed, setCompleted] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(PREMARKET_KEY) || "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompleted(
        raw.day === dayKey && Array.isArray(raw.completed) ? raw.completed : [],
      );
    } catch {
      /* ignore */
    }
  }, [dayKey]);

  const persist = (next: string[]) => {
    setCompleted(next);
    localStorage.setItem(
      PREMARKET_KEY,
      JSON.stringify({ day: dayKey, completed: next }),
    );
  };
  const toggle = (id: string) =>
    persist(
      completed.includes(id)
        ? completed.filter((c) => c !== id)
        : [...completed, id],
    );

  const done = steps.filter((s) => completed.includes(s.id)).length;
  const complete = total > 0 && done >= total;
  const started = done > 0;

  // Completed + auto-hide enabled -> nothing to show for the rest of the day.
  if (complete && routine.autoHide) return null;

  // Visual treatment per state.
  const state = complete ? "done" : started ? "progress" : "fresh";
  const shell =
    state === "done"
      ? "border-emerald-300/60 bg-emerald-50"
      : state === "progress"
        ? "border-amber-300/70 bg-amber-50"
        : "border-brand/15 bg-brand-soft/50";
  const barTrack = state === "progress" ? "bg-amber-100" : "bg-white";
  const barFill = state === "progress" ? "bg-amber-500" : "bg-brand";
  const btn =
    state === "progress"
      ? "bg-amber-500 hover:brightness-105"
      : "bg-brand hover:brightness-105";

  return (
    <>
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-3.5 ${shell}`}
      >
        <div className="flex items-center gap-3">
          {state === "done" ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : state === "progress" ? (
            <AlertTriangle size={20} className="text-amber-500" />
          ) : (
            <Star size={20} className="fill-brand text-brand" />
          )}
          <div className="text-gray-800">
            {state === "done" && (
              <span className="font-semibold">
                You&apos;re ready to trade. Routine complete — nice work.
              </span>
            )}
            {state === "progress" && (
              <>
                <span className="font-bold text-amber-900">
                  Pre-market routine incomplete.
                </span>{" "}
                <span className="text-amber-800/80">
                  Finish all {total} steps before you take a trade — don&apos;t
                  skip your process.
                </span>
              </>
            )}
            {state === "fresh" && (
              <>
                <span className="font-bold">Complete your pre-market routine</span>{" "}
                <span className="text-gray-600">
                  before you take your first trade today.
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {total > 0 && (
            <>
              <div
                className={`h-2 w-40 overflow-hidden rounded-full ${barTrack}`}
              >
                <div
                  className={`h-full rounded-full transition-all ${barFill}`}
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">
                {done} of {total}
              </span>
            </>
          )}
          <button
            onClick={() => setOpen(true)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${btn}`}
          >
            {state === "done"
              ? "Review routine"
              : started
                ? "Continue pre-market routine"
                : "Start pre-market routine"}
            {state !== "done" && <Play size={13} className="fill-white" />}
          </button>
        </div>
      </div>

      {open && (
        <RoutineChecklist
          steps={steps}
          completed={completed}
          resetTime={routine.resetTime}
          onToggle={toggle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// The checklist modal opened from the banner. Each step can be marked done and
// (when it has an action) jumps to the matching page so the user can do it.
function RoutineChecklist({
  steps,
  completed,
  resetTime,
  onToggle,
  onClose,
}: {
  steps: RoutineStep[];
  completed: string[];
  resetTime: string;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const done = steps.filter((s) => completed.includes(s.id)).length;
  const allDone = steps.length > 0 && done >= steps.length;

  const go = (action: string) => {
    const route = ROUTINE_ROUTES[action];
    if (route) {
      onClose();
      router.push(route);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pre-Market Routine</h2>
            <p className="text-sm text-gray-500">
              Complete each step before you trade.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : "bg-brand"}`}
              style={{
                width: `${steps.length ? (done / steps.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-sm font-medium text-gray-500">
            {done} of {steps.length}
          </span>
        </div>

        {steps.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            No routine steps yet. Build your routine in Settings › Pre-Market
            Routine.
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step) => {
              const isDone = completed.includes(step.id);
              const meta = ROUTINE_ICONS[step.icon] ?? ROUTINE_ICONS.checklist;
              const Icon = meta.Icon;
              const hasRoute = Boolean(ROUTINE_ROUTES[step.action]);
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                    isDone
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-gray-100"
                  }`}
                >
                  <button
                    onClick={() => onToggle(step.id)}
                    title={isDone ? "Mark as not done" : "Mark as done"}
                    className="shrink-0"
                  >
                    {isDone ? (
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    ) : (
                      <Circle size={22} className="text-gray-300 hover:text-gray-400" />
                    )}
                  </button>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}
                  >
                    <Icon size={17} />
                  </span>
                  <span
                    className={`flex-1 text-sm font-medium ${
                      isDone ? "text-gray-400 line-through" : "text-gray-800"
                    }`}
                  >
                    {step.label}
                  </span>
                  {hasRoute && (
                    <button
                      onClick={() => go(step.action)}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-brand hover:text-brand"
                    >
                      {step.action.replace(/^Go to /, "")}
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={13} /> Resets daily at {resetTime}
          </span>
          <button
            onClick={onClose}
            className={`rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 ${
              allDone ? "bg-emerald-500" : "bg-brand"
            }`}
          >
            {allDone ? "Done — ready to trade" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// TradingView advanced chart (embedded widget)
// ===========================================================================

function TradingViewChart({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    container.innerHTML = `<div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>`;
    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "1",
      timezone: "America/New_York",
      theme: "light",
      style: "1",
      locale: "en",
      hide_side_toolbar: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);
    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div
      ref={ref}
      className="tradingview-widget-container"
      style={{ height: "100%", width: "100%" }}
    />
  );
}

// ===========================================================================
// Positions
// ===========================================================================

function Positions({
  open,
  closed,
  onExit,
  onExitAll,
}: {
  open: Position[];
  closed: Position[];
  onExit: (id: string) => void;
  onExitAll: () => void;
}) {
  const [tab, setTab] = useState<"open" | "pending" | "closed">("open");
  const rows = tab === "open" ? open : tab === "closed" ? closed : [];

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex gap-6">
          <PosTab label="Open Positions" count={open.length} active={tab === "open"} onClick={() => setTab("open")} />
          <PosTab label="Pending Orders" count={0} active={tab === "pending"} onClick={() => setTab("pending")} />
          <PosTab label="Closed Positions" count={closed.length} active={tab === "closed"} onClick={() => setTab("closed")} />
        </div>
        {tab === "open" && open.length > 0 && (
          <button
            onClick={onExitAll}
            className="mb-2 rounded-lg border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Exit All
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          No {tab === "open" ? "open positions" : tab === "pending" ? "pending orders" : "closed positions"}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    p.side === "Buy" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                  }`}
                >
                  {p.side}
                </span>
                <span className="font-semibold text-gray-800">{p.symbol}</span>
                <span className="text-gray-400">{p.volume} lot</span>
                <span className="text-gray-400">@ {p.entry}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={p.pnl < 0 ? "text-red-500" : "text-emerald-500"}>
                  {fmtMoney(p.pnl)}
                </span>
                {p.status === "open" && (
                  <button
                    onClick={() => onExit(p.id)}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Exit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PosTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition ${
        active ? "border-brand text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
      }`}
    >
      {label} <span className={active ? "text-brand" : "text-gray-300"}>{count}</span>
    </button>
  );
}

// ===========================================================================
// Status panel (trades, window, closed PnL, guardrails)
// ===========================================================================

function StatusPanel({
  tradesToday,
  maxTrades,
  windowStart,
  windowEnd,
  closedPnl,
  maxLoss,
  maxProfit,
}: {
  tradesToday: number;
  maxTrades: number;
  windowStart: string;
  windowEnd: string;
  closedPnl: number;
  maxLoss: number;
  maxProfit: number;
}) {
  const windowOpen = isWindowOpen(windowStart, windowEnd);
  const lossHit = closedPnl <= -maxLoss;
  // Position on the -maxLoss … +maxProfit scale.
  const span = maxLoss + maxProfit;
  const pct = span > 0 ? ((closedPnl + maxLoss) / span) * 100 : 50;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      {/* Trades dots */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Trades:</span>
        <div className="flex gap-1">
          {Array.from({ length: maxTrades }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i < tradesToday ? "bg-red-400" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <span className="ml-auto text-sm text-gray-400">
          {Math.min(tradesToday, maxTrades)}/{maxTrades}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 py-3">
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          Trading Window{" "}
          <span className="font-semibold text-gray-700">
            {windowStart} - {windowEnd}
          </span>
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
            windowOpen ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
          }`}
        >
          {windowOpen ? "Open" : "Closed"}
        </span>
      </div>

      {/* Closed PnL */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-gray-500">
            Today&apos;s Closed PnL <Info size={13} className="text-gray-300" />
          </span>
          <span className={`text-2xl font-bold ${closedPnl < 0 ? "text-red-500" : "text-emerald-500"}`}>
            {fmtMoney(closedPnl)}
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

      <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-sm">
        <div>
          <span className="text-gray-400">Max Loss </span>
          <span className="font-semibold text-gray-700">${maxLoss.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-400">Max Profit </span>
          <span className="font-semibold text-gray-700">
            ${maxProfit >= 1000 ? `${maxProfit / 1000}K` : maxProfit}
          </span>
          <Info size={13} className="text-gray-300" />
        </div>
      </div>

      {lossHit && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-500">
          <XCircle size={16} /> Max loss hit. Stop trading for today.
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Watchlist / Alerts / Trading Plan
// ===========================================================================

function Watchlist({
  selected,
  onSelect,
}: {
  selected: Instrument;
  onSelect: (i: Instrument) => void;
}) {
  const [tab, setTab] = useState<"watchlist" | "alerts" | "plan">("watchlist");
  const [query, setQuery] = useState("");
  const [pins, setPins] = useState<string[]>([]);
  const [activePlan, setActivePlanState] = useState<Plan | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPins(JSON.parse(localStorage.getItem(PINS_KEY) || '["EURUSD"]'));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivePlanState(getActivePlan());
    // Keep in sync when the active plan changes on the Edge page.
    const onActiveChange = (e: Event) =>
      setActivePlanState((e as CustomEvent<Plan | null>).detail);
    window.addEventListener(ACTIVE_PLAN_EVENT, onActiveChange);
    return () => window.removeEventListener(ACTIVE_PLAN_EVENT, onActiveChange);
  }, []);

  const togglePin = (sym: string) => {
    const next = pins.includes(sym) ? pins.filter((s) => s !== sym) : [...pins, sym];
    setPins(next);
    localStorage.setItem(PINS_KEY, JSON.stringify(next));
  };

  const list = INSTRUMENTS.filter(
    (i) =>
      i.symbol.toLowerCase().includes(query.toLowerCase()) ||
      i.name.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => Number(pins.includes(b.symbol)) - Number(pins.includes(a.symbol)));

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex gap-5 border-b border-gray-100">
        <WlTab icon={Star} label="Watchlist" active={tab === "watchlist"} onClick={() => setTab("watchlist")} />
        <WlTab icon={Bell} label="Alerts" active={tab === "alerts"} onClick={() => setTab("alerts")} />
        <WlTab icon={ClipboardList} label="Trading Plan" active={tab === "plan"} onClick={() => setTab("plan")} />
      </div>

      {tab === "watchlist" && (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <Search size={15} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all instruments..."
              className="w-full text-sm outline-none"
            />
          </div>
          <div className="mb-1 grid grid-cols-[1fr_auto_auto] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span>Instrument</span>
            <span className="text-right">Last</span>
            <span className="text-right">Chg</span>
          </div>
          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {list.map((i) => (
              <button
                key={i.symbol}
                onClick={() => onSelect(i)}
                className={`group grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition ${
                  selected.symbol === i.symbol ? "bg-brand-soft/60" : "hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <span>{i.flag}</span>
                  <span className="font-semibold text-gray-800">{i.symbol}</span>
                </span>
                <span className="text-right text-sm tabular-nums text-gray-700">
                  {fmtPrice(i.last, i.digits)}
                </span>
                <span className="flex items-center justify-end gap-1.5">
                  <span
                    className={`text-right text-sm tabular-nums ${
                      i.changePct < 0 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {i.changePct > 0 ? "+" : ""}
                    {i.changePct.toFixed(2)}%
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(i.symbol);
                    }}
                    className={`transition ${
                      pins.includes(i.symbol)
                        ? "text-brand"
                        : "text-gray-300 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Pin size={14} className={pins.includes(i.symbol) ? "fill-brand" : ""} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "alerts" && (
        <div className="py-14 text-center text-sm text-gray-400">
          <Bell size={32} className="mx-auto mb-2 text-gray-200" />
          No alerts set. Create one from any instrument.
        </div>
      )}
      {tab === "plan" && <ActivePlanTab plan={activePlan} />}
    </div>
  );
}

function WlTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 text-sm font-semibold transition ${
        active ? "border-brand text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"
      }`}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

// The active Edge plan, mirrored from the Edge page via localStorage.
function ActivePlanTab({ plan }: { plan: Plan | null }) {
  if (!plan) {
    return (
      <div className="py-14 text-center text-sm text-gray-400">
        <ClipboardList size={32} className="mx-auto mb-2 text-gray-200" />
        No active plan yet. Set one as active on the Edge page.
      </div>
    );
  }

  const dot =
    plan.dot_color === "green"
      ? "bg-green-500"
      : plan.dot_color === "yellow"
        ? "bg-yellow-400"
        : "bg-red-500";

  return (
    <div className="max-h-[28rem] space-y-5 overflow-y-auto pr-1">
      <div>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
          <h3 className="truncate text-base font-bold text-gray-900">{plan.name}</h3>
          <span className="ml-auto shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            Active
          </span>
        </div>
        {plan.plan_type && (
          <div className="mt-1 pl-4 text-xs text-gray-400">{plan.plan_type}</div>
        )}
      </div>

      {plan.charting_process.length > 0 && (
        <PlanSection title="Charting Process">
          <ol className="space-y-2">
            {plan.charting_process.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </PlanSection>
      )}

      {plan.entry_criteria.length > 0 && (
        <PlanSection title="Entry Criteria">
          <ul className="space-y-1.5">
            {plan.entry_criteria.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                {c.label}
              </li>
            ))}
          </ul>
        </PlanSection>
      )}

      {plan.trade_management_rules.length > 0 && (
        <PlanSection title="Trade Management">
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {plan.trade_management_rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </PlanSection>
      )}

      {plan.exit_criteria.length > 0 && (
        <PlanSection title="Exit Criteria">
          <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
            {plan.exit_criteria.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </PlanSection>
      )}

      {plan.trading_notes && (
        <PlanSection title="Trading Notes">
          <p className="whitespace-pre-wrap text-sm text-gray-700">{plan.trading_notes}</p>
        </PlanSection>
      )}
    </div>
  );
}

function PlanSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      {children}
    </section>
  );
}

// ===========================================================================
// Order ticket
// ===========================================================================

function OrderTicket({
  instrument,
  onPlace,
  onClose,
}: {
  instrument: Instrument;
  onPlace: (side: "Buy" | "Sell", volume: number) => void;
  onClose: () => void;
}) {
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [volume, setVolume] = useState("0.10");
  const vol = parseFloat(volume) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{instrument.flag}</span>
            <div>
              <div className="font-bold text-gray-900">{instrument.symbol}</div>
              <div className="text-xs text-gray-400">{instrument.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("Sell")}
            className={`rounded-lg py-3 text-sm font-bold transition ${
              side === "Sell" ? "bg-red-500 text-white" : "bg-red-50 text-red-500"
            }`}
          >
            Sell
            <div className="text-xs font-medium opacity-80">
              {fmtPrice(instrument.last - 0.0001, instrument.digits)}
            </div>
          </button>
          <button
            onClick={() => setSide("Buy")}
            className={`rounded-lg py-3 text-sm font-bold transition ${
              side === "Buy" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600"
            }`}
          >
            Buy
            <div className="text-xs font-medium opacity-80">
              {fmtPrice(instrument.last, instrument.digits)}
            </div>
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-gray-600">Volume (lots)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />

        <div className="mb-4 flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <Info size={13} /> Demo mode — orders are simulated, no live PnL.
        </div>

        <button
          disabled={vol <= 0}
          onClick={() => onPlace(side, vol)}
          className={`w-full rounded-lg py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 ${
            side === "Buy" ? "bg-emerald-500" : "bg-red-500"
          }`}
        >
          Place {side} Order
        </button>
      </div>
    </div>
  );
}
