-- ============================================================================
-- 0008_trade_status.sql  —  Live / closed trade lifecycle
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0007).
--
-- A trade is "live" once started (entry emotion + notes captured) and "closed"
-- once finished (exit emotion + outcome captured). Only closed trades count in
-- the performance stats.
-- ============================================================================

alter table public.trades
  add column if not exists status text not null default 'closed'
    check (status in ('live', 'closed'));

create index if not exists trades_status_idx on public.trades (status);
