import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import type { StaticPathname } from "@/i18n/routing";
import { COMPANY, ENV } from "@/data/site";
import { Wordmark } from "./Header";
import { ShopLink } from "./TrackedLink";

const SITE: { href: StaticPathname; key: string }[] = [
  { href: "/prodotti", key: "products" },
  { href: "/prodotti/tabelle", key: "tables" },
  { href: "/su-misura", key: "custom" },
  { href: "/azienda", key: "about" },
  { href: "/qualita", key: "quality" },
  { href: "/radioamatori", key: "ham" },
  { href: "/faq", key: "faq" },
  { href: "/contatti", key: "contact" },
];

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");
  const op = COMPANY.operationalAddress;
  const lg = COMPANY.legalAddress;

  return (
    <footer className="border-t border-line bg-surface pb-[max(2rem,env(safe-area-inset-bottom))] pt-14">
      <div className="container-site grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Wordmark />
          <p className="mt-5 max-w-[34ch] text-sm text-muted">{t("tagline")}</p>
          {/* Logo originale (sfondo chiaro): presentato su una targhetta per restare leggibile in entrambi i temi */}
          <div className="mt-6 inline-block rounded-sm bg-plate p-3 ring-1 ring-line">
            <Image src="/brand/logo.png" alt={t("logoAlt")} width={541} height={197} sizes="216px" className="h-auto w-[216px]" />
          </div>
        </div>

        <nav aria-label={t("navTitle")} className="lg:col-span-2">
          <h2 className="annot uppercase tracking-[0.14em] text-muted">{t("navTitle")}</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {SITE.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-fg/90 hover:text-accent">
                  {nav(item.key)}
                </Link>
              </li>
            ))}
            <li>
              <ShopLink source="footer" className="inline-flex items-center gap-1 text-fg/90 hover:text-accent">
                {nav("shop")}
              </ShopLink>
            </li>
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <h2 className="annot uppercase tracking-[0.14em] text-muted">{t("contactTitle")}</h2>
          <address className="mt-4 grid gap-3 text-sm not-italic">
            <a href={`mailto:${COMPANY.email}`} className="text-fg hover:text-accent">
              {COMPANY.email}
            </a>
            <a href={COMPANY.phoneHref} className="tabular text-fg hover:text-accent">
              {COMPANY.phone}
            </a>
            <a href={COMPANY.phone2Href} className="tabular text-fg hover:text-accent">
              {COMPANY.phone2}
            </a>
            <a href={`mailto:${COMPANY.pec}`} className="text-fg hover:text-accent">
              <span className="text-muted">{t("pec")}</span> {COMPANY.pec}
            </a>
            <span className="text-muted">
              {op.street}
              <br />
              {op.postalCode} {op.city} ({op.province})
            </span>
          </address>
        </div>

        <div className="lg:col-span-3">
          <h2 className="annot uppercase tracking-[0.14em] text-muted">{t("legalTitle")}</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            <li>
              <Link href="/privacy" className="text-fg/90 hover:text-accent">
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/termini" className="text-fg/90 hover:text-accent">
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/cookie" className="text-fg/90 hover:text-accent">
                {t("cookie")}
              </Link>
            </li>
          </ul>
          <p className="mt-5 text-xs text-muted">
            {COMPANY.legalName}
            <br />
            {lg.street}, {lg.postalCode} {lg.city} ({lg.province})
            <br />
            {t("vat")} <span className="tabular">{COMPANY.vat}</span>
          </p>
        </div>
      </div>

      <div className="container-site mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{t("rights", { year: new Date().getFullYear() })}</p>
        <p className="max-w-[60ch] sm:text-center">{t("distinct")}</p>
        <p>
          {t("credit")}{" "}
          <a href={ENV.limitlessUrl} target="_blank" rel="noopener" className="font-semibold text-fg hover:text-accent">
            LIMITLESS
            <span className="sr-only"> {common("opensNewTab")}</span>
          </a>
        </p>
      </div>
    </footer>
  );
}
