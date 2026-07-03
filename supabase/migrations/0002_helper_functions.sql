-- =====================================================================
-- 0002_helper_functions.sql
-- SECURITY DEFINER helper functions used inside RLS policies.
-- These run with elevated privilege internally but only ever return
-- booleans/scalars derived from the CALLING user's auth.uid() — they
-- do not leak data themselves.
-- =====================================================================

create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function is_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and is_active = true
  );
$$;

comment on function is_admin() is 'True if the currently authenticated user is an active admin. Used in RLS policies.';
comment on function is_active_user() is 'True if the currently authenticated user has an active profile. Disabled accounts fail this even with a still-valid JWT.';
