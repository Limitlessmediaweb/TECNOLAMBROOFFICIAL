import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { DIM_BY_WR, MATERIAL, SEAMLESS_TABLE, SIZES, SIZE_BY_WR, TWIST_TABLE, isOnRequest, num, range, standardLengths } from "@/data/waveguides";
import { flangesFor } from "@/data/flanges";
import { familyByKey, familySlug } from "@/data/families";
import { COMPANY, ENV } from "@/data/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { breadcrumbsFor } from "@/lib/page";
import { neighbours, wrFromSlug, wrSlug } from "@/lib/wr-page";
import { Breadcrumbs, PageHeader } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { PageMessages } from "@/components/ui/PageMessages";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { QuoteLink, ShopLink, localizedHref } from "@/components/ui/TrackedLink";
import { FamilyDemo3D } from "@/components/configurator/FamilyDemo3D";

type Props = PageProps<"/[locale]/prodotti/guida-flessibile/[wr]">;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SIZES.map((s) => ({ locale, wr: wrSlug(s.wr) })));
}

const hrefOf = (wr: string) => ({ pathname: "/prodotti/guida-flessibile/[wr]" as const, params: { wr: wrSlug(wr) } });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, wr: slug } = await params;
  const wr = wrFromSlug(slug);
  if (!wr) return {};
  const size = SIZE_BY_WR.get(wr)!;
  const t = await getTranslations({ locale, namespace: "wrPage" });
  const band = range(size.min, size.max, locale);
  return buildMetadata({
    locale: locale as Locale,
    href: hrefOf(wr),
    title: t("metaTitle", { wr, band }),
    description: t("metaDescription", { wr, band, iec: size.iec, wg: size.wg }),
  });
}

/** Una pagina per misura: banda, dimensioni, dati elettrici twistabile e seamless, flange, configuratore. */
export default async function WrPage({ params }: Props) {
  const { locale, wr: slug } = await params;
  setRequestLocale(locale);
  const wr = wrFromSlug(slug);
  if (!wr) notFound();
  const size = SIZE_BY_WR.get(wr)!;
  const dim = DIM_BY_WR.get(wr);
  const twist = TWIST_TABLE.find((r) => r.wr === wr);
  const seamless = SEAMLESS_TABLE.find((r) => r.wr === wr);
  const t = await getTranslations("wrPage");
  const products = await getTranslations("products.page");
  const band = range(size.min, size.max, locale);
  const mm = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${num(v, locale, 0, d)} mm`);
  const near = neighbours(wr);
  const shopPath = await localizedHref("/shop");
  const twistable = familyByKey("twistable")!;
  const seamlessFamily = familyByKey("seamless")!;
  const title = t("title", { wr });

  const specs: [string, string][] = [
    [t("band"), `${band} GHz`],
    [t("designations"), `${size.wr} · ${size.iec} · ${size.wg}`],
    [t("inner"), `${num(size.a, locale, 2, 2)} × ${num(size.b, locale, 2, 2)} mm`],
    ...(dim
      ? ([
          [t("code"), dim.code],
          [t("outer"), `${mm(dim.A)} × ${mm(dim.B)}`],
          [t("root"), `${mm(dim.C)} × ${mm(dim.D)}`],
          [t("pitch"), mm(dim.P)],
          [t("tol"), `± ${num(dim.tol, locale, 2, 2)} mm`],
        ] as [string, string][])
      : []),
    [t("length"), `${standardLengths(wr).map((l) => num(l, locale)).join(" · ")} mm`],
    [t("material"), `${t("brass")} ${MATERIAL}`],
  ];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description: t("metaDescription", { wr, band, iec: size.iec, wg: size.wg }),
    url: absoluteUrl(hrefOf(wr), locale as Locale),
    image: `${ENV.siteUrl}/render/twistable.webp`,
    category: t("category"),
    ...(dim ? { sku: dim.code, mpn: dim.code } : {}),
    brand: { "@type": "Brand", name: COMPANY.brand },
    manufacturer: { "@id": `${ENV.siteUrl}/#organization` },
    material: `${t("brass")} ${MATERIAL}`,
    additionalProperty: [
      { "@type": "PropertyValue", name: t("band"), minValue: size.min, maxValue: size.max, unitCode: "A86", unitText: "GHz" },
      { "@type": "PropertyValue", name: "IEC 60153-2", value: size.iec },
      { "@type": "PropertyValue", name: "WG", value: size.wg },
    ],
  };

  return (
    <PageMessages namespaces={["configurator", "tables"]}>
      <JsonLd
        data={[
          productJsonLd,
          await breadcrumbsFor(locale as Locale, [
            { name: products("title"), href: "/prodotti" },
            { name: title, href: hrefOf(wr) },
          ]),
        ]}
      />
      <PageHeader
        crumbs={<Breadcrumbs items={[{ label: products("title"), href: "/prodotti" }, { label: title }]} />}
        title={<h1 className="text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] lg:text-[clamp(3rem,5vw,5rem)]">{title}</h1>}
        intro={<p>{t("intro", { wr, band, iec: size.iec, wg: size.wg })}</p>}
      >
        <div className="flex flex-wrap gap-3">
          <ShopLink source={`wr_${wr}`} query={{ tipo: "twistabile", wr: wr.replace("WR-", "") }} hash="configura" className="btn btn-primary">
            {t("configureTwistable")}
          </ShopLink>
          <QuoteLink source={`wr_${wr}`} className="btn btn-ghost">
            {t("quote")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </QuoteLink>
        </div>
      </PageHeader>

      <section className="section-y border-t border-line" aria-labelledby="specs-title">
        <div className="container-site grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 id="specs-title" className="text-display-m font-bold">
              {t("specsTitle")}
            </h2>
            <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-t border-line pt-6">
              {specs.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="tabular">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted">{t("innerNote")}</p>
          </div>
          <div className="lg:col-span-7">
            <FamilyDemo3D type="twistable" wr={wr} shopPath={shopPath} stacked />
          </div>
        </div>
      </section>

      <section className="section-y border-t border-line" aria-labelledby="el-title">
        <div className="container-site">
          <h2 id="el-title" className="text-display-m font-bold">
            {t("electricalTitle")}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="border border-line bg-surface p-6">
              <h3 className="text-display-s font-bold">
                <Link href={{ pathname: "/prodotti/[famiglia]", params: { famiglia: familySlug(twistable, locale) } }} className="tap hover:text-accent">
                  {t("twistable")}
                </Link>
              </h3>
              {twist ? (
                <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted">{t("rl", { len: "300" })}</dt>
                  <dd className="text-right tabular">{num(twist.rl300, locale, 1, 1)} dB</dd>
                  <dt className="text-muted">{t("rl", { len: "600" })}</dt>
                  <dd className="text-right tabular">{num(twist.rl600, locale, 1, 1)} dB</dd>
                  <dt className="text-muted">{t("rl", { len: "1000" })}</dt>
                  <dd className="text-right tabular">{num(twist.rl1000, locale, 1, 1)} dB</dd>
                  <dt className="text-muted">{t("att")}</dt>
                  <dd className="text-right tabular">{num(twist.att, locale, 2, 2)} dB/m</dd>
                  {twist.cw != null ? (
                    <>
                      <dt className="text-muted">{t("cw")}</dt>
                      <dd className="text-right tabular">{num(twist.cw, locale)} W</dd>
                    </>
                  ) : null}
                  {twist.peak != null ? (
                    <>
                      <dt className="text-muted">{t("peak")}</dt>
                      <dd className="text-right tabular">{num(twist.peak, locale)} kW</dd>
                    </>
                  ) : null}
                </dl>
              ) : (
                <p className="mt-4 text-muted">{t("onRequest")}</p>
              )}
              <ShopLink source={`wr_${wr}_twist`} query={{ tipo: "twistabile", wr: wr.replace("WR-", "") }} hash="configura" className="btn btn-ghost btn-sm mt-6">
                {t("configureTwistable")}
              </ShopLink>
            </div>
            <div className="border border-line bg-surface p-6">
              <h3 className="text-display-s font-bold">
                <Link href={{ pathname: "/prodotti/[famiglia]", params: { famiglia: familySlug(seamlessFamily, locale) } }} className="tap hover:text-accent">
                  {t("seamless")}
                </Link>
              </h3>
              {seamless && !isOnRequest(seamless) ? (
                <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                  <dt className="text-muted">{t("vswr600")}</dt>
                  <dd className="text-right tabular">{num(seamless.vswr600!, locale, 2, 2)}</dd>
                  <dt className="text-muted">{t("att")}</dt>
                  <dd className="text-right tabular">{num(seamless.att!, locale, 2, 2)} dB/m</dd>
                  <dt className="text-muted">{t("cw")}</dt>
                  <dd className="text-right tabular">{num(seamless.cw!, locale)} W</dd>
                  <dt className="text-muted">{t("peak")}</dt>
                  <dd className="text-right tabular">{num(seamless.peak!, locale)} kW</dd>
                </dl>
              ) : (
                <p className="mt-4 text-muted">{t("onRequest")}</p>
              )}
              <ShopLink source={`wr_${wr}_seamless`} query={{ tipo: "seamless", wr: wr.replace("WR-", "") }} hash="configura" className="btn btn-ghost btn-sm mt-6">
                {t("configureSeamless")}
              </ShopLink>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">{t("indicative")}</p>
          <Link href="/prodotti/tabelle" className="mt-6 inline-flex min-h-11 items-center gap-2 font-medium underline decoration-accent underline-offset-4 hover:text-accent">
            {t("tablesLink")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
      </section>

      <section className="section-y border-t border-line" aria-labelledby="fl-title">
        <div className="container-site grid gap-6 lg:grid-cols-12 lg:gap-8">
          <h2 id="fl-title" className="text-display-m font-bold lg:col-span-4">
            {t("flangesTitle")}
          </h2>
          <div className="lg:col-span-8">
            <ul className="flex flex-wrap gap-2">
              {flangesFor(wr).map((f) => (
                <li key={f.id} className="rounded-full border border-line-strong px-4 py-2 font-mono text-sm">
                  {f.label}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-muted">{t("flangesBody")}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="cta-title">
        <div className="container-site grid gap-6 py-16 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 id="cta-title" className="text-display-m font-bold">
              {t("ctaTitle", { wr })}
            </h2>
            <p className="mt-3 max-w-[60ch] text-muted">{t("ctaBody")}</p>
          </div>
          <QuoteLink source={`wr_${wr}_bottom`} className="btn btn-primary">
            {t("quote")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </QuoteLink>
        </div>
      </section>

      <nav className="border-t border-line" aria-label={t("neighbours")}>
        <div className="container-site flex flex-wrap justify-between gap-4 py-10">
          {near.lower ? (
            <Link href={hrefOf(near.lower)} className="group inline-flex items-center gap-3" rel="prev">
              <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.75} />
              <span>
                <span className="annot block text-muted">{t("lower")}</span>
                <span className="font-display text-xl font-bold wdth-wide">{near.lower}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {near.higher ? (
            <Link href={hrefOf(near.higher)} className="group inline-flex items-center gap-3 text-right" rel="next">
              <span>
                <span className="annot block text-muted">{t("higher")}</span>
                <span className="font-display text-xl font-bold wdth-wide">{near.higher}</span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
            </Link>
          ) : null}
        </div>
      </nav>
    </PageMessages>
  );
}
