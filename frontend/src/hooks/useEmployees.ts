import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, FUNCTIONS_URL } from "../lib/supabaseClient";
import type { Profile } from "../types/database.types";

async function authedFetch(path: string, body: unknown) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${FUNCTIONS_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request to ${path} failed`);
  return json;
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      full_name: string;
      employee_code: string;
      role?: "employee" | "admin";
    }) => authedFetch("create-employee", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useSetEmployeeActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { employee_id: string; is_active: boolean }) =>
      authedFetch("disable-employee", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useResetCredentials() {
  return useMutation({
    mutationFn: async (input: { employee_id: string; new_password: string }) =>
      authedFetch("reset-employee-credentials", input),
  });
}
