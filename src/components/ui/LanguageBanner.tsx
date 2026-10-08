"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useClientLocale } from "@/lib/client-i18n";
import { switchLocalePath } from "@/i18n/switch-path";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/locales";
import { track } from "@/lib/analytics";

/** Testi del banner nella lingua proposta (chi li legge parla quella lingua). */
const TEXT: Record<Locale, { body: string; go: string; close: string }> = {
  it: { body: "Questa pagina è disponibile in italiano.", go: "Passa all’italiano", close: "Chiudi" },
  en: { body: "This page is available in English.", go: "Switch to English", close: "Close" },
  es: { body: "Esta página está disponible en español.", go: "Ver en español", close: "Cerrar" },
  zh: { body: "本页面提供简体中文版本。", go: "切换到中文", close: "关闭" },
  de: { body: "Diese Seite ist auf Deutsch verfügbar.", go: "Auf Deutsch ansehen", close: "Schließen" },
};

const SEEN = "tl-lang-banner";
const CHOICE = "tl-lang-choice";

/** Prima lingua del browser tra quelle del sito (zh-CN → zh, de-AT → de). */
function browserLocale(): Locale | null {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    const hit = LOCALES.find((l) => l === base);
    if (hit) return hit;
  }
  return null;
}

/**
 * Alla prima visita, se il browser preferisce un'altra lingua del sito, la propone con un piccolo
 * banner. Nessun redirect automatico; la scelta (o la chiusura) viene ricordata.
 */
export function LanguageBanner() {
  const locale = useClientLocale() as Locale;
  const pathname = usePathname();
  const [target, setTarget] = useState<Locale | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (localStorage.getItem(SEEN) || localStorage.getItem(CHOICE)) return;
      } catch {
        return;
      }
      const pref = browserLocale();
      if (pref && pref !== locale) setTarget(pref);
    }, 1200);
    return () => window.clearTimeout(id);
  }, [locale]);

  if (!target) return null;
  const tx = TEXT[target];
  const remember = (value: string) => {
    try {
      localStorage.setItem(SEEN, value);
    } catch {}
  };
  return (
    <div
      role="region"
      aria-label={tx.body}
      lang={LOCALE_META[target].hreflang}
      className="fixed inset-x-4 top-[4.75rem] z-[55] mx-auto flex max-w-md items-center gap-3 rounded-md border border-line bg-bg/95 p-3 pl-4 text-sm shadow-[0_12px_32px_var(--c-shadow)] backdrop-blur lg:left-auto lg:right-6 lg:top-[5.25rem]"
      data-language-banner
    >
      <p className="min-w-0 flex-1">{tx.body}</p>
      <NextLink
        href={switchLocalePath(pathname, locale, target)}
        hrefLang={LOCALE_META[target].hreflang}
        className="btn btn-primary btn-sm shrink-0"
        onClick={() => {
          remember(target);
          track("language_switch", { from: locale, to: target, source: "banner" });
        }}
      >
        {tx.go}
      </NextLink>
      <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-2" aria-label={tx.close} onClick={() => (remember("dismissed"), setTarget(null))}>
        <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
