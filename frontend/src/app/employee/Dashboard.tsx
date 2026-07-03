import { useState } from "react";
import TopBar from "../../components/TopBar";
import WorkEntryForm from "./WorkEntryForm";
import HistoryTable from "./HistoryTable";
import EditRequestModal from "./EditRequestModal";
import { useMyTimeEntries } from "../../hooks/useTimeEntries";
import { useMyEditRequests } from "../../hooks/useEditRequests";
import type { TimeEntry } from "../../types/database.types";

export default function EmployeeDashboard() {
  const { data: entries, isLoading } = useMyTimeEntries();
  const { data: myRequests } = useMyEditRequests();
  const [entryForEdit, setEntryForEdit] = useState<TimeEntry | null>(null);

  const pendingRequestEntryIds = new Set(
    (myRequests ?? []).filter((r) => r.status === "pending").map((r) => r.time_entry_id),
  );

  const totalHoursThisMonth = (entries ?? [])
    .filter((e) => e.entry_date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((sum, e) => sum + Number(e.hours_spent), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar title="DAccountants" subtitle="Time Tracker" />

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Hours this month</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {totalHoursThisMonth.toFixed(1)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Total entries</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{entries?.length ?? 0}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Pending corrections</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {(myRequests ?? []).filter((r) => r.status === "pending").length}
            </p>
          </div>
        </div>

        <WorkEntryForm />

        <HistoryTable
          entries={entries ?? []}
          isLoading={isLoading}
          pendingRequestEntryIds={pendingRequestEntryIds}
          onRequestCorrection={setEntryForEdit}
        />

        {entryForEdit && (
          <EditRequestModal entry={entryForEdit} onClose={() => setEntryForEdit(null)} />
        )}
      </main>
    </div>
  );
}
