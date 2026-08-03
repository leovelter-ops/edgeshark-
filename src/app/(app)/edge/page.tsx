"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronsLeft,
  ListTodo,
  FilePlus2,
  MoreVertical,
  CheckCircle2,
  Copy,
  Trash2,
  X,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Plan, PlanDraft, planToDraft, emptyDraft } from "@/lib/types";
import { SAMPLE_PRESETS } from "@/lib/samplePlans";
import { getActivePlanId, setActivePlan } from "@/lib/activePlan";
import PlanDetail from "@/components/edge/PlanDetail";
import PlanEditor from "@/components/edge/PlanEditor";

// "Active" is tracked client-side (localStorage), not in the DB — so it works
// with or without Supabase and never depends on an `is_active` column existing.
function withActive(plan: Plan, activeId: string | null): Plan {
  return { ...plan, is_active: plan.id === activeId };
}

// Fields sent to Supabase. `is_active` is intentionally omitted (client-only).
function dbPayload(d: PlanDraft) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { is_active, ...rest } = d;
  return rest;
}

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
  const [newPlanMenu, setNewPlanMenu] = useState<null | "header" | "list">(null);
  const [selectPresetOpen, setSelectPresetOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    (async () => {
      const activeId = getActivePlanId();
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        setPlans(SAMPLE_PRESETS.map((p) => withActive(p, activeId)));
        setDbConnected(false);
      } else {
        setDbConnected(true);
        const rows = (data as Plan[]) ?? [];
        const hasPresets = rows.some((p) => p.is_preset);
        const all = hasPresets ? rows : [...rows, ...SAMPLE_PRESETS];
        setPlans(all.map((p) => withActive(p, activeId)));
      }
      setLoading(false);
    })();
  }, [supabase]);

  // Active plan pinned to the top (sort is stable, so others keep insert order).
  const myPlans = plans
    .filter((p) => !p.is_preset)
    .sort((a, b) => Number(b.is_active) - Number(a.is_active));
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
  function viewPlan(plan: Plan) {
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

    const activeId = getActivePlanId();

    if (dbConnected) {
      const q = isExisting
        ? supabase.from("plans").update(dbPayload(payload)).eq("id", editing.id!).select().single()
        : supabase.from("plans").insert(dbPayload(payload)).select().single();
      const { data, error } = await q;
      if (error || !data) {
        alert(`Could not save plan: ${error?.message ?? "unknown error"}`);
        setSaving(false);
        return;
      }
      const row = withActive(data as Plan, activeId);
      setPlans((prev) =>
        isExisting ? prev.map((p) => (p.id === row.id ? row : p)) : [...prev, row],
      );
      if (row.is_active) setActivePlan(row); // keep the active snapshot fresh
      setSelectedId(row.id);
      setEditing(close ? null : { id: row.id, draft: planToDraft(row) });
    } else {
      const id = editing.id ?? `local-${Date.now()}`;
      const row = withActive({ ...payload, id }, activeId);
      setPlans((prev) =>
        editing.id ? prev.map((p) => (p.id === id ? row : p)) : [...prev, row],
      );
      if (row.is_active) setActivePlan(row);
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

  async function handleDelete(plan: Plan) {
    if (!confirm(`Delete "${plan.name}"? This can't be undone.`)) return;
    if (dbConnected && !plan.id.startsWith("local-")) {
      const { error } = await supabase.from("plans").delete().eq("id", plan.id);
      if (error) {
        alert(`Could not delete: ${error.message}`);
        return;
      }
    }
    if (plan.is_active) setActivePlan(null); // deleting the active plan clears it
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    if (selectedId === plan.id) setSelectedId(null);
    if (editing?.id === plan.id) setEditing(null);
  }

  async function handleDuplicate(plan: Plan, keepName = false) {
    const draft = {
      ...planToDraft(plan),
      name: keepName ? plan.name : `${plan.name} (copy)`,
      is_preset: false,
      is_active: false,
    };
    const payload = toPayload(draft);
    if (dbConnected) {
      const { data, error } = await supabase.from("plans").insert(dbPayload(payload)).select().single();
      if (error || !data) {
        alert(`Could not duplicate: ${error?.message ?? "unknown error"}`);
        return;
      }
      const row = withActive(data as Plan, getActivePlanId());
      setPlans((prev) => [...prev, row]);
      setSelectedId(row.id);
    } else {
      const row: Plan = { ...payload, id: `local-${Date.now()}`, is_active: false };
      setPlans((prev) => [...prev, row]);
      setSelectedId(row.id);
    }
    setEditing(null);
  }

  function handleSetActive(plan: Plan, active: boolean) {
    // Active state lives in localStorage (only one plan active at a time), so
    // the Trading page can read it and there's no dependency on a DB column.
    const nextPlan = active ? { ...plan, is_active: true } : null;
    setActivePlan(nextPlan);
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === plan.id) return { ...p, is_active: active };
        if (active && p.is_active) return { ...p, is_active: false };
        return p;
      }),
    );
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
        <div className="relative">
          <button
            onClick={() => setNewPlanMenu((m) => (m === "header" ? null : "header"))}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <Plus size={16} /> New Plan <ChevronDown size={15} className="opacity-80" />
          </button>
          {newPlanMenu === "header" && (
            <NewPlanMenu
              align="right"
              onBlank={() => {
                startNew();
                setNewPlanMenu(null);
              }}
              onPreset={() => {
                setSelectPresetOpen(true);
                setNewPlanMenu(null);
              }}
              onClose={() => setNewPlanMenu(null)}
            />
          )}
        </div>
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
              <div className="relative">
                <button
                  onClick={() => setNewPlanMenu((m) => (m === "list" ? null : "list"))}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus size={15} className="text-brand" /> New Plan
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
                {newPlanMenu === "list" && (
                  <NewPlanMenu
                    align="left"
                    onBlank={() => {
                      startNew();
                      setNewPlanMenu(null);
                    }}
                    onPreset={() => {
                      setSelectPresetOpen(true);
                      setNewPlanMenu(null);
                    }}
                    onClose={() => setNewPlanMenu(null)}
                  />
                )}
              </div>
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
                  onClick={() => viewPlan(p)}
                  menu={{
                    isActive: p.is_active,
                    onSetActive: () => handleSetActive(p, !p.is_active),
                    onDuplicate: () => handleDuplicate(p),
                    onDelete: () => handleDelete(p),
                  }}
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
                    onClick={() => viewPlan(p)}
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
            <PlanDetail
              plan={selected}
              onEdit={() => openEdit(selected)}
              onDelete={() => handleDelete(selected)}
              onDuplicate={() => handleDuplicate(selected)}
              onToggleActive={(active) => handleSetActive(selected, active)}
              onUsePreset={() => handleDuplicate(selected, true)}
            />
          ) : (
            <MyPlansEmpty loading={loading} onCreate={startNew} />
          )}
        </div>
      </div>

      {selectPresetOpen && (
        <SelectPresetModal
          presets={presets}
          onPick={(p) => {
            viewPlan(p);
            setSelectPresetOpen(false);
          }}
          onClose={() => setSelectPresetOpen(false)}
        />
      )}
    </div>
  );
}

function NewPlanMenu({
  align,
  onBlank,
  onPreset,
  onClose,
}: {
  align: "left" | "right";
  onBlank: () => void;
  onPreset: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className={`absolute top-full z-20 mt-1 w-52 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg ${
          align === "right" ? "right-0" : "left-0"
        }`}
      >
        <button
          onClick={onBlank}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <Plus size={15} /> Create Blank Plan
        </button>
        <button
          onClick={onPreset}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <Copy size={15} /> Create From Preset
        </button>
      </div>
    </>
  );
}

function SelectPresetModal({
  presets,
  onPick,
  onClose,
}: {
  presets: Plan[];
  onPick: (p: Plan) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Select Preset</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="flex h-72 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand/40 hover:shadow-md"
            >
              <div className="mb-3 flex items-center gap-2 font-semibold text-gray-800">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass[p.dot_color]}`} />
                <span className="truncate">{p.name}</span>
              </div>
              <div className="text-xs text-gray-400">Plan Type</div>
              <div className="mb-4 truncate text-sm text-gray-700">{p.plan_type || "—"}</div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <BarChart3 size={13} /> Charting Process
              </div>
              <div className="space-y-2 overflow-hidden">
                {p.charting_process.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex gap-2 text-sm text-gray-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                      {i + 1}
                    </span>
                    <span className="line-clamp-2">{s}</span>
                  </div>
                ))}
              </div>
            </button>
          ))}
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

type RowMenu = {
  isActive: boolean;
  onSetActive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function PlanRow({
  plan,
  active,
  onClick,
  menu,
}: {
  plan: { id: string; name: string; plan_type: string | null; dot_color: string };
  active: boolean;
  onClick: () => void;
  menu?: RowMenu;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`group relative rounded-xl transition ${
        active ? "bg-brand-soft" : "hover:bg-gray-50"
      }`}
    >
      <button onClick={onClick} className="w-full px-3 py-2.5 pr-9 text-left">
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

      {menu && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="absolute right-1.5 top-2 rounded-md p-1 text-gray-400 opacity-0 transition hover:bg-black/5 hover:text-gray-700 group-hover:opacity-100 aria-expanded:opacity-100"
            aria-expanded={open}
          >
            <MoreVertical size={16} />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-1.5 top-9 z-20 w-44 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                <MenuItem
                  icon={CheckCircle2}
                  onClick={() => {
                    menu.onSetActive();
                    setOpen(false);
                  }}
                >
                  {menu.isActive ? "Set as Inactive" : "Set as Active"}
                </MenuItem>
                <MenuItem
                  icon={Copy}
                  onClick={() => {
                    menu.onDuplicate();
                    setOpen(false);
                  }}
                >
                  Duplicate
                </MenuItem>
                <MenuItem
                  icon={Trash2}
                  danger
                  onClick={() => {
                    menu.onDelete();
                    setOpen(false);
                  }}
                >
                  Delete
                </MenuItem>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${
        danger ? "text-red-500" : "text-gray-700"
      }`}
    >
      <Icon size={15} /> {children}
    </button>
  );
}
