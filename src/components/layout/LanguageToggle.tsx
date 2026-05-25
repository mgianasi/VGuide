"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

type Props = {
  currentLocale: string;
};

const LOCALES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
  { code: "ar", label: "العربية" },
] as const;

export function LanguageToggle({ currentLocale }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = useCallback(
    (newLocale: string) => {
      // Replace the current locale segment in the path
      const segments = pathname.split("/");
      segments[1] = newLocale;
      router.push(segments.join("/"));
    },
    [pathname, router],
  );

  return (
    <div className="flex items-center gap-1">
      <label htmlFor="lang-toggle" className="sr-only">
        Select language
      </label>
      <select
        id="lang-toggle"
        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700"
        value={currentLocale}
        onChange={(e) => switchLocale(e.target.value)}
        aria-label="Language"
      >
        {LOCALES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}