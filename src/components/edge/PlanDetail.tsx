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
} from "lucide-react";
import { Plan } from "@/lib/types";

const dotClass: Record<string, string> = {
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  green: "bg-green-500",
};

function fmt(n: number | null, opts?: Intl.NumberFormatOptions) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", opts);
}

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

export default function PlanDetail({ plan }: { plan: Plan }) {
  // Entry-criteria ticks are a working checklist — local, not persisted.
  const [checks, setChecks] = useState<boolean[]>([]);
  useEffect(() => {
    setChecks(plan.entry_criteria.map((c) => c.checked));
  }, [plan]);

  const hasRisk =
    plan.max_trades_per_day !== null ||
    plan.max_daily_loss !== null ||
    plan.max_daily_profit !== null ||
    plan.risk_per_trade !== null;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass[plan.dot_color]}`} />
          <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
        </div>
        {plan.is_preset && (
          <button className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105">
            Use this Preset
          </button>
        )}
      </div>

      {/* Plan Type + Risk Controls */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-medium text-gray-500">Plan Type</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {plan.plan_type || "—"}
          </div>
        </div>

        {hasRisk && (
          <div className="w-full rounded-xl border border-rose-100 bg-rose-50/60 p-5 lg:w-80">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Risk Controls
                <Info size={13} className="text-gray-400" />
              </div>
              <Pencil size={14} className="cursor-pointer text-gray-400 hover:text-gray-600" />
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <Metric value={fmt(plan.max_trades_per_day)} label="Max trades per day" />
              <Metric
                value={fmt(plan.max_daily_loss, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                label="Max daily loss"
              />
              <Metric
                value={fmt(plan.max_daily_profit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                label="Max daily profit"
              />
              <Metric
                value={
                  plan.risk_per_trade === null
                    ? "—"
                    : `${plan.risk_per_trade.toFixed(2)}%`
                }
                label="Risk per trade"
              />
            </div>
          </div>
        )}
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

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
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
