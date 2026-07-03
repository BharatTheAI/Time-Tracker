// supabase/functions/reset-employee-credentials/index.ts
//
// Admin-only. Sets a new password for an employee and revokes their
// existing sessions (forces re-login with the new credential). Logs
// the action to audit_logs explicitly since auth.users changes aren't
// covered by the profiles/time_entries triggers.

import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  getRequestUser,
  getCallerProfile,
  getServiceClient,
} from "../_shared/supabaseClients.ts";
import { validatePassword } from "../_shared/passwordPolicy.ts";

interface ResetCredentialsBody {
  employee_id: string;
  new_password: string;
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

  let body: ResetCredentialsBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { employee_id, new_password } = body;

  if (!employee_id || !new_password) {
    return jsonResponse(
      { error: "employee_id and new_password are required" },
      400,
    );
  }

  const passwordCheck = validatePassword(new_password);
  if (!passwordCheck.valid) {
    return jsonResponse({ error: "Weak password", details: passwordCheck.errors }, 400);
  }

  const service = getServiceClient();

  const { error: updateError } = await service.auth.admin.updateUserById(employee_id, {
    password: new_password,
  });

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 400);
  }

  // Force re-login everywhere with the new credential.
  await service.auth.admin.signOut(employee_id, "global");

  // Explicit audit entry — auth.users changes aren't caught by our
  // table triggers, so we log this one manually via the append-only
  // audit_logs table using the service client (bypasses RLS by design,
  // consistent with "no direct client insert" on that table).
  await service.from("audit_logs").insert({
    actor_id: user.id,
    action: "admin_reset_credentials",
    target_table: "profiles",
    target_id: employee_id,
    metadata: { note: "Password reset by admin; all sessions revoked." },
  });

  return jsonResponse({ success: true });
});
