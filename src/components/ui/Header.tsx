import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import type { StaticPathname } from "@/i18n/routing";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { QuoteLink, ShopLink, localizedHref } from "./TrackedLink";
import { MobileMenu, NavList } from "./HeaderClient";
import { RequestButton, RequestMenuLink } from "@/components/request/RequestButton";
import { Phone } from "lucide-react";
import { COMPANY } from "@/data/site";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { cn } from "@/lib/cn";

const PRIMARY: { href: StaticPathname; key: string }[] = [
  { href: "/prodotti", key: "products" },
  { href: "/su-misura", key: "custom" },
  { href: "/azienda", key: "about" },
  { href: "/qualita", key: "quality" },
  { href: "/shop", key: "shopShort" },
  { href: "/contatti", key: "contact" },
];

const SECONDARY: { href: StaticPathname; key: string }[] = [
  { href: "/prodotti/tabelle", key: "tables" },
  { href: "/faq", key: "faq" },
];

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex flex-col leading-none", className)}>
      <span className="font-display text-[0.92rem] font-extrabold uppercase tracking-[0.04em] wdth-wide max-[380px]:text-[0.84rem] sm:text-[1.15rem] sm:tracking-[0.06em] sm:wdth-xwide">
        Tecnolambro
      </span>
      <span className="annot mt-1 text-[0.5625rem] uppercase tracking-[0.2em] text-primary-ink sm:text-[0.625rem] sm:tracking-[0.26em]">Microwave Components</span>
    </span>
  );
}

/**
 * Header: componente server (percorsi localizzati ed etichette calcolati qui).
 * Isole client: voce di menu attiva (NavList), menu mobile (MobileMenu), lingua, tema, effetto magnetico.
 */
export async function Header() {
  const t = await getTranslations("nav");
  const toItems = async (list: typeof PRIMARY) =>
    Promise.all(list.map(async (item) => ({ href: await localizedHref(item.href), label: t(item.key) })));
  const primary = await toItems(PRIMARY);
  const all = await toItems([...PRIMARY, ...SECONDARY]);
  const home = await localizedHref("/");
  const requestPath = await localizedHref("/shop/richiesta");

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/70 bg-scrim backdrop-blur-md">
      <div className="container-site flex h-16 items-center gap-3 sm:gap-4 lg:h-[4.5rem]">
        <NextLink href={home} className="mr-auto inline-flex min-h-11 items-center rounded-sm">
          <Wordmark />
          <span className="sr-only">, {t("homeShort")}</span>
        </NextLink>

        <nav aria-label={t("label")} className="hidden lg:block">
          <NavList items={primary} variant="desktop" />
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <a href={COMPANY.phoneHref} aria-label={`${t("call")} ${COMPANY.phone}`} className="grid size-11 place-items-center rounded-full border border-line-strong transition-colors hover:border-accent sm:hidden" data-area="header" data-header-phone>
            <Phone aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.75} />
          </a>
          <RequestButton href={requestPath} className="max-sm:hidden" />
          <MagneticButton>
            <QuoteLink source="header" className="btn btn-primary btn-sm max-sm:px-3 max-[380px]:px-2.5 max-[380px]:text-[0.8125rem]">
              <span className="sm:hidden">{t("quoteShort")}</span>
              <span className="hidden sm:inline">{t("quote")}</span>
            </QuoteLink>
          </MagneticButton>
          <MobileMenu openLabel={t("menu")} closeLabel={t("close")} label={t("menuLabel")} wordmark={<Wordmark />}>
            <nav aria-label={t("menuLabel")} className="container-site flex-1 overflow-y-auto py-6">
              <NavList items={all} variant="mobile" />
              <div className="mt-8 grid gap-3">
                <QuoteLink source="mobile_menu" className="btn btn-primary w-full">
                  {t("quote")}
                </QuoteLink>
                <ShopLink source="mobile_menu" className="btn btn-ghost w-full">
                  {t("shop")}
                </ShopLink>
                <RequestMenuLink href={requestPath} />
                <a href={COMPANY.phoneHref} className="btn btn-ghost w-full tabular" data-area="mobile_menu">
                  <Phone aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  {COMPANY.phone}
                </a>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </nav>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
