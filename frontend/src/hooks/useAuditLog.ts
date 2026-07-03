import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import type { AuditLog } from "../types/database.types";

export function useAuditLog(limit = 100) {
  return useQuery({
    queryKey: ["audit-log", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, actor:actor_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as AuditLog[];
    },
  });
}
