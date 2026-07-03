-- =====================================================================
-- 0006_employee_management.sql
-- Admin-only employee lifecycle operations.
-- NOTE: auth.users creation itself (with password) must happen via
-- supabase.auth.admin.createUser() from an Edge Function using the
-- service role key — that cannot be done in plain SQL. This migration
-- provides the profile-side function that the Edge Function calls
-- immediately after creating the auth user, plus disable/reactivate.
-- =====================================================================

-- Called by the create-employee Edge Function right after
-- auth.admin.createUser() succeeds, using the service role (bypasses
-- RLS by connecting as postgres/service_role, not via this function).
-- Kept as a function for a single consistent insertion point + audit.
--
-- p_actor_id: the admin performing this action, passed explicitly
-- because the service-role client has no caller JWT (auth.uid() would
-- be NULL). This is set as a session-local override so the
-- log_profile_change audit trigger (via current_actor_id(), see 0004)
-- attributes the resulting 'employee_created' entry correctly instead
-- of leaving actor_id blank.
create or replace function provision_employee_profile(
  p_user_id uuid,
  p_full_name text,
  p_employee_code text,
  p_role text default 'employee',
  p_actor_id uuid default null
)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row profiles;
begin
  -- This function is only callable by the service role in practice
  -- (invoked from an Edge Function with the service key), but we still
  -- guard it: if called with a user JWT, require admin.
  if auth.role() <> 'service_role' and not is_admin() then
    raise exception 'Only admin can provision employees';
  end if;

  if p_role not in ('employee', 'admin') then
    raise exception 'Invalid role';
  end if;

  if p_actor_id is not null then
    perform set_config('audit.actor_id', p_actor_id::text, true); -- true = local to this transaction only
  end if;

  insert into profiles (id, full_name, role, employee_code, is_active)
  values (p_user_id, p_full_name, p_role, p_employee_code, true)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function provision_employee_profile(uuid, text, text, text, uuid) to service_role, authenticated;


-- Disable/reactivate — historical time_entries/edit_requests/audit_logs
-- for this employee are NEVER touched or deleted by this function.
-- Session revocation happens in the calling Edge Function (auth.admin
-- API), not here.
create or replace function set_employee_active_status(
  p_user_id uuid,
  p_is_active boolean
)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row profiles;
begin
  if not is_admin() then
    raise exception 'Only admin can change employee status';
  end if;

  update profiles
  set is_active = p_is_active, updated_at = now()
  where id = p_user_id
  returning * into v_row;

  if v_row is null then
    raise exception 'Employee not found';
  end if;

  return v_row;
end;
$$;

grant execute on function set_employee_active_status(uuid, boolean) to authenticated;
