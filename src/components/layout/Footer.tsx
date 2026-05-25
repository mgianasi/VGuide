import Link from "next/link";

type Props = {
  locale: string;
};

export function Footer({ locale }: Props) {
  return (
    <footer
      className="border-t border-neutral-200 bg-neutral-50"
      role="contentinfo"
    >
      <div className="page-container py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <p className="mb-2 text-sm font-semibold text-neutral-800">
              Illinois State Board of Elections
            </p>
            <p className="text-xs text-neutral-500">
              Official Voters&apos; Guide
            </p>
          </div>

          {/* Contact */}
          <div>
            <p className="mb-2 text-sm font-semibold text-neutral-800">
              Contact
            </p>
            <ul className="space-y-1 text-sm text-neutral-600">
              <li>
                <strong>Springfield:</strong> 217-782-4141
              </li>
              <li>
                <strong>Chicago:</strong> 312-814-6440
              </li>
              <li>
                <Link
                  href={`/${locale}/voters-guide/contact`}
                  className="text-primary-600 hover:underline"
                >
                  Full Contact Information
                </Link>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <p className="mb-2 text-sm font-semibold text-neutral-800">
              Resources
            </p>
            <ul className="space-y-1 text-sm text-neutral-600">
              <li>
                <Link
                  href={`/${locale}/voters-guide/faqs`}
                  className="hover:underline"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <a
                  href="https://elections.il.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  elections.il.gov
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-neutral-200 pt-6 text-center text-xs text-neutral-400">
          &copy; {new Date().getFullYear()} Illinois State Board of Elections.
          All rights reserved.
        </div>
      </div>
    </footer>
  );
}
