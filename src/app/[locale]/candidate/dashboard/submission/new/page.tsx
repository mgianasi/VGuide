"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Election = { id: string; label: string; cycleYear: number; electionType: string };
type Office = { id: string; label: string; category: string };

export default function NewSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [elections, setElections] = useState<Election[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Form state
  const [electionId, setElectionId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [candidateStatement, setCandidateStatement] = useState("");
  const [biographicalInfo, setBiographicalInfo] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [contactZipCode, setContactZipCode] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactFax, setContactFax] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");

  const langOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "pl", label: "Polski" },
    { value: "zh", label: "中文" },
    { value: "ar", label: "العربية" },
    { value: "hi", label: "हिन्दी" },
    { value: "ur", label: "اردو" },
    { value: "ko", label: "한국어" },
    { value: "vi", label: "Tiếng Việt" },
    { value: "tl", label: "Tagalog" },
  ];

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/submissions");
        const data = await res.json();
        if (data.success) {
          setElections(data.elections ?? []);
          setOffices(data.offices ?? []);
          if (data.elections?.length === 1) setElectionId(data.elections[0].id);
        } else {
          setError("Failed to load form data");
        }
      } catch {
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          electionId,
          officeId,
          languageCode,
          candidateStatement: candidateStatement.trim() || null,
          biographicalInfo: biographicalInfo.trim() || null,
          contactAddress: contactAddress.trim() || null,
          contactZipCode: contactZipCode.trim() || null,
          contactPhone: contactPhone.trim() || null,
          contactFax: contactFax.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactWebsite: contactWebsite.trim() || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create submission");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/candidate/dashboard`);
      }, 1500);
    } catch {
      setError("Connection error");
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-md bg-green-50 p-6 text-green-700">
          <h2 className="text-lg font-semibold">Submission Created!</h2>
          <p className="mt-2 text-sm">
            Your submission has been submitted for review.
          </p>
          <p className="mt-4 text-xs text-green-500">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/${locale}/candidate/dashboard`}
          className="text-sm text-neutral-500 hover:text-primary-600"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-neutral-900">
          New Submission
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fill out your candidate profile for the Voters&apos; Guide
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400">
          Loading...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Election & Office */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Election Details
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="electionId" className="label">
                  Election *
                </label>
                <select
                  id="electionId"
                  required
                  className="input-field mt-1"
                  value={electionId}
                  onChange={(e) => setElectionId(e.target.value)}
                >
                  <option value="">Select election...</option>
                  {elections.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="officeId" className="label">
                  Office *
                </label>
                <select
                  id="officeId"
                  required
                  className="input-field mt-1"
                  value={officeId}
                  onChange={(e) => setOfficeId(e.target.value)}
                >
                  <option value="">Select office...</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="languageCode" className="label">
                  Language *
                </label>
                <select
                  id="languageCode"
                  required
                  className="input-field mt-1"
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                >
                  {langOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Candidate Content */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Candidate Content
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="candidateStatement" className="label">
                  Candidate Statement
                </label>
                <p className="mb-1 text-xs text-neutral-400">
                  A brief statement to voters about your candidacy
                </p>
                <textarea
                  id="candidateStatement"
                  rows={5}
                  className="input-field mt-1"
                  placeholder="Share your message to the voters..."
                  value={candidateStatement}
                  onChange={(e) => setCandidateStatement(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="biographicalInfo" className="label">
                  Biographical Information
                </label>
                <p className="mb-1 text-xs text-neutral-400">
                  Your background, education, and experience
                </p>
                <textarea
                  id="biographicalInfo"
                  rows={5}
                  className="input-field mt-1"
                  placeholder="Tell voters about yourself..."
                  value={biographicalInfo}
                  onChange={(e) => setBiographicalInfo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Contact Information
            </h2>
            <p className="mb-3 text-xs text-neutral-400">
              Optional — will be used if different from your campaign contact
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="contactAddress" className="label">
                  Address
                </label>
                <input
                  id="contactAddress"
                  type="text"
                  className="input-field mt-1"
                  placeholder="Street address"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="contactZipCode" className="label">
                  ZIP Code
                </label>
                <input
                  id="contactZipCode"
                  type="text"
                  className="input-field mt-1"
                  placeholder="XXXXX"
                  maxLength={10}
                  value={contactZipCode}
                  onChange={(e) => setContactZipCode(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="contactPhone" className="label">
                  Phone
                </label>
                <input
                  id="contactPhone"
                  type="tel"
                  className="input-field mt-1"
                  placeholder="XXX-XXX-XXXX"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="contactFax" className="label">
                  Fax
                </label>
                <input
                  id="contactFax"
                  type="text"
                  className="input-field mt-1"
                  placeholder="Fax number"
                  value={contactFax}
                  onChange={(e) => setContactFax(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="contactWebsite" className="label">
                  Website
                </label>
                <input
                  id="contactWebsite"
                  type="url"
                  className="input-field mt-1"
                  placeholder="https://..."
                  value={contactWebsite}
                  onChange={(e) => setContactWebsite(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Link
              href={`/${locale}/candidate/dashboard`}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !electionId || !officeId}
              className="btn-primary disabled:opacity-30"
            >
              {saving ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}