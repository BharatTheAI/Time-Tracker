// supabase/functions/disable-employee/index.ts
//
// Admin-only. Sets profiles.is_active = false AND immediately revokes
// all active sessions for that user (so an already-open tab can't
// keep working). Historical time_entries/edit_requests/audit_logs
// rows are NEVER touched — they remain fully visible to admin forever.
// Reactivation uses the same endpoint with is_active=true (no session
// revocation needed in that direction).

import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  getUserClient,
  getRequestUser,
  getCallerProfile,
  getServiceClient,
} from "../_shared/supabaseClients.ts";

interface DisableEmployeeBody {
  employee_id: string;
  is_active: boolean; // false = disable, true = reactivate
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

  let body: DisableEmployeeBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { employee_id, is_active } = body;

  if (!employee_id || typeof is_active !== "boolean") {
    return jsonResponse(
      { error: "employee_id and is_active (boolean) are required" },
      400,
    );
  }

  if (employee_id === user.id && is_active === false) {
    return jsonResponse({ error: "You cannot disable your own account" }, 400);
  }

  // Real status change goes through the RPC (0006 migration), which
  // re-checks is_admin() server-side.
  const userScopedClient = getUserClient(req);
  const { data: updated, error } = await userScopedClient.rpc(
    "set_employee_active_status",
    { p_user_id: employee_id, p_is_active: is_active },
  );

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  // Revoke sessions immediately on disable, using the service client
  // since session management requires the admin auth API.
  if (is_active === false) {
    const service = getServiceClient();
    const { error: signOutError } = await service.auth.admin.signOut(
      employee_id,
      "global",
    );
    if (signOutError) {
      // Status is already updated and RLS's is_active_user() check
      // will block further data access regardless, so we don't fail
      // the whole request — but we do surface the issue.
      return jsonResponse({
        employee: updated,
        warning: `Status updated, but session revocation failed: ${signOutError.message}`,
      });
    }
  }

  return jsonResponse({ employee: updated });
});
