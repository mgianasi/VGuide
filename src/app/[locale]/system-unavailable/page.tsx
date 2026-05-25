type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SystemUnavailablePage({ params }: Props) {
  const { locale } = await params;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-lg text-center">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100"
          aria-hidden="true"
        >
          <svg
            className="h-10 w-10 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h1 className="mb-4 text-3xl font-bold text-neutral-900">
          System Unavailable
        </h1>
        <p className="mb-6 text-lg text-neutral-600">
          The Voters&apos; Guide submission system is currently closed for this
          election cycle. Please check back during the open submission window.
        </p>
        <div className="rounded-lg bg-neutral-50 p-4 text-left text-sm text-neutral-600">
          <p className="mb-2 font-medium text-neutral-800">Need help?</p>
          <p>
            <strong>Springfield Office:</strong> 217-782-4141
          </p>
          <p>
            <strong>Chicago Office:</strong> 312-814-6440
          </p>
          <p>
            <strong>Address:</strong> 2329 S. MacArthur Blvd, Springfield, IL
            62704
          </p>
        </div>
      </div>
    </div>
  );
}