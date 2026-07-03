import { useState, FormEvent } from "react";
import TopBar from "../../components/TopBar";
import {
  useEmployees,
  useCreateEmployee,
  useSetEmployeeActive,
  useResetCredentials,
} from "../../hooks/useEmployees";
import { validatePasswordClientSide } from "../../lib/validation";

export default function EmployeeMaster() {
  const { data: employees, isLoading } = useEmployees();
  const createEmployee = useCreateEmployee();
  const setActive = useSetEmployeeActive();
  const resetCredentials = useResetCredentials();

  const [showAddForm, setShowAddForm] = useState(false);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);

  return (
    <div>
      <TopBar title="Employee Master" subtitle="Manage staff accounts and access" />

      <div className="space-y-6 p-6">
        <div className="flex justify-between">
          <p className="text-sm text-slate-500">
            {employees?.length ?? 0} accounts · {employees?.filter((e) => e.is_active).length ?? 0} active
          </p>
          <button className="btn-primary" onClick={() => setShowAddForm(true)}>
            + Add Employee
          </button>
        </div>

        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Code</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Role</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Actions</th>
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
              {employees?.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{emp.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.employee_code}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{emp.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${emp.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}`}
                    >
                      {emp.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <button
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      onClick={() => setResetTargetId(emp.id)}
                    >
                      Reset password
                    </button>
                    <button
                      className="text-xs font-medium text-slate-500 hover:text-red-600"
                      onClick={() =>
                        setActive.mutate({ employee_id: emp.id, is_active: !emp.is_active })
                      }
                      disabled={setActive.isPending}
                    >
                      {emp.is_active ? "Disable" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddForm && <AddEmployeeModal onClose={() => setShowAddForm(false)} onCreate={createEmployee} />}
      {resetTargetId && (
        <ResetPasswordModal
          employeeId={resetTargetId}
          onClose={() => setResetTargetId(null)}
          onReset={resetCredentials}
        />
      )}
    </div>
  );
}

function AddEmployeeModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: ReturnType<typeof useCreateEmployee>;
}) {
  const [fullName, setFullName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"employee" | "admin">("employee");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const pwCheck = validatePasswordClientSide(password);
    if (!pwCheck.valid) {
      setError(pwCheck.errors.join(" "));
      return;
    }

    try {
      await onCreate.mutateAsync({
        email,
        password,
        full_name: fullName,
        employee_code: employeeCode,
        role,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-slate-900">Add Employee</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="label-text">Full Name</label>
            <input required className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Employee Code</label>
            <input
              required
              className="input-field"
              placeholder="EMP001"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
            />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input
              required
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label-text">Temporary Password</label>
            <input
              required
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">
              Min 10 chars, with uppercase, lowercase, number &amp; special character.
            </p>
          </div>
          <div>
            <label className="label-text">Role</label>
            <select className="input-field" value={role} onChange={(e) => setRole(e.target.value as "employee" | "admin")}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={onCreate.isPending} className="btn-primary">
              {onCreate.isPending ? "Creating…" : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  employeeId,
  onClose,
  onReset,
}: {
  employeeId: string;
  onClose: () => void;
  onReset: ReturnType<typeof useResetCredentials>;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const pwCheck = validatePasswordClientSide(newPassword);
    if (!pwCheck.valid) {
      setError(pwCheck.errors.join(" "));
      return;
    }
    try {
      await onReset.mutateAsync({ employee_id: employeeId, new_password: newPassword });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-slate-900">Reset Password</h3>
        {done ? (
          <>
            <p className="mt-3 text-sm text-emerald-700">
              Password reset. All active sessions for this employee have been revoked — they'll
              need to log in again with the new password.
            </p>
            <button className="btn-primary mt-4 w-full" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="label-text">New Password</label>
              <input
                required
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-400">
                Min 10 chars, with uppercase, lowercase, number &amp; special character.
              </p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" disabled={onReset.isPending} className="btn-primary">
                {onReset.isPending ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
