// supabase/functions/review-edit-request/index.ts
//
// Admin approves or rejects a pending correction request. On approval,
// review_edit_request() (0005 migration) atomically applies the
// proposed changes to the locked time_entries row — this is the ONLY
// code path in the entire system that can modify a submitted entry.
// The is_admin() check happens both here (fast-fail) and again inside
// the Postgres function (real enforcement).

import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  getUserClient,
  getRequestUser,
  getCallerProfile,
} from "../_shared/supabaseClients.ts";

interface ReviewBody {
  edit_request_id: string;
  decision: "approved" | "rejected";
  review_note?: string;
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

  const profile = await getCallerProfile(user.id);
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return jsonResponse({ error: "Admin access required" }, 403);
  }

  let body: ReviewBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { edit_request_id, decision, review_note } = body;

  if (!edit_request_id || !decision) {
    return jsonResponse(
      { error: "edit_request_id and decision are required" },
      400,
    );
  }

  if (!["approved", "rejected"].includes(decision)) {
    return jsonResponse(
      { error: "decision must be 'approved' or 'rejected'" },
      400,
    );
  }

  const client = getUserClient(req);
  const { data, error } = await client.rpc("review_edit_request", {
    p_edit_request_id: edit_request_id,
    p_decision: decision,
    p_review_note: review_note ?? null,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ edit_request: data });
});
