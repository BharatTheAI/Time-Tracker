import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Client scoped to the calling user's JWT. All queries through this
 * client are still subject to RLS — used so that business logic runs
 * "as the user," letting Postgres RLS + our RPC functions be the real
 * enforcement point rather than trusting a role check in JS alone.
 */
export function getUserClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

/**
 * Service-role client — bypasses RLS entirely. Used ONLY for
 * operations that legitimately must, e.g. auth.admin.createUser(),
 * auth.admin.signOut(), or writing to tables with no client-facing
 * insert policy. Never expose this client or its key to the frontend.
 */
export function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

/** Resolve the authenticated user from the request's JWT, or null. */
export async function getRequestUser(req: Request) {
  const client = getUserClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

/** Fetch the caller's profile (role, is_active) via service client, keyed off their verified user id. */
export async function getCallerProfile(userId: string) {
  const service = getServiceClient();
  const { data, error } = await service
    .from("profiles")
    .select("id, role, is_active, full_name, employee_code")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}
