"use client";

import { useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Camera,
  ListChecks,
  ClipboardCheck,
  PencilLine,
  Plus,
  Trash2,
  GripVertical,
  ImageIcon,
  Info,
  Pencil,
  Clock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { PlanDraft, DotColor } from "@/lib/types";

const dotClass: Record<string, string> = {
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  green: "bg-green-500",
};
const nextDot: Record<DotColor, DotColor> = {
  red: "yellow",
  yellow: "green",
  green: "red",
};

export default function PlanEditor({
  value,
  onChange,
  dirty,
  saving,
  onSaveNow,
  onSaveClose,
  onCancel,
  uploadImage,
}: {
  value: PlanDraft;
  onChange: (d: PlanDraft) => void;
  dirty: boolean;
  saving: boolean;
  onSaveNow: () => void;
  onSaveClose: () => void;
  onCancel: () => void;
  uploadImage: (file: File) => Promise<string | null>;
}) {
  const set = <K extends keyof PlanDraft>(key: K, v: PlanDraft[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="flex flex-col gap-8 p-8 lg:flex-row">
        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-8">
          {/* Name */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("dot_color", nextDot[value.dot_color])}
              title="Change status color"
              className={`h-3 w-3 shrink-0 rounded-full ${dotClass[value.dot_color]}`}
            />
            <input
              value={value.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Enter trade plan name"
              className="w-full border-none bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
            />
          </div>

          {/* Plan Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-500">Plan Type</label>
            <input
              value={value.plan_type ?? ""}
              onChange={(e) => set("plan_type", e.target.value)}
              placeholder="e.g. Weekly Range, Liquidity Sweep, Break & Retest"
              className={inputCls}
            />
          </div>

          {/* Charting Process */}
          <Section icon={BarChart3} title="Charting Process" onAdd={() => set("charting_process", [...value.charting_process, ""])}>
            <RowList
              items={value.charting_process}
              placeholder="e.g. Mark HTF levels (4H/1H) + daily bias"
              numbered
              onChange={(items) => set("charting_process", items)}
            />
          </Section>

          {/* Entry Criteria */}
          <Section
            icon={CheckCircle2}
            title="Entry Criteria"
            onAdd={() =>
              set("entry_criteria", [...value.entry_criteria, { label: "", checked: false }])
            }
          >
            {value.entry_criteria.length === 0 ? (
              <Helper>Add the conditions that must be true before you enter</Helper>
            ) : (
              <RowList
                items={value.entry_criteria.map((c) => c.label)}
                placeholder="e.g. Imbalance"
                onChange={(items) =>
                  set(
                    "entry_criteria",
                    items.map((label) => ({ label, checked: false })),
                  )
                }
              />
            )}
          </Section>

          {/* Entry Models */}
          <Section icon={Camera} title="Entry Models">
            <div className="grid gap-6 sm:grid-cols-2">
              <UploadBox
                label="Setup screenshot"
                url={value.setup_screenshot_url}
                onUpload={uploadImage}
                onSet={(url) => set("setup_screenshot_url", url)}
              />
              <UploadBox
                label="Entry examples"
                url={value.entry_example_urls[0] ?? null}
                onUpload={uploadImage}
                onSet={(url) => set("entry_example_urls", url ? [url] : [])}
              />
            </div>
          </Section>

          {/* Trade Management Rules */}
          <Section icon={ListChecks} title="Trade Management Rules">
            <textarea
              value={value.trade_management_rules.join("\n")}
              onChange={(e) => set("trade_management_rules", e.target.value.split("\n"))}
              rows={4}
              placeholder="e.g. Partial at 1R, move SL to BE after 1R, set and forget etc."
              className={inputCls}
            />
          </Section>

          {/* Exit Criteria */}
          <Section
            icon={ClipboardCheck}
            title="Exit Criteria"
            onAdd={() => set("exit_criteria", [...value.exit_criteria, ""])}
          >
            {value.exit_criteria.length === 0 ? (
              <Helper>Add your exit rules so you don&apos;t freestyle</Helper>
            ) : (
              <RowList
                items={value.exit_criteria}
                placeholder="e.g. Take profit at 2R"
                onChange={(items) => set("exit_criteria", items)}
              />
            )}
          </Section>

          {/* Trading Notes */}
          <Section icon={PencilLine} title="Trading Notes">
            <textarea
              value={value.trading_notes ?? ""}
              onChange={(e) => set("trading_notes", e.target.value)}
              rows={4}
              placeholder="Why this works • Common mistakes • Non-negotiables • Reminders under pressure"
              className={inputCls}
            />
          </Section>
        </div>

        {/* Right sidebar cards */}
        <div className="w-full shrink-0 space-y-5 lg:w-72">
          <RiskControlsCard value={value} set={set} />
          <TradingWindowCard value={value} set={set} />
        </div>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 flex items-center justify-between gap-4 rounded-b-2xl border-t border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          {saving ? (
            <Loader2 size={22} className="animate-spin text-brand" />
          ) : (
            <CheckCircle size={22} className={dirty ? "text-amber-500" : "text-green-500"} />
          )}
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {saving ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved"}
            </div>
            <div className="text-xs text-gray-400">
              {dirty ? "You have unsaved edits" : "No changes yet"}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onSaveNow}
            disabled={saving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Save Now
          </button>
          <button
            onClick={onSaveClose}
            disabled={saving}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
          >
            Save &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/20";

function Section({
  icon: Icon,
  title,
  onAdd,
  children,
}: {
  icon: React.ElementType;
  title: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          <Icon size={15} />
          {title}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 rounded-md border border-brand/30 px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
          >
            <Plus size={13} /> Add
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-400">{children}</p>;
}

function RowList({
  items,
  placeholder,
  numbered,
  onChange,
}: {
  items: string[];
  placeholder: string;
  numbered?: boolean;
  onChange: (items: string[]) => void;
}) {
  const update = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {numbered && (
            <>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                {i + 1}
              </span>
              <GripVertical size={16} className="shrink-0 cursor-grab text-gray-300" />
            </>
          )}
          <input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className={inputCls}
          />
          <button
            onClick={() => remove(i)}
            className="shrink-0 rounded-lg p-2 text-gray-300 hover:bg-gray-100 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

function UploadBox({
  label,
  url,
  onUpload,
  onSet,
}: {
  label: string;
  url: string | null;
  onUpload: (file: File) => Promise<string | null>;
  onSet: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const uploaded = await onUpload(file);
    if (uploaded) onSet(uploaded);
    setBusy(false);
    e.target.value = "";
  }

  return (
    <div>
      <div className="mb-2 text-sm text-gray-500">{label}</div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 text-gray-400 transition hover:border-brand/40 hover:bg-brand-soft/30"
      >
        {busy ? (
          <Loader2 size={24} className="animate-spin text-brand" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2">
            <ImageIcon size={28} strokeWidth={1.5} />
            <span className="text-sm font-medium">Upload Image</span>
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  );
}

type SetFn = <K extends keyof PlanDraft>(key: K, v: PlanDraft[K]) => void;

function RiskControlsCard({ value, set }: { value: PlanDraft; set: SetFn }) {
  const [edit, setEdit] = useState(false);
  const num = (v: string) => (v === "" ? null : Number(v));

  return (
    <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Risk Controls
          <Info size={13} className="text-gray-400" />
        </div>
        <button onClick={() => setEdit((v) => !v)}>
          <Pencil size={14} className="text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      {edit ? (
        <div className="grid grid-cols-2 gap-3">
          <EditNum label="Max trades / day" val={value.max_trades_per_day} onChange={(v) => set("max_trades_per_day", num(v))} />
          <EditNum label="Max daily loss" val={value.max_daily_loss} onChange={(v) => set("max_daily_loss", num(v))} />
          <EditNum label="Max daily profit" val={value.max_daily_profit} onChange={(v) => set("max_daily_profit", num(v))} />
          <EditNum label="Risk per trade %" val={value.risk_per_trade} onChange={(v) => set("risk_per_trade", num(v))} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
          <Metric value={fmt(value.max_trades_per_day)} label="Max trades per day" />
          <Metric value={fmt(value.max_daily_loss, 2)} label="Max daily loss" />
          <Metric value={fmt(value.max_daily_profit, 2)} label="Max daily profit" />
          <Metric
            value={value.risk_per_trade === null ? "—" : `${value.risk_per_trade.toFixed(2)}%`}
            label="Risk per trade"
          />
        </div>
      )}
    </div>
  );
}

function TradingWindowCard({ value, set }: { value: PlanDraft; set: SetFn }) {
  const [edit, setEdit] = useState(false);
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Clock size={13} className="text-gray-400" />
        Trading Window
      </div>

      {edit ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              value={value.trading_window_start ?? ""}
              onChange={(e) => set("trading_window_start", e.target.value)}
              placeholder="08:00"
              className={inputCls}
            />
            <span className="text-gray-400">–</span>
            <input
              value={value.trading_window_end ?? ""}
              onChange={(e) => set("trading_window_end", e.target.value)}
              placeholder="17:00"
              className={inputCls}
            />
          </div>
          <textarea
            value={value.block_news_note ?? ""}
            onChange={(e) => set("block_news_note", e.target.value)}
            rows={2}
            placeholder="News-block rule"
            className={inputCls}
          />
          <button
            onClick={() => setEdit(false)}
            className="text-xs font-semibold text-brand hover:brightness-110"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="text-xl font-bold text-gray-900">
            {value.trading_window_start ?? "—"} - {value.trading_window_end ?? "—"}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Block News</span>
            <button onClick={() => setEdit(true)}>
              <Pencil size={14} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          {value.block_news_note && (
            <p className="mt-1 text-sm text-gray-700">{value.block_news_note}</p>
          )}
        </>
      )}
    </div>
  );
}

function EditNum({
  label,
  val,
  onChange,
}: {
  label: string;
  val: number | null;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-gray-500">{label}</span>
      <input
        type="number"
        value={val ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function fmt(n: number | null, decimals?: number) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 0,
  });
}
