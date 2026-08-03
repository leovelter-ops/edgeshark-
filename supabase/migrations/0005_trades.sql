-- ============================================================================
-- 0005_trades.sql  —  Journal trades (manual trade log)
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0004).
--
-- Backs the Trading page "Log Trade" form and the Journal calendar. One row
-- per logged trade. Mirrors the JournalTrade shape in src/lib/journal.ts.
-- ============================================================================

create table if not exists public.trades (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete cascade,

  symbol         text not null,                    -- "EURUSD"
  flag           text not null default '',         -- emoji
  direction      text not null
                   check (direction in ('Buy', 'Sell')),
  net_pnl        numeric not null default 0,       -- realized $, sign = win/loss
  r_multiple     numeric not null default 0,       -- R multiple (0 if unknown)
  emotion        text not null default '',         -- "" or an emoji
  note           text not null default '',
  plan_followed  boolean not null default true,
  executed_at    timestamptz not null default now(), -- when the trade happened

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists trades_user_id_idx     on public.trades (user_id);
create index if not exists trades_executed_at_idx  on public.trades (executed_at desc);

-- keep updated_at fresh (reuses set_updated_at() from 0001)
drop trigger if exists trades_set_updated_at on public.trades;
create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ⚠️ DEV RLS: anon read/write so the journal works before auth. Tighten once
--    login exists (see TODO).
-- ----------------------------------------------------------------------------
alter table public.trades enable row level security;

drop policy if exists "dev anon read trades"  on public.trades;
drop policy if exists "dev anon write trades" on public.trades;

create policy "dev anon read trades"
  on public.trades for select using (true);
create policy "dev anon write trades"
  on public.trades for all using (true) with check (true);

-- TODO (after auth):
--   drop the two "dev anon" policies above and replace with:
--     select: using (auth.uid() = user_id)
--     insert: with check (auth.uid() = user_id)
--     update/delete: using (auth.uid() = user_id)
