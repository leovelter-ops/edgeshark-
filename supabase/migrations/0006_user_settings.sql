-- ============================================================================
-- 0006_user_settings.sql  —  Per-user settings, balance & pre-market progress
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0005).
--
-- Consolidates everything the app currently keeps in localStorage (except the
-- active plan, which already lives on plans.is_active from 0003):
--   starting_balance  <- edgeflo_starting_balance
--   account           <- edgeflo_settings_account   (AccountSettings)
--   routine           <- edgeflo_settings_routine    (RoutineSettings)
--   trading           <- edgeflo_settings_trading    (TradingPrefs)
--   premarket         <- edgeflo_trading_premarket   ({ day, completed[] })
--   pins              <- edgeflo_trading_pins         (["EURUSD", ...])
--
-- One row per user. The settings blobs are stored as jsonb so the client can
-- keep merging them with its DEFAULT_* objects (same shapes as today).
-- ============================================================================

create table if not exists public.user_settings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users (id) on delete cascade,

  starting_balance  numeric not null default 10000,
  account           jsonb   not null default '{}'::jsonb,
  routine           jsonb   not null default '{}'::jsonb,
  trading           jsonb   not null default '{}'::jsonb,
  premarket         jsonb   not null default '{}'::jsonb,
  pins              jsonb   not null default '["EURUSD"]'::jsonb,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One settings row per user. (user_id is nullable pre-auth; Postgres treats
-- NULLs as distinct, so the anon app manages a single row it remembers by id.)
create unique index if not exists user_settings_user_id_key
  on public.user_settings (user_id)
  where user_id is not null;

-- keep updated_at fresh (reuses set_updated_at() from 0001)
drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ⚠️ DEV RLS: anon read/write so settings work before auth. Tighten once login
--    exists (see TODO).
-- ----------------------------------------------------------------------------
alter table public.user_settings enable row level security;

drop policy if exists "dev anon read user_settings"  on public.user_settings;
drop policy if exists "dev anon write user_settings" on public.user_settings;

create policy "dev anon read user_settings"
  on public.user_settings for select using (true);
create policy "dev anon write user_settings"
  on public.user_settings for all using (true) with check (true);

-- TODO (after auth):
--   drop the two "dev anon" policies above and replace with:
--     select: using (auth.uid() = user_id)
--     insert: with check (auth.uid() = user_id)
--     update/delete: using (auth.uid() = user_id)
--   and change user_id to `not null default auth.uid()`.
