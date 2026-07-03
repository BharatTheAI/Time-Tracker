import { useState } from "react";
import { useClients } from "../../hooks/useClients";
import { useRequestEdit } from "../../hooks/useEditRequests";
import { todayIST } from "../../lib/timezone";
import type { TaskCategory, TimeEntry } from "../../types/database.types";

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

interface EditRequestModalProps {
  entry: TimeEntry;
  onClose: () => void;
}

export default function EditRequestModal({ entry, onClose }: EditRequestModalProps) {
  const { data: clients } = useClients();
  const requestEdit = useRequestEdit();

  const [clientId, setClientId] = useState(entry.client_id ?? "");
  const [category, setCategory] = useState<TaskCategory>(entry.category);
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [hours, setHours] = useState(String(entry.hours_spent));
  const [description, setDescription] = useState(entry.description ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isInternal = category === "Internal Work";

  async function handleSubmit() {
    setError(null);
    if (!reason.trim()) {
      setError("Please explain why this correction is needed.");
      return;
    }
    const h = Number(hours);
    if (!hours || Number.isNaN(h) || h <= 0 || h > 24) {
      setError("Hours spent must be greater than 0 and no more than 24.");
      return;
    }

    try {
      await requestEdit.mutateAsync({
        time_entry_id: entry.id,
        reason: reason.trim(),
        proposed_changes: {
          client_id: isInternal ? null : clientId || null,
          category,
          entry_date: entryDate,
          hours_spent: h,
          description: description.trim(),
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit correction request.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-lg p-6">
        <h3 className="text-base font-semibold text-slate-900">Request Correction</h3>
        <p className="mt-1 text-sm text-slate-500">
          This entry is locked. Your proposed changes will only apply after an admin approves
          this request.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label-text">Date</label>
            <input
              type="date"
              max={todayIST()}
              className="input-field"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label-text">Category</label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Client</label>
            <select
              className="input-field"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isInternal}
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
              className="input-field"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label-text">Work Description</label>
            <textarea
              className="input-field"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label-text">Reason for correction (required)</label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="e.g. Selected wrong client by mistake"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={requestEdit.isPending}
          >
            {requestEdit.isPending ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
