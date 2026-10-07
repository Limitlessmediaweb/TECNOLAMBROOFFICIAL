import type { ReactNode } from "react";
import NextLink from "next/link";
import { ArrowRight } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getPathname, type LocalHref } from "@/i18n/switch-path";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export type Href = LocalHref;

/** Percorso localizzato (stringa) di un href interno, calcolato sul server. */
export async function localizedHref(href: Href): Promise<string> {
  const locale = (await getLocale()) as Locale;
  return getPathname({ href, locale });
}

/**
 * Link interno della CTA preventivo. Componente server: il percorso è risolto qui,
 * il tracciamento lo fa ClickTracker tramite data-track.
 */
export async function QuoteLink({
  source,
  className,
  children,
  href,
}: {
  source: string;
  className?: string;
  children: ReactNode;
  href?: Href;
}) {
  const path = await localizedHref(href ?? { pathname: "/contatti", hash: "preventivo" });
  return (
    <NextLink href={path} className={className} data-track="cta_quote_click" data-source={source}>
      {children}
    </NextLink>
  );
}

/** Link allo shop interno (/shop, /en/shop), con evento cta_shop_click. */
export async function ShopLink({
  source,
  className,
  children,
  showIcon = true,
  query,
}: {
  source: string;
  className?: string;
  children: ReactNode;
  showIcon?: boolean;
  /** filtri iniziali del catalogo, es. { linea: "ham" } */
  query?: Record<string, string>;
}) {
  const path = await localizedHref(query ? { pathname: "/shop", query } : "/shop");
  return (
    <NextLink href={path} className={cn(className)} data-track="cta_shop_click" data-source={source}>
      {children}
      {showIcon ? <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} /> : null}
    </NextLink>
  );
}
