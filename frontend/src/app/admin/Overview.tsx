import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import TopBar from "../../components/TopBar";
import { useClientHoursSummary, useEmployeeHoursSummary } from "../../hooks/useAnalytics";
import { useAllTimeEntries } from "../../hooks/useTimeEntries";
import { formatDateOnly, formatIST } from "../../lib/timezone";

const PIE_COLORS = ["#3366ff", "#598cff", "#8eb4ff", "#1f47f0", "#1a37c9", "#1c30a1", "#bcd2ff", "#d9e6ff"];

export default function Overview() {
  const { data: clientSummary } = useClientHoursSummary();
  const { data: employeeSummary } = useEmployeeHoursSummary();
  const { data: recentEntries } = useAllTimeEntries({});

  // Aggregate client summary rows (which are per-month) into totals for the pie chart
  const clientTotals = Object.values(
    (clientSummary ?? []).reduce<Record<string, { name: string; hours: number }>>((acc, row) => {
      const key = row.client_name;
      if (!acc[key]) acc[key] = { name: key, hours: 0 };
      acc[key].hours += Number(row.total_hours);
      return acc;
    }, {}),
  ).filter((c) => c.hours > 0);

  // Employee productivity bar chart — total hours per employee
  const employeeTotals = Object.values(
    (employeeSummary ?? []).reduce<Record<string, { name: string; hours: number }>>((acc, row) => {
      const key = row.full_name;
      if (!acc[key]) acc[key] = { name: key, hours: 0 };
      acc[key].hours += Number(row.total_hours);
      return acc;
    }, {}),
  ).sort((a, b) => b.hours - a.hours);

  // Monthly trend line — total hours logged per month across the firm
  const monthlyTrend = Object.values(
    (clientSummary ?? []).reduce<Record<string, { month: string; hours: number }>>((acc, row) => {
      const key = row.month?.slice(0, 7) ?? "unknown";
      if (!acc[key]) acc[key] = { month: key, hours: 0 };
      acc[key].hours += Number(row.total_hours);
      return acc;
    }, {}),
  ).sort((a, b) => a.month.localeCompare(b.month));

  const totalHoursAllTime = clientTotals.reduce((sum, c) => sum + c.hours, 0);
  const activeEmployeeCount = employeeTotals.filter((e) => e.hours > 0).length;

  return (
    <div>
      <TopBar title="Admin Overview" subtitle="Firm-wide productivity and client analytics" />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Total hours logged</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {totalHoursAllTime.toFixed(1)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Active clients tracked</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{clientTotals.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs font-medium text-slate-500">Employees logging time</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{activeEmployeeCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900">Employee Productivity</h3>
            <p className="text-xs text-slate-500">Total hours logged, all time</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeTotals} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={110} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3366ff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900">Client-wise Hour Distribution</h3>
            <p className="text-xs text-slate-500">Share of total hours by client</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clientTotals}
                    dataKey="hours"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => entry.name}
                  >
                    {clientTotals.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900">Monthly Trend</h3>
          <p className="text-xs text-slate-500">Total hours logged across the firm, by month</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="hours" stroke="#3366ff" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-500">Latest work logs across the firm</p>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {(recentEntries ?? []).slice(0, 15).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {entry.profiles?.full_name ?? "Unknown"}{" "}
                    <span className="font-normal text-slate-400">logged</span>{" "}
                    {Number(entry.hours_spent).toFixed(2)}h
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.category} · {entry.category === "Internal Work" ? "Internal" : entry.clients?.name ?? "—"}{" "}
                    · {formatDateOnly(entry.entry_date)}
                  </p>
                </div>
                <span className="text-xs text-slate-400">{formatIST(entry.created_at, "hh:mm a")}</span>
              </div>
            ))}
            {(recentEntries ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
