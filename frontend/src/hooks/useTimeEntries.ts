import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, FUNCTIONS_URL } from "../lib/supabaseClient";
import type { TaskCategory, TimeEntry } from "../types/database.types";

/**
 * Own-entries history for the employee dashboard. RLS's
 * "time_entries_select_own_or_admin" policy means this query, even if
 * the WHERE clause were tampered with client-side, can never return
 * another employee's rows for a non-admin caller.
 */
export function useMyTimeEntries() {
  return useQuery({
    queryKey: ["my-time-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*, clients(name, billable)")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TimeEntry[];
    },
  });
}

/** Admin: all entries, with optional filters. */
export function useAllTimeEntries(filters: {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  employeeId?: string;
}) {
  return useQuery({
    queryKey: ["all-time-entries", filters],
    queryFn: async () => {
      let query = supabase
        .from("time_entries")
        .select("*, clients(name, billable), profiles(full_name, employee_code)")
        .order("entry_date", { ascending: false });

      if (filters.startDate) query = query.gte("entry_date", filters.startDate);
      if (filters.endDate) query = query.lte("entry_date", filters.endDate);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);
      if (filters.employeeId) query = query.eq("employee_id", filters.employeeId);

      const { data, error } = await query;
      if (error) throw error;
      return data as TimeEntry[];
    },
  });
}

interface SubmitEntryInput {
  client_id: string | null;
  category: TaskCategory;
  entry_date: string;
  hours_spent: number;
  description?: string;
}

export function useSubmitEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitEntryInput) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${FUNCTIONS_URL}/submit-entry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit entry");
      return json.entry as TimeEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["all-time-entries"] });
    },
  });
}
