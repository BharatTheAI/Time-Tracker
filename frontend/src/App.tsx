import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./app/auth/Login";
import EmployeeDashboard from "./app/employee/Dashboard";
import AdminLayout from "./app/admin/AdminLayout";
import Overview from "./app/admin/Overview";
import ClientAnalytics from "./app/admin/ClientAnalytics";
import EmployeeAnalytics from "./app/admin/EmployeeAnalytics";
import ClientMaster from "./app/admin/ClientMaster";
import EmployeeMaster from "./app/admin/EmployeeMaster";
import Corrections from "./app/admin/Corrections";
import AuditLogViewer from "./app/admin/AuditLogViewer";
import ExportCenter from "./app/admin/ExportCenter";

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    </div>
  );
}

export default function App() {
  const { loading, isAuthenticated, isAdmin, isActive } = useAuth();

  if (loading) return <FullScreenLoader />;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  if (!isActive) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Account Disabled</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account has been deactivated. Please contact your firm administrator.
          </p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="clients-analytics" element={<ClientAnalytics />} />
          <Route path="employees-analytics" element={<EmployeeAnalytics />} />
          <Route path="clients" element={<ClientMaster />} />
          <Route path="employees" element={<EmployeeMaster />} />
          <Route path="corrections" element={<Corrections />} />
          <Route path="audit-log" element={<AuditLogViewer />} />
          <Route path="export" element={<ExportCenter />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<EmployeeDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
