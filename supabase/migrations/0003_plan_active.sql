-- ============================================================================
-- 0003_plan_active.sql  —  Active/Inactive flag for plans
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0002).
-- ============================================================================

alter table public.plans
  add column if not exists is_active boolean not null default false;

-- At most one active plan at a time (partial unique index over active rows).
create unique index if not exists plans_single_active_idx
  on public.plans (is_active)
  where is_active;
