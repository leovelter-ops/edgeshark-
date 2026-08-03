// ---------------------------------------------------------------------------
// Active Edge plan. "Which plan is active" is tracked client-side in
// localStorage (not a DB column) so it works whether or not Supabase is
// connected, and so other pages (e.g. Trading) can render the active plan.
// A snapshot of the whole plan is stored so the Trading page can show it
// without re-querying. A custom event keeps open pages in sync within the tab.
// ---------------------------------------------------------------------------

import { Plan } from "./types";

export const ACTIVE_PLAN_ID_KEY = "edgeflo_active_plan_id";
export const ACTIVE_PLAN_KEY = "edgeflo_active_plan";
export const ACTIVE_PLAN_EVENT = "edgeflo-active-plan-change";

export function getActivePlanId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PLAN_ID_KEY);
  } catch {
    return null;
  }
}

export function getActivePlan(): Plan | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PLAN_KEY);
    return raw ? (JSON.parse(raw) as Plan) : null;
  } catch {
    return null;
  }
}

/** Set (or clear, with null) the active plan and notify listeners. */
export function setActivePlan(plan: Plan | null): void {
  try {
    if (plan) {
      localStorage.setItem(ACTIVE_PLAN_ID_KEY, plan.id);
      localStorage.setItem(ACTIVE_PLAN_KEY, JSON.stringify(plan));
    } else {
      localStorage.removeItem(ACTIVE_PLAN_ID_KEY);
      localStorage.removeItem(ACTIVE_PLAN_KEY);
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent<Plan | null>(ACTIVE_PLAN_EVENT, { detail: plan }),
  );
}
