"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { PlanDraft, DotColor, emptyDraft } from "@/lib/types";

export default function NewPlanModal({
  open,
  onClose,
  onCreate,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: PlanDraft) => void | Promise<void>;
  saving: boolean;
}) {
  const [d, setD] = useState<PlanDraft>(emptyDraft());

  if (!open) return null;

  const set = <K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }));

  const num = (v: string): number | null => (v === "" ? null : Number(v));

  function handleSubmit() {
    // Strip blank rows before saving.
    const clean: PlanDraft = {
      ...d,
      name: d.name.trim(),
      plan_type: (d.plan_type ?? "").trim() || null,
      trading_notes: (d.trading_notes ?? "").trim() || null,
      setup_screenshot_url: (d.setup_screenshot_url ?? "").trim() || null,
      charting_process: d.charting_process.map((s) => s.trim()).filter(Boolean),
      entry_criteria: d.entry_criteria
        .map((c) => ({ ...c, label: c.label.trim() }))
        .filter((c) => c.label),
      trade_management_rules: d.trade_management_rules.map((s) => s.trim()).filter(Boolean),
      exit_criteria: d.exit_criteria.map((s) => s.trim()).filter(Boolean),
      entry_example_urls: d.entry_example_urls.map((s) => s.trim()).filter(Boolean),
    };
    onCreate(clean);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">New Plan</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-5">
          {/* Basics */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan name">
              <input
                value={d.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Market Mechanics Plan"
                className={inputCls}
              />
            </Field>
            <Field label="Plan type">
              <input
                value={d.plan_type ?? ""}
                onChange={(e) => set("plan_type", e.target.value)}
                placeholder="Failed Reaction LQ Sweep"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Status color">
            <div className="flex gap-2">
              {(["yellow", "red", "green"] as DotColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("dot_color", c)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    d.dot_color === c ? "border-gray-800" : "border-transparent"
                  } ${c === "yellow" ? "bg-yellow-400" : c === "red" ? "bg-red-500" : "bg-green-500"}`}
                />
              ))}
            </div>
          </Field>

          {/* Risk Controls */}
          <Group title="Risk Controls">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Max trades per day">
                <input
                  type="number"
                  value={d.max_trades_per_day ?? ""}
                  onChange={(e) => set("max_trades_per_day", num(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Max daily loss">
                <input
                  type="number"
                  value={d.max_daily_loss ?? ""}
                  onChange={(e) => set("max_daily_loss", num(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Max daily profit">
                <input
                  type="number"
                  value={d.max_daily_profit ?? ""}
                  onChange={(e) => set("max_daily_profit", num(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Risk per trade (%)">
                <input
                  type="number"
                  value={d.risk_per_trade ?? ""}
                  onChange={(e) => set("risk_per_trade", num(e.target.value))}
                  className={inputCls}
                />
              </Field>
            </div>
          </Group>

          {/* Charting Process */}
          <Group title="Charting Process">
            <DynamicList
              items={d.charting_process}
              placeholder="e.g. Map relevant POIs on 4H"
              onChange={(items) => set("charting_process", items)}
              ordered
            />
          </Group>

          {/* Entry Criteria */}
          <Group title="Entry Criteria">
            <DynamicList
              items={d.entry_criteria.map((c) => c.label)}
              placeholder="e.g. Imbalance"
              onChange={(items) =>
                set(
                  "entry_criteria",
                  items.map((label) => ({ label, checked: false })),
                )
              }
            />
          </Group>

          {/* Entry Models (images) */}
          <Group title="Entry Models">
            <Field label="Setup screenshot URL">
              <input
                value={d.setup_screenshot_url ?? ""}
                onChange={(e) => set("setup_screenshot_url", e.target.value)}
                placeholder="https://…"
                className={inputCls}
              />
            </Field>
            <div className="mt-3">
              <Field label="Entry example URL">
                <input
                  value={d.entry_example_urls[0] ?? ""}
                  onChange={(e) => set("entry_example_urls", e.target.value ? [e.target.value] : [])}
                  placeholder="https://…"
                  className={inputCls}
                />
              </Field>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Paste an image URL for now — drag-and-drop upload comes next.
            </p>
          </Group>

          {/* Trade Management Rules */}
          <Group title="Trade Management Rules">
            <DynamicList
              items={d.trade_management_rules}
              placeholder="e.g. Move stop to breakeven after 1R"
              onChange={(items) => set("trade_management_rules", items)}
            />
          </Group>

          {/* Exit Criteria */}
          <Group title="Exit Criteria">
            <DynamicList
              items={d.exit_criteria}
              placeholder="e.g. Take profit at 2R"
              onChange={(items) => set("exit_criteria", items)}
            />
          </Group>

          {/* Trading Notes */}
          <Group title="Trading Notes">
            <textarea
              value={d.trading_notes ?? ""}
              onChange={(e) => set("trading_notes", e.target.value)}
              rows={3}
              placeholder="Anything else worth remembering…"
              className={inputCls}
            />
          </Group>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!d.name.trim() || saving}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-600">{label}</span>
      {children}
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function DynamicList({
  items,
  placeholder,
  onChange,
  ordered,
}: {
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
  ordered?: boolean;
}) {
  const list = items.length ? items : [""];

  const update = (i: number, v: string) =>
    onChange(list.map((x, j) => (j === i ? v : x)));
  const add = () => onChange([...list, ""]);
  const remove = (i: number) => {
    const next = list.filter((_, j) => j !== i);
    onChange(next.length ? next : [""]);
  };

  return (
    <div className="space-y-2">
      {list.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {ordered && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
              {i + 1}
            </span>
          )}
          <input
            value={item}
            onChange={(e) => update(i, e.target.value)}
            placeholder={placeholder}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="shrink-0 rounded-lg p-2 text-gray-300 hover:bg-gray-100 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand hover:brightness-110"
      >
        <Plus size={15} /> Add
      </button>
    </div>
  );
}
