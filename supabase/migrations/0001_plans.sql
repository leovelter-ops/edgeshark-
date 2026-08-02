-- ============================================================================
-- 0001_plans.sql  —  Edge / trading playbooks
-- Run this in your project's SQL editor:
--   Supabase Dashboard (project ncaodaxcotuhsypigmwl) → SQL Editor → New query
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.plans (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references auth.users (id) on delete cascade,
  name                    text not null,
  plan_type               text,
  dot_color               text not null default 'yellow'
                            check (dot_color in ('yellow', 'red', 'green')),
  is_preset               boolean not null default false,

  -- Risk controls
  max_trades_per_day      numeric,
  max_daily_loss          numeric,
  max_daily_profit        numeric,
  risk_per_trade          numeric,

  -- List / text sections (stored as JSON for a flexible v1)
  charting_process        jsonb not null default '[]'::jsonb,  -- ["step", ...]
  entry_criteria          jsonb not null default '[]'::jsonb,  -- [{"label":"","checked":false}]
  trade_management_rules  jsonb not null default '[]'::jsonb,  -- ["rule", ...]
  exit_criteria           jsonb not null default '[]'::jsonb,  -- ["rule", ...]
  trading_notes           text,

  -- Entry models (images)
  setup_screenshot_url    text,
  entry_example_urls      jsonb not null default '[]'::jsonb,  -- ["url", ...]

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists plans_user_id_idx on public.plans (user_id);
create index if not exists plans_is_preset_idx on public.plans (is_preset);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists plans_set_updated_at on public.plans;
create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ⚠️ DEV POLICIES: these allow anonymous read/write so the app works before
--    auth is built. TIGHTEN THESE once login exists (see TODO below).
-- ----------------------------------------------------------------------------
alter table public.plans enable row level security;

drop policy if exists "dev anon read plans"   on public.plans;
drop policy if exists "dev anon write plans"   on public.plans;

create policy "dev anon read plans"
  on public.plans for select
  using (true);

create policy "dev anon write plans"
  on public.plans for all
  using (true)
  with check (true);

-- TODO (after auth):
--   drop the two "dev anon" policies above and replace with:
--     select: using (is_preset or auth.uid() = user_id)
--     insert: with check (auth.uid() = user_id)
--     update/delete: using (auth.uid() = user_id)

-- ----------------------------------------------------------------------------
-- Seed the three presets shown in the Edge screen
-- ----------------------------------------------------------------------------
insert into public.plans
  (name, plan_type, dot_color, is_preset,
   max_trades_per_day, max_daily_loss, max_daily_profit, risk_per_trade,
   charting_process, entry_criteria, trade_management_rules)
values
  (
    'Market Mechanics Plan', 'Failed Reaction LQ Sweep', 'yellow', true,
    5, 100, 1000, 1,
    '["Map relevant POIs on 4H","Identify whether price is in continuation or pullback phase on 15min","Wait for 15min POI","Look for Entry Model on 5min"]'::jsonb,
    '[{"label":"Imbalance","checked":false},{"label":"Market Shift + LQ Sweep","checked":false},{"label":"Breakout Candle","checked":false}]'::jsonb,
    '["Move stop to breakeven after 1R"]'::jsonb
  ),
  (
    'Jason''s Strategy', 'London Checklist', 'red', true,
    null, null, null, null,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
  ),
  (
    'Weekly Range', 'Aiming to capture the range of the weekly candle', 'red', true,
    null, null, null, null,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
  )
on conflict do nothing;
