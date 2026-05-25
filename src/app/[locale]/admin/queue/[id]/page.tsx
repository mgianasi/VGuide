"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type SubmissionDetail = {
  id: string;
  status: string;
  submissionDate: string;
  languageCode: string;
  candidateStatement: string | null;
  biographicalInfo: string | null;
  contactAddress: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactWebsite: string | null;
  candidate: {
    officialFirstName: string;
    officialLastName: string;
    campaignName: string | null;
    party: string | null;
    education: string | null;
    currentEmployment: string | null;
    age: number | null;
  };
  election: { label: string; cycleYear: number };
  office: { label: string; category: string };
  reviewer?: { displayName: string } | null;
  reviewerNotes: string | null;
  logs?: {
    action: string;
    createdAt: string;
    notes: string | null;
    admin: { displayName: string } | null;
  }[];
};

export default function AdminSubmissionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<
    "approve" | "deny" | "request_changes" | null
  >(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  async function fetchSubmission() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/queue/${submissionId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Not found");
      } else {
        setSubmission(data.data);
      }
    } catch {
      setError("Failed to load submission");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview() {
    if (!action || !submission) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/queue/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Action failed");
        setSubmitting(false);
        return;
      }

      // Refresh
      setAction(null);
      setNotes("");
      await fetchSubmission();
    } catch {
      setError("Connection error");
    } finally {
      setSubmitting(false);
    }
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      pending_review: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      denied: "bg-red-100 text-red-700",
      changes_requested: "bg-orange-100 text-orange-700",
      superseded: "bg-neutral-100 text-neutral-500",
    };
    const labels: Record<string, string> = {
      pending_review: "Pending Review",
      approved: "Approved",
      denied: "Denied",
      changes_requested: "Changes Requested",
      superseded: "Superseded",
    };
    return (
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
          styles[status] ?? "bg-neutral-100 text-neutral-500"
        }`}
      >
        {labels[status] ?? status}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 text-center text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
        <Link
          href={`/${locale}/admin/queue`}
          className="btn-primary mt-4 inline-block"
        >
          ← Back to Queue
        </Link>
      </div>
    );
  }

  if (!submission) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-neutral-500">
        <Link
          href={`/${locale}/admin/queue`}
          className="hover:text-primary-600"
        >
          Queue
        </Link>
        {" / "}
        <span className="text-neutral-900">
          {submission.candidate.officialFirstName}{" "}
          {submission.candidate.officialLastName}
        </span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {submission.candidate.officialFirstName}{" "}
            {submission.candidate.officialLastName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {submission.office.label} · {submission.election.label} ·{" "}
            {submission.languageCode.toUpperCase()}
          </p>
        </div>
        {statusBadge(submission.status)}
      </div>

      {/* Candidate Info */}
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">
          Candidate Information
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {submission.candidate.campaignName && (
            <>
              <dt className="font-medium text-neutral-500">Campaign Name</dt>
              <dd className="text-neutral-900">
                {submission.candidate.campaignName}
              </dd>
            </>
          )}
          {submission.candidate.party && (
            <>
              <dt className="font-medium text-neutral-500">Party</dt>
              <dd className="text-neutral-900">{submission.candidate.party}</dd>
            </>
          )}
          {submission.candidate.age && (
            <>
              <dt className="font-medium text-neutral-500">Age</dt>
              <dd className="text-neutral-900">{submission.candidate.age}</dd>
            </>
          )}
          {submission.candidate.education && (
            <>
              <dt className="font-medium text-neutral-500">Education</dt>
              <dd className="text-neutral-900">
                {submission.candidate.education}
              </dd>
            </>
          )}
          {submission.candidate.currentEmployment && (
            <>
              <dt className="font-medium text-neutral-500">Employment</dt>
              <dd className="text-neutral-900">
                {submission.candidate.currentEmployment}
              </dd>
            </>
          )}
        </dl>
      </div>

      {/* Submission Content */}
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-neutral-900">
          Submission Content
        </h2>

        {submission.candidateStatement && (
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-medium text-neutral-500">
              Candidate Statement
            </h3>
            <p className="text-sm whitespace-pre-wrap text-neutral-900">
              {submission.candidateStatement}
            </p>
          </div>
        )}

        {submission.biographicalInfo && (
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-medium text-neutral-500">
              Biographical Information
            </h3>
            <p className="text-sm whitespace-pre-wrap text-neutral-900">
              {submission.biographicalInfo}
            </p>
          </div>
        )}

        {/* Contact Info */}
        <div className="border-t border-neutral-200 pt-4">
          <h3 className="mb-2 text-sm font-medium text-neutral-500">Contact</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {submission.contactAddress && (
              <>
                <dt className="text-neutral-400">Address</dt>
                <dd className="text-neutral-900">
                  {submission.contactAddress}
                </dd>
              </>
            )}
            {submission.contactPhone && (
              <>
                <dt className="text-neutral-400">Phone</dt>
                <dd className="text-neutral-900">{submission.contactPhone}</dd>
              </>
            )}
            {submission.contactEmail && (
              <>
                <dt className="text-neutral-400">Email</dt>
                <dd className="text-neutral-900">{submission.contactEmail}</dd>
              </>
            )}
            {submission.contactWebsite && (
              <>
                <dt className="text-neutral-400">Website</dt>
                <dd className="text-neutral-900">
                  {submission.contactWebsite}
                </dd>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Action Panel */}
      {submission.status === "pending_review" ||
      submission.status === "changes_requested" ? (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">
            Review Actions
          </h2>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-4 flex gap-3">
            <button
              onClick={() => setAction("approve")}
              className={`btn-primary ${
                action === "approve" ? "ring-primary-500 ring-2" : ""
              }`}
            >
              ✅ Approve
            </button>
            <button
              onClick={() => setAction("deny")}
              className={`rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 ${
                action === "deny" ? "ring-2 ring-red-500" : ""
              }`}
            >
              ❌ Deny
            </button>
            <button
              onClick={() => setAction("request_changes")}
              className={`rounded-md border border-orange-300 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50 ${
                action === "request_changes" ? "ring-2 ring-orange-500" : ""
              }`}
            >
              📝 Request Changes
            </button>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label htmlFor="notes" className="label">
              {action === "deny"
                ? "Reason for denial (required)"
                : action === "request_changes"
                  ? "What changes are needed? (required)"
                  : "Optional notes"}
            </label>
            <textarea
              id="notes"
              rows={3}
              className="input-field mt-1"
              placeholder={
                action
                  ? "Enter notes for the candidate..."
                  : "Select an action above first"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!action}
              required={action === "deny" || action === "request_changes"}
            />
          </div>

          <button
            onClick={handleReview}
            disabled={
              !action ||
              submitting ||
              ((action === "deny" || action === "request_changes") &&
                !notes.trim())
            }
            className="btn-primary disabled:opacity-30"
          >
            {submitting
              ? "Submitting..."
              : action
                ? `Confirm ${action === "approve" ? "Approval" : action === "deny" ? "Denial" : "Changes Request"}`
                : "Select an action"}
          </button>
        </div>
      ) : null}

      {/* Audit Log */}
      {submission.logs && submission.logs.length > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-neutral-900">
            Audit Log ({submission.logs.length})
          </h2>
          <div className="space-y-3">
            {submission.logs.map((log, i) => (
              <div
                key={i}
                className="rounded-md border border-neutral-100 bg-neutral-50 p-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-900">
                    {log.action
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {new Date(log.createdAt).toLocaleString()} ·{" "}
                    {log.admin?.displayName ?? "System"}
                  </span>
                </div>
                {log.notes && (
                  <p className="mt-1 text-sm text-neutral-600">{log.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-6">
        <Link
          href={`/${locale}/admin/queue`}
          className="hover:text-primary-600 text-sm text-neutral-500"
        >
          ← Back to Queue
        </Link>
      </div>
    </div>
  );
}
