export type DotColor = "yellow" | "red" | "green";

export interface EntryCriterion {
  label: string;
  checked: boolean;
}

/** A trading plan / playbook — mirrors the `public.plans` table. */
export interface Plan {
  id: string;
  name: string;
  plan_type: string | null;
  dot_color: DotColor;
  is_preset: boolean;
  is_active: boolean;

  // Risk controls
  max_trades_per_day: number | null;
  max_daily_loss: number | null;
  max_daily_profit: number | null;
  risk_per_trade: number | null;

  // List / text sections
  charting_process: string[];
  entry_criteria: EntryCriterion[];
  trade_management_rules: string[];
  exit_criteria: string[];
  trading_notes: string | null;

  // Entry models (images)
  setup_screenshot_url: string | null;
  entry_example_urls: string[];

  // Trading window
  trading_window_start: string | null; // "08:00"
  trading_window_end: string | null; // "17:00"
  block_news_note: string | null;

  created_at?: string;
  updated_at?: string;
}

/** Shape used by the New Plan form (no id / timestamps yet). */
export type PlanDraft = Omit<Plan, "id" | "created_at" | "updated_at">;

/** A fresh plan — with the default risk/window values EdgeFlo pre-fills. */
export function emptyDraft(): PlanDraft {
  return {
    name: "",
    plan_type: "",
    dot_color: "red",
    is_preset: false,
    is_active: false,
    max_trades_per_day: 5,
    max_daily_loss: 100,
    max_daily_profit: 1000,
    risk_per_trade: 1,
    charting_process: [""],
    entry_criteria: [],
    trade_management_rules: [],
    exit_criteria: [],
    trading_notes: "",
    setup_screenshot_url: "",
    entry_example_urls: [],
    trading_window_start: "08:00",
    trading_window_end: "17:00",
    block_news_note: "Trading blocked 15 min before and after High Impact events",
  };
}

/** Turn an existing plan into an editable draft. */
export function planToDraft(p: Plan): PlanDraft {
  const { id, created_at, updated_at, ...rest } = p;
  void id;
  void created_at;
  void updated_at;
  return rest;
}
