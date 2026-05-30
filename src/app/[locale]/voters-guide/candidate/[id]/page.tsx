'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Since we don't have the exact response shape from /api/candidate-search
// We'll trust the structure inferred from existing files
type CandidateProfile = {
  id: string;
  candidateId: string;
  officialFirstName: string;
  officialLastName: string;
  campaignName: string | null;
  party: string | null;
  office: { label: string; category: string };
  candidateStatement: string | null;
  biographicalInfo: string | null;
  profilePictureUrl: string | null;
  contactAddress: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactWebsite: string | null;
};

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const locale = params.locale as string;

  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/candidates/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCandidate(data.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-container py-8 text-center">Loading...</div>;
  if (!candidate) return <div className="page-container py-8 text-center">Candidate not found.</div>;

  return (
    <div className="page-container py-8">
      <Link href={`/${locale}/voters-guide`} className="text-blue-600 hover:underline mb-4 block">
        ← Back to Voters' Guide
      </Link>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-8">
          {candidate.profilePictureUrl && (
            <img
              src={candidate.profilePictureUrl}
              alt={`${candidate.officialFirstName} ${candidate.officialLastName}`}
              className="w-48 h-48 object-cover rounded-lg shadow-md"
            />
          )}

          <div>
            <h1 className="text-3xl font-bold">{candidate.officialFirstName} {candidate.officialLastName}</h1>
            <p className="text-xl text-neutral-600 mb-2">{candidate.office.label}</p>
            {candidate.party && <p className="text-neutral-500 font-semibold">{candidate.party}</p>}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {candidate.candidateStatement && (
            <div>
              <h2 className="text-lg font-bold mb-2">Candidate Statement</h2>
              <p className="whitespace-pre-wrap">{candidate.candidateStatement}</p>
            </div>
          )}

          {candidate.biographicalInfo && (
            <div>
              <h2 className="text-lg font-bold mb-2">Biographical Information</h2>
              <p className="whitespace-pre-wrap">{candidate.biographicalInfo}</p>
            </div>
          )}

          <div className="pt-6 border-t">
            <h2 className="text-lg font-bold mb-2">Contact Information</h2>
            <ul className="space-y-1">
              {candidate.contactEmail && <li>Email: {candidate.contactEmail}</li>}
              {candidate.contactPhone && <li>Phone: {candidate.contactPhone}</li>}
              {candidate.contactWebsite && (
                <li>
                  <a href={candidate.contactWebsite} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    Campaign Website
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
