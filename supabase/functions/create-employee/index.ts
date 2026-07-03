// supabase/functions/create-employee/index.ts
//
// Admin-only. Creates a new auth.users record (via service role) and
// a matching profiles row. Enforces the password policy server-side —
// this is the actual gate, not a frontend regex.

import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import {
  getRequestUser,
  getCallerProfile,
  getServiceClient,
} from "../_shared/supabaseClients.ts";
import { validatePassword } from "../_shared/passwordPolicy.ts";

interface CreateEmployeeBody {
  email: string;
  password: string;
  full_name: string;
  employee_code: string;
  role?: "employee" | "admin";
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

  let body: CreateEmployeeBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { email, password, full_name, employee_code, role } = body;

  if (!email || !password || !full_name || !employee_code) {
    return jsonResponse(
      { error: "email, password, full_name, and employee_code are required" },
      400,
    );
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return jsonResponse({ error: "Weak password", details: passwordCheck.errors }, 400);
  }

  const service = getServiceClient();

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // internal firm tool — no public signup flow, so skip email verification friction
  });

  if (createError || !created?.user) {
    return jsonResponse({ error: createError?.message ?? "Failed to create auth user" }, 400);
  }

  // Provision the profile via the RPC (0006 migration) using the
  // service client — bypasses RLS by design since this is a
  // privileged, admin-gated operation already checked above.
  // p_actor_id is passed explicitly (the calling admin's own id)
  // because the service client has no caller JWT, so auth.uid() would
  // otherwise be NULL inside the audit trigger for this insert.
  const { data: provisioned, error: provisionError } = await service.rpc(
    "provision_employee_profile",
    {
      p_user_id: created.user.id,
      p_full_name: full_name,
      p_employee_code: employee_code,
      p_role: role ?? "employee",
      p_actor_id: user.id,
    },
  );

  if (provisionError) {
    // Roll back the orphaned auth user so we don't leave a login with no profile.
    await service.auth.admin.deleteUser(created.user.id);
    return jsonResponse({ error: provisionError.message }, 400);
  }

  return jsonResponse({ employee: provisioned });
});
