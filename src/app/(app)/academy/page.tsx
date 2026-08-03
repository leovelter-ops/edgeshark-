"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Users,
  GraduationCap,
  Clock,
  Plus,
  Play,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  ChevronLeft,
  ImagePlus,
  FolderOpen,
} from "lucide-react";
import {
  AcademyFolder,
  AcademyLesson,
  FOLDERS_KEY,
  LESSONS_KEY,
  FOLDER_PLACEHOLDER,
  fileToScaledDataUrl,
} from "@/lib/academy";
import { youTubeId, coverImage, isDirectVideo } from "@/lib/sanctuary";

const NEW_CATEGORY = "__new__";

// ===========================================================================
// Page
// ===========================================================================

export default function AcademyPage() {
  const [folders, setFolders] = useState<AcademyFolder[]>([]);
  const [lessons, setLessons] = useState<AcademyLesson[]>([]);
  const coursesRef = useRef<HTMLDivElement>(null);

  // Load once on mount — localStorage is client-only.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFolders(readList<AcademyFolder>(FOLDERS_KEY));
    setLessons(readList<AcademyLesson>(LESSONS_KEY));
  }, []);

  const saveFolders = (next: AcademyFolder[]) => {
    setFolders(next);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(next));
  };
  const saveLessons = (next: AcademyLesson[]) => {
    setLessons(next);
    localStorage.setItem(LESSONS_KEY, JSON.stringify(next));
  };

  return (
    <div className="min-h-screen">
      <Hero onStart={() => coursesRef.current?.scrollIntoView({ behavior: "smooth" })} />
      <div ref={coursesRef}>
        <Courses
          folders={folders}
          lessons={lessons}
          saveFolders={saveFolders}
          saveLessons={saveLessons}
        />
      </div>
    </div>
  );
}

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

// ===========================================================================
// Hero (static — mirrors the reference)
// ===========================================================================

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#f3f0ff] via-[#faf9ff] to-[#efeaff] px-8 py-14">
      {/* soft decorative glow */}
      <div className="pointer-events-none absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative grid items-center gap-10 lg:grid-cols-2">
        <div className="max-w-xl">
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-brand">
            EdgeFlo Academy
          </div>
          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight text-gray-900">
            Learn how to trade like a 7-figure day trader
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-500">
            Build your foundation with Brad Goh&apos;s free Market Mechanics Mentorship
            series, then learn how to apply the same process inside EdgeFlo with
            step-by-step tutorials on risk, execution, journaling, and performance
            review.
          </p>
          <button
            onClick={onStart}
            className="mt-8 inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#5b8bff] px-8 py-4 text-base font-bold text-white shadow-lg shadow-brand/30 transition hover:brightness-105"
          >
            Start Learning <ArrowRight size={20} />
          </button>
        </div>

        {/* Decorative faded lesson collage */}
        <div className="relative hidden h-80 lg:block">
          <CollageCard
            className="left-2 top-0 rotate-[-6deg]"
            label="Market Mechanics"
            title="How Price Really Moves"
          />
          <CollageCard
            className="left-40 top-16 rotate-[3deg]"
            label="Edgeflo Tutorial"
            title="Setting Up Your Guardrails"
            featured
          />
          <CollageCard
            className="left-24 top-52 rotate-[-2deg]"
            label="Market Mechanics"
            title="Killzones & Timing"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="relative mt-12 grid gap-4 sm:grid-cols-3">
        <StatCard icon={Users} value="10K+" label="Students trained worldwide" />
        <StatCard icon={GraduationCap} value="60+" label="Lessons included" />
        <StatCard icon={Clock} value="10 min" label="Average lesson length" />
      </div>
    </div>
  );
}

function CollageCard({
  className,
  label,
  title,
  featured,
}: {
  className: string;
  label: string;
  title: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`absolute w-64 overflow-hidden rounded-2xl shadow-xl ${
        featured ? "opacity-100" : "opacity-60"
      } ${className}`}
    >
      <div className="flex h-36 items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-brand">
          <Play size={22} className="ml-0.5 fill-brand" />
        </span>
      </div>
      <div className="bg-white p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-brand">
          {label}
        </div>
        <div className="mt-0.5 text-sm font-bold text-gray-900">{title}</div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <Icon size={22} />
      </span>
      <div>
        <div className="text-2xl font-black text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// ===========================================================================
// Courses & Resources (folders → lessons)
// ===========================================================================

function Courses({
  folders,
  lessons,
  saveFolders,
  saveLessons,
}: {
  folders: AcademyFolder[];
  lessons: AcademyLesson[];
  saveFolders: (f: AcademyFolder[]) => void;
  saveLessons: (l: AcademyLesson[]) => void;
}) {
  const [category, setCategory] = useState("All");
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [folderEditor, setFolderEditor] = useState<null | { folder?: AcademyFolder }>(
    null,
  );

  const categories = useMemo(
    () => Array.from(new Set(folders.map((f) => f.category).filter(Boolean))),
    [folders],
  );

  const openFolder = folders.find((f) => f.id === openFolderId) ?? null;

  // ---- folder CRUD --------------------------------------------------------
  const saveFolder = (draft: {
    id?: string;
    name: string;
    image: string;
    category: string;
  }) => {
    if (draft.id) {
      saveFolders(
        folders.map((f) =>
          f.id === draft.id
            ? { ...f, name: draft.name, image: draft.image, category: draft.category }
            : f,
        ),
      );
    } else {
      saveFolders([
        ...folders,
        {
          id: `f-${Date.now()}`,
          name: draft.name,
          image: draft.image,
          category: draft.category,
          created_at: Date.now(),
        },
      ]);
    }
    setFolderEditor(null);
  };

  const deleteFolder = (id: string) => {
    saveFolders(folders.filter((f) => f.id !== id));
    saveLessons(lessons.filter((l) => l.folderId !== id));
    if (openFolderId === id) setOpenFolderId(null);
  };

  if (openFolder) {
    return (
      <FolderView
        folder={openFolder}
        lessons={lessons.filter((l) => l.folderId === openFolder.id)}
        onBack={() => setOpenFolderId(null)}
        saveLessons={(fn) => saveLessons(fn(lessons))}
      />
    );
  }

  const visible =
    category === "All" ? folders : folders.filter((f) => f.category === category);

  return (
    <div className="px-8 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-brand">
            Courses &amp; Resources
          </div>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-gray-900">
            Your library, organized your way.
          </h2>
        </div>
        <button
          onClick={() => setFolderEditor({})}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          <Plus size={16} /> Add Folder
        </button>
      </div>

      {/* Category tabs */}
      {folders.length > 0 && (
        <div className="mb-7 flex flex-wrap gap-2">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                category === c
                  ? "bg-brand text-white"
                  : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {folders.length === 0 ? (
        <CoursesEmpty onAdd={() => setFolderEditor({})} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((f) => (
            <FolderCard
              key={f.id}
              folder={f}
              count={lessons.filter((l) => l.folderId === f.id).length}
              onOpen={() => setOpenFolderId(f.id)}
              onEdit={() => setFolderEditor({ folder: f })}
              onDelete={() => deleteFolder(f.id)}
            />
          ))}
        </div>
      )}

      {folderEditor && (
        <FolderEditor
          folder={folderEditor.folder}
          categories={categories}
          onSave={saveFolder}
          onClose={() => setFolderEditor(null)}
        />
      )}
    </div>
  );
}

function CoursesEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white/50 py-20 text-center">
      <FolderOpen size={46} className="text-gray-200" strokeWidth={1.5} />
      <h3 className="text-lg font-bold text-gray-700">No folders yet</h3>
      <p className="max-w-sm text-sm text-gray-400">
        Create a folder, give it a cover image and a category, then fill it with
        lessons.
      </p>
      <button
        onClick={onAdd}
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
      >
        <Plus size={15} /> Add your first folder
      </button>
    </div>
  );
}

function FolderCard({
  folder,
  count,
  onOpen,
  onEdit,
  onDelete,
}: {
  folder: AcademyFolder;
  count: number;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const isImg = /^(https?:|data:)/.test(folder.image);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
      <button onClick={onOpen} className="block w-full text-left">
        <div className="relative h-40">
          {isImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={folder.image}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ background: folder.image || FOLDER_PLACEHOLDER }}
            />
          )}
          <span className="absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 text-xs font-semibold text-white backdrop-blur">
            {folder.category}
          </span>
        </div>
        <div className="p-4">
          <div className="truncate font-bold text-gray-900">{folder.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
            <FolderOpen size={13} /> {count} lesson{count === 1 ? "" : "s"}
          </div>
        </div>
      </button>

      {/* 3-dot menu */}
      <div className="absolute right-2 top-2">
        <button
          onClick={() => setMenu((m) => !m)}
          className="rounded-md bg-black/40 p-1.5 text-white/90 opacity-0 backdrop-blur transition hover:bg-black/60 group-hover:opacity-100 aria-expanded:opacity-100"
          aria-expanded={menu}
        >
          <MoreVertical size={16} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              <MenuBtn
                icon={Pencil}
                onClick={() => {
                  onEdit();
                  setMenu(false);
                }}
              >
                Edit
              </MenuBtn>
              <MenuBtn
                icon={Trash2}
                danger
                onClick={() => {
                  if (
                    confirm(`Delete "${folder.name}" and its lessons?`)
                  )
                    onDelete();
                  setMenu(false);
                }}
              >
                Delete
              </MenuBtn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Folder detail — lessons displayed like the reference cards
// ===========================================================================

function FolderView({
  folder,
  lessons,
  onBack,
  saveLessons,
}: {
  folder: AcademyFolder;
  lessons: AcademyLesson[];
  onBack: () => void;
  saveLessons: (updater: (all: AcademyLesson[]) => AcademyLesson[]) => void;
}) {
  const [editor, setEditor] = useState<null | { lesson?: AcademyLesson }>(null);
  const [playing, setPlaying] = useState<AcademyLesson | null>(null);

  const save = (draft: {
    id?: string;
    name: string;
    url: string;
    subtitle: string;
    description: string;
  }) => {
    if (draft.id) {
      saveLessons((all) =>
        all.map((l) => (l.id === draft.id ? { ...l, ...draft, id: draft.id! } : l)),
      );
    } else {
      saveLessons((all) => [
        ...all,
        {
          id: `l-${Date.now()}`,
          folderId: folder.id,
          name: draft.name,
          url: draft.url,
          subtitle: draft.subtitle,
          description: draft.description,
          created_at: Date.now(),
        },
      ]);
    }
    setEditor(null);
  };

  const remove = (id: string) => saveLessons((all) => all.filter((l) => l.id !== id));

  return (
    <div className="px-8 py-10">
      <button
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-gray-800"
      >
        <ChevronLeft size={17} /> All folders
      </button>

      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <div className="text-sm font-bold uppercase tracking-[0.2em] text-brand">
            {folder.category}
          </div>
          <h2 className="mt-2 text-4xl font-black tracking-tight text-gray-900">
            {folder.name}
          </h2>
        </div>
        <button
          onClick={() => setEditor({})}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          <Plus size={16} /> Add Lesson
        </button>
      </div>

      {lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white/50 py-20 text-center">
          <Play size={40} className="text-gray-200" strokeWidth={1.5} />
          <h3 className="text-lg font-bold text-gray-700">No lessons yet</h3>
          <p className="max-w-sm text-sm text-gray-400">
            Add a lesson with a video URL, a subtitle, and a description.
          </p>
          <button
            onClick={() => setEditor({})}
            className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
          >
            <Plus size={15} /> Add your first lesson
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => (
            <LessonCard
              key={l.id}
              lesson={l}
              onPlay={() => setPlaying(l)}
              onEdit={() => setEditor({ lesson: l })}
              onDelete={() => remove(l.id)}
            />
          ))}
        </div>
      )}

      {editor && (
        <LessonEditor
          lesson={editor.lesson}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
      {playing && <VideoModal lesson={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function LessonCard({
  lesson,
  onPlay,
  onEdit,
  onDelete,
}: {
  lesson: AcademyLesson;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const cover = coverImage(lesson.url);

  return (
    <div className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md">
      <button onClick={onPlay} className="relative block h-48 w-full">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-700 to-gray-900" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/25">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-brand opacity-0 shadow-lg transition group-hover:opacity-100">
            <Play size={24} className="ml-0.5 fill-brand" />
          </span>
        </div>
      </button>

      <div className="relative p-4">
        <div className="pr-7 text-lg font-bold text-gray-900">{lesson.name}</div>
        {lesson.subtitle && (
          <div className="mt-0.5 text-sm font-medium text-brand">{lesson.subtitle}</div>
        )}
        {lesson.description && (
          <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
            {lesson.description}
          </p>
        )}

        {/* 3-dot menu */}
        <div className="absolute right-3 top-3">
          <button
            onClick={() => setMenu((m) => !m)}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-expanded={menu}
          >
            <MoreVertical size={16} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-8 z-20 w-36 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                <MenuBtn
                  icon={Pencil}
                  onClick={() => {
                    onEdit();
                    setMenu(false);
                  }}
                >
                  Edit
                </MenuBtn>
                <MenuBtn
                  icon={Trash2}
                  danger
                  onClick={() => {
                    if (confirm(`Delete "${lesson.name}"?`)) onDelete();
                    setMenu(false);
                  }}
                >
                  Delete
                </MenuBtn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Editors
// ===========================================================================

function FolderEditor({
  folder,
  categories,
  onSave,
  onClose,
}: {
  folder?: AcademyFolder;
  categories: string[];
  onSave: (d: { id?: string; name: string; image: string; category: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(folder?.name ?? "");
  const [image, setImage] = useState(folder?.image ?? "");
  // If editing an existing custom category, preselect it; otherwise default to
  // the first existing category or straight to "new".
  const initialInList = folder && categories.includes(folder.category);
  const [catChoice, setCatChoice] = useState<string>(
    folder && initialInList
      ? folder.category
      : categories.length && !folder
        ? categories[0]
        : NEW_CATEGORY,
  );
  const [newCat, setNewCat] = useState(
    folder && !initialInList ? folder.category : "",
  );
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const category = catChoice === NEW_CATEGORY ? newCat.trim() : catChoice;
  const canSave = name.trim() && category;

  async function pickFile(file: File) {
    setBusy(true);
    try {
      setImage(await fileToScaledDataUrl(file));
    } finally {
      setBusy(false);
    }
  }

  const isImg = /^(https?:|data:)/.test(image);

  return (
    <Modal title={folder ? "Edit Folder" : "New Folder"} onClose={onClose}>
      <Field label="Folder name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Market Mechanics Mentorship"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </Field>

      <Field label="Folder image">
        <div className="flex items-center gap-3">
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-gray-200">
            {isImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: FOLDER_PLACEHOLDER }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ImagePlus size={15} /> {busy ? "Processing…" : "Upload image"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
              }}
            />
            <input
              value={isImg && image.startsWith("data:") ? "" : image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="…or paste an image URL"
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
      </Field>

      <Field label="Category">
        <div className="relative">
          <select
            value={catChoice}
            onChange={(e) => setCatChoice(e.target.value)}
            className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ New category…</option>
          </select>
        </div>
        {catChoice === NEW_CATEGORY && (
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category name"
            className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        )}
      </Field>

      <ModalActions
        onClose={onClose}
        canSave={!!canSave}
        saveLabel={folder ? "Save" : "Create"}
        onSave={() =>
          onSave({
            id: folder?.id,
            name: name.trim(),
            image: image.trim(),
            category,
          })
        }
      />
    </Modal>
  );
}

function LessonEditor({
  lesson,
  onSave,
  onClose,
}: {
  lesson?: AcademyLesson;
  onSave: (d: {
    id?: string;
    name: string;
    url: string;
    subtitle: string;
    description: string;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(lesson?.name ?? "");
  const [url, setUrl] = useState(lesson?.url ?? "");
  const [subtitle, setSubtitle] = useState(lesson?.subtitle ?? "");
  const [description, setDescription] = useState(lesson?.description ?? "");

  const trimmedUrl = url.trim();
  const validUrl = /^https?:\/\//i.test(trimmedUrl);
  const canSave = name.trim() && validUrl;
  const preview = coverImage(trimmedUrl);

  return (
    <Modal title={lesson ? "Edit Lesson" : "New Lesson"} onClose={onClose}>
      <Field label="Lesson name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. How Price Really Moves"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </Field>
      <Field label="Video URL">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=…  or  https://…/clip.mp4"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        {trimmedUrl && !validUrl && (
          <p className="mt-1.5 text-xs text-red-500">
            Enter a full URL starting with http:// or https://
          </p>
        )}
      </Field>
      <Field label="Subtitle">
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Short one-liner"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </Field>
      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this lesson covers…"
          className="h-24 w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
      </Field>

      {preview && (
        <div className="mb-1 overflow-hidden rounded-lg border border-gray-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="cover preview" className="h-32 w-full object-cover" />
        </div>
      )}

      <ModalActions
        onClose={onClose}
        canSave={!!canSave}
        saveLabel={lesson ? "Save" : "Add"}
        onSave={() =>
          onSave({
            id: lesson?.id,
            name: name.trim(),
            url: trimmedUrl,
            subtitle: subtitle.trim(),
            description: description.trim(),
          })
        }
      />
    </Modal>
  );
}

function VideoModal({
  lesson,
  onClose,
}: {
  lesson: AcademyLesson;
  onClose: () => void;
}) {
  const ytId = youTubeId(lesson.url);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-white px-4 py-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-gray-900">{lesson.name}</div>
            {lesson.subtitle && (
              <div className="text-xs text-gray-400">{lesson.subtitle}</div>
            )}
          </div>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        <div className="aspect-video w-full bg-black">
          {ytId ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
              title={lesson.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isDirectVideo(lesson.url) ? (
            <video className="h-full w-full" src={lesson.url} controls autoPlay />
          ) : (
            <iframe
              className="h-full w-full"
              src={lesson.url}
              title={lesson.name}
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Shared bits
// ===========================================================================

function MenuBtn({
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

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-16 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-sm font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({
  onClose,
  onSave,
  canSave,
  saveLabel,
}: {
  onClose: () => void;
  onSave: () => void;
  canSave: boolean;
  saveLabel: string;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button
        onClick={onClose}
        className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        disabled={!canSave}
        onClick={onSave}
        className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saveLabel}
      </button>
    </div>
  );
}
