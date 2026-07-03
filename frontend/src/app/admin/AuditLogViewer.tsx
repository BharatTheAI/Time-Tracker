import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useAuditLog } from "../../hooks/useAuditLog";
import { formatIST } from "../../lib/timezone";

const ACTION_COLORS: Record<string, string> = {
  entry_created: "bg-emerald-100 text-emerald-800",
  admin_edited_entry: "bg-amber-100 text-amber-800",
  admin_deleted_entry: "bg-red-100 text-red-700",
  edit_requested: "bg-blue-100 text-blue-800",
  edit_approved: "bg-emerald-100 text-emerald-800",
  edit_rejected: "bg-red-100 text-red-700",
  employee_created: "bg-slate-100 text-slate-700",
  employee_disabled: "bg-red-100 text-red-700",
  employee_reactivated: "bg-emerald-100 text-emerald-800",
  admin_reset_credentials: "bg-amber-100 text-amber-800",
  client_created: "bg-slate-100 text-slate-700",
  client_updated: "bg-slate-100 text-slate-700",
  client_deleted: "bg-red-100 text-red-700",
};

export default function AuditLogViewer() {
  const [limit, setLimit] = useState(100);
  const { data: logs, isLoading } = useAuditLog(limit);

  return (
    <div>
      <TopBar title="Audit Trail" subtitle="Permanent, append-only log of all system actions" />

      <div className="space-y-4 p-6">
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Timestamp (IST)</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Action</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && (logs ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No audit records yet.
                  </td>
                </tr>
              )}
              {logs?.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatIST(log.created_at, "dd MMM yyyy, hh:mm:ss a")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {log.actor?.full_name ?? "System"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`badge ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {log.target_table ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(logs ?? []).length >= limit && (
          <button className="btn-secondary" onClick={() => setLimit((l) => l + 100)}>
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
