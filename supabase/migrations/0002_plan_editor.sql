-- ============================================================================
-- 0002_plan_editor.sql  —  Trading Window fields + image-upload storage bucket
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0001).
-- ============================================================================

-- Trading Window / news-block fields (nullable so existing presets are unchanged)
alter table public.plans add column if not exists trading_window_start text;
alter table public.plans add column if not exists trading_window_end   text;
alter table public.plans add column if not exists block_news_note       text;

-- ----------------------------------------------------------------------------
-- Storage bucket for Entry Model screenshots
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('plan-images', 'plan-images', true)
on conflict (id) do nothing;

-- ⚠️ DEV POLICIES: allow anon read/write to this bucket so uploads work before
--    auth exists. TIGHTEN once login is added (scope to auth.uid()).
drop policy if exists "dev read plan-images"   on storage.objects;
drop policy if exists "dev insert plan-images" on storage.objects;
drop policy if exists "dev update plan-images" on storage.objects;
drop policy if exists "dev delete plan-images" on storage.objects;

create policy "dev read plan-images"
  on storage.objects for select using (bucket_id = 'plan-images');
create policy "dev insert plan-images"
  on storage.objects for insert with check (bucket_id = 'plan-images');
create policy "dev update plan-images"
  on storage.objects for update using (bucket_id = 'plan-images');
create policy "dev delete plan-images"
  on storage.objects for delete using (bucket_id = 'plan-images');
