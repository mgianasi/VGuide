import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CandidateDashboardPage({ params }: Props) {
  const { locale } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/${locale}/candidate/login`);
  }

  // Fetch candidate profile + submissions
  const candidate = await prisma.candidate.findUnique({
    where: { accountId: session.sub },
    include: {
      submissions: {
        include: {
          election: { select: { label: true } },
          office: { select: { label: true, category: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const submissions = candidate?.submissions ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">
          Welcome, {session.firstName} {session.lastName}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your Voters&apos; Guide submissions
        </p>
        <form action="/api/auth/logout" method="POST" className="mt-2">
          <button
            type="submit"
            className="text-sm text-neutral-400 underline hover:text-neutral-600"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Action Hub */}
      <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">
          Active Election
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {submissions.length > 0
            ? `${submissions[0].election.label}`
            : "2026 General Election"}
        </p>
        <Link
          href={`/${locale}/candidate/dashboard/submission/new`}
          className="btn-primary mt-4 inline-block"
        >
          + Start New Submission
        </Link>
      </div>

      {/* Submissions */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            My Submissions ({submissions.length})
          </h2>
        </div>

        {submissions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-400">
            No submissions yet. Click &ldquo;Start New Submission&rdquo; above
            to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500 uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Office</th>
                  <th className="px-6 py-3 font-medium">Language</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Submitted</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {s.office.label}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {s.languageCode.toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : s.status === "denied"
                              ? "bg-red-100 text-red-700"
                              : s.status === "superseded"
                                ? "bg-neutral-100 text-neutral-500"
                                : s.status === "changes_requested"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {s.status
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/${locale}/candidate/dashboard/submission/${s.id}`}
                        className="text-primary-600 hover:text-primary-500 font-medium"
                      >
                        {s.status === "changes_requested"
                          ? "Review & Edit →"
                          : "View Details →"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
