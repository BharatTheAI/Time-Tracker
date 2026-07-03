// supabase/functions/request-entry-edit/index.ts
//
// Employee requests a correction to one of their own locked entries.
// This never modifies time_entries directly — it only creates a
// pending edit_requests row. Ownership + "no double pending request"
// checks are enforced inside submit_edit_request() (0005 migration).

import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getUserClient, getRequestUser } from "../_shared/supabaseClients.ts";

interface RequestEditBody {
  time_entry_id: string;
  reason: string;
  proposed_changes: {
    client_id?: string | null;
    category?: string;
    entry_date?: string;
    hours_spent?: number;
    description?: string;
  };
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

  let body: RequestEditBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { time_entry_id, reason, proposed_changes } = body;

  if (!time_entry_id || !reason || !proposed_changes) {
    return jsonResponse(
      { error: "time_entry_id, reason, and proposed_changes are required" },
      400,
    );
  }

  if (Object.keys(proposed_changes).length === 0) {
    return jsonResponse({ error: "proposed_changes cannot be empty" }, 400);
  }

  const client = getUserClient(req);
  const { data, error } = await client.rpc("submit_edit_request", {
    p_time_entry_id: time_entry_id,
    p_reason: reason,
    p_proposed_changes: proposed_changes,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ edit_request: data });
});
