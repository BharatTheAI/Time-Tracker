# Deployment Checklist

## Backend (Supabase)

- [ ] Create a Supabase project (choose the Mumbai / `ap-south-1` region
      for lowest latency to IST users, if available on your plan).
- [ ] `supabase link` and `supabase db push` to apply all 6 migrations.
- [ ] Confirm `enable_signup = false` under Authentication → Providers →
      Email (already set in `config.toml`, but verify in the dashboard
      for hosted projects since `config.toml` only governs local dev
      unless you deploy config too).
- [ ] Set Authentication → Policies → Minimum password length to `10`.
- [ ] Deploy all 7 Edge Functions (`supabase functions deploy <name>`).
- [ ] Set the `ALLOWED_ORIGIN` secret to your production frontend origin.
- [ ] Verify RLS is enabled on all 6 tables (Dashboard → Database →
      Tables → each table should show "RLS enabled").
- [ ] Create the bootstrap admin (see README §6).

## Frontend

- [ ] `frontend/.env` populated with `VITE_SUPABASE_URL` and
      `VITE_SUPABASE_ANON_KEY` (the anon/public key — never the service
      role key, which must only ever live in Edge Function secrets).
- [ ] `npm run build`, deploy `frontend/dist` to Vercel/Netlify or any
      static host.
- [ ] Confirm the deployed frontend origin matches `ALLOWED_ORIGIN` set
      on the backend, or Edge Function calls will be blocked by CORS.

## Post-deploy verification

- [ ] Log in as the bootstrap admin, create a test employee via
      Employee Master.
- [ ] Log in as that employee, submit a work entry, confirm it appears
      locked (no edit/delete controls) in "My Entries."
- [ ] Submit a correction request as the employee; confirm it shows up
      under Admin → Corrections with the pending badge.
- [ ] Approve it as admin; confirm the entry's values update and the
      audit log shows `entry_created`, `edit_requested`, and
      `edit_approved` entries for the same `time_entry_id`.
- [ ] Disable the test employee; confirm they can no longer log in, and
      that their historical entry is still visible under Admin →
      Overview / Export.
- [ ] Run a CSV and an XLSX export from Export Center and confirm both
      download correctly.
- [ ] From a second browser/incognito window logged in as a different
      employee, attempt a direct `fetch()` to the Supabase REST API for
      `time_entries` filtered by another employee's ID — confirm it
      returns zero rows (RLS working as intended).

## Ongoing

- [ ] Rotate the service role key periodically via Supabase Dashboard →
      Project Settings → API, and update it in Edge Function secrets
      (`supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`) — this key
      is managed by Supabase automatically for Edge Functions in most
      setups, but confirm your deployment method.
- [ ] Periodically review `audit_logs` for `admin_deleted_entry` or
      unexpected `admin_edited_entry` actions, since even admins should
      generally route changes through the edit-request flow rather than
      raw table edits.
