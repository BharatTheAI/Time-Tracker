import { useState } from "react";
import TopBar from "../../components/TopBar";
import DateRangeFilter from "../../components/DateRangeFilter";
import { useAllTimeEntries } from "../../hooks/useTimeEntries";
import { currentMonthRangeIST } from "../../lib/timezone";

export default function ClientAnalytics() {
  const [range, setRange] = useState(currentMonthRangeIST());
  const { data: entries, isLoading } = useAllTimeEntries({
    startDate: range.start,
    endDate: range.end,
  });

  const byClient = new Map<
    string,
    { name: string; billable: boolean; hours: number; entries: number }
  >();

  for (const e of entries ?? []) {
    const name = e.category === "Internal Work" ? "Internal Work" : e.clients?.name ?? "Unknown";
    const billable = e.category === "Internal Work" ? false : Boolean(e.clients?.billable);
    const existing = byClient.get(name) ?? { name, billable, hours: 0, entries: 0 };
    existing.hours += Number(e.hours_spent);
    existing.entries += 1;
    byClient.set(name, existing);
  }

  const rows = Array.from(byClient.values()).sort((a, b) => b.hours - a.hours);
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const billableHours = rows.filter((r) => r.billable).reduce((s, r) => s + r.hours, 0);
  const nonBillableHours = totalHours - billableHours;

  return (
    <div>
      <TopBar title="Client Analytics" subtitle="Total hours and billable split by client" />

      <div className="space-y-6 p-6">
        <DateRangeFilter onChange={(r) => setRange({ start: r.startDate, end: r.endDate })} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Total hours</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalHours.toFixed(1)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Billable hours</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{billableHours.toFixed(1)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Non-billable hours</p>
            <p className="mt-1 text-2xl font-semibold text-slate-500">{nonBillableHours.toFixed(1)}</p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Top Time-Consuming Clients</h3>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Client</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Billable</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Entries</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Total Hours</th>
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
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No entries in this date range.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.name} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        r.billable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.billable ? "Billable" : "Non-billable"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.entries}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{r.hours.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
