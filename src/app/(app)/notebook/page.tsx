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
  FilePlus2,
  FileText,
  Copy,
  ArrowLeft,
  MoreVertical,
  X,
} from "lucide-react";
import { TEMPLATES, CATEGORY_META, TemplateDef } from "@/lib/notebookTemplates";
import NoteBody, { toPlainText } from "@/components/notebook/NoteBody";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

const NOTES_KEY = "edgeflo_notes";
const FOLDERS_KEY = "edgeflo_folders";

type View = { kind: "browse" } | { kind: "template"; id: string } | { kind: "note"; id: string };

export default function NotebookPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [view, setView] = useState<View>({ kind: "browse" });
  const [search, setSearch] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newNoteMenu, setNewNoteMenu] = useState(false);
  const [allNotesOpen, setAllNotesOpen] = useState(true);

  // Load persisted notes/folders.
  useEffect(() => {
    try {
      setNotes(JSON.parse(localStorage.getItem(NOTES_KEY) ?? "[]"));
      setFolders(JSON.parse(localStorage.getItem(FOLDERS_KEY) ?? "[]"));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  function persistNotes(next: Note[]) {
    setNotes(next);
    localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  }
  function persistFolders(next: string[]) {
    setFolders(next);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
  }

  function createNote(title: string, content: string) {
    const note: Note = { id: `n-${Date.now()}`, title, content, createdAt: Date.now() };
    persistNotes([note, ...notes]);
    setView({ kind: "note", id: note.id });
    setNewNoteMenu(false);
  }
  function updateNote(id: string, patch: Partial<Note>) {
    persistNotes(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }
  function deleteNote(id: string) {
    persistNotes(notes.filter((n) => n.id !== id));
    setView({ kind: "browse" });
  }

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }, [notes, search]);

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
              onBlank={() => createNote("Untitled Note", "")}
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
          {/* Search */}
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

          {/* All notes */}
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              ALL NOTES <span className="text-gray-400">{notes.length}</span>
            </div>
            <button onClick={() => setAllNotesOpen((o) => !o)} className="text-gray-400 hover:text-gray-600">
              {allNotesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {allNotesOpen &&
            (filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <ListTodo size={40} className="text-gray-200" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">
                  {search ? "No matching notes" : "No notes yet"}
                </p>
                <button
                  onClick={() => createNote("Untitled Note", "")}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus size={15} className="text-brand" /> New Note
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setView({ kind: "note", id: n.id })}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                      view.kind === "note" && view.id === n.id
                        ? "bg-brand-soft text-brand"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <FileText size={15} className="shrink-0 text-gray-400" />
                    <span className="truncate">{n.title || "Untitled Note"}</span>
                  </button>
                ))}
              </div>
            ))}

          {/* Folders */}
          <div className="mb-2 mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              FOLDERS <span className="text-gray-400">{folders.length}</span>
              <button
                onClick={() => setNewFolderOpen(true)}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-brand"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {folders.map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700"
              >
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
              onUse={() => createNote(activeTemplate.name, toPlainText(activeTemplate.body))}
            />
          ) : activeNote ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              onChange={(patch) => updateNote(activeNote.id, patch)}
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

// ------------------------------------------------------------------ Templates

function TemplateBrowser({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-2xl font-bold text-gray-900">Templates</h2>

      <Section title="Pinned Templates" count={0} icon={<Pin size={15} />} />
      <Section title="My Templates" count={0} adder />

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

function Section({
  title,
  count,
  icon,
  adder,
}: {
  title: string;
  count: number;
  icon?: React.ReactNode;
  adder?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
      {icon}
      {title} <span className="text-sm font-normal text-gray-400">{count}</span>
      {adder && (
        <button className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-brand">
          <Plus size={16} />
        </button>
      )}
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
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} /> Templates
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{template.emoji}</span>
          <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
            Template
          </span>
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
  onChange: (patch: Partial<Note>) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> Templates
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
      <input
        value={note.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Untitled Note"
        className="mb-4 w-full border-none bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
      />
      <textarea
        value={note.content}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder="Start writing…"
        className="flex-1 resize-none border-none bg-transparent text-[15px] leading-relaxed text-gray-800 outline-none placeholder:text-gray-300"
      />
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
