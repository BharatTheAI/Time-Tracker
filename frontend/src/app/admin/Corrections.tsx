import { useState } from "react";
import TopBar from "../../components/TopBar";
import { usePendingEditRequests, useReviewEditRequest } from "../../hooks/useEditRequests";
import { formatDateOnly, formatIST } from "../../lib/timezone";
import type { EditRequest } from "../../types/database.types";

export default function Corrections() {
  const { data: requests, isLoading } = usePendingEditRequests();
  const reviewRequest = useReviewEditRequest();
  const [activeRequest, setActiveRequest] = useState<EditRequest | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function openReview(req: EditRequest, d: "approved" | "rejected") {
    setActiveRequest(req);
    setDecision(d);
    setNote("");
    setError(null);
  }

  async function confirmReview() {
    if (!activeRequest || !decision) return;
    try {
      await reviewRequest.mutateAsync({
        edit_request_id: activeRequest.id,
        decision,
        review_note: note.trim() || undefined,
      });
      setActiveRequest(null);
      setDecision(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review request.");
    }
  }

  return (
    <div>
      <TopBar title="Correction Requests" subtitle="Review and approve or reject employee corrections" />

      <div className="space-y-4 p-6">
        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

        {!isLoading && (requests ?? []).length === 0 && (
          <div className="card p-10 text-center text-slate-400">No pending correction requests.</div>
        )}

        {(requests ?? []).map((req) => {
          const original = req.time_entries;
          const proposed = req.proposed_changes;
          return (
            <div key={req.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {req.requester?.full_name ?? "Unknown"}{" "}
                    <span className="font-normal text-slate-400">
                      ({req.requester?.employee_code})
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    Requested {formatIST(req.created_at, "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
                <span className="badge bg-amber-100 text-amber-800">Pending</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-400">Original</p>
                  {original && (
                    <ul className="space-y-1 text-slate-600">
                      <li>Date: {formatDateOnly(original.entry_date)}</li>
                      <li>Category: {original.category}</li>
                      <li>Hours: {Number(original.hours_spent).toFixed(2)}</li>
                      <li>Notes: {original.description || "—"}</li>
                    </ul>
                  )}
                </div>
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase text-brand-500">Proposed</p>
                  <ul className="space-y-1 text-slate-700">
                    {proposed.entry_date && <li>Date: {formatDateOnly(proposed.entry_date)}</li>}
                    {proposed.category && <li>Category: {proposed.category}</li>}
                    {proposed.hours_spent !== undefined && (
                      <li>Hours: {Number(proposed.hours_spent).toFixed(2)}</li>
                    )}
                    {proposed.description !== undefined && (
                      <li>Notes: {proposed.description || "—"}</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <span className="font-medium text-slate-700">Reason: </span>
                {req.reason}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button className="btn-danger" onClick={() => openReview(req, "rejected")}>
                  Reject
                </button>
                <button className="btn-primary" onClick={() => openReview(req, "approved")}>
                  Approve
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {activeRequest && decision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-900">
              Confirm {decision === "approved" ? "Approval" : "Rejection"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {decision === "approved"
                ? "This will apply the proposed changes to the locked entry."
                : "This request will be marked rejected and the entry stays unchanged."}
            </p>
            <div className="mt-4">
              <label className="label-text">Note (optional)</label>
              <textarea
                className="input-field"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setActiveRequest(null)}>
                Cancel
              </button>
              <button
                className={decision === "approved" ? "btn-primary" : "btn-danger"}
                onClick={confirmReview}
                disabled={reviewRequest.isPending}
              >
                {reviewRequest.isPending ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
