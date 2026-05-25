"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Submission = {
  id: string;
  status: string;
  submissionDate: string;
  languageCode: string;
  candidate: { officialFirstName: string; officialLastName: string };
  election: { label: string; cycleYear: number };
  office: { label: string; category: string };
  reviewer?: { displayName: string } | null;
};

type Filters = {
  elections: { id: string; label: string; cycleYear: number; status: string }[];
  offices: { id: string; label: string; category: string }[];
};

export default function AdminQueuePage() {
  const params = useParams();
  const locale = params.locale as string;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [electionFilter, setElectionFilter] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [langFilter, setLangFilter] = useState("");

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending_review", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "denied", label: "Denied" },
    { value: "changes_requested", label: "Changes Requested" },
    { value: "superseded", label: "Superseded" },
  ];

  const langOptions = [
    { value: "", label: "All Languages" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "pl", label: "Polski" },
    { value: "zh", label: "中文" },
    { value: "ar", label: "العربية" },
    { value: "hi", label: "हिन्दी" },
  ];

  async function fetchQueue(p: number = 1) {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (electionFilter) params.set("electionId", electionFilter);
    if (officeFilter) params.set("officeId", officeFilter);
    if (langFilter) params.set("languageCode", langFilter);
    if (searchQuery) params.set("query", searchQuery);
    params.set("page", String(p));
    params.set("pageSize", "20");

    try {
      const res = await fetch(`/api/admin/queue?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load queue");
      } else {
        setSubmissions(data.data ?? []);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
        if (data.filters) setFilters(data.filters);
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue(1);
  }, [statusFilter, electionFilter, officeFilter, langFilter]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    fetchQueue(1);
  }

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      pending_review: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      denied: "bg-red-100 text-red-700",
      changes_requested: "bg-orange-100 text-orange-700",
      superseded: "bg-neutral-100 text-neutral-500",
    };
    const labels: Record<string, string> = {
      pending_review: "Pending Review",
      approved: "Approved",
      denied: "Denied",
      changes_requested: "Changes Requested",
      superseded: "Superseded",
    };
    return (
      <span
        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
          styles[status] ?? "bg-neutral-100 text-neutral-500"
        }`}
      >
        {labels[status] ?? status}
      </span>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Submission Queue
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {total} submission{total !== 1 ? "s" : ""}
          </p>
        </div>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-neutral-400 underline hover:text-neutral-600"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto min-w-[160px]"
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={electionFilter}
            onChange={(e) => setElectionFilter(e.target.value)}
            className="input-field w-auto min-w-[160px]"
          >
            <option value="">All Elections</option>
            {(filters?.elections ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>

          <select
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
            className="input-field w-auto min-w-[160px]"
          >
            <option value="">All Offices</option>
            {(filters?.offices ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="input-field w-auto min-w-[130px]"
          >
            {langOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search candidate or office..."
              className="input-field w-auto min-w-[200px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-400">
            Loading...
          </div>
        ) : submissions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-400">
            No submissions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Candidate</th>
                  <th className="px-6 py-3 font-medium">Office</th>
                  <th className="px-6 py-3 font-medium">Election</th>
                  <th className="px-6 py-3 font-medium">Lang</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 font-medium text-neutral-900">
                      {s.candidate.officialFirstName}{" "}
                      {s.candidate.officialLastName}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {s.office.label}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {s.election.label}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {s.languageCode.toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      {statusBadge(s.status)}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {new Date(s.submissionDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/${locale}/admin/queue/${s.id}`}
                        className="font-medium text-primary-600 hover:text-primary-500"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4">
            <button
              onClick={() => fetchQueue(page - 1)}
              disabled={page <= 1}
              className="btn-primary disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-sm text-neutral-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchQueue(page + 1)}
              disabled={page >= totalPages}
              className="btn-primary disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}