// supabase/functions/submit-entry/index.ts
//
// Employee submits a manual work entry. Entry is locked the instant it
// is created — there is no "draft" state. All real validation happens
// server-side in the submit_entry() Postgres function (0005 migration);
// this Edge Function is a thin, auth-checked wrapper around that RPC so
// we get a clean HTTP surface plus a place for request-shape validation.

import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getUserClient, getRequestUser } from "../_shared/supabaseClients.ts";

interface SubmitEntryBody {
  client_id: string | null;
  category: string;
  entry_date: string; // YYYY-MM-DD
  hours_spent: number;
  description?: string;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const user = await getRequestUser(req);
  if (!user) {
    return jsonResponse({ error: "Not authenticated" }, 401);
  }

  let body: SubmitEntryBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { client_id, category, entry_date, hours_spent, description } = body;

  if (!category || !entry_date || hours_spent === undefined || hours_spent === null) {
    return jsonResponse(
      { error: "category, entry_date, and hours_spent are required" },
      400,
    );
  }

  // The RPC (submit_entry) uses auth.uid() from the caller's JWT for
  // employee_id — it is never taken from the request body, so there is
  // no way for a caller to submit an entry as someone else even if
  // they tamper with this payload.
  const client = getUserClient(req);
  const { data, error } = await client.rpc("submit_entry", {
    p_client_id: client_id ?? null,
    p_category: category,
    p_entry_date: entry_date,
    p_hours_spent: hours_spent,
    p_description: description ?? null,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ entry: data });
});
