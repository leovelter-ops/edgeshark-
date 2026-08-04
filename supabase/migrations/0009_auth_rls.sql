-- ============================================================================
-- 0009_auth_rls.sql  —  Per-user data now that real auth (Supabase Auth) exists
-- Run in the SQL Editor of project ncaodaxcotuhsypigmwl (AFTER 0008).
--
-- Replaces the dev-anon "allow everything" policies with per-user policies and
-- defaults user_id to the signed-in user, so trades / settings / plans / notes
-- are scoped to each account. Run this AFTER you've created your account and
-- can sign in. Existing dev rows have user_id = null and become invisible.
-- ============================================================================

-- ---- default user_id to the caller ----------------------------------------
alter table public.trades        alter column user_id set default auth.uid();
alter table public.user_settings alter column user_id set default auth.uid();
alter table public.plans         alter column user_id set default auth.uid();
alter table public.notes         alter column user_id set default auth.uid();

-- ---- trades ---------------------------------------------------------------
drop policy if exists "dev anon read trades"  on public.trades;
drop policy if exists "dev anon write trades" on public.trades;
create policy "own trades read"   on public.trades for select using (auth.uid() = user_id);
create policy "own trades write"  on public.trades for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- user_settings --------------------------------------------------------
drop policy if exists "dev anon read user_settings"  on public.user_settings;
drop policy if exists "dev anon write user_settings" on public.user_settings;
create policy "own settings read"  on public.user_settings for select using (auth.uid() = user_id);
create policy "own settings write" on public.user_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- notes ----------------------------------------------------------------
drop policy if exists "dev anon read notes"  on public.notes;
drop policy if exists "dev anon write notes" on public.notes;
create policy "own notes read"  on public.notes for select using (auth.uid() = user_id);
create policy "own notes write" on public.notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- plans (presets stay readable by everyone) ----------------------------
drop policy if exists "dev anon read plans"  on public.plans;
drop policy if exists "dev anon write plans" on public.plans;
create policy "plans read"   on public.plans for select
  using (is_preset or auth.uid() = user_id);
create policy "plans write"  on public.plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
