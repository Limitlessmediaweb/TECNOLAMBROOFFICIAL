import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Factory, Paintbrush, FlaskConical, PencilRuler, MapPin } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { pageMetadata, breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { OwnerSection, WorkshopSection } from "@/components/sections/PeopleAndPhotos";
import { JsonLd } from "@/components/ui/JsonLd";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Stagger } from "@/components/motion/Stagger";
import { HistorySection, FinalCta } from "@/components/sections/HomeSections";
import { COMPANY } from "@/data/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/azienda">): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "about", "/azienda");
}

function mapsUrl(a: { street: string; postalCode: string; city: string; province: string }) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.street}, ${a.postalCode} ${a.city} ${a.province}`)}`;
}

export default async function AboutPage({ params }: PageProps<"/[locale]/azienda">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aboutPage");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");
  // l'ordine del lavoro: progettazione → produzione → trattamenti → collaudo finale al 100%
  const blocks = [
    { icon: PencilRuler, title: t("officeTitle"), body: t("officeBody") },
    { icon: Factory, title: t("productionTitle"), body: t("productionBody") },
    { icon: Paintbrush, title: t("treatmentsTitle"), body: t("treatmentsBody") },
    { icon: FlaskConical, title: t("labTitle"), body: t("labBody") },
  ];
  const sites = [
    { label: t("operational"), address: COMPANY.operationalAddress, main: true },
    { label: t("legal"), address: COMPANY.legalAddress, main: false },
  ];

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale as Locale, [{ name: nav("about"), href: "/azienda" }])} />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: nav("about") }]} />}
        title={
          <SplitReveal as="h1" immediate className="max-w-[16ch] text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] [hyphens:auto] md:[overflow-wrap:normal] lg:text-[clamp(3rem,5.4vw,5.5rem)]">
            {t("title")}
          </SplitReveal>
        }
        intro={<p>{t("intro")}</p>}
      />

      <OwnerSection />

      <section className="section-y border-t border-line" aria-label={t("processLabel")}>
        <Stagger className="container-site grid gap-px border border-line bg-line sm:grid-cols-2">
          {blocks.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className={i === 3 ? "flex flex-col gap-4 bg-[color-mix(in_srgb,var(--c-accent)_8%,var(--c-bg))] p-7 lg:p-10" : "flex flex-col gap-4 bg-bg p-7 lg:p-10"}>
              <Icon aria-hidden="true" className="size-7 text-accent" strokeWidth={1.5} />
              <h2 className="text-display-m font-bold">{title}</h2>
              <p className="max-w-[48ch] text-muted">{body}</p>
            </div>
          ))}
        </Stagger>
      </section>

      <HistorySection />
      <WorkshopSection />

      <section className="section-y border-t border-line" aria-labelledby="sites-title">
        <div className="container-site">
          <h2 id="sites-title" className="text-display-l font-bold">
            {t("sitesTitle")}
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {sites.map(({ label, address, main }) => (
              <li key={label} className={main ? "flex flex-col gap-3 border border-accent/50 bg-surface p-7" : "flex flex-col gap-3 border border-line p-7"}>
                <MapPin aria-hidden="true" className="size-6 text-accent" strokeWidth={1.5} />
                <h3 className="text-display-s font-bold">{label}</h3>
                <address className="not-italic text-muted">
                  {address.street}
                  <br />
                  {address.postalCode} {address.city} ({address.province})
                </address>
                <a href={mapsUrl(address)} target="_blank" rel="noopener" className="mt-2 self-start text-sm underline decoration-accent underline-offset-4 hover:text-accent">
                  {t("mapLink")}
                  <span className="sr-only"> {common("opensNewTab")}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
