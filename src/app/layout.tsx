import type { Metadata } from "next";
import { Inter, Public_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Illinois State Board of Elections — Voters' Guide",
  description:
    "Official Illinois Voters' Guide. Find candidate information for upcoming elections. Search by office, name, or jurisdiction.",
  keywords: [
    "Illinois elections",
    "voters guide",
    "candidate information",
    "ISBE",
    "election 2026",
  ],
  openGraph: {
    title: "Illinois State Board of Elections — Voters' Guide",
    description:
      "Official Illinois Voters' Guide. Find candidate information for upcoming elections.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${publicSans.variable}`}>
      <body className="min-h-screen bg-white font-body text-neutral-700 antialiased">
        {/* Skip-to-content link for WCAG 2.4.1 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white focus:ring-3 focus:ring-primary-400"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}