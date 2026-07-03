-- =====================================================================
-- 0003_rls_policies.sql
-- Row Level Security — the actual, database-enforced security boundary.
-- These policies hold even if a client calls the PostgREST/Supabase API
-- directly with devtools, bypassing the frontend entirely.
-- =====================================================================

alter table profiles enable row level security;
alter table clients enable row level security;
alter table time_entries enable row level security;
alter table edit_requests enable row level security;
alter table audit_logs enable row level security;
alter table login_events enable row level security;

-- ---------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------
-- Everyone (authenticated) can see basic profile info (needed for
-- "employee-wise" dropdowns, entry attribution display, etc.) but only
-- their own full row unless admin.
create policy "profiles_select_self_or_admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

-- No self-service insert: profiles are created exclusively by the
-- admin-invoked create-employee Edge Function (service role), so there
-- is deliberately NO insert policy for 'authenticated'.

-- Employees may update a very limited set of their own non-sensitive
-- fields (nothing here yet — kept locked down). Admin can update any
-- profile (e.g. is_active, role corrections).
create policy "profiles_admin_update"
  on profiles for update
  using (is_admin());

-- ---------------------------------------------------------------------
-- CLIENTS
-- ---------------------------------------------------------------------
-- All active, authenticated users can read the client list (needed for
-- the dropdown). Only admins can write.
create policy "clients_select_all_authenticated"
  on clients for select
  using (is_active_user());

create policy "clients_admin_insert"
  on clients for insert
  with check (is_admin());

create policy "clients_admin_update"
  on clients for update
  using (is_admin());

create policy "clients_admin_delete"
  on clients for delete
  using (is_admin());

-- ---------------------------------------------------------------------
-- TIME ENTRIES
-- ---------------------------------------------------------------------
-- Employees see only their own entries; admins see all.
create policy "time_entries_select_own_or_admin"
  on time_entries for select
  using ((employee_id = auth.uid() and is_active_user()) or is_admin());

-- Employees may insert only their own entries (server-side Edge
-- Function also validates, this is defense-in-depth).
create policy "time_entries_insert_own"
  on time_entries for insert
  with check (employee_id = auth.uid() and is_active_user());

-- Deliberately NO update/delete policy for plain authenticated
-- employees. The absence of a policy is the enforcement: once RLS is
-- enabled, no policy means no access. Only admin can update/delete,
-- and even admin should route through admin-approve-edit for
-- traceability rather than raw table edits where possible.
create policy "time_entries_admin_update"
  on time_entries for update
  using (is_admin());

create policy "time_entries_admin_delete"
  on time_entries for delete
  using (is_admin());

-- ---------------------------------------------------------------------
-- EDIT REQUESTS
-- ---------------------------------------------------------------------
create policy "edit_requests_select_own_or_admin"
  on edit_requests for select
  using (requested_by = auth.uid() or is_admin());

-- Employee may only request an edit on an entry that is actually theirs.
create policy "edit_requests_insert_own_entry_only"
  on edit_requests for insert
  with check (
    requested_by = auth.uid()
    and is_active_user()
    and exists (
      select 1 from time_entries te
      where te.id = time_entry_id
        and te.employee_id = auth.uid()
    )
  );

-- Only admin can transition status (approve/reject). No delete policy
-- at all — edit request history is permanent.
create policy "edit_requests_admin_update"
  on edit_requests for update
  using (is_admin());

-- ---------------------------------------------------------------------
-- AUDIT LOGS — append-only, readable by admin only, writable by no one
-- directly (writes happen exclusively via SECURITY DEFINER triggers /
-- functions, which bypass RLS by design).
-- ---------------------------------------------------------------------
create policy "audit_logs_admin_select"
  on audit_logs for select
  using (is_admin());

revoke insert, update, delete on audit_logs from authenticated;
revoke insert, update, delete on audit_logs from anon;

-- ---------------------------------------------------------------------
-- LOGIN EVENTS — admin can read all; a user can read their own.
-- Writes happen via SECURITY DEFINER function only (see 0004).
-- ---------------------------------------------------------------------
create policy "login_events_select_own_or_admin"
  on login_events for select
  using (user_id = auth.uid() or is_admin());

revoke insert, update, delete on login_events from authenticated;
revoke insert, update, delete on login_events from anon;
