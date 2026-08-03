"use client";

import { useEffect, useRef, useState } from "react";
import {
  Pencil,
  LogOut,
  Camera,
  Clock,
  Info,
  GripVertical,
  Trash2,
  Plus,
  PencilLine,
  LineChart,
  Flower2,
  ShieldCheck,
  CalendarClock,
  ListTodo,
  BookOpen,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Calendar,
  ChevronDown,
} from "lucide-react";
import {
  ACCOUNT_KEY,
  ROUTINE_KEY,
  TRADING_KEY,
  AccountSettings,
  DEFAULT_ACCOUNT,
  TIMEZONES,
  CURRENCIES,
  RoutineSettings,
  RoutineStep,
  DEFAULT_ROUTINE,
  ROUTINE_ACTIONS,
  MAX_STEPS,
  TradingPrefs,
  DEFAULT_TRADING,
  NEWS_WHEN,
  NEWS_MINS,
  RECOMMENDED_GUARDRAILS,
  loadSetting,
  saveSetting,
  hydrateSettings,
  SETTINGS_EVENT,
  SettingsChange,
} from "@/lib/settings";
import { fileToScaledDataUrl } from "@/lib/academy";
import { applyTheme, getTheme, THEME_EVENT, Theme } from "@/lib/theme";

const TABS = ["Account", "Pre-Market Routine", "Trading Preferences"] as const;
type Tab = (typeof TABS)[number];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("Account");

  return (
    <div className="min-h-screen px-8 py-7">
      <div className="mb-6 flex items-baseline gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Set your rules, risk limits, hours, and alerts.</p>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
        {/* Tab bar */}
        <div className="flex gap-6 border-b border-gray-100 px-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 py-4 text-sm font-semibold transition ${
                tab === t
                  ? "border-brand text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-8">
          {tab === "Account" && <AccountTab />}
          {tab === "Pre-Market Routine" && <RoutineTab />}
          {tab === "Trading Preferences" && <TradingTab />}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Account
// ===========================================================================

function AccountTab() {
  const [saved, setSaved] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [draft, setDraft] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [editing, setEditing] = useState(false);
  // Track edit mode in a ref so the settings-change listener (registered once)
  // can avoid overwriting an in-progress edit.
  const editingRef = useRef(editing);
  useEffect(() => {
    editingRef.current = editing;
  });
  // The live applied theme, shared with the sidebar toggle via @/lib/theme.
  const [appliedTheme, setAppliedTheme] = useState<Theme>("light");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // The applied theme (<html> class) is the source of truth; reconcile the
    // stored account so the two never drift.
    const applied = getTheme();
    const s = { ...loadSetting(ACCOUNT_KEY, DEFAULT_ACCOUNT), theme: applied };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(s);
    setDraft(s);
    setAppliedTheme(applied);

    // Reflect theme changes made elsewhere (e.g. the sidebar toggle).
    const onThemeChange = (e: Event) => {
      const t = (e as CustomEvent<Theme>).detail;
      setAppliedTheme(t);
      setSaved((prev) => ({ ...prev, theme: t }));
      setDraft((prev) => ({ ...prev, theme: t }));
    };
    window.addEventListener(THEME_EVENT, onThemeChange);

    // Hydrate from Supabase, then reflect account changes from other tabs/pages.
    hydrateSettings();
    const onSettings = (e: Event) => {
      const { key, value } = (e as CustomEvent<SettingsChange>).detail;
      if (key !== ACCOUNT_KEY) return;
      const merged = { ...DEFAULT_ACCOUNT, ...value, theme: getTheme() };
      setSaved(merged);
      setDraft((prev) => (editingRef.current ? prev : merged));
    };
    window.addEventListener(SETTINGS_EVENT, onSettings);
    return () => {
      window.removeEventListener(THEME_EVENT, onThemeChange);
      window.removeEventListener(SETTINGS_EVENT, onSettings);
    };
  }, []);

  // Theme applies immediately (like the avatar) regardless of edit mode, and
  // persists on its own without committing other unsaved edits.
  const chooseTheme = (t: Theme) => {
    applyTheme(t);
    setAppliedTheme(t);
    setSaved((prev) => {
      const next = { ...prev, theme: t };
      saveSetting(ACCOUNT_KEY, next);
      return next;
    });
    setDraft((prev) => ({ ...prev, theme: t }));
  };

  const commit = (next: AccountSettings) => {
    setSaved(next);
    setDraft(next);
    saveSetting(ACCOUNT_KEY, next);
  };

  const set = <K extends keyof AccountSettings>(k: K, v: AccountSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  async function pickAvatar(file: File) {
    const url = await fileToScaledDataUrl(file, 256);
    const next = { ...saved, avatar: url };
    commit(next); // avatar saves immediately, like the reference
  }

  const view = editing ? draft : saved;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Account</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <LogOut size={15} /> Log out
          </button>
          {editing ? (
            <>
              <button
                onClick={() => {
                  setDraft(saved);
                  setEditing(false);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  commit(draft);
                  setEditing(false);
                }}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
            >
              <Pencil size={15} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-6xl font-bold text-white">
            {view.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              (view.name[0] || "?").toUpperCase()
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            <Camera size={15} /> Change
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickAvatar(f);
            }}
          />
        </div>

        {/* Identity */}
        <div className="flex-1">
          {editing ? (
            <div className="grid max-w-md gap-3">
              <LabeledInput label="Name" value={draft.name} onChange={(v) => set("name", v)} />
              <LabeledInput
                label="Username"
                value={draft.username}
                onChange={(v) => set("username", v)}
              />
              <LabeledInput label="Phone" value={draft.phone} onChange={(v) => set("phone", v)} />
              <LabeledInput label="Email" value={draft.email} onChange={(v) => set("email", v)} />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-900">{saved.name}</div>
              <div className="text-gray-400">@{saved.username}</div>
              <ReadField label="Phone" value={saved.phone} />
              <ReadField label="Email" value={saved.email} />
            </>
          )}

          {/* Preferences */}
          <h3 className="mb-4 mt-10 text-xl font-bold text-gray-900">Preferences</h3>
          <div className="grid max-w-2xl gap-x-12 gap-y-5 sm:grid-cols-2">
            <PrefField label="Timezone">
              {editing ? (
                <Dropdown value={draft.timezone} onChange={(v) => set("timezone", v)} options={TIMEZONES} />
              ) : (
                <div className="text-gray-800">{saved.timezone}</div>
              )}
            </PrefField>
            <PrefField label="Time format">
              {editing ? (
                <Dropdown
                  value={draft.timeFormat}
                  onChange={(v) => set("timeFormat", v as "12h" | "24h")}
                  options={["12h", "24h"]}
                />
              ) : (
                <div className="text-gray-800">{saved.timeFormat}</div>
              )}
            </PrefField>
            <PrefField label="Currency display" info>
              {editing ? (
                <Dropdown
                  value={draft.currency}
                  onChange={(v) => set("currency", v)}
                  options={CURRENCIES}
                  labels={CURRENCIES.map((c) => c || "Not set")}
                />
              ) : (
                <div className="text-gray-800">{saved.currency || "Not set"}</div>
              )}
            </PrefField>
          </div>

          {/* Theme */}
          <h3 className="mb-4 mt-10 text-xl font-bold text-gray-900">Theme</h3>
          <div className="flex gap-6">
            <Radio
              checked={appliedTheme === "light"}
              onChange={() => chooseTheme("light")}
              label="☀ Light"
            />
            <Radio
              checked={appliedTheme === "dark"}
              onChange={() => chooseTheme("dark")}
              label="☾ Dark"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Pre-Market Routine
// ===========================================================================

const ROUTINE_ICONS: Record<string, { Icon: React.ElementType; className: string }> = {
  edit: { Icon: PencilLine, className: "bg-red-50 text-red-500" },
  chart: { Icon: LineChart, className: "bg-brand-soft text-brand" },
  meditate: { Icon: Flower2, className: "bg-emerald-50 text-emerald-500" },
  shield: { Icon: ShieldCheck, className: "bg-blue-50 text-blue-500" },
  calendar: { Icon: CalendarClock, className: "bg-amber-50 text-amber-500" },
  checklist: { Icon: ListTodo, className: "bg-blue-50 text-blue-500" },
  book: { Icon: BookOpen, className: "bg-teal-50 text-teal-500" },
};
const ICON_KEYS = Object.keys(ROUTINE_ICONS);

function RoutineTab() {
  const [draft, setDraft] = useState<RoutineSettings>(DEFAULT_ROUTINE);
  const [saved, setSaved] = useState<RoutineSettings>(DEFAULT_ROUTINE);
  const dragIndex = useRef<number | null>(null);
  const savedRef = useRef(saved);
  const draftRef = useRef(draft);
  useEffect(() => {
    savedRef.current = saved;
    draftRef.current = draft;
  });

  useEffect(() => {
    const s = loadSetting(ROUTINE_KEY, DEFAULT_ROUTINE);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(s);
    setDraft(s);
    hydrateSettings();
    // Reflect routine changes hydrated/saved elsewhere — but never clobber an
    // in-progress edit.
    const onSettings = (e: Event) => {
      const { key, value } = (e as CustomEvent<SettingsChange>).detail;
      if (key !== ROUTINE_KEY) return;
      const merged = { ...DEFAULT_ROUTINE, ...value };
      const clean =
        JSON.stringify(draftRef.current) === JSON.stringify(savedRef.current);
      setSaved(merged);
      if (clean) setDraft(merged);
    };
    window.addEventListener(SETTINGS_EVENT, onSettings);
    return () => window.removeEventListener(SETTINGS_EVENT, onSettings);
  }, []);

  const set = <K extends keyof RoutineSettings>(k: K, v: RoutineSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const setStep = (id: string, patch: Partial<RoutineStep>) =>
    set("steps", draft.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addStep = () => {
    if (draft.steps.length >= MAX_STEPS) return;
    set("steps", [
      ...draft.steps,
      { id: `s-${Date.now()}`, icon: "checklist", label: "New Step", action: "None" },
    ]);
  };
  const removeStep = (id: string) => set("steps", draft.steps.filter((s) => s.id !== id));

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...draft.steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    set("steps", next);
  };

  const cycleIcon = (id: string, current: string) => {
    const idx = ICON_KEYS.indexOf(current);
    setStep(id, { icon: ICON_KEYS[(idx + 1) % ICON_KEYS.length] });
  };

  const save = () => {
    setSaved(draft);
    saveSetting(ROUTINE_KEY, draft);
  };

  return (
    <div className="max-w-4xl">
      <h2 className="mb-3 text-2xl font-bold text-gray-900">Pre-Market Routine</h2>
      <p className="text-gray-600">
        This checklist shows up before you trade and stays pinned across EdgeFlo until you
        complete it. Build your flow once, then run it daily.
      </p>
      <button className="mt-1 text-sm font-semibold text-brand hover:underline">
        Need help building your routine? Watch Brad&apos;s walkthrough.
      </button>

      <div className="mt-6 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <ToggleRow
          label="Enable Pre-Market Banner"
          on={draft.enableBanner}
          onToggle={() => set("enableBanner", !draft.enableBanner)}
        />
        <ToggleRow
          label="Enable start session prompt"
          on={draft.enableStartPrompt}
          onToggle={() => set("enableStartPrompt", !draft.enableStartPrompt)}
        />
        <ToggleRow
          label="Show banner on all pages"
          on={draft.showOnAllPages}
          onToggle={() => set("showOnAllPages", !draft.showOnAllPages)}
        />
        <ToggleRow
          label="Auto-hide after completion"
          on={draft.autoHide}
          onToggle={() => set("autoHide", !draft.autoHide)}
        />
      </div>

      <div className="mt-6 max-w-xs">
        <label className="mb-1.5 block text-sm font-medium text-gray-500">
          Daily reset time (America/New_York)
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5">
          <Clock size={16} className="text-gray-400" />
          <input
            type="time"
            value={draft.resetTime}
            onChange={(e) => set("resetTime", e.target.value)}
            className="w-full text-gray-800 outline-none"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-400">Checklist progress resets daily at this time.</p>
      </div>

      {/* Steps */}
      <div className="mt-8 flex items-center justify-between">
        <span className="text-sm text-gray-500">Customize and reorder your routine.</span>
        <button
          onClick={() => set("steps", DEFAULT_ROUTINE.steps)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Reset to default
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-x-3 border-t border-gray-100 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <span className="col-start-2">Icon</span>
        <span>Step</span>
        <span>Action</span>
        <span />
      </div>

      <div className="mt-2 space-y-2">
        {draft.steps.map((step, i) => {
          const meta = ROUTINE_ICONS[step.icon] ?? ROUTINE_ICONS.checklist;
          const Icon = meta.Icon;
          return (
            <div
              key={step.id}
              draggable
              onDragStart={() => (dragIndex.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== null) reorder(dragIndex.current, i);
                dragIndex.current = null;
              }}
              className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-x-3"
            >
              <span className="cursor-grab text-gray-300" title="Drag to reorder">
                <GripVertical size={18} />
              </span>
              <button
                onClick={() => cycleIcon(step.id, step.icon)}
                title="Click to change icon"
                className={`flex h-9 w-9 items-center justify-center rounded-full ${meta.className}`}
              >
                <Icon size={17} />
              </button>
              <input
                value={step.label}
                onChange={(e) => setStep(step.id, { label: e.target.value })}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <Dropdown
                value={step.action}
                onChange={(v) => setStep(step.id, { action: v })}
                options={ROUTINE_ACTIONS}
                className="w-52"
              />
              <button
                onClick={() => removeStep(step.id)}
                className="rounded-md p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <button
        onClick={addStep}
        disabled={draft.steps.length >= MAX_STEPS}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={15} /> Add step ({draft.steps.length} / {MAX_STEPS} used)
      </button>

      <SaveBar onCancel={() => setDraft(saved)} onSave={save} />
    </div>
  );
}

// ===========================================================================
// Trading Preferences
// ===========================================================================

function TradingTab() {
  const [draft, setDraft] = useState<TradingPrefs>(DEFAULT_TRADING);
  const [saved, setSaved] = useState<TradingPrefs>(DEFAULT_TRADING);
  const savedRef = useRef(saved);
  const draftRef = useRef(draft);
  useEffect(() => {
    savedRef.current = saved;
    draftRef.current = draft;
  });

  useEffect(() => {
    const s = loadSetting(TRADING_KEY, DEFAULT_TRADING);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(s);
    setDraft(s);
    hydrateSettings();
    const onSettings = (e: Event) => {
      const { key, value } = (e as CustomEvent<SettingsChange>).detail;
      if (key !== TRADING_KEY) return;
      const merged = { ...DEFAULT_TRADING, ...value };
      const clean =
        JSON.stringify(draftRef.current) === JSON.stringify(savedRef.current);
      setSaved(merged);
      if (clean) setDraft(merged);
    };
    window.addEventListener(SETTINGS_EVENT, onSettings);
    return () => window.removeEventListener(SETTINGS_EVENT, onSettings);
  }, []);

  const set = <K extends keyof TradingPrefs>(k: K, v: TradingPrefs[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    setSaved(draft);
    saveSetting(TRADING_KEY, draft);
  };

  return (
    <div className="max-w-5xl">
      <h2 className="mb-3 text-2xl font-bold text-gray-900">Trading Preferences</h2>
      <p className="text-gray-600">
        Your guardrails are your trading rules. Once your session starts, EdgeFlo will warn or
        block you when you&apos;re about to break them. You can change these later anytime.
      </p>
      <button className="mt-1 text-sm font-semibold text-brand hover:underline">
        Need help setting your guardrails? Watch Brad&apos;s walkthrough.
      </button>

      {/* Hard lock */}
      <div className="mt-7 flex items-start gap-3">
        <Toggle on={draft.hardLock} onClick={() => set("hardLock", !draft.hardLock)} />
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-gray-800">
            Hard Lock Trading <Info size={14} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">
            Disables &quot;Trade anyway&quot; after you breach a guardrail. Trading stays locked
            until the next day.
          </p>
        </div>
      </div>

      {/* Guardrails */}
      <div className="mt-8 mb-4 flex items-center gap-3">
        <h3 className="flex items-center gap-1.5 text-xl font-bold text-gray-900">
          Guardrails <Info size={15} className="text-gray-300" />
        </h3>
        <button
          onClick={() => setDraft((d) => ({ ...d, ...RECOMMENDED_GUARDRAILS }))}
          className="rounded-lg border border-brand/30 px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft/40"
        >
          Apply recommended defaults
        </button>
      </div>

      <div className="divide-y divide-gray-100 border-y border-gray-100">
        <GuardrailRow icon={BarChart3} iconCls="bg-brand-soft text-brand" label="Max Trades Per Day">
          <NumberInput value={draft.maxTradesPerDay} onChange={(v) => set("maxTradesPerDay", v)} />
        </GuardrailRow>
        <GuardrailRow
          icon={AlertTriangle}
          iconCls="bg-red-50 text-red-500"
          label="Max Daily Loss"
          hint="Uses realized PnL"
        >
          <NumberInput value={draft.maxDailyLoss} onChange={(v) => set("maxDailyLoss", v)} />
        </GuardrailRow>
        <GuardrailRow
          icon={TrendingUp}
          iconCls="bg-emerald-50 text-emerald-500"
          label="Max Daily Profit"
          hint="Uses realized Net PnL"
        >
          <NumberInput value={draft.maxDailyProfit} onChange={(v) => set("maxDailyProfit", v)} />
        </GuardrailRow>
        <GuardrailRow
          icon={ShieldCheck}
          iconCls="bg-brand-soft text-brand"
          label="Fixed Risk Per Trade"
          hint="Lot size auto-adjusts to match risk."
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2">
            <input
              type="number"
              step="0.01"
              value={draft.fixedRisk}
              onChange={(e) => set("fixedRisk", Number(e.target.value))}
              className="w-16 text-sm outline-none"
            />
            <span className="text-sm text-gray-400">%</span>
          </div>
        </GuardrailRow>
        <GuardrailRow icon={Clock} iconCls="bg-brand-soft text-brand" label="Trading Window">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Time (EDT):</span>
            <TimeInput value={draft.windowStart} onChange={(v) => set("windowStart", v)} />
            <TimeInput value={draft.windowEnd} onChange={(v) => set("windowEnd", v)} />
          </div>
        </GuardrailRow>
        <GuardrailRow
          icon={Calendar}
          iconCls="bg-amber-50 text-amber-500"
          label="News Block"
          hint="Only blocks high-impact events relevant to your pinned pairs."
        >
          <div className="flex items-center gap-2">
            <Dropdown
              value={draft.newsWhen}
              onChange={(v) => set("newsWhen", v)}
              options={NEWS_WHEN}
              className="w-44"
            />
            <Dropdown
              value={String(draft.newsMins)}
              onChange={(v) => set("newsMins", Number(v))}
              options={NEWS_MINS.map(String)}
              labels={NEWS_MINS.map((m) => `${m} min`)}
              className="w-28"
            />
          </div>
        </GuardrailRow>
      </div>

      <SaveBar onCancel={() => setDraft(saved)} onSave={save} />

      {/* Trading Prompts */}
      <h3 className="mb-3 mt-10 text-xl font-bold text-gray-900">Trading Prompts</h3>
      <div className="flex items-start gap-3">
        <Toggle
          on={draft.postTradePrompts}
          onClick={() => set("postTradePrompts", !draft.postTradePrompts)}
        />
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-gray-800">
            Post-trade prompts <Info size={14} className="text-gray-300" />
          </div>
          <p className="text-sm text-gray-500">
            Quick reflection after entry/close. Your emotion tags and notes sync automatically to
            your Trading Journal.
          </p>
        </div>
      </div>

      {draft.postTradePrompts && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <PromptCard
            checked={draft.afterOpening}
            onToggle={() => set("afterOpening", !draft.afterOpening)}
            label="After opening a trade"
          >
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-800">🇺🇸 EURUSD</div>
                <span className="text-gray-300">×</span>
              </div>
              <div className="text-xs text-gray-400">Long @ 1.16082</div>
              <div className="mt-3 text-sm text-gray-700">
                What emotion drove this entry? <span className="font-semibold text-brand">Greed</span>
              </div>
              <div className="mt-2 flex gap-1.5 text-xl">
                {["😌", "🥵", "😏", "😀", "🚀", "😡", "🤩"].map((e, i) => (
                  <span key={i}>{e}</span>
                ))}
              </div>
              <div className="mt-3 text-xs font-semibold text-emerald-500">✓ Saved</div>
            </div>
          </PromptCard>
          <PromptCard
            checked={draft.afterClosing}
            onToggle={() => set("afterClosing", !draft.afterClosing)}
            label="After closing a trade"
          >
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-xs text-gray-400">Closed PnL</div>
              <div className="text-2xl font-bold text-emerald-500">
                +$500<span className="text-sm">.00</span>
              </div>
              <div className="mt-2 text-sm text-gray-700">
                EURUSD trade closed.
                <br />
                How do you feel right now?
              </div>
              <div className="mt-2 flex gap-1.5 text-xl">
                {["😌", "😔", "😣", "😌", "😡", "🏆"].map((e, i) => (
                  <span key={i}>{e}</span>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <input type="checkbox" className="accent-brand" /> I followed my trade plan
              </label>
            </div>
          </PromptCard>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Shared controls
// ===========================================================================

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-6">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-0.5 text-gray-800">{value}</div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

function PrefField({
  label,
  info,
  children,
}: {
  label: string;
  info?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-sm text-gray-400">
        {label} {info && <Info size={13} className="text-gray-300" />}
      </div>
      {children}
    </div>
  );
}

function Radio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button onClick={onChange} className="flex items-center gap-2 text-sm text-gray-700">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          checked ? "border-brand" : "border-gray-300"
        }`}
      >
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
      </span>
      {label}
    </button>
  );
}

function Dropdown({
  value,
  onChange,
  options,
  labels,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: string[];
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-800 outline-none focus:border-brand"
      >
        {options.map((o, i) => (
          <option key={o} value={o}>
            {labels ? labels[i] : o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-brand" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Toggle on={on} onClick={onToggle} />
      <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {label} <Info size={13} className="text-gray-300" />
      </span>
    </div>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
    />
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
    />
  );
}

function GuardrailRow({
  icon: Icon,
  iconCls,
  label,
  hint,
  children,
}: {
  icon: React.ElementType;
  iconCls: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconCls}`}>
        <Icon size={17} />
      </span>
      <span className="w-44 shrink-0 font-semibold text-gray-800">{label}</span>
      {children}
      {hint && <span className="text-sm text-gray-400">{hint}</span>}
      <span className="ml-auto">
        <Info size={16} className="text-gray-300" />
      </span>
    </div>
  );
}

function PromptCard({
  checked,
  onToggle,
  label,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 p-5">
      <label className="mb-4 flex items-center gap-2 font-medium text-gray-800">
        <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-brand" />
        {label}
      </label>
      {children}
    </div>
  );
}

function SaveBar({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  const [justSaved, setJustSaved] = useState(false);
  return (
    <div className="mt-6 flex items-center gap-3">
      <button
        onClick={onCancel}
        className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        onClick={() => {
          onSave();
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 1800);
        }}
        className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:brightness-105"
      >
        Save changes
      </button>
      {justSaved && <span className="text-sm font-semibold text-emerald-500">✓ Saved</span>}
    </div>
  );
}
