// ---------------------------------------------------------------------------
// Sanctuary shared data: ambient sounds, meditation backgrounds, toolkit types,
// and small helpers. The Mental Toolkit and meditation session log are stored
// in localStorage (no dedicated Supabase table yet), mirroring the notebook
// fallback pattern.
// ---------------------------------------------------------------------------

export const TOOLKIT_KEY = "edgeflo_sanctuary_toolkit";
export const SESSIONS_KEY = "edgeflo_sanctuary_sessions";
export const INTENTION_KEY = "edgeflo_sanctuary_intention";

export const DEFAULT_INTENTION = "journal every trade";

// ---- Mental Toolkit -------------------------------------------------------

export type ToolkitCategory = "Reboot" | "Rewire" | "Recovery";

export const TOOLKIT_CATEGORIES: ToolkitCategory[] = [
  "Reboot",
  "Rewire",
  "Recovery",
];

/** A user-added exercise: a name, a category, and a video URL to play. */
export interface ToolkitItem {
  id: string;
  name: string;
  category: ToolkitCategory;
  url: string;
  favorite: boolean;
  created_at: number;
}

// ---- Ambient sounds -------------------------------------------------------

export interface AmbientSound {
  id: string;
  name: string;
  /** Looping audio file. Omitted for "None" and synthesized white noise. */
  url?: string;
  /** Generate white noise with the Web Audio API instead of loading a file. */
  noise?: boolean;
  /** Swatch shown in the dropdown. */
  color: string;
}

// Free, hotlinkable loops from Google's Actions Sound Library
// (https://developers.google.com/assistant/tools/sound-library). White noise is
// synthesized in-browser so it is genuinely flat rather than a random clip.
export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: "none", name: "None", color: "transparent" },
  {
    id: "rain",
    name: "Gentle Rain",
    url: "https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg",
    color: "#5b8def",
  },
  {
    id: "ocean",
    name: "Ocean Waves",
    url: "https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg",
    color: "#2fb6c9",
  },
  {
    id: "forest",
    name: "Forest Ambience",
    url: "https://actions.google.com/sounds/v1/ambiences/spring_day_forest.ogg",
    color: "#3f9d5a",
  },
  {
    id: "fire",
    name: "Fireplace",
    url: "https://actions.google.com/sounds/v1/ambiences/fire.ogg",
    color: "#e08a3c",
  },
  { id: "white", name: "White Noise", noise: true, color: "#9aa0aa" },
];

export function soundById(id: string): AmbientSound {
  return AMBIENT_SOUNDS.find((s) => s.id === id) ?? AMBIENT_SOUNDS[0];
}

// ---- Meditation background images -----------------------------------------

// Calming, free-to-use stock photography (Unsplash direct CDN URLs).
export const MEDITATION_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=80", // misty green mountains
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80", // calm turquoise beach
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80", // sunlit forest
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80", // mountain lake
  "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1600&q=80", // foggy pine forest
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=80", // still alpine lake
];

// ---- Meditation session log ------------------------------------------------

export interface MedSession {
  id: string;
  /** epoch ms of when the session finished */
  date: number;
  durationSec: number;
  soundId: string;
  /** optional post-session check-in */
  mood?: string;
  note?: string;
}

/** Post-session mood check-in options. */
export interface Mood {
  id: string;
  emoji: string;
  label: string;
}

export const MOODS: Mood[] = [
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "relaxed", emoji: "😮‍💨", label: "Relaxed" },
  { id: "sleepy", emoji: "🥱", label: "Sleepy" },
  { id: "energized", emoji: "🤩", label: "Energized" },
  { id: "frustrated", emoji: "😤", label: "Frustrated" },
  { id: "content", emoji: "😊", label: "Content" },
];

// ---- Session controls ------------------------------------------------------

/** Duration preset chips, in minutes. */
export const DURATION_PRESETS = [5, 10, 15, 30, 60];

/** Interval-bell options, in minutes. */
export const INTERVAL_OPTIONS = [1, 2, 5];

// ---- URL helpers -----------------------------------------------------------

/** Extract a YouTube video id from the common URL shapes, else null. */
export function youTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Cover image for a toolkit item — the YouTube thumbnail when we can find one. */
export function coverImage(url: string): string | null {
  const id = youTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

/** True for direct video files we can drop into a <video> element. */
export function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i.test(url);
}

export function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Parse an "mm:ss" (or plain minutes) string into seconds. */
export function parseClock(text: string): number {
  const t = text.trim();
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    const mm = parseInt(m, 10) || 0;
    const ss = parseInt(s, 10) || 0;
    return mm * 60 + Math.min(ss, 59);
  }
  const mins = parseInt(t, 10) || 0;
  return mins * 60;
}
