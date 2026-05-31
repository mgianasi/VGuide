'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

type PolicyQuestion = {
  id: string;
  title: string;
  fileName: string;
  description?: string | null;
};

export default function PolicyQuestionsPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [items, setItems] = useState<PolicyQuestion[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/policy-questions`);
        const data = await res.json();
        if (data.success) {
          setItems(data.data);
        }
      } catch {
        // silent
      }
    }
    load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Public Policy Questions</h1>
      <p className="mt-2 text-sm text-neutral-600">
        View the public policy questions for this election cycle.
      </p>

      <div className="mt-6 space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-neutral-500">No policy questions available.</p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-semibold">{item.title}</p>
              {item.description && (
                <p className="text-sm text-neutral-600">{item.description}</p>
              )}
            </div>
            <a
              href={`/policy-questions/${item.fileName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              View PDF
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
