import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, FUNCTIONS_URL } from "../lib/supabaseClient";
import type { EditRequest, TimeEntry } from "../types/database.types";

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

/** Employee: their own correction requests. */
export function useMyEditRequests() {
  return useQuery({
    queryKey: ["my-edit-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edit_requests")
        .select("*, time_entries(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EditRequest[];
    },
  });
}

/** Admin: pending correction requests (drives the badge + review section). */
export function usePendingEditRequests() {
  return useQuery({
    queryKey: ["pending-edit-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("edit_requests")
        .select("*, time_entries(*), requester:requested_by(full_name, employee_code)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as EditRequest[];
    },
  });
}

interface ProposedChanges {
  client_id?: string | null;
  category?: string;
  entry_date?: string;
  hours_spent?: number;
  description?: string;
}

export function useRequestEdit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      time_entry_id: string;
      reason: string;
      proposed_changes: ProposedChanges;
    }) => authedFetch("request-entry-edit", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-edit-requests"] });
      qc.invalidateQueries({ queryKey: ["my-time-entries"] });
    },
  });
}

export function useReviewEditRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      edit_request_id: string;
      decision: "approved" | "rejected";
      review_note?: string;
    }) => authedFetch("review-edit-request", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-edit-requests"] });
      qc.invalidateQueries({ queryKey: ["all-time-entries"] });
    },
  });
}

export type { TimeEntry };
