-- =====================================================================
-- 0005_business_functions_and_views.sql
-- Core business logic as SECURITY DEFINER RPC functions (so validation
-- cannot be bypassed by calling PostgREST table endpoints directly),
-- plus reporting views for the admin dashboard.
-- =====================================================================

-- ---------------------------------------------------------------------
-- submit_entry: the ONLY way a time_entries row gets created.
-- Validates everything server-side; ignores any client-supplied
-- employee_id (always uses auth.uid()).
-- ---------------------------------------------------------------------
create or replace function submit_entry(
  p_client_id uuid,
  p_category task_category,
  p_entry_date date,
  p_hours_spent numeric,
  p_description text
)
returns time_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid := auth.uid();
  v_row time_entries;
begin
  if v_employee_id is null then
    raise exception 'Not authenticated';
  end if;

  if not is_active_user() then
    raise exception 'Account is disabled';
  end if;

  if p_hours_spent is null or p_hours_spent <= 0 or p_hours_spent > 24 then
    raise exception 'Hours spent must be greater than 0 and no more than 24';
  end if;

  if p_entry_date is null or p_entry_date > (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Entry date cannot be in the future';
  end if;

  if p_category <> 'Internal Work' and p_client_id is null then
    raise exception 'Client is required for this category';
  end if;

  if p_client_id is not null then
    if not exists (select 1 from clients where id = p_client_id and is_active = true) then
      raise exception 'Selected client is not valid or is inactive';
    end if;
  end if;

  insert into time_entries (employee_id, client_id, category, entry_date, hours_spent, description, is_locked)
  values (v_employee_id, p_client_id, p_category, p_entry_date, p_hours_spent, p_description, true)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function submit_entry(uuid, task_category, date, numeric, text) to authenticated;


-- ---------------------------------------------------------------------
-- submit_edit_request: employee requests a correction on their OWN
-- locked entry. Does not touch time_entries.
-- ---------------------------------------------------------------------
create or replace function submit_edit_request(
  p_time_entry_id uuid,
  p_reason text,
  p_proposed_changes jsonb
)
returns edit_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row edit_requests;
begin
  if not is_active_user() then
    raise exception 'Account is disabled';
  end if;

  if not exists (
    select 1 from time_entries
    where id = p_time_entry_id and employee_id = auth.uid()
  ) then
    raise exception 'Entry not found or not owned by you';
  end if;

  if exists (
    select 1 from edit_requests
    where time_entry_id = p_time_entry_id and status = 'pending'
  ) then
    raise exception 'A correction request is already pending for this entry';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required';
  end if;

  insert into edit_requests (time_entry_id, requested_by, reason, proposed_changes)
  values (p_time_entry_id, auth.uid(), p_reason, p_proposed_changes)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function submit_edit_request(uuid, text, jsonb) to authenticated;


-- ---------------------------------------------------------------------
-- review_edit_request: admin approves or rejects. On approval, applies
-- proposed_changes to time_entries atomically. This is the ONLY path
-- by which a locked time_entries row is ever modified.
-- ---------------------------------------------------------------------
create or replace function review_edit_request(
  p_edit_request_id uuid,
  p_decision text,          -- 'approved' | 'rejected'
  p_review_note text default null
)
returns edit_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request edit_requests;
  v_changes jsonb;
begin
  if not is_admin() then
    raise exception 'Only admin can review correction requests';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into v_request from edit_requests where id = p_edit_request_id for update;

  if v_request is null then
    raise exception 'Edit request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'This request has already been reviewed';
  end if;

  update edit_requests
  set status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note
  where id = p_edit_request_id
  returning * into v_request;

  if p_decision = 'approved' then
    v_changes := v_request.proposed_changes;

    update time_entries
    set
      client_id    = coalesce((v_changes->>'client_id')::uuid, client_id),
      category     = coalesce((v_changes->>'category')::task_category, category),
      entry_date   = coalesce((v_changes->>'entry_date')::date, entry_date),
      hours_spent  = coalesce((v_changes->>'hours_spent')::numeric, hours_spent),
      description  = coalesce(v_changes->>'description', description),
      updated_at   = now()
    where id = v_request.time_entry_id;
  end if;

  return v_request;
end;
$$;

grant execute on function review_edit_request(uuid, text, text) to authenticated;


-- =====================================================================
-- REPORTING VIEWS (admin-only via RLS-equivalent check baked into the
-- security_invoker views + underlying table RLS; views inherit RLS
-- from time_entries since they're security_invoker)
-- =====================================================================

-- These views are admin-only, enforced explicitly (not just via
-- underlying-table RLS), so a non-admin authenticated user querying
-- the view directly gets zero rows rather than a partial/misleading
-- aggregate built only from their own entries.

create view client_hours_summary
with (security_invoker = true) as
select
  c.id as client_id,
  c.name as client_name,
  c.billable,
  count(te.id) as entry_count,
  coalesce(sum(te.hours_spent), 0) as total_hours,
  date_trunc('month', te.entry_date) as month
from clients c
left join time_entries te on te.client_id = c.id
where is_admin()
group by c.id, c.name, c.billable, date_trunc('month', te.entry_date);

create view employee_hours_summary
with (security_invoker = true) as
select
  p.id as employee_id,
  p.full_name,
  p.employee_code,
  p.is_active,
  count(te.id) as entry_count,
  coalesce(sum(te.hours_spent), 0) as total_hours,
  date_trunc('month', te.entry_date) as month
from profiles p
left join time_entries te on te.employee_id = p.id
where p.role = 'employee' and is_admin()
group by p.id, p.full_name, p.employee_code, p.is_active, date_trunc('month', te.entry_date);

create view billable_summary
with (security_invoker = true) as
select
  date_trunc('month', te.entry_date) as month,
  case
    when te.category = 'Internal Work' then false
    else coalesce(c.billable, false)
  end as is_billable,
  coalesce(sum(te.hours_spent), 0) as total_hours
from time_entries te
left join clients c on c.id = te.client_id
where is_admin()
group by date_trunc('month', te.entry_date), is_billable;

grant select on client_hours_summary, employee_hours_summary, billable_summary to authenticated;

comment on view client_hours_summary is 'Admin-only aggregate — the is_admin() predicate in the WHERE clause returns zero rows for non-admin callers even if they query the view directly.';
