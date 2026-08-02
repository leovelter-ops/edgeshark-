-- ============================================================================
-- 0004_notes.sql  —  Notebook notes
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0003).
-- ============================================================================

create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  title       text not null default 'Untitled',
  content     text not null default '',
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists notes_updated_at_idx on public.notes (updated_at desc);

-- keep updated_at fresh (reuses set_updated_at() from 0001)
drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ⚠️ DEV RLS: anon read/write so notes work before auth. Tighten once login exists.
-- ----------------------------------------------------------------------------
alter table public.notes enable row level security;

drop policy if exists "dev anon read notes"  on public.notes;
drop policy if exists "dev anon write notes" on public.notes;

create policy "dev anon read notes"
  on public.notes for select using (true);
create policy "dev anon write notes"
  on public.notes for all using (true) with check (true);
