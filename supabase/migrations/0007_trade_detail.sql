-- ============================================================================
-- 0007_trade_detail.sql  —  Full trade-journal detail fields
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0006).
--
-- Adds the fields shown on the Journal trade-detail view: execution levels,
-- costs, session/duration, the review & reflection inputs, and the HTF/MTF/LTF
-- chart screenshots (stored as scaled data URLs in `charts`). All nullable so
-- existing trades are unaffected.
-- ============================================================================

alter table public.trades
  add column if not exists entry_price       numeric,
  add column if not exists exit_price        numeric,
  add column if not exists stop_loss         numeric,
  add column if not exists take_profit       numeric,
  add column if not exists lots              numeric,
  add column if not exists session           text,
  add column if not exists duration_min      integer,
  add column if not exists commission        numeric,
  add column if not exists swap              numeric,
  add column if not exists plan_intended     text,
  add column if not exists entry_confluences jsonb  not null default '[]'::jsonb,
  add column if not exists trade_management  text,
  add column if not exists mistakes          jsonb  not null default '[]'::jsonb,
  add column if not exists entry_emotion     text,
  add column if not exists exit_emotion      text,
  -- { "htf": "data:...", "mtf": "data:...", "ltf": "data:..." }
  add column if not exists charts            jsonb  not null default '{}'::jsonb;
