import { useState, FormEvent } from "react";
import TopBar from "../../components/TopBar";
import { useClients, useCreateClient, useUpdateClient } from "../../hooks/useClients";

export default function ClientMaster() {
  const { data: clients, isLoading } = useClients(true); // include inactive so admin can reactivate
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const [name, setName] = useState("");
  const [billable, setBillable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Client name is required.");
      return;
    }
    try {
      await createClient.mutateAsync({ name: name.trim(), billable });
      setName("");
      setBillable(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add client.");
    }
  }

  function startEdit(id: string, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await updateClient.mutateAsync({ id, name: editName.trim() });
    setEditingId(null);
  }

  async function toggleActive(id: string, isActive: boolean) {
    await updateClient.mutateAsync({ id, is_active: !isActive });
  }

  async function toggleBillable(id: string, billableNow: boolean) {
    await updateClient.mutateAsync({ id, billable: !billableNow });
  }

  return (
    <div>
      <TopBar title="Client Master" subtitle="Manage the firm's client list" />

      <div className="space-y-6 p-6">
        <div className="card p-6">
          <h2 className="text-base font-semibold text-slate-900">Add Client</h2>
          <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="label-text">Client Name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ABC Pvt Ltd"
              />
            </div>
            <div>
              <label className="label-text">Billable</label>
              <select
                className="input-field"
                value={billable ? "yes" : "no"}
                onChange={(e) => setBillable(e.target.value === "yes")}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <button type="submit" disabled={createClient.isPending} className="btn-primary">
              {createClient.isPending ? "Adding…" : "Add Client"}
            </button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-900">All Clients</h3>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Billable</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-500">Actions</th>
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
              {clients?.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {editingId === c.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="input-field"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                        <button className="text-xs font-medium text-brand-600" onClick={() => saveEdit(c.id)}>
                          Save
                        </button>
                        <button className="text-xs text-slate-400" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900">{c.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className={`badge ${c.billable ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                      onClick={() => toggleBillable(c.id, c.billable)}
                      title="Click to toggle"
                    >
                      {c.billable ? "Billable" : "Non-billable"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${c.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"}`}
                    >
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <button className="text-xs font-medium text-brand-600 hover:text-brand-700" onClick={() => startEdit(c.id, c.name)}>
                      Rename
                    </button>
                    <button
                      className="text-xs font-medium text-slate-500 hover:text-slate-700"
                      onClick={() => toggleActive(c.id, c.is_active)}
                    >
                      {c.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
