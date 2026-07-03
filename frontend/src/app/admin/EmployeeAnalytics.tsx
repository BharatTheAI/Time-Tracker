import { useState } from "react";
import TopBar from "../../components/TopBar";
import DateRangeFilter from "../../components/DateRangeFilter";
import { useAllTimeEntries } from "../../hooks/useTimeEntries";
import { currentMonthRangeIST } from "../../lib/timezone";

export default function EmployeeAnalytics() {
  const [range, setRange] = useState(currentMonthRangeIST());
  const { data: entries, isLoading } = useAllTimeEntries({
    startDate: range.start,
    endDate: range.end,
  });

  const byEmployee = new Map<
    string,
    { name: string; code: string | null; hours: number; entries: number; categories: Record<string, number> }
  >();

  for (const e of entries ?? []) {
    const name = e.profiles?.full_name ?? "Unknown";
    const existing =
      byEmployee.get(name) ?? { name, code: e.profiles?.employee_code ?? null, hours: 0, entries: 0, categories: {} };
    existing.hours += Number(e.hours_spent);
    existing.entries += 1;
    existing.categories[e.category] = (existing.categories[e.category] ?? 0) + Number(e.hours_spent);
    byEmployee.set(name, existing);
  }

  const rows = Array.from(byEmployee.values()).sort((a, b) => b.hours - a.hours);

  return (
    <div>
      <TopBar title="Employee Analytics" subtitle="Productivity ranking and work distribution" />

      <div className="space-y-6 p-6">
        <DateRangeFilter onChange={(r) => setRange({ start: r.startDate, end: r.endDate })} />

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Productivity Ranking</h3>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Rank</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Entries</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Total Hours</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Top Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No entries in this date range.
                  </td>
                </tr>
              )}
              {rows.map((r, idx) => {
                const topCategory = Object.entries(r.categories).sort((a, b) => b[1] - a[1])[0];
                return (
                  <tr key={r.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">#{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.code}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.entries}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.hours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-600">{topCategory?.[0] ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
