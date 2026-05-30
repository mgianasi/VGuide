'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type SubmissionDetail = {
  id: string;
  candidate: {
    officialFirstName: string | null;
    officialLastName: string | null;
    party: string | null;
  };
  office: { label: string };
  candidateStatement: string | null;
  biographicalInfo: string | null;
  profilePictureUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
};

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const locale = params.locale as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/candidates/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubmission(data.data);
        } else {
          setError(data.error || "Candidate not found");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch candidate details");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="page-container py-8 text-center">Loading...</div>;
  if (error || !submission) return <div className="page-container py-8 text-center text-red-600">{error || "Candidate not found."}</div>;

  return (
    <div className="page-container py-8">
      <Link href={`/${locale}/voters-guide`} className="text-blue-600 hover:underline mb-4 block">
        &larr; Back to Voters&apos; Guide
      </Link>

      <div className="card bg-white p-6 shadow-sm rounded-lg">
        <div className="flex flex-col md:flex-row gap-8">
          {submission.profilePictureUrl && (
            <img
              src={submission.profilePictureUrl}
              alt={`${submission.candidate.officialFirstName} ${submission.candidate.officialLastName}`}
              className="w-48 h-48 object-cover rounded-lg shadow-md"
            />
          )}

          <div>
            <h1 className="text-3xl font-bold mb-4">
              {submission.candidate.officialFirstName} {submission.candidate.officialLastName}
            </h1>
            <p className="text-xl text-neutral-600 mb-2">{submission.office.label}</p>
            {submission.candidate.party && <p className="text-neutral-500 font-semibold">{submission.candidate.party}</p>}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {submission.candidateStatement && (
            <div>
              <h2 className="text-lg font-bold mb-2">Candidate Statement</h2>
              <p className="whitespace-pre-wrap text-neutral-700">{submission.candidateStatement}</p>
            </div>
          )}

          {submission.biographicalInfo && (
            <div>
              <h2 className="text-lg font-bold mb-2">Biographical Information</h2>
              <p className="whitespace-pre-wrap text-neutral-700">{submission.biographicalInfo}</p>
            </div>
          )}

          <div className="pt-6 border-t">
            <h2 className="text-lg font-bold mb-2">Contact Information</h2>
            <ul className="space-y-1 text-neutral-700">
              {submission.contactEmail && <li>Email: {submission.contactEmail}</li>}
              {submission.contactPhone && <li>Phone: {submission.contactPhone}</li>}
              {submission.contactWebsite && (
                <li>
                  Campaign Website:{" "}
                  <a href={submission.contactWebsite} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    {submission.contactWebsite}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
