"use client";

import { useEffect, useRef } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { switchLocalePath } from "@/i18n/switch-path";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/locales";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/** Selettore della lingua: IT · EN · ES · 中文 · DE, verso la stessa pagina (indirizzi e slug tradotti). */
export function LanguageSwitcher({ className, inline = false }: { className?: string; inline?: boolean }) {
  const t = useT("nav");
  const locale = useClientLocale() as Locale;
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);

  // chiusura con clic fuori o Esc
  useEffect(() => {
    const el = ref.current;
    if (!el || inline) return;
    const onDoc = (e: MouseEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        el.open = false;
        el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [inline]);

  const links = LOCALES.map((l) => (
    <NextLink
      key={l}
      href={switchLocalePath(pathname, locale, l)}
      hrefLang={LOCALE_META[l].hreflang}
      lang={LOCALE_META[l].hreflang}
      aria-current={l === locale ? "true" : undefined}
      onClick={() => {
        if (l !== locale) track("language_switch", { from: locale, to: l });
        try {
          localStorage.setItem("tl-lang-choice", l);
        } catch {}
      }}
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 rounded-sm px-3 text-sm transition-colors hover:bg-surface-2",
        l === locale ? "font-semibold text-fg" : "text-fg/85",
        inline && "min-w-11 justify-center rounded-full border border-line-strong px-3 hover:border-accent hover:bg-transparent",
        inline && l === locale && "border-accent",
      )}
    >
      <span>{inline ? LOCALE_META[l].label : LOCALE_META[l].name}</span>
      {!inline && l === locale ? <Check aria-hidden="true" className="size-4 text-accent" strokeWidth={2} /> : null}
    </NextLink>
  ));

  // nel menu mobile: tutte le lingue in riga
  if (inline)
    return (
      <nav aria-label={t("language")} className={cn("flex flex-wrap gap-2", className)}>
        {links}
      </nav>
    );

  return (
    <details ref={ref} className={cn("relative", className)}>
      <summary
        className="annot flex h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-1 rounded-full border border-line-strong px-3 uppercase tracking-[0.12em] text-fg transition-colors hover:border-accent [&::-webkit-details-marker]:hidden"
        aria-label={`${LOCALE_META[locale].label} · ${t("language")}: ${LOCALE_META[locale].name}`}
      >
        {LOCALE_META[locale].label}
        <ChevronDown aria-hidden="true" className="size-3.5" strokeWidth={1.75} />
      </summary>
      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid min-w-44 gap-0.5 rounded-md border border-line bg-bg p-1.5 shadow-[0_12px_32px_var(--c-shadow)]">{links}</div>
    </details>
  );
}
