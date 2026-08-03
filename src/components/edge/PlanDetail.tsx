"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Camera,
  ListChecks,
  ClipboardCheck,
  PencilLine,
  Info,
  Pencil,
  Trash2,
  Copy,
} from "lucide-react";
import { Plan } from "@/lib/types";
import RiskWindowPanel from "./RiskWindowPanel";

const dotClass: Record<string, string> = {
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  green: "bg-green-500",
};

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
      <Icon size={15} />
      {children}
    </div>
  );
}

export default function PlanDetail({
  plan,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onUsePreset,
}: {
  plan: Plan;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleActive?: (active: boolean) => void;
  onUsePreset?: () => void;
}) {
  // Entry-criteria ticks are a working checklist — local, not persisted.
  const [checks, setChecks] = useState<boolean[]>([]);
  useEffect(() => {
    setChecks(plan.entry_criteria.map((c) => c.checked));
  }, [plan]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass[plan.dot_color]}`} />
          <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
        </div>

        {plan.is_preset ? (
          <button
            onClick={onUsePreset}
            className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            Use this Preset
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={onDelete}
              title="Delete"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onDuplicate}
              title="Duplicate"
              className="rounded-lg border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
            >
              <Pencil size={15} /> Edit
            </button>
          </div>
        )}
      </div>

      {/* Active toggle (My Plans only) */}
      {!plan.is_preset && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-brand-soft/60 px-4 py-3">
          <button
            role="switch"
            aria-checked={plan.is_active}
            onClick={() => onToggleActive?.(!plan.is_active)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              plan.is_active ? "bg-brand" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                plan.is_active ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
          <span className="text-sm font-semibold text-gray-800">
            {plan.is_active ? "Active" : "Inactive"}
          </span>
          <Info size={14} className="text-gray-400" />
        </div>
      )}

      {/* Plan Type + Risk Controls (risk/window are read-only, from Settings) */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-medium text-gray-500">Plan Type</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {plan.plan_type || "—"}
          </div>
        </div>

        <div className="w-full lg:w-72">
          <RiskWindowPanel />
        </div>
      </div>

      {/* Charting Process */}
      {plan.charting_process.length > 0 && (
        <section className="mt-8">
          <SectionLabel icon={BarChart3}>Charting Process</SectionLabel>
          <ol className="space-y-3">
            {plan.charting_process.map((step, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <span className="text-gray-800">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Entry Criteria */}
      {plan.entry_criteria.length > 0 && (
        <section className="mt-8">
          <SectionLabel icon={CheckCircle2}>Entry Criteria</SectionLabel>
          <div className="space-y-3">
            {plan.entry_criteria.map((c, i) => (
              <label key={i} className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={checks[i] ?? false}
                  onChange={() =>
                    setChecks((prev) => prev.map((v, j) => (j === i ? !v : v)))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                />
                <span className="text-gray-800">{c.label}</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Entry Models */}
      <section className="mt-8">
        <SectionLabel icon={Camera}>Entry Models</SectionLabel>
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageBox title="Setup screenshot" url={plan.setup_screenshot_url} />
          <ImageBox title="Entry examples" url={plan.entry_example_urls[0] ?? null} />
        </div>
      </section>

      {/* Trade Management Rules */}
      <section className="mt-8">
        <SectionLabel icon={ListChecks}>Trade Management Rules</SectionLabel>
        {plan.trade_management_rules.length > 0 ? (
          <ul className="space-y-2">
            {plan.trade_management_rules.map((r, i) => (
              <li key={i} className="text-gray-800">
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">Not Set</p>
        )}
      </section>

      {/* Exit Criteria */}
      <section className="mt-8">
        <SectionLabel icon={ClipboardCheck}>Exit Criteria</SectionLabel>
        {plan.exit_criteria.length > 0 ? (
          <ul className="space-y-2">
            {plan.exit_criteria.map((e, i) => (
              <li key={i} className="text-gray-800">
                {e}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">Add your exit rules so you don&apos;t freestyle</p>
        )}
      </section>

      {/* Trading Notes */}
      <section className="mt-8">
        <SectionLabel icon={PencilLine}>Trading Notes</SectionLabel>
        {plan.trading_notes ? (
          <p className="whitespace-pre-wrap text-gray-800">{plan.trading_notes}</p>
        ) : (
          <p className="text-gray-400">Not Set</p>
        )}
      </section>
    </div>
  );
}

function ImageBox({ title, url }: { title: string; url: string | null }) {
  return (
    <div>
      <div className="mb-2 text-sm text-gray-500">{title}</div>
      <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-gray-300">No image</span>
        )}
      </div>
    </div>
  );
}
