"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronDown, ChevronsLeft, ListTodo, FilePlus2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Plan, PlanDraft } from "@/lib/types";
import { SAMPLE_PRESETS } from "@/lib/samplePlans";
import PlanDetail from "@/components/edge/PlanDetail";
import NewPlanModal from "@/components/edge/NewPlanModal";

const dotClass: Record<string, string> = {
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  green: "bg-green-500",
};

export default function EdgePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        // Table not set up yet — fall back to sample presets so the UI renders.
        setPlans(SAMPLE_PRESETS);
        setDbConnected(false);
      } else {
        setDbConnected(true);
        const rows = (data as Plan[]) ?? [];
        const hasPresets = rows.some((p) => p.is_preset);
        setPlans(hasPresets ? rows : [...rows, ...SAMPLE_PRESETS]);
      }
      setLoading(false);
    })();
  }, [supabase]);

  const myPlans = plans.filter((p) => !p.is_preset);
  const presets = plans.filter((p) => p.is_preset);

  // Land on "My Plans": auto-select a user plan if one exists, but never a
  // preset. When there are no user plans, nothing is selected and the empty
  // state is shown.
  useEffect(() => {
    if (!selectedId && myPlans.length) {
      setSelectedId(myPlans[0].id);
    }
  }, [myPlans, selectedId]);

  const selected = plans.find((p) => p.id === selectedId) ?? null;

  async function handleCreate(draft: PlanDraft) {
    setSaving(true);
    if (dbConnected) {
      const { data, error } = await supabase
        .from("plans")
        .insert({ ...draft })
        .select()
        .single();
      if (!error && data) {
        const row = data as Plan;
        setPlans((prev) => [...prev, row]);
        setSelectedId(row.id);
      } else {
        alert(`Could not save plan: ${error?.message ?? "unknown error"}`);
        setSaving(false);
        return;
      }
    } else {
      const local: Plan = { ...draft, id: `local-${Date.now()}` };
      setPlans((prev) => [...prev, local]);
      setSelectedId(local.id);
    }
    setSaving(false);
    setModalOpen(false);
  }

  return (
    <div className="min-h-screen px-8 py-7">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Edge</h1>
          <p className="max-w-md text-sm text-gray-500">
            Build and refine your trading playbooks — your rules, biases, and edge in one
            place.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          <Plus size={16} /> New Plan <ChevronDown size={15} className="opacity-80" />
        </button>
      </div>

      {!dbConnected && !loading && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
          Showing sample presets — run the setup SQL in your Supabase project to store
          plans. New plans you create now are kept in memory only.
        </div>
      )}

      <div className="flex gap-6">
        {/* MY PLANS / PRESETS column */}
        <div className="w-72 shrink-0 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">MY PLANS</span>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded p-0.5 text-brand hover:bg-brand-soft"
              >
                <Plus size={16} />
              </button>
            </div>
            <button className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500">
              <ChevronsLeft size={16} />
            </button>
          </div>

          {myPlans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ListTodo size={40} className="text-gray-200" strokeWidth={1.5} />
              <p className="text-sm text-gray-400">No Edge Plans yet</p>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus size={15} className="text-brand" /> New Plan
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {myPlans.map((p) => (
                <PlanRow
                  key={p.id}
                  plan={p}
                  active={p.id === selectedId}
                  onClick={() => setSelectedId(p.id)}
                />
              ))}
            </div>
          )}

          {presets.length > 0 && (
            <>
              <div className="mb-2 mt-6 text-sm font-semibold text-gray-700">PRESETS</div>
              <div className="space-y-1.5">
                {presets.map((p) => (
                  <PlanRow
                    key={p.id}
                    plan={p}
                    active={p.id === selectedId}
                    onClick={() => setSelectedId(p.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1">
          {selected ? (
            <PlanDetail plan={selected} />
          ) : (
            <MyPlansEmpty loading={loading} onCreate={() => setModalOpen(true)} />
          )}
        </div>
      </div>

      <NewPlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
        saving={saving}
      />
    </div>
  );
}

function MyPlansEmpty({
  loading,
  onCreate,
}: {
  loading: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="min-h-[calc(100vh-8rem)] rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">My Plans</h2>
      {!loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
          <FilePlus2 size={56} className="text-gray-200" strokeWidth={1.5} />
          <h3 className="text-xl font-bold text-gray-800">No plans yet</h3>
          <p className="max-w-sm text-gray-500">
            Create your first trading plan to define your edge and trading rules.
          </p>
          <button
            onClick={onCreate}
            className="mt-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            Create My First Plan
          </button>
        </div>
      )}
    </div>
  );
}

function PlanRow({
  plan,
  active,
  onClick,
}: {
  plan: Plan;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
        active ? "bg-brand-soft" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass[plan.dot_color]}`} />
        <span
          className={`truncate text-sm font-semibold ${
            active ? "text-brand" : "text-gray-800"
          }`}
        >
          {plan.name}
        </span>
      </div>
      {plan.plan_type && (
        <div className="mt-0.5 truncate pl-4 text-xs text-gray-400">{plan.plan_type}</div>
      )}
    </button>
  );
}
