"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Volume2,
  VolumeX,
  RotateCcw,
  Flower2,
  Calendar,
  Hourglass,
  Flame,
  Trophy,
  CalendarDays,
  Play,
  Pause,
  Star,
  MoreVertical,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  AMBIENT_SOUNDS,
  soundById,
  MEDITATION_IMAGES,
  DURATION_PRESETS,
  INTERVAL_OPTIONS,
  MOODS,
  ToolkitItem,
  ToolkitCategory,
  TOOLKIT_CATEGORIES,
  TOOLKIT_KEY,
  SESSIONS_KEY,
  INTENTION_KEY,
  DEFAULT_INTENTION,
  MedSession,
  youTubeId,
  coverImage,
  isDirectVideo,
  formatClock,
  parseClock,
} from "@/lib/sanctuary";

// ===========================================================================
// Page
// ===========================================================================

export default function SanctuaryPage() {
  // Set when a session finishes — drives the post-session check-in in the
  // progress panel. Lifted here so the hero (writer) and panel (reader) share it.
  const [pending, setPending] = useState<{
    durationSec: number;
    soundId: string;
  } | null>(null);

  return (
    <div className="min-h-screen px-8 py-7">
      {/* Header */}
      <div className="mb-6 flex items-baseline gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Sanctuary</h1>
        <p className="max-w-md text-sm text-gray-500">
          Reset your mind before or after a session.
        </p>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1">
          <MeditationHero onComplete={setPending} />
        </div>
        <div className="w-full shrink-0 xl:w-80">
          <ProgressPanel pending={pending} onResolve={() => setPending(null)} />
        </div>
      </div>

      <MentalToolkit />
    </div>
  );
}

// ===========================================================================
// Session log — shared across the hero (writes) and progress panel (reads)
// via a tiny event bus so both stay in sync without a store.
// ===========================================================================

function loadSessions(): MedSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveSessions(list: MedSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("sanctuary-sessions"));
}

// ===========================================================================
// Ambient sound + bell engine (Web Audio for white noise & bells)
// ===========================================================================

type AmbientHandle = {
  start: (soundId: string, volume: number) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
  bell: () => void;
};

function useAmbient(): AmbientHandle {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const noiseRef = useRef<{
    ctx: AudioContext;
    src: AudioBufferSourceNode;
    gain: GainNode;
  } | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (noiseRef.current) {
      try {
        noiseRef.current.src.stop();
      } catch {
        /* already stopped */
      }
      noiseRef.current.ctx.close().catch(() => {});
      noiseRef.current = null;
    }
  }, []);

  const start = useCallback(
    (soundId: string, volume: number) => {
      stop();
      const s = soundById(soundId);
      if (s.id === "none") return;
      if (s.noise) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        const ctx = new Ctx();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = volume * 0.4; // white noise is harsh — tame it
        src.connect(gain).connect(ctx.destination);
        src.start();
        noiseRef.current = { ctx, src, gain };
      } else if (s.url) {
        const a = new Audio(s.url);
        a.loop = true;
        a.volume = volume;
        a.play().catch(() => {});
        audioRef.current = a;
      }
    },
    [stop],
  );

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (noiseRef.current) noiseRef.current.gain.gain.value = volume * 0.4;
  }, []);

  const bell = useCallback(() => {
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      // Two soft, decaying sine partials — a gentle singing-bowl chime.
      [528, 792].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const peak = i === 0 ? 0.5 : 0.2;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 3.1);
      });
      setTimeout(() => ctx.close().catch(() => {}), 3300);
    } catch {
      /* audio not available */
    }
  }, []);

  // Clean up on unmount.
  useEffect(() => stop, [stop]);

  return { start, setVolume, stop, bell };
}

// ===========================================================================
// Meditation hero (image carousel + session card)
// ===========================================================================

function MeditationHero({
  onComplete,
}: {
  onComplete: (p: { durationSec: number; soundId: string }) => void;
}) {
  const [slide, setSlide] = useState(0);
  const [durationSec, setDurationSec] = useState(10 * 60);
  const [clockText, setClockText] = useState("10:00");
  const [bellsOn, setBellsOn] = useState(true);
  const [intervalMin, setIntervalMin] = useState(1);
  const [soundId, setSoundId] = useState("white");
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);

  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(0);

  const ambient = useAmbient();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef(false);
  const finishRef = useRef<(completed: boolean) => void>(() => {});
  // The authoritative duration/sound for the *running* session — captured at
  // Start so logging never reads a stale state closure.
  const startedDurRef = useRef(0);
  const startedSoundRef = useRef("white");
  // Drives the countdown from outside React's setState updater, so completion
  // never triggers a setState-during-render.
  const remainingRef = useRef(0);

  const effectiveVol = muted ? 0 : volume;

  // Keep the ambient volume live while a session plays.
  useEffect(() => {
    if (running && !paused) ambient.setVolume(effectiveVol);
  }, [effectiveVol, running, paused, ambient]);

  const clearTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };

  const finish = useCallback(
    (completed: boolean) => {
      runningRef.current = false;
      clearTick();
      ambient.stop();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setRunning(false);
      setPaused(false);
      setRemaining(0);
      if (completed) {
        ambient.bell();
        onComplete({
          durationSec: startedDurRef.current,
          soundId: startedSoundRef.current,
        });
      }
    },
    [ambient, onComplete],
  );
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  // Leaving fullscreen (Esc) mid-session ends it without logging.
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && runningRef.current) {
        finishRef.current(false);
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const runTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      const next = remainingRef.current - 1;
      remainingRef.current = next;
      if (next <= 0) {
        setRemaining(0);
        finish(true);
        return;
      }
      const elapsed = startedDurRef.current - next;
      if (bellsOn && elapsed > 0 && elapsed % (intervalMin * 60) === 0) {
        ambient.bell();
      }
      setRemaining(next);
    }, 1000);
  }, [bellsOn, intervalMin, ambient, finish]);

  function start() {
    const secs = parseClock(clockText) || durationSec;
    if (secs <= 0) return;
    startedDurRef.current = secs;
    startedSoundRef.current = soundId;
    remainingRef.current = secs;
    setDurationSec(secs);
    setRemaining(secs);
    runningRef.current = true;
    setRunning(true);
    setPaused(false);
    ambient.start(soundId, effectiveVol);
    ambient.bell();
    runTick();
    document.documentElement.requestFullscreen?.().catch(() => {});
  }
  function togglePause() {
    if (paused) {
      setPaused(false);
      ambient.start(soundId, effectiveVol);
      runTick();
    } else {
      setPaused(true);
      clearTick();
      ambient.stop();
    }
  }
  function reset() {
    remainingRef.current = startedDurRef.current;
    setRemaining(startedDurRef.current);
    if (!paused) {
      ambient.start(startedSoundRef.current, effectiveVol);
      runTick();
    }
  }

  function pickPreset(min: number) {
    const secs = min * 60;
    setDurationSec(secs);
    setClockText(formatClock(secs));
  }

  const activePreset = DURATION_PRESETS.find((m) => m * 60 === durationSec);
  const prev = () =>
    setSlide(
      (s) => (s - 1 + MEDITATION_IMAGES.length) % MEDITATION_IMAGES.length,
    );
  const next = () => setSlide((s) => (s + 1) % MEDITATION_IMAGES.length);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 shadow-sm">
      {/* Background slides — changed only via the arrows / dots below */}
      {MEDITATION_IMAGES.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            i === slide ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-black/10" />

      {/* Carousel arrows */}
      <CarouselArrow side="left" onClick={prev} />
      <CarouselArrow side="right" onClick={next} />

      {/* Foreground card */}
      <div className="relative flex min-h-[560px] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white/95 p-7 shadow-xl backdrop-blur">
          <div className="mb-5 flex flex-col items-center">
            <Flower2 className="mb-2 text-brand" size={28} />
            <h2 className="text-xl font-bold text-gray-900">Meditation Session</h2>
          </div>

          {/* Duration */}
          <label className="mb-1.5 block text-sm font-medium text-gray-600">
            Duration:
          </label>
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5">
            <Clock size={16} className="text-gray-400" />
            <input
              value={clockText}
              onChange={(e) => setClockText(e.target.value)}
              onBlur={() => {
                const secs = parseClock(clockText);
                setDurationSec(secs);
                setClockText(formatClock(secs));
              }}
              className="w-full text-lg font-semibold text-gray-800 outline-none"
            />
          </div>
          <div className="mb-4 grid grid-cols-5 gap-1.5">
            {DURATION_PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => pickPreset(m)}
                className={`rounded-md py-1.5 text-xs font-semibold transition ${
                  activePreset === m
                    ? "bg-brand text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === 60 ? "1 hour" : `${m} min`}
              </button>
            ))}
          </div>

          {/* Interval bells */}
          <div className="mb-2 flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Interval Bells:</span>
            <Toggle on={bellsOn} onClick={() => setBellsOn((b) => !b)} />
          </div>
          <Select
            disabled={!bellsOn}
            value={String(intervalMin)}
            onChange={(v) => setIntervalMin(Number(v))}
            className="mb-4"
          >
            {INTERVAL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                Every {m} Minute{m > 1 ? "s" : ""}
              </option>
            ))}
          </Select>

          {/* Ambient sound */}
          <label className="mb-1.5 block text-sm font-medium text-gray-600">
            Ambient Sound:
          </label>
          <div className="relative mb-3">
            <span
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full border border-black/10"
              style={{ background: soundById(soundId).color }}
            />
            <Select value={soundId} onChange={setSoundId} padLeft>
              {AMBIENT_SOUNDS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="mb-5 flex items-center gap-3">
            <Volume2 size={18} className="text-gray-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1.5 w-full accent-brand"
            />
          </div>

          <button
            onClick={start}
            className="w-full rounded-xl bg-gradient-to-r from-[#2563eb] to-[#5b8bff] py-3.5 text-center font-semibold text-white shadow-sm transition hover:brightness-105"
          >
            Start
          </button>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        {MEDITATION_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setSlide(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === slide ? "w-5 bg-brand" : "w-1.5 bg-white/70"
            }`}
          />
        ))}
      </div>

      {running && (
        <FullscreenTimer
          bg={MEDITATION_IMAGES[slide]}
          remaining={remaining}
          total={durationSec}
          paused={paused}
          muted={muted}
          soundName={soundById(soundId).name}
          onTogglePause={togglePause}
          onReset={reset}
          onToggleMute={() => setMuted((m) => !m)}
          onClose={() => finish(false)}
        />
      )}
    </div>
  );
}

function FullscreenTimer({
  bg,
  remaining,
  total,
  paused,
  muted,
  soundName,
  onTogglePause,
  onReset,
  onToggleMute,
  onClose,
}: {
  bg: string;
  remaining: number;
  total: number;
  paused: boolean;
  muted: boolean;
  soundName: string;
  onTogglePause: () => void;
  onReset: () => void;
  onToggleMute: () => void;
  onClose: () => void;
}) {
  const r = 140;
  const c = 2 * Math.PI * r;
  const offset = total > 0 ? c - (remaining / total) * c : 0;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/40" />

      <button
        onClick={onClose}
        title="End session"
        className="absolute right-6 top-6 z-10 rounded-full p-2 text-white/80 transition hover:bg-white/10"
      >
        <X size={26} />
      </button>

      <div className="relative flex flex-col items-center">
        <div className="relative h-72 w-72">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 300 300">
            <circle
              cx="150"
              cy="150"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="3"
            />
            <circle
              cx="150"
              cy="150"
              r={r}
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl font-light tabular-nums text-white">
              {formatClock(remaining)}
            </span>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-12 text-white/85">
          <button onClick={onReset} title="Restart" className="transition hover:text-white">
            <RotateCcw size={26} />
          </button>
          <button
            onClick={onTogglePause}
            title={paused ? "Resume" : "Pause"}
            className="transition hover:text-white"
          >
            {paused ? <Play size={32} /> : <Pause size={32} />}
          </button>
          <button
            onClick={onToggleMute}
            title={muted ? "Unmute" : "Mute"}
            className="transition hover:text-white"
          >
            {muted ? <VolumeX size={26} /> : <Volume2 size={26} />}
          </button>
        </div>
        <div className="mt-5 text-sm text-white/50">{soundName}</div>
      </div>
    </div>
  );
}

function CarouselArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-gray-700 shadow transition hover:bg-white ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}

// ===========================================================================
// Progress panel
// ===========================================================================

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // Sunday-based
  return x;
}
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function computeStats(sessions: MedSession[]) {
  const now = new Date();
  const weekStart = startOfWeek(now);

  const weekDays = new Array(7).fill(false);
  let minutesThisWeek = 0;
  let totalMinutes = 0;
  const days = new Set<string>();

  for (const s of sessions) {
    const d = new Date(s.date);
    totalMinutes += s.durationSec / 60;
    days.add(dayKey(d));
    if (d >= weekStart) {
      weekDays[d.getDay()] = true;
      minutesThisWeek += s.durationSec / 60;
    }
  }

  // Streaks
  const streakFrom = (from: Date) => {
    let n = 0;
    const cur = new Date(from);
    cur.setHours(0, 0, 0, 0);
    while (days.has(dayKey(cur))) {
      n++;
      cur.setDate(cur.getDate() - 1);
    }
    return n;
  };
  const today = new Date();
  let current = streakFrom(today);
  if (current === 0) {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    current = streakFrom(y); // yesterday still counts until today lapses
  }
  let longest = 0;
  for (const key of days) {
    const [yy, mm, dd] = key.split("-").map(Number);
    longest = Math.max(longest, streakFrom(new Date(yy, mm, dd)));
  }

  return {
    weekDays,
    weekSessions: sessions.filter((s) => new Date(s.date) >= weekStart).length,
    minutesThisWeek: Math.round(minutesThisWeek),
    currentStreak: current,
    longestStreak: longest,
    totalMinutes: Math.round(totalMinutes),
    totalSessions: sessions.length,
  };
}

function TodayNote() {
  const [text, setText] = useState(DEFAULT_INTENTION);
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(INTENTION_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved !== null) setText(saved);
  }, []);

  // Focus + place caret at the end when entering edit mode.
  useEffect(() => {
    const el = taRef.current;
    if (editing && el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  const save = () => {
    const trimmed = text.trim();
    setText(trimmed);
    localStorage.setItem(INTENTION_KEY, trimmed);
    setEditing(false);
  };

  return (
    <div className="group relative mb-3 rounded-xl bg-brand-soft/60 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Today I Will
      </div>
      {editing ? (
        <textarea
          ref={taRef}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur(); // blur triggers save
            } else if (e.key === "Escape") {
              e.currentTarget.blur();
            }
          }}
          className="mt-1 w-full resize-none rounded-md border border-brand bg-white px-2 py-1 text-gray-800 outline-none"
        />
      ) : (
        <>
          <button
            onClick={() => setEditing(true)}
            className="mt-1 block w-full cursor-text text-left text-gray-800"
          >
            {text || <span className="text-gray-400">Set your intention…</span>}
          </button>
          <span
            onClick={() => setEditing(true)}
            className="absolute right-2 top-2 cursor-pointer rounded-md bg-gray-900/80 px-2 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100"
          >
            Edit
          </span>
        </>
      )}
    </div>
  );
}

function ProgressPanel({
  pending,
  onResolve,
}: {
  pending: { durationSec: number; soundId: string } | null;
  onResolve: () => void;
}) {
  const [sessions, setSessions] = useState<MedSession[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setSessions(loadSessions());
    refresh();
    window.addEventListener("sanctuary-sessions", refresh);
    return () => window.removeEventListener("sanctuary-sessions", refresh);
  }, []);

  const stats = useMemo(() => computeStats(sessions), [sessions]);

  // Log the just-finished session (with optional check-in) and clear it.
  const resolve = (mood?: string, note?: string) => {
    if (pending) {
      const list = loadSessions();
      list.push({
        id: `s-${Date.now()}`,
        date: Date.now(),
        durationSec: pending.durationSec,
        soundId: pending.soundId,
        mood,
        note,
      });
      saveSessions(list);
    }
    onResolve();
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      {pending ? (
        <SessionComplete
          onSkip={() => resolve()}
          onSave={(mood, note) => resolve(mood, note)}
          onClose={() => resolve()}
        />
      ) : (
        <>
          <TodayNote />

          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Your Progress
          </div>

          <button
            onClick={() => setLogOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            <Calendar size={16} className="text-brand" /> View Sessions
          </button>

          <div className="mt-5 text-sm font-medium text-gray-500">
            This Week Sessions
          </div>
          <div className="mt-2 flex justify-between">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span
                  className={`h-6 w-6 rounded-full border ${
                    stats.weekDays[i]
                      ? "border-brand bg-brand"
                      : "border-gray-200 bg-white"
                  }`}
                />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <Stat icon={Hourglass} label="Minutes This Week" value={`${stats.minutesThisWeek} m`} />
      <Stat icon={Flame} label="Current Streak" value={`${stats.currentStreak} Days`} />

      {showAll && (
        <>
          <Stat icon={Trophy} label="Longest Streak" value={`${stats.longestStreak} Days`} />
          <Stat
            icon={Hourglass}
            label="Total Meditation Minutes"
            value={`${stats.totalMinutes} m`}
          />
          <Stat
            icon={CalendarDays}
            label="Total Sessions"
            value={`${stats.totalSessions} Sessions`}
          />
        </>
      )}

      <button
        onClick={() => setShowAll((v) => !v)}
        className="mt-5 text-sm font-semibold text-brand hover:underline"
      >
        {showAll ? "Close" : "View All Stats"}
      </button>

      {logOpen && (
        <SessionsLog sessions={sessions} onClose={() => setLogOpen(false)} />
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="mt-4">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-gray-800">
        <Icon size={16} className="text-brand" />
        <span className="font-semibold">{value}</span>
      </div>
    </div>
  );
}

function SessionComplete({
  onSkip,
  onSave,
  onClose,
}: {
  onSkip: () => void;
  onSave: (mood: string, note?: string) => void;
  onClose: () => void;
}) {
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const selected = MOODS.find((m) => m.id === mood);

  return (
    <div className="mb-2">
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-bold text-gray-900">Session Complete. Nice work!</h3>
        <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      <div className="mt-2 text-sm text-gray-700">
        How are you feeling right now?{" "}
        {selected && (
          <span className="font-semibold text-brand">{selected.label}</span>
        )}
      </div>
      <div className="mt-3 flex justify-between">
        {MOODS.map((m) => (
          <button
            key={m.id}
            title={m.label}
            onClick={() => setMood(m.id)}
            className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition ${
              mood === m.id
                ? "bg-brand-soft ring-2 ring-brand"
                : "hover:bg-gray-100"
            }`}
          >
            {m.emoji}
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        What did you notice during the session?
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional reflection..."
        className="mt-2 h-24 w-full resize-none rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-brand"
      />

      <div className="mt-4 flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          Skip
        </button>
        <button
          disabled={!mood}
          onClick={() => onSave(mood!, note.trim() || undefined)}
          className="flex-1 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save &amp; Exit
        </button>
      </div>

      <div className="mt-5 border-t border-gray-100" />
    </div>
  );
}

function SessionsLog({
  sessions,
  onClose,
}: {
  sessions: MedSession[];
  onClose: () => void;
}) {
  const sorted = [...sessions].sort((a, b) => b.date - a.date);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Meditation Sessions Log</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        {sorted.length === 0 ? (
          <p className="py-12 text-center text-gray-400">No meditation sessions yet</p>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {sorted.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
              >
                <div>
                  <div className="font-medium text-gray-800">
                    {new Date(s.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    <span className="ml-2 text-sm text-gray-400">
                      {new Date(s.date).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">{soundById(s.soundId).name}</div>
                </div>
                <div className="text-sm font-semibold text-brand">
                  {formatClock(s.durationSec)}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:brightness-105"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Mental Toolkit (CRUD)
// ===========================================================================

const CATEGORY_BADGE: Record<ToolkitCategory, string> = {
  Reboot: "bg-blue-500/80",
  Rewire: "bg-blue-500/80",
  Recovery: "bg-emerald-500/80",
};

type Tab = "All" | ToolkitCategory | "Favorites";

function loadToolkit(): ToolkitItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TOOLKIT_KEY) || "[]");
  } catch {
    return [];
  }
}

function MentalToolkit() {
  const [items, setItems] = useState<ToolkitItem[]>([]);
  const [tab, setTab] = useState<Tab>("All");
  const [editor, setEditor] = useState<null | { item?: ToolkitItem }>(null);
  const [playing, setPlaying] = useState<ToolkitItem | null>(null);

  // Load once on mount — localStorage is only available client-side, so this
  // can't be a useState initializer without risking a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setItems(loadToolkit()), []);

  const persist = (next: ToolkitItem[]) => {
    setItems(next);
    localStorage.setItem(TOOLKIT_KEY, JSON.stringify(next));
  };

  const save = (draft: {
    id?: string;
    name: string;
    category: ToolkitCategory;
    url: string;
  }) => {
    if (draft.id) {
      persist(
        items.map((it) =>
          it.id === draft.id
            ? { ...it, name: draft.name, category: draft.category, url: draft.url }
            : it,
        ),
      );
    } else {
      persist([
        ...items,
        {
          id: `t-${Date.now()}`,
          name: draft.name,
          category: draft.category,
          url: draft.url,
          favorite: false,
          created_at: Date.now(),
        },
      ]);
    }
    setEditor(null);
  };

  const remove = (id: string) =>
    persist(items.filter((it) => it.id !== id));
  const toggleFav = (id: string) =>
    persist(items.map((it) => (it.id === id ? { ...it, favorite: !it.favorite } : it)));

  const counts = {
    All: items.length,
    Reboot: items.filter((i) => i.category === "Reboot").length,
    Rewire: items.filter((i) => i.category === "Rewire").length,
    Recovery: items.filter((i) => i.category === "Recovery").length,
    Favorites: items.filter((i) => i.favorite).length,
  };

  const visible = items.filter((it) => {
    if (tab === "All") return true;
    if (tab === "Favorites") return it.favorite;
    return it.category === tab;
  });

  const TABS: Tab[] = ["All", "Reboot", "Rewire", "Recovery", "Favorites"];

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-start gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Mental Toolkit</h2>
        <p className="mt-1 max-w-xl text-sm text-gray-500">
          A curated library of mental exercises and psychology tools to rewire your
          trading mind.
        </p>
      </div>

      <div className="mb-5 flex items-center justify-between border-b border-gray-100">
        <div className="flex flex-wrap gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition ${
                tab === t
                  ? "border-brand text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              {t === "Favorites" && <Star size={13} className="mr-1 inline" />}
              {t}{" "}
              <span className={tab === t ? "text-brand" : "text-gray-300"}>
                {counts[t]}
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditor({})}
          className="mb-2 flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
        >
          <Plus size={15} /> Add Video
        </button>
      </div>

      {visible.length === 0 ? (
        <ToolkitEmpty onAdd={() => setEditor({})} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((it) => (
            <ToolkitCard
              key={it.id}
              item={it}
              onPlay={() => setPlaying(it)}
              onEdit={() => setEditor({ item: it })}
              onDelete={() => remove(it.id)}
              onToggleFav={() => toggleFav(it.id)}
            />
          ))}
        </div>
      )}

      {editor && (
        <ToolkitEditor
          item={editor.item}
          onSave={save}
          onClose={() => setEditor(null)}
        />
      )}
      {playing && <VideoModal item={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

function ToolkitEmpty({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 py-20 text-center">
      <Flower2 size={44} className="text-gray-200" strokeWidth={1.5} />
      <h3 className="text-lg font-bold text-gray-700">No exercises here yet</h3>
      <p className="max-w-sm text-sm text-gray-400">
        Add a YouTube or video link to build your own mental toolkit. It plays right
        here when you click the card.
      </p>
      <button
        onClick={onAdd}
        className="mt-1 flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:brightness-105"
      >
        <Plus size={15} /> Add your first video
      </button>
    </div>
  );
}

function ToolkitCard({
  item,
  onPlay,
  onEdit,
  onDelete,
  onToggleFav,
}: {
  item: ToolkitItem;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFav: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const cover = coverImage(item.url);

  return (
    <div className="group relative h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-700 to-gray-900 shadow-sm">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />

      {/* Category badge */}
      <span
        className={`absolute left-3 top-3 rounded-md px-2 py-1 text-xs font-semibold text-white backdrop-blur ${CATEGORY_BADGE[item.category]}`}
      >
        {item.category}
      </span>

      {/* Star + 3-dot */}
      <div className="absolute right-2 top-2 flex items-center gap-0.5">
        <button
          onClick={onToggleFav}
          className="rounded-md p-1.5 text-white/90 transition hover:bg-white/15"
          title={item.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            size={18}
            className={item.favorite ? "fill-brand text-brand" : ""}
          />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="rounded-md p-1.5 text-white/90 transition hover:bg-white/15"
            aria-expanded={menu}
          >
            <MoreVertical size={18} />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                <button
                  onClick={() => {
                    onEdit();
                    setMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={15} /> Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${item.name}"?`)) onDelete();
                    setMenu(false);
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

      {/* Play button */}
      <button
        onClick={onPlay}
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/85 text-brand opacity-0 shadow-lg transition group-hover:opacity-100">
          <Play size={24} className="ml-0.5 fill-brand" />
        </span>
      </button>

      {/* Title */}
      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <div className="truncate text-base font-semibold text-white drop-shadow">
          {item.name}
        </div>
      </div>
    </div>
  );
}

function ToolkitEditor({
  item,
  onSave,
  onClose,
}: {
  item?: ToolkitItem;
  onSave: (d: {
    id?: string;
    name: string;
    category: ToolkitCategory;
    url: string;
  }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState<ToolkitCategory>(
    item?.category ?? "Reboot",
  );
  const [url, setUrl] = useState(item?.url ?? "");

  const trimmed = url.trim();
  const validUrl = /^https?:\/\//i.test(trimmed);
  const canSave = name.trim() && validUrl;
  const preview = coverImage(trimmed);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-24 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            {item ? "Edit Exercise" : "Add Exercise"}
          </h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <label className="mb-1.5 block text-sm font-medium text-gray-600">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Box Breathing"
          className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />

        <label className="mb-1.5 block text-sm font-medium text-gray-600">Category</label>
        <Select value={category} onChange={(v) => setCategory(v as ToolkitCategory)} className="mb-4">
          {TOOLKIT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>

        <label className="mb-1.5 block text-sm font-medium text-gray-600">Video URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=…  or  https://…/clip.mp4"
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand"
        />
        {trimmed && !validUrl && (
          <p className="mt-1.5 text-xs text-red-500">
            Enter a full URL starting with http:// or https://
          </p>
        )}

        {preview && (
          <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="cover preview" className="h-32 w-full object-cover" />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            disabled={!canSave}
            onClick={() =>
              onSave({ id: item?.id, name: name.trim(), category, url: trimmed })
            }
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {item ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoModal({ item, onClose }: { item: ToolkitItem; onClose: () => void }) {
  const ytId = youTubeId(item.url);
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
            <div className="truncate font-semibold text-gray-900">{item.name}</div>
            <div className="text-xs text-gray-400">{item.category}</div>
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
              title={item.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isDirectVideo(item.url) ? (
            <video className="h-full w-full" src={item.url} controls autoPlay />
          ) : (
            <iframe
              className="h-full w-full"
              src={item.url}
              title={item.name}
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
// Small shared controls
// ===========================================================================

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition ${
        on ? "bg-brand" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Select({
  value,
  onChange,
  children,
  className = "",
  padLeft,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  /** wrapper classes (margins/layout only) */
  className?: string;
  /** leave room for a leading swatch */
  padLeft?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pr-9 text-sm text-gray-800 outline-none focus:border-brand disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 ${
          padLeft ? "pl-9" : "pl-3"
        }`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}
