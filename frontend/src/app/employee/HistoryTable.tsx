import { formatDateOnly } from "../../lib/timezone";
import type { TimeEntry } from "../../types/database.types";

interface HistoryTableProps {
  entries: TimeEntry[];
  isLoading: boolean;
  pendingRequestEntryIds: Set<string>;
  onRequestCorrection: (entry: TimeEntry) => void;
}

export default function HistoryTable({
  entries,
  isLoading,
  pendingRequestEntryIds,
  onRequestCorrection,
}: HistoryTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">My Entries</h2>
        <p className="mt-1 text-sm text-slate-500">
          Showing only your own submitted entries. All entries are locked once submitted.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Date</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Client</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Category</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Hours</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Notes</th>
              <th className="px-4 py-3 text-left font-medium text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Loading entries…
                </td>
              </tr>
            )}

            {!isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No entries yet. Log your first entry above.
                </td>
              </tr>
            )}

            {entries.map((entry) => {
              const hasPending = pendingRequestEntryIds.has(entry.id);
              return (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {formatDateOnly(entry.entry_date)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {entry.category === "Internal Work" ? "—" : entry.clients?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{entry.category}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {Number(entry.hours_spent).toFixed(2)}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-500" title={entry.description ?? ""}>
                    {entry.description || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {hasPending ? (
                      <span className="badge bg-amber-100 text-amber-800">Correction pending</span>
                    ) : (
                      <button
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        onClick={() => onRequestCorrection(entry)}
                      >
                        Request correction
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
