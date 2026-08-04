-- ============================================================================
-- 0010_profiles.sql  —  User profiles + auto-provision on signup
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0009).
--
-- Real auth is now on (email/password). When a user is added in Supabase Auth
-- (auth.users), this trigger automatically creates the matching public.profiles
-- row — so "adding a user" is all that's needed.
-- ============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- keep updated_at fresh (reuses set_updated_at() from 0001)
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self insert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;

create policy "profiles self read"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles self insert"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update"
  on public.profiles for update using (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- Auto-create a profile whenever an auth user is created.
-- SECURITY DEFINER so the trigger can insert past RLS.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any users that already exist.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
