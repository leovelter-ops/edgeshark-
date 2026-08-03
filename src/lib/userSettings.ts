// ---------------------------------------------------------------------------
// Owner of the single public.user_settings row (migration 0006). Everything the
// app used to keep in localStorage-only settings — starting balance, account /
// routine / trading preference blobs, pre-market progress, watchlist pins —
// lives on this one row (no auth yet, so it's a shared singleton).
//
// This module centralizes row creation so the many callers never race to insert
// duplicate rows: ensureSettingsRowId() is memoized and shared.
// ---------------------------------------------------------------------------

import { createClient } from "@/lib/supabase/client";

let _db: ReturnType<typeof createClient> | null = null;
function db() {
  return (_db ??= createClient());
}

export interface UserSettingsRow {
  id: string;
  starting_balance: number;
  account: Record<string, unknown>;
  routine: Record<string, unknown>;
  trading: Record<string, unknown>;
  premarket: Record<string, unknown>;
  pins: string[];
}

// Memoized "there is exactly one settings row, here is its id". Shared across
// balance + settings writers so they all patch the same row.
let _rowIdPromise: Promise<string | null> | null = null;

export function ensureSettingsRowId(): Promise<string | null> {
  return (_rowIdPromise ??= (async () => {
    try {
      const existing = await db()
        .from("user_settings")
        .select("id")
        .limit(1)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data?.id) return existing.data.id as string;

      // No row yet — create one with column defaults.
      const inserted = await db()
        .from("user_settings")
        .insert({})
        .select("id")
        .single();
      if (inserted.error) throw inserted.error;
      return inserted.data.id as string;
    } catch {
      _rowIdPromise = null; // let a later call retry
      return null;
    }
  })());
}

/** Fetch the whole settings row (or null if none / unreachable). */
export async function fetchUserSettings(): Promise<Partial<UserSettingsRow> | null> {
  try {
    const { data, error } = await db()
      .from("user_settings")
      .select("*")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as Partial<UserSettingsRow>) ?? null;
  } catch {
    return null;
  }
}

/** Patch one or more columns on the single settings row (best-effort). */
export async function patchUserSettings(
  patch: Partial<Omit<UserSettingsRow, "id">>,
): Promise<void> {
  const id = await ensureSettingsRowId();
  if (!id) return;
  try {
    await db().from("user_settings").update(patch).eq("id", id);
  } catch {
    /* stays in cache; reconciles on next fetch */
  }
}
