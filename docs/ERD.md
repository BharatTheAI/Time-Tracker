# Entity Relationship Diagram

```
auth.users (Supabase managed)
     │ 1:1
     ▼
 profiles ────────────────────────────┐
 (id, full_name, role,                │
  is_active, employee_code)           │
     │ 1:N                            │ 1:N
     ▼                                ▼
 time_entries                    edit_requests
 (id, employee_id FK,            (id, time_entry_id FK,
  client_id FK,                   requested_by FK,
  category, entry_date,           reason, proposed_changes,
  hours_spent, description,       status, reviewed_by FK,
  is_locked)                      reviewed_at, review_note)
     ▲
     │ N:1
 clients
 (id, name, is_active, billable,
  created_by FK)


 audit_logs
 (id, actor_id FK -> profiles,
  action, target_table, target_id,
  metadata jsonb, created_at)
 — append-only, populated by triggers on
   time_entries / edit_requests / clients / profiles

 login_events
 (id, user_id FK -> profiles,
  event_type, created_at)
 — populated via record_login_event() RPC
   called from the frontend on sign-in/out
```

## Relationship notes

- `time_entries.employee_id` → `profiles.id`: one employee has many
  entries. RLS restricts SELECT to `employee_id = auth.uid()` unless
  the caller is an admin.
- `time_entries.client_id` → `clients.id`: nullable, because
  `category = 'Internal Work'` entries have no client (enforced by the
  `internal_work_no_client` check constraint).
- `edit_requests.time_entry_id` → `time_entries.id`: many correction
  requests can reference one entry over time, but the
  `submit_edit_request()` function blocks creating a second `pending`
  request while one is already open.
- `edit_requests.requested_by` / `reviewed_by` → `profiles.id`: the
  requester is always the entry's own employee (enforced in
  `submit_edit_request()`); the reviewer is always an admin (enforced in
  `review_edit_request()`).
- `audit_logs.target_id` is a loosely-typed UUID (no FK) since it points
  at rows across several different tables (`time_entries`,
  `edit_requests`, `clients`, `profiles`) depending on `target_table`.

## Reporting views (derived, not stored)

- `client_hours_summary` — aggregates `time_entries` by client and month.
- `employee_hours_summary` — aggregates `time_entries` by employee and month.
- `billable_summary` — aggregates by month and billable/non-billable status.

All three are `security_invoker` views with an explicit `is_admin()`
guard in the `WHERE` clause, so they return zero rows for non-admin
callers even if queried directly.
