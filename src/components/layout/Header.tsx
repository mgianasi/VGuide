import Link from "next/link";
import { LanguageToggle } from "./LanguageToggle";

type Props = {
  locale: string;
};

export function Header({ locale }: Props) {
  return (
    <header
      className="border-b border-neutral-200 bg-white"
      role="banner"
    >
      {/* Top bar — state seal + branding */}
      <div className="page-container flex items-center justify-between py-3">
        <Link
          href={`/${locale}/voters-guide`}
          className="flex items-center gap-3"
          aria-label="Illinois State Board of Elections — Home"
        >
          {/* Illinois state seal placeholder */}
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F0] text-[10px] font-bold leading-tight text-[#002868]"
            aria-hidden="true"
          >
            IL
            <br />
            SEAL
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-[#002868]">
              Illinois State Board of Elections
            </p>
            <p className="text-xs text-neutral-500">
              Official Voters&apos; Guide
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <LanguageToggle currentLocale={locale} />
          <Link
            href={`/${locale}/candidate/login`}
            className="btn-secondary text-sm"
          >
            Candidate Login
          </Link>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="border-t border-neutral-100 bg-neutral-50"
        aria-label="Main navigation"
      >
        <div className="page-container flex flex-wrap gap-x-6 gap-y-1 py-2 text-sm">
          <Link
            href={`/${locale}/voters-guide`}
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Voters&apos; Guide
          </Link>
          <Link
            href={`/${locale}/voters-guide/faqs`}
            className="text-neutral-600 hover:text-neutral-800"
          >
            FAQs
          </Link>
          <Link
            href={`/${locale}/voters-guide/contact`}
            className="text-neutral-600 hover:text-neutral-800"
          >
            Contact Us
          </Link>
          <a
            href="https://elections.il.gov/ElectionOperations/ElectionAuthorities.aspx"
            className="text-neutral-600 hover:text-neutral-800"
            target="_blank"
            rel="noopener noreferrer"
          >
            Election Authorities
          </a>
        </div>
      </nav>
    </header>
  );
}