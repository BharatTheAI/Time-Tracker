# TimeTrack — CA Firm Time Tracking System

Full-stack internal time tracking application for a 10–15 person CA firm.
Manual work-entry based (no live timer) — employees log hours after the
fact; every submitted entry is immediately locked; corrections go through
an admin-approved edit-request workflow. Built on React + Supabase
(Postgres, Auth, Row Level Security, Edge Functions).

## 1. Prerequisites

- Node.js 18+
- A Supabase project (free tier is enough for 10–15 users)
- [Supabase CLI](https://supabase.com/docs/guides/cli) for local dev / migrations / deploying Edge Functions

## 2. Database Setup

```bash
cd supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase db push          # applies all migrations in supabase/migrations, in order
```

This creates all tables, RLS policies, audit triggers, business-logic
RPC functions, and reporting views. Order matters — the migrations are
numbered `0001` through `0006` and must run in sequence (a fresh
`db push` handles this automatically).

## 3. Auth Configuration

In the Supabase Dashboard → Authentication → Providers:
- Disable public sign-ups (already set via `supabase/config.toml` →
  `enable_signup = false`) — all accounts are provisioned by the admin
  through the app.
- Set **Minimum password length** to `10` under Authentication → Policies
  (the full complexity rule — upper/lower/number/special — is enforced
  in the `create-employee` and `reset-employee-credentials` Edge
  Functions, since Supabase's native policy only covers length).

## 4. Deploy Edge Functions

```bash
cd supabase
supabase functions deploy submit-entry
supabase functions deploy request-entry-edit
supabase functions deploy review-edit-request
supabase functions deploy create-employee
supabase functions deploy disable-employee
supabase functions deploy reset-employee-credentials
supabase functions deploy export-report
```

Set the `ALLOWED_ORIGIN` secret to your deployed frontend URL (used for CORS):

```bash
supabase secrets set ALLOWED_ORIGIN=https://your-app.vercel.app
```

## 5. Frontend Setup

```bash
cd frontend
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from
# Supabase Dashboard → Project Settings → API
npm install
npm run dev
```

Build for production:

```bash
npm run build      # outputs to frontend/dist — deploy to Vercel/Netlify
```

## 6. Creating the First Admin

Since public sign-up is disabled and only admins can create employees,
you need one bootstrap admin. Easiest path: in the Supabase Dashboard →
Authentication → Users, click "Add user," create the account manually,
then in the SQL editor run:

```sql
select provision_employee_profile(
  '<the-new-user-uuid>',
  'Firm Administrator',
  'ADMIN001',
  'admin'
);
```

All subsequent employees (and additional admins) are created from the
app's Employee Master page.

## 7. Architecture Summary

- **Manual entries only** — no live timer. Employees fill in date,
  client, category, hours (decimal), and description. The entry is
  locked (`is_locked = true`) the instant it's created.
- **Corrections, not edits** — an employee can never UPDATE or DELETE a
  `time_entries` row (no RLS policy grants it). To fix a mistake they
  submit an `edit_requests` row; only `review_edit_request()` — callable
  by admins only — can apply changes to the original entry.
- **RLS is the real security boundary** — every table has Row Level
  Security enabled. Even a direct PostgREST/API call with a valid
  employee JWT cannot read another employee's rows or write outside
  policy, regardless of what the frontend does.
- **Full audit trail** — Postgres triggers log every insert/update/delete
  on `time_entries`, `edit_requests`, `clients`, and `profiles` to an
  append-only `audit_logs` table with no client-facing write grant.
- **Disabled accounts** — `profiles.is_active = false` blocks login and
  all data access immediately (via `is_active_user()` in every RLS
  policy) and revokes existing sessions server-side. Historical data for
  disabled employees is never deleted or hidden from admin.
- **Password policy** — min 10 characters + upper/lower/number/special,
  enforced server-side in the Edge Functions that set passwords.

See `docs/ERD.md` for the entity relationship diagram and
`docs/deployment.md` for a more detailed deployment checklist.
