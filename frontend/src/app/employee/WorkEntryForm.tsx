import { useState, FormEvent } from "react";
import { useClients } from "../../hooks/useClients";
import { useSubmitEntry } from "../../hooks/useTimeEntries";
import { todayIST } from "../../lib/timezone";
import type { TaskCategory } from "../../types/database.types";

const CATEGORIES: TaskCategory[] = [
  "Audit",
  "GST",
  "Income Tax",
  "Accounting",
  "MCA Filing",
  "Research",
  "Internal Work",
  "Compliance",
  "Other",
];

export default function WorkEntryForm() {
  const { data: clients, isLoading: clientsLoading } = useClients();
  const submitEntry = useSubmitEntry();

  const [clientId, setClientId] = useState("");
  const [category, setCategory] = useState<TaskCategory | "">("");
  const [entryDate, setEntryDate] = useState(todayIST());
  const [hours, setHours] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isInternal = category === "Internal Work";

  function validate(): string | null {
    if (!category) return "Please select a task category.";
    if (!isInternal && !clientId) return "Please select a client.";
    const h = Number(hours);
    if (!hours || Number.isNaN(h) || h <= 0 || h > 24) {
      return "Hours spent must be a number greater than 0 and no more than 24.";
    }
    if (!entryDate) return "Please select a date.";
    if (entryDate > todayIST()) return "Entry date cannot be in the future.";
    return null;
  }

  function handleSubmitClick(e: FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setConfirmOpen(true);
  }

  async function confirmSubmit() {
    setConfirmOpen(false);
    try {
      await submitEntry.mutateAsync({
        client_id: isInternal ? null : clientId,
        category: category as TaskCategory,
        entry_date: entryDate,
        hours_spent: Number(hours),
        description: description.trim() || undefined,
      });
      setClientId("");
      setCategory("");
      setHours("");
      setDescription("");
      setEntryDate(todayIST());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to submit entry.");
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-slate-900">Log Work</h2>
      <p className="mt-1 text-sm text-slate-500">
        Submitted entries are locked immediately. If you make a mistake, you can request a
        correction afterward — direct edits aren't possible.
      </p>

      <form onSubmit={handleSubmitClick} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-text">Date</label>
          <input
            type="date"
            required
            max={todayIST()}
            className="input-field"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label-text">Task Category</label>
          <select
            required
            className="input-field"
            value={category}
            onChange={(e) => setCategory(e.target.value as TaskCategory)}
          >
            <option value="" disabled>
              Select category
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-text">
            Client {isInternal && <span className="text-slate-400">(not required)</span>}
          </label>
          <select
            className="input-field"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={isInternal || clientsLoading}
          >
            <option value="">{isInternal ? "N/A — Internal Work" : "Select client"}</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-text">Hours Spent</label>
          <input
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            required
            placeholder="e.g. 2.5"
            className="input-field"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label-text">Work Description (optional)</label>
          <textarea
            className="input-field"
            rows={2}
            placeholder="Prepared GST reconciliation for ABC Pvt Ltd"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {formError && (
          <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        <div className="sm:col-span-2">
          <button type="submit" disabled={submitEntry.isPending} className="btn-primary">
            {submitEntry.isPending ? "Submitting…" : "Submit Entry"}
          </button>
        </div>
      </form>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-900">Confirm submission</h3>
            <p className="mt-2 text-sm text-slate-600">
              Once submitted, this entry will be permanently locked. You won't be able to edit
              or delete it — only request a correction later. Continue?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={confirmSubmit}>
                Confirm &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
