"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ChevronsLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  ListTodo,
  Folder,
  Pin,
  FileText,
  Copy,
  ArrowLeft,
  MoreVertical,
  Trash2,
  Pencil,
  Eye,
  X,
  FilePlus2,
} from "lucide-react";
import { TEMPLATES, CATEGORY_META, TemplateDef } from "@/lib/notebookTemplates";
import NoteBody from "@/components/notebook/NoteBody";
import { createClient } from "@/lib/supabase/client";

interface Note {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

const NOTES_KEY = "edgeflo_notes";
const FOLDERS_KEY = "edgeflo_folders";
const BLANK_BODY = "Let's get started!";

type View = { kind: "browse" } | { kind: "template"; id: string } | { kind: "note"; id: string };

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "just now";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 45) return "a few seconds ago";
  if (s < 90) return "a minute ago";
  const m = Math.floor(s / 60);
  if (m < 45) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "an hour ago" : `${h} hours ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? "a day ago" : `${d} days ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return mo === 1 ? "a month ago" : `${mo} months ago`;
  const y = Math.floor(d / 365);
  return y === 1 ? "a year ago" : `${y} years ago`;
}

export default function NotebookPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [view, setView] = useState<View>({ kind: "browse" });
  const [search, setSearch] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newNoteMenu, setNewNoteMenu] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(true);
  const [dbReady, setDbReady] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const supabase = useMemo(() => createClient(), []);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load notes: Supabase if available, otherwise localStorage.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) {
        try {
          setNotes(JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]"));
        } catch {
          /* ignore */
        }
        setDbReady(false);
      } else {
        setNotes((data as Note[]) ?? []);
        setDbReady(true);
      }
      try {
        setFolders(JSON.parse(localStorage.getItem(FOLDERS_KEY) ?? "[]"));
      } catch {
        /* ignore */
      }
      setLoaded(true);
    })();
  }, [supabase]);

  // Mirror to localStorage when running without a DB.
  useEffect(() => {
    if (loaded && !dbReady) localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes, dbReady, loaded]);

  function persistFolders(next: string[]) {
    setFolders(next);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
  }

  async function createNote(title: string, content: string) {
    if (dbReady) {
      const { data, error } = await supabase
        .from("notes")
        .insert({ title, content })
        .select()
        .single();
      if (!error && data) {
        const row = data as Note;
        setNotes((prev) => [row, ...prev]);
        setView({ kind: "note", id: row.id });
        setNewNoteMenu(false);
        return;
      }
    }
    const now = new Date().toISOString();
    const row: Note = {
      id: `n-${Date.now()}`,
      title,
      content,
      is_pinned: false,
      created_at: now,
      updated_at: now,
    };
    setNotes((prev) => [row, ...prev]);
    setView({ kind: "note", id: row.id });
    setNewNoteMenu(false);
  }

  function saveNote(id: string, patch: Partial<Pick<Note, "title" | "content" | "is_pinned">>) {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updated_at: new Date().toISOString() } : n)),
    );
    if (dbReady && !id.startsWith("n-")) {
      clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(() => {
        supabase.from("notes").update(patch).eq("id", id);
      }, 500);
    }
  }

  async function deleteNote(id: string) {
    if (dbReady && !id.startsWith("n-")) await supabase.from("notes").delete().eq("id", id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setView({ kind: "browse" });
  }

  const q = search.trim().toLowerCase();
  const match = (n: Note) =>
    !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);

  const sorted = [...notes]
    .filter(match)
    .sort(
      (a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) ||
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  const recent = [...notes]
    .filter(match)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const activeTemplate =
    view.kind === "template" ? TEMPLATES.find((t) => t.id === view.id) ?? null : null;
  const activeNote = view.kind === "note" ? notes.find((n) => n.id === view.id) ?? null : null;

  return (
    <div className="min-h-screen px-8 py-7">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Notebook</h1>
          <p className="text-sm text-gray-500">Think before you trade. Review before you repeat.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setNewNoteMenu((o) => !o)}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            <Plus size={16} /> New Note <ChevronDown size={15} className="opacity-80" />
          </button>
          {newNoteMenu && (
            <NewNoteMenu
              onBlank={() => createNote("Untitled", BLANK_BODY)}
              onFromTemplate={() => {
                setView({ kind: "browse" });
                setNewNoteMenu(false);
              }}
              onClose={() => setNewNoteMenu(false)}
            />
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left column */}
        <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search in notes"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <button className="rounded-lg border border-gray-200 p-2 text-gray-300 hover:text-gray-500">
              <ChevronsLeft size={16} />
            </button>
          </div>

          {/* Recent notes */}
          <SectionHeader
            label="RECENT NOTES"
            open={recentOpen}
            onToggle={() => setRecentOpen((o) => !o)}
          />
          {recentOpen && (
            <div className="mb-2 space-y-1">
              {recent.length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">Nothing recent</p>
              ) : (
                recent.map((n) => (
                  <NoteRow
                    key={n.id}
                    note={n}
                    active={view.kind === "note" && view.id === n.id}
                    onClick={() => setView({ kind: "note", id: n.id })}
                  />
                ))
              )}
            </div>
          )}

          {/* All notes */}
          <div className="mt-4">
            <SectionHeader
              label="ALL NOTES"
              count={notes.length}
              open={allOpen}
              onToggle={() => setAllOpen((o) => !o)}
            />
          </div>
          {allOpen &&
            (sorted.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ListTodo size={40} className="text-gray-200" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">
                  {search ? "No matching notes" : "No notes yet"}
                </p>
                <button
                  onClick={() => createNote("Untitled", BLANK_BODY)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus size={15} className="text-brand" /> New Note
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {sorted.map((n) => (
                  <NoteRow
                    key={n.id}
                    note={n}
                    active={view.kind === "note" && view.id === n.id}
                    onClick={() => setView({ kind: "note", id: n.id })}
                  />
                ))}
              </div>
            ))}

          {/* Folders */}
          <div className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold text-gray-500">
            FOLDERS <span className="text-gray-400">{folders.length}</span>
            <button
              onClick={() => setNewFolderOpen(true)}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-brand"
            >
              <Plus size={15} />
            </button>
          </div>
          <div className="space-y-1">
            {folders.map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700">
                <Folder size={15} className="text-gray-400" />
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="min-w-0 flex-1">
          {activeTemplate ? (
            <TemplateView
              template={activeTemplate}
              onBack={() => setView({ kind: "browse" })}
              onUse={() => createNote(activeTemplate.name, activeTemplate.body)}
            />
          ) : activeNote ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              onChange={(patch) => saveNote(activeNote.id, patch)}
              onDelete={() => deleteNote(activeNote.id)}
              onBack={() => setView({ kind: "browse" })}
            />
          ) : (
            <TemplateBrowser onOpen={(id) => setView({ kind: "template", id })} />
          )}
        </div>
      </div>

      {newFolderOpen && (
        <NewFolderModal
          onClose={() => setNewFolderOpen(false)}
          onSave={(name) => {
            if (name.trim()) persistFolders([...folders, name.trim()]);
            setNewFolderOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SectionHeader({
  label,
  count,
  open,
  onToggle,
}: {
  label: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
        {label}
        {count !== undefined && <span className="text-gray-400">{count}</span>}
      </div>
      <button onClick={onToggle} className="text-gray-400 hover:text-gray-600">
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </div>
  );
}

function NoteRow({
  note,
  active,
  onClick,
}: {
  note: Note;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left transition ${
        active ? "bg-brand-soft" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center gap-2">
        {note.is_pinned && <Pin size={12} className="shrink-0 text-brand" />}
        <FileText size={15} className="shrink-0 text-gray-400" />
        <span className={`truncate text-sm font-medium ${active ? "text-brand" : "text-gray-800"}`}>
          {note.title || "Untitled"}
        </span>
      </div>
      <div className="pl-6 text-xs text-gray-400">{relativeTime(note.updated_at)}</div>
    </button>
  );
}

// ------------------------------------------------------------------ Templates

function TemplateBrowser({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-2xl font-bold text-gray-900">Templates</h2>

      <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
        <Pin size={15} /> Pinned Templates <span className="text-sm font-normal text-gray-400">0</span>
      </div>
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
        My Templates <span className="text-sm font-normal text-gray-400">0</span>
        <button className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-brand">
          <Plus size={16} />
        </button>
      </div>

      {CATEGORY_META.map(({ name, emoji }) => {
        const items = TEMPLATES.filter((t) => t.category === name);
        return (
          <div key={name} className="mb-8">
            <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
              <span>{emoji}</span> {name}{" "}
              <span className="text-sm font-normal text-gray-400">{items.length}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {items.map((t) => (
                <TemplateCard key={t.id} template={t} onOpen={() => onOpen(t.id)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplateCard({ template, onOpen }: { template: TemplateDef; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="group relative flex h-64 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand/40 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-gray-800">
          <span>{template.emoji}</span>
          <span className="truncate">{template.name}</span>
        </div>
        <MoreVertical size={16} className="shrink-0 text-gray-300" />
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="scale-[0.82] origin-top-left [width:122%]">
          <NoteBody src={template.body} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>
    </button>
  );
}

function TemplateView({
  template,
  onBack,
  onUse,
}: {
  template: TemplateDef;
  onBack: () => void;
  onUse: () => void;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Templates
      </button>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{template.emoji}</span>
          <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">Template</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Read-only</span>
          <button
            onClick={onUse}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            Use Template
          </button>
          <button className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-50">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
      <NoteBody src={template.body} />
    </div>
  );
}

// --------------------------------------------------------------------- Notes

function NoteEditor({
  note,
  onChange,
  onDelete,
  onBack,
}: {
  note: Note;
  onChange: (patch: Partial<Pick<Note, "title" | "content" | "is_pinned">>) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  // New/blank notes open ready to type; template notes open in the rendered view.
  const [editing, setEditing] = useState(note.content.trim() === BLANK_BODY || note.content.trim() === "");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Templates
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText size={22} className="shrink-0 text-gray-400" />
          <input
            value={note.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Untitled"
            className="w-full border-none bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-sm text-gray-400">Auto-Saved</span>
          <button
            onClick={() => setEditing((v) => !v)}
            title={editing ? "Preview" : "Edit"}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          >
            {editing ? <Eye size={16} /> : <Pencil size={16} />}
          </button>
          <button
            onClick={() => onChange({ is_pinned: !note.is_pinned })}
            title={note.is_pinned ? "Unpin" : "Pin"}
            className={`rounded-lg border border-gray-200 p-2 hover:bg-gray-50 ${
              note.is_pinned ? "text-brand" : "text-gray-500"
            }`}
          >
            <Pin size={16} />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-20 w-40 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                  <button
                    onClick={() => {
                      setEditing((v) => !v);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {editing ? <Eye size={15} /> : <Pencil size={15} />}
                    {editing ? "Preview" : "Edit"}
                  </button>
                  <button
                    onClick={() => {
                      onDelete();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-50"
                  >
                    <Trash2 size={15} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {editing ? (
        <textarea
          value={note.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Start writing…"
          className="flex-1 resize-none border-none bg-transparent font-mono text-[13px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
        />
      ) : (
        <NoteBody src={note.content} />
      )}
    </div>
  );
}

// ------------------------------------------------------------------- Overlays

function NewNoteMenu({
  onBlank,
  onFromTemplate,
  onClose,
}: {
  onBlank: () => void;
  onFromTemplate: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
        <button
          onClick={onBlank}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <FilePlus2 size={15} /> Create Blank Note
        </button>
        <button
          onClick={onFromTemplate}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <Copy size={15} /> Create From Template
        </button>
      </div>
    </>
  );
}

function NewFolderModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">New Folder</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="mb-5 flex items-center gap-3">
          <Folder size={22} className="shrink-0 text-brand" />
          <input
            ref={ref}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSave(name)}
            placeholder="Folder name"
            className="w-full border-b border-gray-200 bg-transparent py-2 text-sm outline-none placeholder:text-gray-400 focus:border-brand"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name)}
            className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:brightness-105"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
