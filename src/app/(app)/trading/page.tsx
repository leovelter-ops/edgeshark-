"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Info,
  ChevronDown,
  Zap,
  ChevronsRight,
  Star,
  ClipboardList,
  Search,
  Pin,
  XCircle,
  X,
  Play,
  Plus,
  Pencil,
  Check,
  Trash2,
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
  PINS_KEY,
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
import {
  JournalTrade,
  JOURNAL_EVENT,
  BALANCE_EVENT,
  loadTrades,
  loadStartingBalance,
  saveStartingBalance,
  addTrade,
  deleteTrade,
  tradesOnDay,
  sumPnl,
} from "@/lib/journal";
import { Plan } from "@/lib/types";
import { getActivePlan, ACTIVE_PLAN_EVENT } from "@/lib/activePlan";

const EMOTIONS = ["😌", "🤩", "😏", "😀", "🚀", "😰", "😡"];

export default function TradingPage() {
  const [logOpen, setLogOpen] = useState(false);
  const [selected, setSelected] = useState<Instrument>(INSTRUMENTS[0]);
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [balance, setBalance] = useState<number>(0);

  const prefs = useMemo(() => loadSetting(TRADING_KEY, DEFAULT_TRADING), []);
  const routine = useMemo(() => loadSetting(ROUTINE_KEY, DEFAULT_ROUTINE), []);
  const account = useMemo(() => loadSetting(ACCOUNT_KEY, DEFAULT_ACCOUNT), []);

  // Load logged trades + starting balance, and stay in sync when either changes
  // (here or on the Journal page).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrades(loadTrades());
    setBalance(loadStartingBalance());
    const onTrades = (e: Event) =>
      setTrades((e as CustomEvent<JournalTrade[]>).detail);
    const onBalance = (e: Event) =>
      setBalance((e as CustomEvent<number>).detail);
    window.addEventListener(JOURNAL_EVENT, onTrades);
    window.addEventListener(BALANCE_EVENT, onBalance);
    return () => {
      window.removeEventListener(JOURNAL_EVENT, onTrades);
      window.removeEventListener(BALANCE_EVENT, onBalance);
    };
  }, []);

  const todayTrades = useMemo(() => tradesOnDay(trades, new Date()), [trades]);
  const todayPnl = sumPnl(todayTrades);
  // Running equity = the balance you set + all realized PnL you've logged.
  const equity = balance + sumPnl(trades);

  const saveBalance = (n: number) => {
    setBalance(n);
    saveStartingBalance(n);
  };

  const logTrade = (t: JournalTrade) => {
    setTrades(addTrade(t));
    setLogOpen(false);
  };
  const removeTrade = (id: string) => setTrades(deleteTrade(id));

  return (
    <div className="min-h-screen px-6 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Trading</h1>
        <div className="flex items-center gap-6">
          <BalanceMetric value={balance} onSave={saveBalance} />
          <Metric
            label="Today's PnL"
            value={fmtMoney(todayPnl)}
            valueClass={todayPnl < 0 ? "text-red-500" : "text-emerald-500"}
            info
          />
          <Metric
            label="Equity"
            value={`$${equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            info
          />
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
            onClick={() => setLogOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <Plus size={16} /> Log Trade
          </button>
          <button className="text-gray-300 hover:text-gray-500">
            <ChevronsRight size={20} />
          </button>
        </div>
      </div>

      {routine.enableBanner && (
        <PreMarketBanner routine={routine} timezone={account.timezone} />
      )}

      {/* Two big panels: risk status + watchlist */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusPanel
          tradesToday={todayTrades.length}
          maxTrades={prefs.maxTradesPerDay}
          windowStart={prefs.windowStart}
          windowEnd={prefs.windowEnd}
          closedPnl={todayPnl}
          maxLoss={prefs.maxDailyLoss}
          maxProfit={prefs.maxDailyProfit}
        />
        <Watchlist selected={selected} onSelect={setSelected} />
      </div>

      {/* Today's logged trades */}
      <div className="mt-4">
        <TodayTrades trades={todayTrades} onDelete={removeTrade} onLog={() => setLogOpen(true)} />
      </div>

      {logOpen && (
        <LogTradeModal
          instrument={selected}
          onLog={logTrade}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
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

// Editable starting account balance. Click to set it the first time; running
// equity is derived from it plus logged PnL.
function BalanceMetric({
  value,
  onSave,
}: {
  value: number;
  onSave: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = () => {
    setDraft(String(value));
    setEditing(true);
  };
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(n) && n >= 0) onSave(n);
    setEditing(false);
  };

  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-1 text-xs text-gray-400">
        Balance
      </div>
      {editing ? (
        <div className="mt-0.5 flex items-center justify-end gap-1">
          <span className="text-lg font-bold text-gray-400">$</span>
          <input
            autoFocus
            type="number"
            step="0.01"
            min="0"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-28 rounded-md border border-brand px-2 py-0.5 text-right text-lg font-bold text-gray-900 outline-none"
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            className="rounded-md p-1 text-brand hover:bg-brand-soft"
            title="Save balance"
          >
            <Check size={15} />
          </button>
        </div>
      ) : (
        <button
          onClick={start}
          title="Set account balance"
          className="group mt-0.5 flex items-center justify-end gap-1 text-lg font-bold text-gray-900"
        >
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          <Pencil size={12} className="text-gray-300 transition group-hover:text-brand" />
        </button>
      )}
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
// Today's logged trades
// ===========================================================================

function TodayTrades({
  trades,
  onDelete,
  onLog,
}: {
  trades: JournalTrade[];
  onDelete: (id: string) => void;
  onLog: () => void;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg font-bold text-gray-900">Today&apos;s Trades</h3>
          <span className="text-sm text-gray-400">
            Logged to your Journal calendar
          </span>
        </div>
        <button
          onClick={onLog}
          className="flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand transition hover:brightness-105"
        >
          <Plus size={15} /> Log Trade
        </button>
      </div>

      {trades.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          No trades logged today. Hit{" "}
          <span className="font-semibold text-brand">Log Trade</span> to record
          one.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_1fr_auto] gap-3 border-b border-gray-100 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <span>Instrument</span>
            <span>Time</span>
            <span>Direction</span>
            <span className="text-right">R</span>
            <span className="text-right">Net PnL</span>
            <span />
          </div>
          <div className="mt-1 space-y-1">
            {trades
              .slice()
              .sort((a, b) => b.ts - a.ts)
              .map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_1fr_auto] items-center gap-3 rounded-lg px-2 py-3 text-sm transition hover:bg-gray-50"
                >
                  <span className="flex items-center gap-2 truncate font-semibold text-gray-800">
                    <span>{t.flag}</span>
                    {t.symbol}
                    {t.emotion && <span className="text-base">{t.emotion}</span>}
                  </span>
                  <span className="text-gray-500">
                    {new Date(t.ts).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span
                    className={
                      t.direction === "Buy"
                        ? "font-semibold text-emerald-500"
                        : "font-semibold text-red-500"
                    }
                  >
                    {t.direction === "Buy" ? "↑" : "↓"} {t.direction}
                  </span>
                  <span className="text-right tabular-nums text-gray-500">
                    {t.rMultiple ? `${t.rMultiple > 0 ? "+" : ""}${t.rMultiple}R` : "—"}
                  </span>
                  <span
                    className={`text-right font-semibold tabular-nums ${
                      t.netPnl < 0 ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    {fmtMoney(t.netPnl)}
                  </span>
                  <button
                    onClick={() => onDelete(t.id)}
                    title="Delete trade"
                    className="rounded-md p-1.5 text-gray-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
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
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
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
  const [tab, setTab] = useState<"plan" | "watchlist">("plan");
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
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-4 flex gap-5 border-b border-gray-100">
        <WlTab icon={ClipboardList} label="Trading Plan" active={tab === "plan"} onClick={() => setTab("plan")} />
        <WlTab icon={Star} label="Watchlist" active={tab === "watchlist"} onClick={() => setTab("watchlist")} />
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
          <div className="max-h-96 space-y-0.5 overflow-y-auto">
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
// Log trade form
// ===========================================================================

/** Format a Date as the value a datetime-local input expects (local time). */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LogTradeModal({
  instrument,
  onLog,
  onClose,
}: {
  instrument: Instrument;
  onLog: (t: JournalTrade) => void;
  onClose: () => void;
}) {
  const [symbol, setSymbol] = useState(instrument.symbol);
  const [direction, setDirection] = useState<"Buy" | "Sell">("Buy");
  const [pnl, setPnl] = useState("");
  const [rMultiple, setRMultiple] = useState("");
  const [emotion, setEmotion] = useState("");
  const [planFollowed, setPlanFollowed] = useState(true);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date()));

  const inst = INSTRUMENTS.find((i) => i.symbol === symbol) ?? instrument;
  const pnlValid = pnl.trim() !== "" && !Number.isNaN(Number(pnl));

  const submit = () => {
    if (!pnlValid) return;
    const ts = when ? new Date(when).getTime() : Date.now();
    onLog({
      id: `t-${Date.now()}`,
      symbol: inst.symbol,
      flag: inst.flag,
      direction,
      netPnl: Number(pnl),
      rMultiple: rMultiple.trim() === "" ? 0 : Number(rMultiple),
      emotion,
      note: note.trim(),
      planFollowed,
      ts: Number.isNaN(ts) ? Date.now() : ts,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-16 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Log a Trade</h2>
            <p className="text-sm text-gray-500">Records to your Journal calendar.</p>
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        {/* Instrument */}
        <Field label="Instrument">
          <div className="relative">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-8 text-sm text-gray-800 outline-none focus:border-brand"
            >
              {INSTRUMENTS.map((i) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.flag} {i.symbol} — {i.name}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        </Field>

        {/* Direction */}
        <Field label="Direction">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("Sell")}
              className={`rounded-lg py-2.5 text-sm font-bold transition ${
                direction === "Sell" ? "bg-red-500 text-white" : "bg-red-50 text-red-500"
              }`}
            >
              ↓ Sell
            </button>
            <button
              onClick={() => setDirection("Buy")}
              className={`rounded-lg py-2.5 text-sm font-bold transition ${
                direction === "Buy" ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              ↑ Buy
            </button>
          </div>
        </Field>

        {/* PnL + R */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Net PnL ($)">
            <input
              type="number"
              step="0.01"
              value={pnl}
              onChange={(e) => setPnl(e.target.value)}
              placeholder="e.g. -250 or 500"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </Field>
          <Field label="R multiple (optional)">
            <input
              type="number"
              step="0.1"
              value={rMultiple}
              onChange={(e) => setRMultiple(e.target.value)}
              placeholder="e.g. 2 or -1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </Field>
        </div>

        {/* Date/time */}
        <Field label="Date & time">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-brand"
          />
        </Field>

        {/* Emotion */}
        <Field label="Emotion (optional)">
          <div className="flex gap-1.5">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                onClick={() => setEmotion(emotion === e ? "" : e)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                  emotion === e
                    ? "border-brand bg-brand-soft"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>

        {/* Plan followed */}
        <label className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={planFollowed}
            onChange={(e) => setPlanFollowed(e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          I followed my trade plan
        </label>

        {/* Note */}
        <Field label="Note (optional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="What happened on this trade?"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </Field>

        <button
          disabled={!pnlValid}
          onClick={submit}
          className="mt-2 w-full rounded-lg bg-brand py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Log Trade to Journal
        </button>
        {!pnlValid && (
          <p className="mt-2 text-center text-xs text-gray-400">
            Enter the trade&apos;s Net PnL to log it.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}
