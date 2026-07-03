import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { usePendingEditRequests } from "../../hooks/useEditRequests";

const NAV_ITEMS = [
  { to: "/", label: "Overview", end: true },
  { to: "/clients-analytics", label: "Client Analytics" },
  { to: "/employees-analytics", label: "Employee Analytics" },
  { to: "/corrections", label: "Corrections" },
  { to: "/clients", label: "Clients" },
  { to: "/employees", label: "Employees" },
  { to: "/audit-log", label: "Audit Log" },
  { to: "/export", label: "Export" },
];

export default function AdminLayout() {
  const { profile, signOut } = useAuth();
  const { data: pending } = usePendingEditRequests();
  const pendingCount = pending?.length ?? 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            D
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">DAccountants</p>
            <p className="text-xs text-slate-400">Time Track - Admin Console</p>
          </div>
        </div>

        <nav className="space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <span>{item.label}</span>
              {item.to === "/corrections" && pendingCount > 0 && (
                <span className="badge bg-amber-100 text-amber-800">{pendingCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-200 px-5 py-4">
          <p className="text-sm font-medium text-slate-900">{profile?.full_name}</p>
          <p className="text-xs text-slate-400">Administrator</p>
          <button onClick={() => signOut()} className="btn-secondary mt-3 w-full">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
