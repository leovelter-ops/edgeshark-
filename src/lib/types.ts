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

  created_at?: string;
  updated_at?: string;
}

/** Shape used by the New Plan form (no id / timestamps yet). */
export type PlanDraft = Omit<Plan, "id" | "created_at" | "updated_at">;

export function emptyDraft(): PlanDraft {
  return {
    name: "",
    plan_type: "",
    dot_color: "yellow",
    is_preset: false,
    max_trades_per_day: null,
    max_daily_loss: null,
    max_daily_profit: null,
    risk_per_trade: null,
    charting_process: [""],
    entry_criteria: [{ label: "", checked: false }],
    trade_management_rules: [""],
    exit_criteria: [""],
    trading_notes: "",
    setup_screenshot_url: "",
    entry_example_urls: [],
  };
}
