import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useClients } from "../../hooks/useClients";
import { useEmployees } from "../../hooks/useEmployees";
import { supabase, FUNCTIONS_URL } from "../../lib/supabaseClient";
import { currentMonthRangeIST } from "../../lib/timezone";

type ReportType = "client" | "employee" | "monthly" | "range";
type ExportFormat = "csv" | "xlsx";

const REPORT_LABELS: Record<ReportType, string> = {
  client: "Client-wise Report",
  employee: "Employee-wise Report",
  monthly: "Monthly Report",
  range: "Custom Date Range Report",
};

export default function ExportCenter() {
  const { data: clients } = useClients();
  const { data: employees } = useEmployees();

  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [format, setFormat] = useState<ExportFormat>("xlsx");
  const defaultRange = currentMonthRangeIST();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setDownloading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch(`${FUNCTIONS_URL}/export-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report_type: reportType,
          format,
          start_date: startDate,
          end_date: endDate,
          client_id: reportType === "client" && clientId ? clientId : undefined,
          employee_id: reportType === "employee" && employeeId ? employeeId : undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}_report_${startDate}_to_${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <TopBar title="Export Reports" subtitle="Download CSV or Excel reports for billing and management" />

      <div className="p-6">
        <div className="card max-w-xl p-6 space-y-4">
          <div>
            <label className="label-text">Report Type</label>
            <select
              className="input-field"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
            >
              {Object.entries(REPORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Start Date</label>
              <input
                type="date"
                className="input-field"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label-text">End Date</label>
              <input
                type="date"
                className="input-field"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {reportType === "client" && (
            <div>
              <label className="label-text">Filter by Client (optional)</label>
              <select className="input-field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">All clients</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reportType === "employee" && (
            <div>
              <label className="label-text">Filter by Employee (optional)</label>
              <select
                className="input-field"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">All employees</option>
                {employees?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="label-text">Format</label>
            <div className="flex gap-3">
              {(["xlsx", "csv"] as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium uppercase transition-colors ${
                    format === f
                      ? "bg-brand-600 text-white"
                      : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button className="btn-primary w-full" onClick={handleExport} disabled={downloading}>
            {downloading ? "Preparing download…" : "Download Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
