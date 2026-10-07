"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { switchLocalePath } from "@/i18n/switch-path";
import type { Locale } from "@/i18n/routing";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/** Link alla stessa pagina nell'altra lingua (slug delle famiglie tradotti). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useT("nav");
  const locale = useClientLocale() as Locale;
  const other: Locale = locale === "it" ? "en" : "it";
  const pathname = usePathname();
  const href = switchLocalePath(pathname, locale, other);

  return (
    <NextLink
      href={href}
      hrefLang={other}
      onClick={() => track("language_switch", { from: locale, to: other })}
      className={cn(
        "annot inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-line-strong px-3 uppercase tracking-[0.12em] text-fg transition-colors hover:border-accent",
        className,
      )}
    >
      {other}
      <span className="sr-only"> {t("switchToLabel")}</span>
    </NextLink>
  );
}
