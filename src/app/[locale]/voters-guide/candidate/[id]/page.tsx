'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type SubmissionDetail = {
  id: string;
  candidate: {
    officialFirstName: string | null;
    officialLastName: string | null;
    campaignName: string | null;
    party: string | null;
    education: string | null;
    currentEmployment: string | null;
    age: number | null;
    campaignAddress: string | null;
    campaignZipCode: string | null;
    campaignWebsite: string | null;
    generalInformation: string | null;
    campaignPhoneNumber: string | null;
    campaignFaxNumber: string | null;
  };
  office: { label: string };
  candidateStatement: string | null;
  biographicalInfo: string | null;
  profilePictureUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactFax: string | null;
  contactWebsite: string | null;
};

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const locale = params.locale as string;

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/candidates/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSubmission(data.data);
        }
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="page-container py-8 text-center">Loading...</div>;
  if (!submission) return <div className="page-container py-8 text-center text-red-600">Candidate not found.</div>;

  const { candidate } = submission;

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
              alt="Profile"
              className="w-48 h-48 object-cover rounded-lg shadow-md"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold mb-4 text-black block">
              {candidate.officialFirstName} {candidate.officialLastName}
            </h1>
            <p className="text-xl text-neutral-600">{submission.office.label}</p>
            {candidate.party && <p className="text-neutral-500 font-semibold">{candidate.party}</p>}
            {candidate.campaignName && <p className="mt-2 text-sm italic">{candidate.campaignName}</p>}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {candidate.generalInformation && (<div><h2 className="text-lg font-bold">General Information</h2><p>{candidate.generalInformation}</p></div>)}
          {candidate.education && (<div><h2 className="text-lg font-bold">Education</h2><p>{candidate.education}</p></div>)}
          {candidate.currentEmployment && (<div><h2 className="text-lg font-bold">Employment</h2><p>{candidate.currentEmployment}</p></div>)}
          
          <div className="pt-6 border-t font-mono text-sm shadow-inner bg-neutral-50 p-4">
              <h3 className="font-bold mb-2">Campaign Contact Information</h3>
              {candidate.campaignAddress && <p><span className="text-neutral-500">Campaign Address:</span> {candidate.campaignAddress}</p>}
              {candidate.campaignZipCode && <p><span className="text-neutral-500">Campaign ZIP:</span> {candidate.campaignZipCode}</p>}
              {(submission.contactPhone || candidate.campaignPhoneNumber) && <p><span className="text-neutral-500">Phone:</span> <a href={`tel:${submission.contactPhone || candidate.campaignPhoneNumber}`} className="text-blue-600 underline">{submission.contactPhone || candidate.campaignPhoneNumber}</a></p>}
              {(submission.contactFax || candidate.campaignFaxNumber) && <p><span className="text-neutral-500">Fax:</span> {submission.contactFax || candidate.campaignFaxNumber}</p>}
              {submission.contactEmail && <p><span className="text-neutral-500">Email:</span> <a href={`mailto:${submission.contactEmail}`} className="text-blue-600 underline">{submission.contactEmail}</a></p>}
              {submission.contactWebsite ? (
                <p>
                  <span className="text-neutral-500">Website:</span>{' '}
                  <a href={submission.contactWebsite} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    Website
                  </a>
                </p>
              ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
