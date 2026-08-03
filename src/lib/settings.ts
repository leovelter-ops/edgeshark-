// ---------------------------------------------------------------------------
// Settings: Account, Pre-Market Routine, and Trading Preferences. Persisted in
// localStorage (no dedicated Supabase table yet).
// ---------------------------------------------------------------------------

export const ACCOUNT_KEY = "edgeflo_settings_account";
export const ROUTINE_KEY = "edgeflo_settings_routine";
export const TRADING_KEY = "edgeflo_settings_trading";

// ---- Account ---------------------------------------------------------------

export interface AccountSettings {
  name: string;
  username: string;
  phone: string;
  email: string;
  avatar: string; // data URL or ""
  timezone: string;
  timeFormat: "12h" | "24h";
  currency: string; // "" = Not set
  theme: "light" | "dark";
}

export const DEFAULT_ACCOUNT: AccountSettings = {
  name: "Leonardo Velter",
  username: "Leonardo",
  phone: "(239) 867-7040",
  email: "leovelter@gmail.com",
  avatar: "",
  timezone: "America/New_York (EDT)",
  timeFormat: "24h",
  currency: "",
  theme: "light",
};

export const TIMEZONES = [
  "America/New_York (EDT)",
  "America/Chicago (CDT)",
  "America/Los_Angeles (PDT)",
  "Europe/London (BST)",
  "Europe/Berlin (CEST)",
  "Asia/Singapore (SGT)",
  "Asia/Tokyo (JST)",
  "Australia/Sydney (AEST)",
];

export const CURRENCIES = ["", "USD ($)", "EUR (€)", "GBP (£)", "JPY (¥)", "AUD (A$)"];

// ---- Pre-Market Routine ----------------------------------------------------

export interface RoutineStep {
  id: string;
  icon: string; // key into ROUTINE_ICONS
  label: string;
  action: string;
}

export interface RoutineSettings {
  enableBanner: boolean;
  enableStartPrompt: boolean;
  showOnAllPages: boolean;
  autoHide: boolean;
  resetTime: string; // "00:00"
  steps: RoutineStep[];
}

export const MAX_STEPS = 6;

export const ROUTINE_ACTIONS = [
  "Go to Edge",
  "Go to Trading Platform",
  "Go to Sanctuary",
  "Go to Notebook",
  "Go to Academy",
  "None",
];

/** Maps a RoutineStep action to an in-app route (null = no navigation). */
export const ROUTINE_ROUTES: Record<string, string | null> = {
  "Go to Edge": "/edge",
  "Go to Trading Platform": "/trading",
  "Go to Sanctuary": "/sanctuary",
  "Go to Notebook": "/notebook",
  "Go to Academy": "/academy",
  None: null,
};

/** "America/New_York (EDT)" -> "America/New_York" */
export function ianaZone(tz: string): string {
  return (tz.split(" ")[0] || "America/New_York").trim();
}

/**
 * A stable key (YYYY-MM-DD) identifying the routine period the given instant
 * belongs to. A fresh period begins each day at `resetTime` in timezone `tz`,
 * so any progress stored under an older key is treated as reset. This is how
 * the pre-market checklist "resets daily at the time set in Settings" while
 * respecting the account's timezone.
 */
export function routineDayKey(
  resetTime: string,
  tz: string,
  now: Date = new Date(),
): string {
  const iana = ianaZone(tz);
  let y: number, mo: number, d: number, hh: number, mm: number;
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: iana,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    y = get("year");
    mo = get("month");
    d = get("day");
    hh = get("hour");
    mm = get("minute");
  } catch {
    // Unknown zone: fall back to the browser's local time.
    y = now.getFullYear();
    mo = now.getMonth() + 1;
    d = now.getDate();
    hh = now.getHours();
    mm = now.getMinutes();
  }
  const [rh, rm] = resetTime.split(":").map(Number);
  if (hh * 60 + mm < rh * 60 + rm) {
    // Before today's reset time -> still the previous day's period.
    const prev = new Date(Date.UTC(y, mo - 1, d));
    prev.setUTCDate(prev.getUTCDate() - 1);
    y = prev.getUTCFullYear();
    mo = prev.getUTCMonth() + 1;
    d = prev.getUTCDate();
  }
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const DEFAULT_ROUTINE: RoutineSettings = {
  enableBanner: true,
  enableStartPrompt: true,
  showOnAllPages: true,
  autoHide: true,
  resetTime: "00:00",
  steps: [
    { id: "s1", icon: "edit", label: "Review Trade Plan", action: "Go to Edge" },
    { id: "s2", icon: "chart", label: "Analyze Charts", action: "Go to Trading Platform" },
    { id: "s3", icon: "meditate", label: "10 Min Meditation", action: "Go to Sanctuary" },
  ],
};

// ---- Trading Preferences ---------------------------------------------------

export interface TradingPrefs {
  hardLock: boolean;
  maxTradesPerDay: number;
  maxDailyLoss: number;
  maxDailyProfit: number;
  fixedRisk: number;
  windowStart: string;
  windowEnd: string;
  newsWhen: string;
  newsMins: number;
  postTradePrompts: boolean;
  afterOpening: boolean;
  afterClosing: boolean;
}

export const NEWS_WHEN = ["Off", "Before", "After", "Before and After"];
export const NEWS_MINS = [5, 15, 30, 60];

export const DEFAULT_TRADING: TradingPrefs = {
  hardLock: false,
  maxTradesPerDay: 5,
  maxDailyLoss: 100,
  maxDailyProfit: 1000,
  fixedRisk: 1,
  windowStart: "08:00",
  windowEnd: "17:00",
  newsWhen: "Before and After",
  newsMins: 15,
  postTradePrompts: true,
  afterOpening: true,
  afterClosing: true,
};

/** The values "Apply recommended defaults" restores (guardrails only). */
export const RECOMMENDED_GUARDRAILS = {
  maxTradesPerDay: 5,
  maxDailyLoss: 100,
  maxDailyProfit: 1000,
  fixedRisk: 1,
  windowStart: "08:00",
  windowEnd: "17:00",
  newsWhen: "Before and After",
  newsMins: 15,
};

// ---- storage helper --------------------------------------------------------

export function loadSetting<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    // merge so newly-added fields keep their defaults
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}
