"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Plus,
  ImagePlus,
  Check,
} from "lucide-react";
import { fmtMoney } from "@/lib/trading";
import {
  JournalTrade,
  TradeCharts,
  EMOTIONS,
  fetchTrade,
  updateTrade,
  loadTrades,
  fetchTrades,
} from "@/lib/journal";
import { fileToScaledDataUrl } from "@/lib/academy";
import { createClient } from "@/lib/supabase/client";

const SESSIONS = ["", "London", "New York", "Asia", "Sydney", "London/NY Overlap"];
const EMOTION_OPTS = ["", ...EMOTIONS];

type Status = "saved" | "unsaved" | "saving";

export default function TradeDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [t, setT] = useState<JournalTrade | null | undefined>(undefined);
  const [status, setStatus] = useState<Status>("saved");
  const [planNames, setPlanNames] = useState<string[]>([]);
  const [order, setOrder] = useState<string[]>([]);

  // Load the full trade (incl. charts), the plan names, and the trade order.
  useEffect(() => {
    let alive = true;
    fetchTrade(id).then((trade) => {
      if (alive) setT(trade);
    });

    const ids = loadTrades()
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .map((x) => x.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(ids);
    fetchTrades().then((list) =>
      setOrder(list.slice().sort((a, b) => b.ts - a.ts).map((x) => x.id)),
    );

    createClient()
      .from("plans")
      .select("name")
      .then(({ data }) => {
        if (data) setPlanNames(data.map((p: { name: string }) => p.name));
      });
    return () => {
      alive = false;
    };
  }, [id]);

  // Debounced autosave whenever there are unsaved edits.
  useEffect(() => {
    if (status !== "unsaved" || !t) return;
    const h = setTimeout(async () => {
      setStatus("saving");
      await updateTrade(id, editableFields(t));
      setStatus((s) => (s === "saving" ? "saved" : s));
    }, 900);
    return () => clearTimeout(h);
  }, [t, status, id]);

  const patch = (p: Partial<JournalTrade>) => {
    setT((prev) => (prev ? { ...prev, ...p } : prev));
    setStatus("unsaved");
  };

  const saveNow = async (close: boolean) => {
    if (t) {
      setStatus("saving");
      await updateTrade(id, editableFields(t));
      setStatus("saved");
    }
    if (close) router.push("/journal");
  };

  if (t === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Loading trade…
      </div>
    );
  }
  if (t === null) {
    return (
      <div className="min-h-screen px-6 py-6">
        <BackLink />
        <div className="mt-10 text-center text-gray-500">
          Trade not found.{" "}
          <button onClick={() => router.push("/journal")} className="font-semibold text-brand">
            Back to Journal
          </button>
        </div>
      </div>
    );
  }

  const idx = order.indexOf(id);
  const prevId = idx > 0 ? order[idx - 1] : null;
  const nextId = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  const win = t.netPnl >= 0;
  const dateLong = new Date(t.ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen px-6 py-6 pb-28">
      <BackLink />

      {/* Title row */}
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <span className="text-2xl">{t.flag}</span>
          {t.symbol}
          <span className="text-gray-300">·</span>
          <span className={win ? "text-emerald-500" : "text-red-500"}>
            {t.direction === "Buy" ? "↑" : "↓"} {t.direction}
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-600">{dateLong}</span>
          {t.status === "live" ? (
            <span className="ml-1 flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold uppercase text-amber-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Live
            </span>
          ) : (
            <span className="ml-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase text-gray-500">
              Closed
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <NavBtn
            label="Previous"
            icon={ChevronLeft}
            disabled={!prevId}
            onClick={() => prevId && router.push(`/journal/${prevId}`)}
          />
          <NavBtn
            label="Next Trade"
            icon={ChevronRight}
            iconRight
            disabled={!nextId}
            onClick={() => nextId && router.push(`/journal/${nextId}`)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_1fr]">
        {/* Left: trade details */}
        <TradeDetails t={t} patch={patch} />

        {/* Right: charts + review */}
        <div className="min-w-0 space-y-6">
          <Charts charts={t.charts ?? {}} patch={patch} />
          <Review t={t} patch={patch} planNames={planNames} />
        </div>
      </div>

      {/* Save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-gray-100 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            {status === "saved" ? (
              <span className="flex items-center gap-1.5 font-semibold text-emerald-500">
                <Check size={16} /> All changes saved
              </span>
            ) : status === "saving" ? (
              <span className="font-semibold text-gray-500">Saving…</span>
            ) : (
              <span className="font-semibold text-amber-500">Unsaved changes</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/journal")}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => saveNow(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Save Now
            </button>
            <button
              onClick={() => saveNow(true)}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
            >
              Save &amp; Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Which fields we persist from the detail view.
function editableFields(t: JournalTrade): Partial<JournalTrade> {
  return {
    netPnl: t.netPnl,
    rMultiple: t.rMultiple,
    note: t.note,
    planFollowed: t.planFollowed,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    stopLoss: t.stopLoss,
    takeProfit: t.takeProfit,
    lots: t.lots,
    session: t.session,
    durationMin: t.durationMin,
    commission: t.commission,
    swap: t.swap,
    planIntended: t.planIntended,
    entryConfluences: t.entryConfluences ?? [],
    tradeManagement: t.tradeManagement,
    mistakes: t.mistakes ?? [],
    entryEmotion: t.entryEmotion,
    exitEmotion: t.exitEmotion,
    charts: t.charts ?? {},
  };
}

function BackLink() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/journal")}
      className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700"
    >
      <ArrowLeft size={16} /> Journal
    </button>
  );
}

function NavBtn({
  label,
  icon: Icon,
  iconRight,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  iconRight?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {!iconRight && <Icon size={16} />}
      {label}
      {iconRight && <Icon size={16} />}
    </button>
  );
}

// ===========================================================================
// Trade details (left)
// ===========================================================================

function TradeDetails({
  t,
  patch,
}: {
  t: JournalTrade;
  patch: (p: Partial<JournalTrade>) => void;
}) {
  const win = t.netPnl >= 0;
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400">
        Trade Details
      </h2>

      {/* Net PnL */}
      <div className={`mt-4 text-5xl font-extrabold ${win ? "text-emerald-500" : "text-red-500"}`}>
        {fmtMoney(t.netPnl)}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        Net PnL
      </div>

      {/* Instrument / direction / lots */}
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
        <Facet label="Instrument">
          <span className="flex items-center gap-1.5 font-bold text-gray-800">
            <span>{t.flag}</span>
            {t.symbol}
          </span>
        </Facet>
        <Facet label="Direction">
          <span className={`font-bold ${win ? "text-emerald-500" : "text-red-500"}`}>
            {t.direction === "Buy" ? "↑" : "↓"} {t.direction}
          </span>
        </Facet>
        <Facet label="Lots">
          <InlineNum value={t.lots} onChange={(v) => patch({ lots: v })} placeholder="0.10" />
        </Facet>
      </div>

      {/* Context */}
      <Section title="Context">
        <Row label="Date">
          <span className="text-gray-700">
            {new Date(t.ts).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </Row>
        <Row label="Session">
          <Select
            value={t.session ?? ""}
            onChange={(v) => patch({ session: v || null })}
            options={SESSIONS}
            labels={SESSIONS.map((s) => s || "—")}
          />
        </Row>
        <Row label="Duration (min)">
          <InlineNum
            value={t.durationMin}
            onChange={(v) => patch({ durationMin: v })}
            placeholder="—"
          />
        </Row>
      </Section>

      {/* Execution */}
      <Section title="Execution">
        <Row label="Entry Price">
          <InlineNum value={t.entryPrice} onChange={(v) => patch({ entryPrice: v })} step="0.00001" />
        </Row>
        <Row label="Exit Price">
          <InlineNum value={t.exitPrice} onChange={(v) => patch({ exitPrice: v })} step="0.00001" />
        </Row>
        <Row label="Stop Loss">
          <InlineNum value={t.stopLoss} onChange={(v) => patch({ stopLoss: v })} step="0.00001" />
        </Row>
        <Row label="Take Profit">
          <InlineNum value={t.takeProfit} onChange={(v) => patch({ takeProfit: v })} step="0.00001" />
        </Row>
      </Section>

      {/* Performance */}
      <Section title="Performance">
        <Row label="Risk (R)">
          <span className="font-semibold text-gray-700">1R</span>
        </Row>
        <Row label="Return (R)">
          <span className={`font-semibold ${t.rMultiple < 0 ? "text-red-500" : "text-emerald-500"}`}>
            {t.rMultiple >= 0 ? "+" : ""}
            {t.rMultiple.toFixed(2)}R
          </span>
        </Row>
      </Section>

      {/* Costs */}
      <Section title="Costs">
        <Row label="Commission">
          <InlineNum value={t.commission} onChange={(v) => patch({ commission: v })} prefix="$" step="0.01" />
        </Row>
        <Row label="Swap">
          <InlineNum value={t.swap} onChange={(v) => patch({ swap: v })} prefix="$" step="0.01" />
        </Row>
      </Section>
    </div>
  );
}

function Facet({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-lg">{children}</div>
      <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-50 py-2.5 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      {children}
    </div>
  );
}

// ===========================================================================
// Charts (screenshots)
// ===========================================================================

function Charts({
  charts,
  patch,
}: {
  charts: TradeCharts;
  patch: (p: Partial<JournalTrade>) => void;
}) {
  const set = (key: keyof TradeCharts, url: string | undefined) =>
    patch({ charts: { ...charts, [key]: url } });

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Charts</h2>
      <p className="mt-1 text-sm text-gray-500">
        Add screenshots to review context + execution. Click, drag, or paste images from clipboard.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["htf", "mtf", "ltf"] as const).map((k) => (
          <ChartSlot
            key={k}
            label={k.toUpperCase()}
            value={charts[k]}
            onChange={(url) => set(k, url)}
          />
        ))}
      </div>
    </div>
  );
}

function ChartSlot({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (url: string | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    try {
      onChange(await fileToScaledDataUrl(file, 1100, 0.8));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label} <Info size={12} className="text-gray-300" />
      </div>
      <div
        tabIndex={0}
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onPaste={(e) => {
          const item = Array.from(e.clipboardData.items).find((i) =>
            i.type.startsWith("image/"),
          );
          if (item) handleFile(item.getAsFile());
        }}
        className={`group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border text-center outline-none transition ${
          value
            ? "border-gray-200"
            : "cursor-pointer border-2 border-dashed border-gray-200 hover:border-brand hover:bg-brand-soft/30 focus:border-brand"
        }`}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={`${label} chart`} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
                className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-800"
              >
                Replace
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(undefined);
                }}
                className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold text-red-500"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="px-3 text-xs text-gray-400">
            {busy ? (
              "Processing…"
            ) : (
              <>
                <ImagePlus size={22} className="mx-auto mb-1.5 text-gray-300" />
                Click, drag, or paste
              </>
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

// ===========================================================================
// Review & reflection
// ===========================================================================

function Review({
  t,
  patch,
  planNames,
}: {
  t: JournalTrade;
  patch: (p: Partial<JournalTrade>) => void;
  planNames: string[];
}) {
  const planOptions = t.planIntended && !planNames.includes(t.planIntended)
    ? [t.planIntended, ...planNames]
    : planNames;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">Review &amp; Reflection</h2>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <FieldLabel>Plan</FieldLabel>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={t.planFollowed}
              onChange={(e) => patch({ planFollowed: e.target.checked })}
              className="h-4 w-4 accent-brand"
            />
            I followed my trade plan
          </label>
        </div>
        <div>
          <FieldLabel>Which plan did you intend to follow?</FieldLabel>
          <Select
            value={t.planIntended ?? ""}
            onChange={(v) => patch({ planIntended: v || null })}
            options={["", ...planOptions]}
            labels={["Select a plan…", ...planOptions]}
            full
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <FieldLabel>Entry Confluences</FieldLabel>
          <TagEditor
            tags={t.entryConfluences ?? []}
            onChange={(tags) => patch({ entryConfluences: tags })}
            placeholder="Add a confluence…"
          />
        </div>
        <div>
          <FieldLabel>Trade Management</FieldLabel>
          <textarea
            value={t.tradeManagement ?? ""}
            onChange={(e) => patch({ tradeManagement: e.target.value })}
            rows={3}
            placeholder="How did you manage the trade?"
            className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="mt-5">
        <FieldLabel>Mistakes</FieldLabel>
        <TagEditor
          tags={t.mistakes ?? []}
          onChange={(tags) => patch({ mistakes: tags })}
          placeholder="Add a mistake…"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-6">
        <div>
          <FieldLabel>Entry Emotion</FieldLabel>
          <Select
            value={t.entryEmotion ?? ""}
            onChange={(v) => patch({ entryEmotion: v || null })}
            options={EMOTION_OPTS}
            labels={EMOTION_OPTS.map((e) => e || "—")}
            full
          />
        </div>
        <div>
          <FieldLabel>Exit Emotion</FieldLabel>
          <Select
            value={t.exitEmotion ?? ""}
            onChange={(v) => patch({ exitEmotion: v || null })}
            options={EMOTION_OPTS}
            labels={EMOTION_OPTS.map((e) => e || "—")}
            full
          />
        </div>
      </div>

      <div className="mt-5">
        <FieldLabel>Add a note or reflection</FieldLabel>
        <textarea
          value={t.note}
          onChange={(e) => patch({ note: e.target.value })}
          rows={4}
          placeholder="What happened, what did you learn, what will you do next time?"
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-sm font-medium text-gray-500">{children}</div>;
}

// ===========================================================================
// Shared inputs
// ===========================================================================

function InlineNum({
  value,
  onChange,
  placeholder = "—",
  prefix,
  step = "any",
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
  prefix?: string;
  step?: string;
}) {
  return (
    <span className="flex items-center gap-1">
      {prefix && <span className="text-sm text-gray-400">{prefix}</span>}
      <input
        type="number"
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-24 rounded-md border border-transparent px-1 py-0.5 text-right text-sm font-semibold text-gray-800 outline-none hover:border-gray-200 focus:border-brand"
      />
    </span>
  );
}

function Select({
  value,
  onChange,
  options,
  labels,
  full,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: string[];
  full?: boolean;
}) {
  return (
    <div className={`relative ${full ? "w-full" : "w-40"}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-800 outline-none focus:border-brand"
      >
        {options.map((o, i) => (
          <option key={`${o}-${i}`} value={o}>
            {labels ? labels[i] : o}
          </option>
        ))}
      </select>
      <ChevronRight
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400"
      />
    </div>
  );
}

function TagEditor({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  };
  return (
    <div className="rounded-lg border border-gray-200 p-2 focus-within:border-brand">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-md bg-brand-soft px-2 py-1 text-xs font-medium text-brand"
          >
            {tag}
            <button onClick={() => onChange(tags.filter((x) => x !== tag))}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 px-1 py-0.5 text-sm outline-none"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-brand disabled:opacity-40"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
