import Link from "next/link";
import Image from "next/image";
import { LanguageToggle } from "./LanguageToggle";

type Props = { locale: string };

export function Header({ locale }: Props) {
  return (
    <header className="border-b border-neutral-200 bg-white" role="banner">
      <div className="page-container flex items-center justify-between py-3">
        <Link href={`/${locale}/voters-guide`} className="flex items-center gap-3">
          <Image
            src="/il-seal.png"
            alt="Illinois State Board of Elections Seal"
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
          <div className="hidden sm:block">
            <p className="text-sm leading-tight font-semibold text-[#002868]">Illinois State Board of Elections</p>
            <p className="text-xs text-neutral-500">Official Voters&apos; Guide</p>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageToggle currentLocale={locale} />
          <Link href={`/${locale}/candidate/login`} className="btn-secondary text-sm">
            Candidate Login
          </Link>
        </div>
      </div>
      <nav className="border-t border-neutral-100 bg-neutral-50" aria-label="Main navigation">
        <div className="page-container flex flex-wrap gap-x-6 gap-y-1 py-2 text-sm">
          <Link href={`/${locale}/voters-guide`} className="text-primary-600 hover:text-primary-700 font-medium">Voters&apos; Guide</Link>
          <Link href={`/${locale}/voters-guide/faqs`} className="text-neutral-600 hover:text-neutral-800">FAQs</Link>
          <Link href={`/${locale}/voters-guide/contact`} className="text-neutral-600 hover:text-neutral-800">Contact Us</Link>
        </div>
      </nav>
    </header>
  );
}
