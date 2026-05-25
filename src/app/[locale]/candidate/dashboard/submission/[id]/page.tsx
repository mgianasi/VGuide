"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type SubmissionDetail = {
  id: string;
  candidateId: string;
  status: string;
  submissionDate: string;
  languageCode: string;
  candidateStatement: string | null;
  biographicalInfo: string | null;
  contactAddress: string | null;
  contactZipCode: string | null;
  contactPhone: string | null;
  contactFax: string | null;
  contactEmail: string | null;
  contactWebsite: string | null;
  profilePictureUrl: string | null;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  election: {
    id: string;
    label: string;
    cycleYear: number;
    electionType: string;
  };
  office: { id: string; label: string; category: string };
  candidate: {
    officialFirstName: string;
    officialLastName: string;
    campaignName: string | null;
    party: string | null;
    education: string | null;
    currentEmployment: string | null;
    age: number | null;
    campaignAddress: string | null;
    campaignWebsite: string | null;
    generalInformation: string | null;
  };
  reviewer: { displayName: string } | null;
  logs: {
    id: string;
    action: string;
    notes: string | null;
    previousStatus: string | null;
    newStatus: string | null;
    createdAt: string;
    admin: { displayName: string } | null;
  }[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; editable: boolean }
> = {
  pending_review: {
    label: "Pending Review",
    color: "bg-yellow-100 text-yellow-700",
    editable: true,
  },
  approved: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    editable: false,
  },
  denied: {
    label: "Denied",
    color: "bg-red-100 text-red-700",
    editable: false,
  },
  changes_requested: {
    label: "Changes Requested",
    color: "bg-orange-100 text-orange-700",
    editable: true,
  },
  superseded: {
    label: "Superseded",
    color: "bg-neutral-100 text-neutral-500",
    editable: false,
  },
};

const LOG_LABELS: Record<string, string> = {
  submission_approved: "Approved",
  submission_denied: "Denied",
  changes_requested: "Changes Requested",
  submission_resubmitted: "Resubmitted by Candidate",
  note_added: "Note Added",
};

function formatAction(action: string): string {
  return (
    LOG_LABELS[action] ??
    action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export default function CandidateSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Editable form fields
  const [candidateStatement, setCandidateStatement] = useState("");
  const [biographicalInfo, setBiographicalInfo] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactZipCode, setContactZipCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactFax, setContactFax] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [resubmissionNote, setResubmissionNote] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [profilePicturePreview, setProfilePicturePreview] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/candidate/submissions/${submissionId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) {
          setError(data.error || "Failed to load submission");
          return;
        }
        const s: SubmissionDetail = data.data;
        setSubmission(s);
        setCandidateStatement(s.candidateStatement ?? "");
        setBiographicalInfo(s.biographicalInfo ?? "");
        setContactAddress(s.contactAddress ?? "");
        setContactZipCode(s.contactZipCode ?? "");
        setContactPhone(s.contactPhone ?? "");
        setContactFax(s.contactFax ?? "");
        setContactEmail(s.contactEmail ?? "");
        setContactWebsite(s.contactWebsite ?? "");
        setProfilePicture(s.profilePictureUrl ?? "");
        setProfilePicturePreview(s.profilePictureUrl ?? "");
      } catch {
        if (!cancelled) setError("Connection error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const statusConfig = submission
    ? (STATUS_CONFIG[submission.status] ?? STATUS_CONFIG.pending_review)
    : null;
  const isEditable = statusConfig?.editable ?? false;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setProfilePicture(dataUrl);
      setProfilePicturePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/candidate/submissions/${submissionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateStatement: candidateStatement || null,
          biographicalInfo: biographicalInfo || null,
          contactAddress: contactAddress || null,
          contactZipCode: contactZipCode || null,
          contactPhone: contactPhone || null,
          contactFax: contactFax || null,
          contactEmail: contactEmail || null,
          contactWebsite: contactWebsite || null,
          profilePictureUrl: profilePicture || null,
          resubmissionNote: resubmissionNote || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to save");
      } else {
        setSuccess(data.message);
        setResubmissionNote("");
        // Navigate back to dashboard so candidate sees the updated status
        router.push(`/${locale}/candidate/dashboard`);
      }
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
        <Link
          href={`/${locale}/candidate/dashboard`}
          className="text-primary-600 mt-4 inline-block text-sm hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  if (!submission) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href={`/${locale}/candidate/dashboard`}
        className="text-primary-600 mb-4 inline-block text-sm hover:underline"
      >
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-neutral-900">
            {submission.office.label}
          </h1>
          {statusConfig && (
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          {submission.election.label} &middot;{" "}
          {submission.languageCode.toUpperCase()} &middot; Submitted{" "}
          {new Date(submission.submissionDate).toLocaleDateString()}
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Form-level error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ═══ ADMIN FEEDBACK ═══ */}
      {submission.reviewerNotes && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-orange-800">
            Admin Feedback
          </h2>
          <p className="text-sm whitespace-pre-wrap text-orange-900">
            {submission.reviewerNotes}
          </p>
          {submission.reviewer && (
            <p className="mt-2 text-xs text-orange-600">
              — {submission.reviewer.displayName}
              {submission.reviewedAt &&
                `, ${new Date(submission.reviewedAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
      )}

      {/* ═══ ACTIVITY LOG ═══ */}
      {submission.logs.length > 0 && (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Activity
          </h2>
          <div className="space-y-3">
            {submission.logs.map((log) => (
              <div key={log.id} className="border-l-2 border-neutral-200 pl-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-800">
                    {formatAction(log.action)}
                  </span>
                  <span className="text-xs text-neutral-400">
                    by {log.admin?.displayName ?? "Candidate"}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {log.notes && (
                  <p className="mt-1 text-sm whitespace-pre-wrap text-neutral-600">
                    {log.notes}
                  </p>
                )}
                {log.previousStatus &&
                  log.newStatus &&
                  log.action !== "submission_resubmitted" && (
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {log.previousStatus.replace(/_/g, " ")} →{" "}
                      {log.newStatus.replace(/_/g, " ")}
                    </p>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SUBMISSION CONTENT ═══ */}
      <div className="space-y-6">
        {/* Candidate Statement */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Candidate Statement
          </h2>
          {isEditable ? (
            <textarea
              value={candidateStatement}
              onChange={(e) => setCandidateStatement(e.target.value)}
              rows={5}
              className="input-field w-full resize-y"
              placeholder="Your candidate statement..."
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap text-neutral-600">
              {submission.candidateStatement || "No statement provided"}
            </p>
          )}
        </div>

        {/* Biographical Info */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Biographical Information
          </h2>
          {isEditable ? (
            <textarea
              value={biographicalInfo}
              onChange={(e) => setBiographicalInfo(e.target.value)}
              rows={5}
              className="input-field w-full resize-y"
              placeholder="Your biographical information..."
            />
          ) : (
            <p className="text-sm whitespace-pre-wrap text-neutral-600">
              {submission.biographicalInfo || "No biographical info provided"}
            </p>
          )}
        </div>

        {/* Candidate Photo */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Candidate Photo
          </h2>
          {isEditable ? (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="hover:border-primary-300 hover:bg-primary-50 flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6">
                  <svg
                    className="mb-2 h-8 w-8 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm text-neutral-500">
                    {profilePicturePreview
                      ? "Change photo"
                      : "Click to select a photo"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
              {profilePicturePreview && (
                <div className="relative shrink-0">
                  <img
                    src={profilePicturePreview}
                    alt="Preview"
                    className="h-32 w-32 rounded-lg border border-neutral-200 object-cover shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProfilePicture("");
                      setProfilePicturePreview("");
                    }}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ) : submission.profilePictureUrl ? (
            <img
              src={submission.profilePictureUrl}
              alt="Candidate photo"
              className="h-40 w-40 rounded-lg border border-neutral-200 object-cover shadow-sm"
            />
          ) : (
            <p className="text-sm text-neutral-400">No photo uploaded</p>
          )}
        </div>

        {/* Contact Information */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Contact Information
          </h2>
          {isEditable ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Address
                </label>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={contactZipCode}
                  onChange={(e) => setContactZipCode(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Phone
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Fax
                </label>
                <input
                  type="text"
                  value={contactFax}
                  onChange={(e) => setContactFax(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Website
                </label>
                <input
                  type="url"
                  value={contactWebsite}
                  onChange={(e) => setContactWebsite(e.target.value)}
                  className="input-field w-full"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {submission.contactAddress && (
                <p className="text-sm text-neutral-600">
                  <span className="text-xs text-neutral-400">Address:</span>{" "}
                  {submission.contactAddress}
                </p>
              )}
              {submission.contactZipCode && (
                <p className="text-sm text-neutral-600">
                  <span className="text-xs text-neutral-400">ZIP:</span>{" "}
                  {submission.contactZipCode}
                </p>
              )}
              {submission.contactPhone && (
                <p className="text-sm text-neutral-600">
                  <span className="text-xs text-neutral-400">Phone:</span>{" "}
                  {submission.contactPhone}
                </p>
              )}
              {submission.contactFax && (
                <p className="text-sm text-neutral-600">
                  <span className="text-xs text-neutral-400">Fax:</span>{" "}
                  {submission.contactFax}
                </p>
              )}
              {submission.contactEmail && (
                <p className="text-sm text-neutral-600">
                  <span className="text-xs text-neutral-400">Email:</span>{" "}
                  {submission.contactEmail}
                </p>
              )}
              {submission.contactWebsite && (
                <p className="text-sm text-neutral-600">
                  <span className="text-xs text-neutral-400">Website:</span>{" "}
                  {submission.contactWebsite}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Candidate Profile (read-only) */}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            Your Profile
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <p className="text-sm text-neutral-600">
              <span className="text-xs text-neutral-400">Name:</span>{" "}
              {submission.candidate.officialFirstName}{" "}
              {submission.candidate.officialLastName}
            </p>
            {submission.candidate.campaignName && (
              <p className="text-sm text-neutral-600">
                <span className="text-xs text-neutral-400">Campaign:</span>{" "}
                {submission.candidate.campaignName}
              </p>
            )}
            {submission.candidate.party && (
              <p className="text-sm text-neutral-600">
                <span className="text-xs text-neutral-400">Party:</span>{" "}
                {submission.candidate.party}
              </p>
            )}
            {submission.candidate.education && (
              <p className="text-sm text-neutral-600">
                <span className="text-xs text-neutral-400">Education:</span>{" "}
                {submission.candidate.education}
              </p>
            )}
            {submission.candidate.currentEmployment && (
              <p className="text-sm text-neutral-600">
                <span className="text-xs text-neutral-400">Employment:</span>{" "}
                {submission.candidate.currentEmployment}
              </p>
            )}
            {submission.candidate.age != null && (
              <p className="text-sm text-neutral-600">
                <span className="text-xs text-neutral-400">Age:</span>{" "}
                {submission.candidate.age}
              </p>
            )}
          </div>
        </div>

        {/* Save / Resubmit button */}
        {isEditable && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
            {submission.status === "changes_requested" && (
              <div className="mb-4">
                <label className="mb-1 block text-xs font-medium text-neutral-500">
                  Note for the Admin (optional)
                </label>
                <textarea
                  value={resubmissionNote}
                  onChange={(e) => setResubmissionNote(e.target.value)}
                  rows={2}
                  className="input-field w-full resize-y"
                  placeholder="Briefly describe the changes you made..."
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving
                  ? "Saving..."
                  : submission.status === "changes_requested"
                    ? "Save & Resubmit for Review"
                    : "Save Changes"}
              </button>
              <Link
                href={`/${locale}/candidate/dashboard`}
                className="text-sm text-neutral-400 underline hover:text-neutral-600"
              >
                Cancel
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
