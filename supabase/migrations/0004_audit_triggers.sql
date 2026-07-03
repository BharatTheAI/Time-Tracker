-- =====================================================================
-- 0004_audit_triggers.sql
-- Database-level audit logging. These fire on ANY change to the
-- tracked tables, including changes made directly in Supabase Studio
-- by an admin (not just changes made through the app) — so "no silent
-- modifications" is guaranteed at the Postgres level, not the app level.
-- =====================================================================

-- Resolves the acting user for audit purposes. Normally this is just
-- auth.uid() (the caller's own JWT). The one exception is writes made
-- via the service-role client (e.g. provision_employee_profile, called
-- from the create-employee Edge Function after auth.admin.createUser())
-- where there is no caller JWT and auth.uid() is NULL. In that case the
-- Edge Function sets a session-local 'audit.actor_id' via set_config()
-- immediately before the write, and this function falls back to it —
-- so the audit trail still attributes the action to the real admin
-- instead of recording a blank actor.
create or replace function current_actor_id()
returns uuid
language plpgsql
stable
as $$
declare
  v_override text;
begin
  if auth.uid() is not null then
    return auth.uid();
  end if;

  v_override := nullif(current_setting('audit.actor_id', true), '');
  if v_override is null then
    return null;
  end if;

  return v_override::uuid;
end;
$$;

create or replace function log_time_entry_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'entry_created';
  elsif tg_op = 'UPDATE' then
    v_action := 'admin_edited_entry';
  elsif tg_op = 'DELETE' then
    v_action := 'admin_deleted_entry';
  end if;

  insert into audit_logs (actor_id, action, target_table, target_id, metadata)
  values (
    current_actor_id(),
    v_action,
    'time_entries',
    coalesce(new.id, old.id),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_time_entries_audit
  after insert or update or delete on time_entries
  for each row execute function log_time_entry_change();


create or replace function log_edit_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'edit_requested';
  elsif tg_op = 'UPDATE' and new.status = 'approved' and old.status = 'pending' then
    v_action := 'edit_approved';
  elsif tg_op = 'UPDATE' and new.status = 'rejected' and old.status = 'pending' then
    v_action := 'edit_rejected';
  else
    v_action := 'edit_request_updated';
  end if;

  insert into audit_logs (actor_id, action, target_table, target_id, metadata)
  values (
    current_actor_id(),
    v_action,
    'edit_requests',
    coalesce(new.id, old.id),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_edit_requests_audit
  after insert or update on edit_requests
  for each row execute function log_edit_request_change();


create or replace function log_client_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'client_created';
  elsif tg_op = 'UPDATE' then
    v_action := 'client_updated';
  elsif tg_op = 'DELETE' then
    v_action := 'client_deleted';
  end if;

  insert into audit_logs (actor_id, action, target_table, target_id, metadata)
  values (
    current_actor_id(),
    v_action,
    'clients',
    coalesce(new.id, old.id),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_clients_audit
  after insert or update or delete on clients
  for each row execute function log_client_change();


create or replace function log_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'employee_created';
  elsif tg_op = 'UPDATE' and new.is_active = false and old.is_active = true then
    v_action := 'employee_disabled';
  elsif tg_op = 'UPDATE' and new.is_active = true and old.is_active = false then
    v_action := 'employee_reactivated';
  elsif tg_op = 'UPDATE' then
    v_action := 'profile_updated';
  end if;

  insert into audit_logs (actor_id, action, target_table, target_id, metadata)
  values (
    current_actor_id(),
    v_action,
    'profiles',
    coalesce(new.id, old.id),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );

  return coalesce(new, old);
end;
$$;

create trigger trg_profiles_audit
  after insert or update on profiles
  for each row execute function log_profile_change();


-- ---------------------------------------------------------------------
-- Helper: record a login/logout event. SECURITY DEFINER so it can
-- write to login_events even though 'authenticated' has no direct
-- insert grant on that table.
-- ---------------------------------------------------------------------
create or replace function record_login_event(
  p_user_id uuid,
  p_event_type text,
  p_ip_address text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into login_events (user_id, event_type, ip_address, user_agent)
  values (p_user_id, p_event_type, p_ip_address, p_user_agent);
end;
$$;

grant execute on function record_login_event(uuid, text, text, text) to authenticated, anon;
