"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronDown, ChevronsLeft, ListTodo, FilePlus2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Plan, PlanDraft, planToDraft, emptyDraft } from "@/lib/types";
import { SAMPLE_PRESETS } from "@/lib/samplePlans";
import PlanDetail from "@/components/edge/PlanDetail";
import PlanEditor from "@/components/edge/PlanEditor";

const dotClass: Record<string, string> = {
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  green: "bg-green-500",
};

type Editing = { id?: string; draft: PlanDraft };

export default function EdgePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [dirty, setDirty] = useState(false);
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

  // When not editing, land on a user plan if one exists (never a preset).
  useEffect(() => {
    if (!editing && !selectedId && myPlans.length) {
      setSelectedId(myPlans[0].id);
    }
  }, [editing, myPlans, selectedId]);

  const selected = !editing ? plans.find((p) => p.id === selectedId) ?? null : null;

  // ---- create / edit flow -------------------------------------------------
  function startNew() {
    setEditing({ draft: emptyDraft() });
    setDirty(false);
    setSelectedId(null);
  }
  function openEdit(plan: Plan) {
    setEditing({ id: plan.id, draft: planToDraft(plan) });
    setDirty(false);
  }
  function viewPreset(plan: Plan) {
    setEditing(null);
    setSelectedId(plan.id);
  }
  function handleChange(d: PlanDraft) {
    setEditing((e) => (e ? { ...e, draft: d } : e));
    setDirty(true);
  }
  function cancel() {
    setEditing(null);
    setDirty(false);
  }

  function toPayload(d: PlanDraft): PlanDraft {
    return {
      ...d,
      name: d.name.trim() || "Untitled Plan",
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
      trading_window_start: (d.trading_window_start ?? "").trim() || null,
      trading_window_end: (d.trading_window_end ?? "").trim() || null,
      block_news_note: (d.block_news_note ?? "").trim() || null,
    };
  }

  async function persist(close: boolean) {
    if (!editing) return;
    setSaving(true);
    const payload = toPayload(editing.draft);
    const isExisting = !!editing.id && !editing.id.startsWith("local-");

    if (dbConnected) {
      const q = isExisting
        ? supabase.from("plans").update(payload).eq("id", editing.id!).select().single()
        : supabase.from("plans").insert(payload).select().single();
      const { data, error } = await q;
      if (error || !data) {
        alert(`Could not save plan: ${error?.message ?? "unknown error"}`);
        setSaving(false);
        return;
      }
      const row = data as Plan;
      setPlans((prev) =>
        isExisting ? prev.map((p) => (p.id === row.id ? row : p)) : [...prev, row],
      );
      setSelectedId(row.id);
      setEditing(close ? null : { id: row.id, draft: planToDraft(row) });
    } else {
      const id = editing.id ?? `local-${Date.now()}`;
      const row: Plan = { ...payload, id };
      setPlans((prev) =>
        editing.id ? prev.map((p) => (p.id === id ? row : p)) : [...prev, row],
      );
      setSelectedId(id);
      setEditing(close ? null : { id, draft: planToDraft(row) });
    }
    setDirty(false);
    setSaving(false);
  }

  async function uploadImage(file: File): Promise<string | null> {
    if (!dbConnected) return URL.createObjectURL(file); // local preview
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const { error } = await supabase.storage.from("plan-images").upload(path, file);
    if (error) {
      alert(`Image upload failed: ${error.message}. (Did you run migration 0002?)`);
      return null;
    }
    return supabase.storage.from("plan-images").getPublicUrl(path).data.publicUrl;
  }

  // Highlighted row key
  const currentKey = editing ? editing.id ?? "__draft__" : selectedId;
  const showDraftRow = !!editing && !editing.id;

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
          onClick={startNew}
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
                onClick={startNew}
                className="rounded p-0.5 text-brand hover:bg-brand-soft"
              >
                <Plus size={16} />
              </button>
            </div>
            <button className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-500">
              <ChevronsLeft size={16} />
            </button>
          </div>

          {myPlans.length === 0 && !showDraftRow ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <ListTodo size={40} className="text-gray-200" strokeWidth={1.5} />
              <p className="text-sm text-gray-400">No Edge Plans yet</p>
              <button
                onClick={startNew}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus size={15} className="text-brand" /> New Plan
                <ChevronDown size={14} className="text-gray-400" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {showDraftRow && (
                <PlanRow
                  plan={{
                    ...editing!.draft,
                    id: "__draft__",
                    name: editing!.draft.name || "Untitled Plan",
                    plan_type: null,
                  }}
                  active
                  onClick={() => {}}
                />
              )}
              {myPlans.map((p) => (
                <PlanRow
                  key={p.id}
                  plan={p}
                  active={currentKey === p.id}
                  onClick={() => openEdit(p)}
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
                    active={currentKey === p.id}
                    onClick={() => viewPreset(p)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1">
          {editing ? (
            <PlanEditor
              value={editing.draft}
              onChange={handleChange}
              dirty={dirty}
              saving={saving}
              onSaveNow={() => persist(false)}
              onSaveClose={() => persist(true)}
              onCancel={cancel}
              uploadImage={uploadImage}
            />
          ) : selected ? (
            <PlanDetail plan={selected} />
          ) : (
            <MyPlansEmpty loading={loading} onCreate={startNew} />
          )}
        </div>
      </div>
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
  plan: { id: string; name: string; plan_type: string | null; dot_color: string };
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
