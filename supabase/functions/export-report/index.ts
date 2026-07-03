// supabase/functions/export-report/index.ts
//
// Admin-only. Generates CSV or XLSX exports server-side so an employee
// can never trigger a mass export even if they discover the endpoint
// (role-gated before any query runs). Supports client-wise,
// employee-wise, monthly, and custom date-range reports.

import { handleOptions, corsHeaders } from "../_shared/cors.ts";
import { jsonResponse } from "../_shared/cors.ts";
import {
  getUserClient,
  getRequestUser,
  getCallerProfile,
} from "../_shared/supabaseClients.ts";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

type ReportType = "client" | "employee" | "monthly" | "range";
type ExportFormat = "csv" | "xlsx";

interface ExportBody {
  report_type: ReportType;
  format: ExportFormat;
  start_date?: string; // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD
  client_id?: string;
  employee_id?: string;
}

interface EntryRow {
  entry_date: string;
  employee_name: string;
  employee_code: string | null;
  client_name: string;
  billable: boolean;
  category: string;
  hours_spent: number;
  description: string | null;
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

  let body: ExportBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { report_type, format, start_date, end_date, client_id, employee_id } = body;

  if (!report_type || !format) {
    return jsonResponse({ error: "report_type and format are required" }, 400);
  }

  // Runs with the admin's own JWT — RLS still applies, and since the
  // caller is a verified active admin, the select-all policy on
  // time_entries grants full visibility. No service-role escalation
  // needed for a read-only export.
  const client = getUserClient(req);

  let query = client
    .from("time_entries")
    .select(
      `entry_date, hours_spent, description, category,
       profiles:employee_id ( full_name, employee_code ),
       clients:client_id ( name, billable )`,
    )
    .order("entry_date", { ascending: true });

  if (start_date) query = query.gte("entry_date", start_date);
  if (end_date) query = query.lte("entry_date", end_date);
  if (client_id) query = query.eq("client_id", client_id);
  if (employee_id) query = query.eq("employee_id", employee_id);

  const { data, error } = await query;

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  const rows: EntryRow[] = (data ?? []).map((r: any) => ({
    entry_date: r.entry_date,
    employee_name: r.profiles?.full_name ?? "Unknown",
    employee_code: r.profiles?.employee_code ?? null,
    client_name: r.category === "Internal Work" ? "Internal Work" : (r.clients?.name ?? "Unknown"),
    billable: r.category === "Internal Work" ? false : Boolean(r.clients?.billable),
    category: r.category,
    hours_spent: r.hours_spent,
    description: r.description,
  }));

  const grouped = groupByReportType(rows, report_type);

  if (format === "csv") {
    const csv = toCsv(grouped);
    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${report_type}_report.csv"`,
      },
    });
  }

  // XLSX
  const worksheet = XLSX.utils.json_to_sheet(grouped);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${report_type}_report.xlsx"`,
    },
  });
});

function groupByReportType(rows: EntryRow[], reportType: ReportType) {
  if (reportType === "range" || reportType === "monthly") {
    // Detailed row-level export, sorted by date — monthly filtering is
    // handled by the caller passing start_date/end_date bounds.
    return rows.map((r) => ({
      Date: r.entry_date,
      Employee: r.employee_name,
      "Employee Code": r.employee_code ?? "",
      Client: r.client_name,
      Billable: r.billable ? "Yes" : "No",
      Category: r.category,
      "Hours Spent": r.hours_spent,
      Description: r.description ?? "",
    }));
  }

  if (reportType === "client") {
    const byClient = new Map<string, { hours: number; billable: boolean; entries: number }>();
    for (const r of rows) {
      const key = r.client_name;
      const existing = byClient.get(key) ?? { hours: 0, billable: r.billable, entries: 0 };
      existing.hours += Number(r.hours_spent);
      existing.entries += 1;
      byClient.set(key, existing);
    }
    return Array.from(byClient.entries()).map(([client, v]) => ({
      Client: client,
      Billable: v.billable ? "Yes" : "No",
      "Total Hours": v.hours.toFixed(2),
      "Entry Count": v.entries,
    }));
  }

  // employee
  const byEmployee = new Map<string, { hours: number; code: string | null; entries: number }>();
  for (const r of rows) {
    const key = r.employee_name;
    const existing = byEmployee.get(key) ?? { hours: 0, code: r.employee_code, entries: 0 };
    existing.hours += Number(r.hours_spent);
    existing.entries += 1;
    byEmployee.set(key, existing);
  }
  return Array.from(byEmployee.entries()).map(([employee, v]) => ({
    Employee: employee,
    "Employee Code": v.code ?? "",
    "Total Hours": v.hours.toFixed(2),
    "Entry Count": v.entries,
  }));
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const s = String(val ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}
