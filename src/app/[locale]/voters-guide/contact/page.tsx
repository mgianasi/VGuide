type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ContactPage() {

  return (
    <div className="page-container py-8">
      <h1 className="section-heading mb-8">Contact Us</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Springfield Office */}
        <div className="card">
          <h2 className="mb-1 text-lg font-semibold text-neutral-900">
            Springfield Office
          </h2>
          <p className="mb-4 text-sm text-neutral-500">
            Main office for candidate filings and election administration
          </p>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-neutral-800">Address</dt>
              <dd className="text-neutral-600">
                2329 S. MacArthur Blvd
                <br />
                Springfield, IL 62704
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-800">Phone</dt>
              <dd className="text-neutral-600">
                <a
                  href="tel:+12177824141"
                  className="text-primary-600 hover:underline"
                >
                  217-782-4141
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-800">Hours</dt>
              <dd className="text-neutral-600">
                Monday - Friday, 8:30 AM - 5:00 PM
              </dd>
            </div>
          </dl>
        </div>

        {/* Chicago Office */}
        <div className="card">
          <h2 className="mb-1 text-lg font-semibold text-neutral-900">
            Chicago Office
          </h2>
          <p className="mb-4 text-sm text-neutral-500">
            Secondary office for voter outreach and public information
          </p>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-neutral-800">Address</dt>
              <dd className="text-neutral-600">
                69 W. Washington
                <br />
                Suite LL08
                <br />
                Chicago, IL 60602
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-800">Phone</dt>
              <dd className="text-neutral-600">
                <a
                  href="tel:+13128146440"
                  className="text-primary-600 hover:underline"
                >
                  312-814-6440
                </a>
              </dd>
            </div>
            <div>
              <dt className="font-medium text-neutral-800">Email</dt>
              <dd className="text-neutral-600">
                <a
                  href="mailto:contact@elections.il.gov"
                  className="text-primary-600 hover:underline"
                >
                  contact@elections.il.gov
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Additional info */}
      <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-800">
          Election Authorities
        </h2>
        <p className="text-sm text-neutral-600">
          For local election authority information, please visit{" "}
          <a
            href="https://elections.il.gov/ElectionOperations/ElectionAuthorities.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 font-medium hover:underline"
          >
            elections.il.gov
          </a>
          .
        </p>
      </div>
    </div>
  );
}
