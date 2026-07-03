import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import type { ClientHoursSummary, EmployeeHoursSummary, BillableSummary } from "../types/database.types";

export function useClientHoursSummary() {
  return useQuery({
    queryKey: ["client-hours-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_hours_summary").select("*");
      if (error) throw error;
      return data as ClientHoursSummary[];
    },
  });
}

export function useEmployeeHoursSummary() {
  return useQuery({
    queryKey: ["employee-hours-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employee_hours_summary").select("*");
      if (error) throw error;
      return data as EmployeeHoursSummary[];
    },
  });
}

export function useBillableSummary() {
  return useQuery({
    queryKey: ["billable-summary"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billable_summary").select("*");
      if (error) throw error;
      return data as BillableSummary[];
    },
  });
}
