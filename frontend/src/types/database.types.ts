// Hand-authored to mirror the SQL migrations exactly. Once the project
// is linked to a live Supabase instance, regenerate with:
//   npm run gen:types
// and this file will be overwritten with the canonical generated types.

export type TaskCategory =
  | "Audit"
  | "GST"
  | "Income Tax"
  | "Accounting"
  | "MCA Filing"
  | "Research"
  | "Internal Work"
  | "Compliance"
  | "Other";

export type UserRole = "employee" | "admin";
export type EditRequestStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  employee_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  is_active: boolean;
  billable: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  client_id: string | null;
  category: TaskCategory;
  entry_date: string; // YYYY-MM-DD
  hours_spent: number;
  description: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  // joined fields (present when queried with select())
  clients?: Pick<Client, "name" | "billable"> | null;
  profiles?: Pick<Profile, "full_name" | "employee_code"> | null;
}

export interface EditRequest {
  id: string;
  time_entry_id: string;
  requested_by: string;
  reason: string;
  proposed_changes: Partial<
    Pick<TimeEntry, "client_id" | "category" | "entry_date" | "hours_spent" | "description">
  >;
  status: EditRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  // joined
  time_entries?: TimeEntry | null;
  requester?: Pick<Profile, "full_name" | "employee_code"> | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actor?: Pick<Profile, "full_name"> | null;
}

export interface ClientHoursSummary {
  client_id: string;
  client_name: string;
  billable: boolean;
  entry_count: number;
  total_hours: number;
  month: string;
}

export interface EmployeeHoursSummary {
  employee_id: string;
  full_name: string;
  employee_code: string | null;
  is_active: boolean;
  entry_count: number;
  total_hours: number;
  month: string;
}

export interface BillableSummary {
  month: string;
  is_billable: boolean;
  total_hours: number;
}

// Minimal Database interface shape for supabase-js generics.
// A full `supabase gen types` run will produce the exhaustive version.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> };
      time_entries: { Row: TimeEntry; Insert: Partial<TimeEntry>; Update: Partial<TimeEntry> };
      edit_requests: { Row: EditRequest; Insert: Partial<EditRequest>; Update: Partial<EditRequest> };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> };
    };
    Views: {
      client_hours_summary: { Row: ClientHoursSummary };
      employee_hours_summary: { Row: EmployeeHoursSummary };
      billable_summary: { Row: BillableSummary };
    };
  };
}
