-- =====================================================================
-- 0001_init_schema.sql
-- CA Firm Time Tracking System — Core Schema
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- PROFILES (extends auth.users with role + status)
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('employee', 'admin')),
  is_active boolean not null default true,
  employee_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Extends auth.users with role and active status. One row per user.';

-- ---------------------------------------------------------------------
-- CLIENTS (master data managed by admin)
-- ---------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  billable boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_not_blank check (length(trim(name)) > 0)
);

create unique index clients_name_unique_ci on clients (lower(name));

-- ---------------------------------------------------------------------
-- TASK CATEGORY ENUM
-- ---------------------------------------------------------------------
create type task_category as enum (
  'Audit',
  'GST',
  'Income Tax',
  'Accounting',
  'MCA Filing',
  'Research',
  'Internal Work',
  'Compliance',
  'Other'
);

-- ---------------------------------------------------------------------
-- TIME ENTRIES (manual work log — no timer, locks instantly on submit)
-- ---------------------------------------------------------------------
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id),
  client_id uuid references clients(id),          -- nullable for Internal Work
  category task_category not null,
  entry_date date not null,
  hours_spent numeric(5,2) not null,
  description text,
  is_locked boolean not null default true,         -- always true from creation; kept explicit for clarity/auditing
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint hours_spent_range check (hours_spent > 0 and hours_spent <= 24),
  constraint entry_date_not_future check (entry_date <= (now() at time zone 'Asia/Kolkata')::date),
  constraint internal_work_no_client check (
    (category = 'Internal Work') or (client_id is not null)
  )
);

create index time_entries_employee_idx on time_entries (employee_id, entry_date desc);
create index time_entries_client_idx on time_entries (client_id, entry_date desc);
create index time_entries_date_idx on time_entries (entry_date);

comment on column time_entries.is_locked is 'Always true post-insert. Corrections go through edit_requests, never a direct UPDATE by the employee.';

-- ---------------------------------------------------------------------
-- EDIT REQUESTS (the only path to modify a locked entry)
-- ---------------------------------------------------------------------
create table edit_requests (
  id uuid primary key default gen_random_uuid(),
  time_entry_id uuid not null references time_entries(id),
  requested_by uuid not null references profiles(id),
  reason text not null,
  proposed_changes jsonb not null,   -- { client_id, category, entry_date, hours_spent, description }
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),

  constraint reason_not_blank check (length(trim(reason)) > 0)
);

create index edit_requests_status_idx on edit_requests (status, created_at desc);
create index edit_requests_entry_idx on edit_requests (time_entry_id);

-- ---------------------------------------------------------------------
-- AUDIT LOGS (append-only, system + trigger managed)
-- ---------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on audit_logs (actor_id, created_at desc);
create index audit_logs_target_idx on audit_logs (target_table, target_id);
create index audit_logs_created_idx on audit_logs (created_at desc);

-- ---------------------------------------------------------------------
-- LOGIN EVENTS
-- ---------------------------------------------------------------------
create table login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  event_type text not null check (event_type in ('login_success', 'login_failed', 'logout')),
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index login_events_user_idx on login_events (user_id, created_at desc);
