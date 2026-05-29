'use client';
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type CandidateSubmission = {
  id: string;
  candidate: {
    officialFirstName: string;
    officialLastName: string;
    party: string | null;
    campaignName: string | null;
    profilePictureUrl: string | null;
    campaignWebsite: string | null;
  };
  office: { label: string; category: string };
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default function VotersGuidePage({ params }: Props) {
  const [submissions, setSubmissions] = useState<CandidateSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [office, setOffice] = useState("");
  const [party, setParty] = useState("");
  const [election, setElection] = useState("2026-general");
  const [paramsResolved, setParamsResolved] = useState<{ locale: string } | null>(null);

  useEffect(() => {
    params.then(setParamsResolved);
  }, [params]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (query) sp.set("query", query);
      if (office) sp.set("officeId", office);
      if (party) sp.set("party", party);
      // election logic would map to electionId if real data available
      const resp = await fetch(`/api/candidates/search?${sp.toString()}`);
      const json = await resp.json();
      if (json.success) {
        setSubmissions(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, office, party, election]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  if (!paramsResolved) return null;
  const { locale } = paramsResolved;

  return (
    <div className="page-container py-8">
      {/* Election Cycle Selector */}
      <section className="mb-8" aria-label="Election cycle selector">
        <div className="card">
          <label htmlFor="election-select" className="label mb-2">
            Select Election Cycle
          </label>
          <select
            id="election-select"
            className="input-field"
            value={election}
            onChange={(e) => setElection(e.target.value)}
          >
            <option value="2026-general">2026 General Election</option>
            <option value="2024-general">2024 General Election</option>
            <option value="2022-general">2022 General Election</option>
          </select>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="mb-8" aria-label="Search candidates">
        <div className="card">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-full lg:col-span-2">
              <label htmlFor="search-query" className="label mb-2">
                Search by candidate name or office
              </label>
              <input
                id="search-query"
                type="search"
                className="input-field"
                placeholder="e.g. Smith, U.S. Senator..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="office-filter" className="label mb-2">
                Office
              </label>
              <select id="office-filter" className="input-field" value={office} onChange={(e) => setOffice(e.target.value)}>
                <option value="">All Offices</option>
                <option value="us-senator">U.S. Senator</option>
                <option value="governor">Governor</option>
                <option value="lt-governor">Lt. Governor</option>
                <option value="attorney-general">Attorney General</option>
                <option value="secretary-of-state">Secretary of State</option>
                <option value="comptroller">Comptroller</option>
                <option value="treasurer">Treasurer</option>
                <option value="congress">U.S. Congress</option>
              </select>
            </div>
            <div>
              <label htmlFor="party-filter" className="label mb-2">
                Party
              </label>
              <select id="party-filter" className="input-field" value={party} onChange={(e) => setParty(e.target.value)}>
                <option value="">All Parties</option>
                <option value="democratic">Democratic</option>
                <option value="republican">Republican</option>
                <option value="independent">Independent</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Candidate Results */}
      <section aria-label="Candidate results" className="mb-8">
        <h2 className="section-heading mb-6">Candidates</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <p className="col-span-full text-center">Loading...</p>
          ) : submissions.length > 0 ? (
            submissions.map((s) => (
              <div key={s.id} className="card hover:shadow-lg transition-shadow">
                <h3 className="font-bold text-lg">
                  {s.candidate.officialFirstName} {s.candidate.officialLastName}
                </h3>
                <p className="text-sm text-neutral-600 mb-2">{s.office.label}</p>
                {s.candidate.party && (
                  <p className="text-xs uppercase tracking-wider font-semibold">
                    {s.candidate.party}
                  </p>
                )}
                {s.candidate.campaignWebsite && (
                  <a
                    href={s.candidate.campaignWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="block mt-4 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Visit Website
                  </a>
                )}
              </div>
            ))
          ) : (
            <p className="col-span-full text-center text-neutral-500">
              No candidates found matching your search.
            </p>
          )}
        </div>
      </section>

      {/* Policy Questions (decoupled section) */}
      <section
        aria-label="Public policy questions"
        className="mb-8 border-t border-neutral-200 pt-8"
      >
        <div className="card">
          <h2 className="section-heading mb-4">Public Policy Questions</h2>
          <p className="mb-4 text-neutral-600">
            View public policy questions and explanatory text for the current
            election cycle.
          </p>
          <Link href={`/${locale}/policy-questions`} className="btn-primary">
            View Policy PDFs
          </Link>
        </div>
      </section>
    </div>
  );
}
