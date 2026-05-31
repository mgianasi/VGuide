type Props = {
  params: Promise<{ locale: string }>;
};

export default async function FAQsPage() {

  const faqs = [
    {
      q: "Who is eligible to appear on the Voters' Guide?",
      a: "Candidates who have filed a statement of candidacy with the Illinois State Board of Elections and meet the legal requirements for the office they seek are eligible to submit information for the Voters' Guide.",
    },
    {
      q: "How do I submit my candidate information?",
      a: "Register for a candidate account on this site, verify your email, and complete the Multi-Factor Authentication (MFA) setup. Once logged in, you can start a new submission from your dashboard.",
    },
    {
      q: "Can I submit information in multiple languages?",
      a: "Yes. Candidates may submit information in English and one additional language. Approved submissions in different languages can coexist, but a subsequent submission in the same language will supersede the previous one.",
    },
    {
      q: "What is the submission deadline?",
      a: "Submission deadlines are tied to each election cycle's active window. Check the election cycle selector on the Voters' Guide home page for specific dates.",
    },
    {
      q: "How long does the review process take?",
      a: "Submissions are reviewed by ISBE staff. The review timeline depends on the volume of submissions. You will be notified via email when your submission status changes.",
    },
    {
      q: "My submission was denied. What can I do?",
      a: "If your submission is denied, the reviewer will include notes explaining the reason. You may submit a new, corrected submission for review.",
    },
    {
      q: "I need help. Who can I contact?",
      a: "Contact the Springfield office at 217-782-4141 or the Chicago office at 312-814-6440. Visit the Contact Us page for full details.",
    },
  ];

  return (
    <div className="page-container py-8">
      <h1 className="section-heading mb-8">Frequently Asked Questions</h1>

      <div className="max-w-3xl space-y-4">
        {faqs.map((faq, i) => (
          <details
            key={i}
            className="group rounded-lg border border-neutral-200"
          >
            <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50">
              {faq.q}
              <svg
                className="h-5 w-5 text-neutral-400 transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="border-t border-neutral-100 px-6 py-4 text-sm leading-relaxed text-neutral-600">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
