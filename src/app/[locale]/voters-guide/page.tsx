import Link from "next/link";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function VotersGuidePage({ params }: Props) {
  const { locale } = await params;

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
            defaultValue="2026-general"
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
              />
            </div>
            <div>
              <label htmlFor="office-filter" className="label mb-2">
                Office
              </label>
              <select id="office-filter" className="input-field">
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
              <select id="party-filter" className="input-field">
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
          {/* Candidate cards will be rendered here via API */}
          <p className="col-span-full text-center text-neutral-500">
            Select an election cycle and search to view candidates.
          </p>
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
          <Link
            href={`/${locale}/policy-questions`}
            className="btn-primary"
          >
            View Policy PDFs
          </Link>
        </div>
      </section>
    </div>
  );
}