import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PencilRuler } from "lucide-react";
import { routing, type Locale } from "@/i18n/routing";
import { buildMetadata, absoluteUrl } from "@/lib/seo";
import { breadcrumbsFor } from "@/lib/page";
import { getCommerce } from "@/lib/commerce";
import { formatGHz } from "@/data/bands";
import { SHOP_PRODUCTS, shopProductByHandle } from "@/data/products";
import { COMPANY, ENV } from "@/data/site";
import { Breadcrumbs, DemoDataTag } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";
import { QuoteLink, localizedHref } from "@/components/ui/TrackedLink";
import { PartDrawing } from "@/components/domain/PartDrawings";
import { AddToCart } from "@/components/shop/AddToCart";
import { AvailabilityBadge, ProductCard, bandLabel } from "@/components/shop/ProductCard";
import { ShopMessages } from "@/components/shop/ShopMessages";
import type { Product } from "@/lib/commerce/types";

type Props = PageProps<"/[locale]/shop/[handle]">;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SHOP_PRODUCTS.map((p) => ({ locale, handle: p.handle })));
}

async function load(locale: string, handle: string): Promise<Product | null> {
  return getCommerce().getProduct(handle, locale as Locale);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, handle } = await params;
  const product = await load(locale, handle);
  if (!product) return {};
  const m = await getTranslations({ locale, namespace: "meta.product" });
  const title = product.specs.wr ? m("title", { name: product.shortTitle, wr: product.specs.wr }) : m("titleNoWr", { name: product.shortTitle });
  return buildMetadata({
    locale: locale as Locale,
    href: { pathname: "/shop/[handle]", params: { handle } },
    // ≤ 60 caratteri: se il nome è lungo si toglie " Shop"
    title: title.length > 60 ? title.replace(" | Tecnolambro Shop", " | Tecnolambro") : title,
    description: product.description.slice(0, 155),
  });
}

const AVAILABILITY_SCHEMA = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  on_order: "https://schema.org/PreOrder",
} as const;

export default async function ProductPage({ params }: Props) {
  const { locale, handle } = await params;
  setRequestLocale(locale);
  const product = await load(locale, handle);
  if (!product) notFound();

  const t = await getTranslations("shop");
  const variant = product.variants[0];
  const band = bandLabel(product.specs.band, locale);
  const shopPath = await localizedHref("/shop");
  const data = shopProductByHandle(handle);
  const url = absoluteUrl({ pathname: "/shop/[handle]", params: { handle } }, locale as Locale);

  const specs: [string, string | null][] = [
    [t("specs.code"), product.code],
    [t("specs.size"), product.specs.wr],
    [t("specs.band"), band],
    [t("specs.length"), product.specs.length],
    [t("specs.flanges"), product.specs.flanges],
    [t("specs.material"), product.specs.material],
    [t("specs.vswr"), product.specs.vswr ? `≤ ${formatGHz(product.specs.vswr, locale)}` : null],
  ];

  const related = (await getCommerce().listProducts(locale as Locale))
    .filter((p) => p.handle !== product.handle && (p.family === product.family || p.specs.wr === product.specs.wr))
    .slice(0, 3);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    sku: product.code,
    mpn: product.code,
    description: product.description,
    brand: { "@type": "Brand", name: COMPANY.brand },
    manufacturer: { "@type": "Organization", name: COMPANY.legalName },
    url,
    image: `${ENV.siteUrl}/opengraph-image`,
    offers: {
      "@type": "Offer",
      url,
      price: variant.price.amount.toFixed(2),
      priceCurrency: "EUR",
      availability: AVAILABILITY_SCHEMA[variant.availability],
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: COMPANY.legalName },
      priceSpecification: { "@type": "UnitPriceSpecification", price: variant.price.amount.toFixed(2), priceCurrency: "EUR", valueAddedTaxIncluded: false },
    },
  };

  const quoteHref = {
    pathname: "/contatti" as const,
    query: { ...(product.specs.wr ? { misura: product.specs.wr } : {}), famiglia: data?.quoteFamily ?? "custom", rif: product.code },
    hash: "preventivo",
  };

  return (
    <ShopMessages namespaces={["shop"]}>
      <JsonLd data={productLd} />
      <JsonLd
        data={await breadcrumbsFor(locale as Locale, [
          { name: t("breadcrumb"), href: "/shop" },
          { name: product.title, href: { pathname: "/shop/[handle]", params: { handle } } },
        ])}
      />

      <div className="container-site pb-16 pt-28 lg:pt-36">
        <Breadcrumbs items={[{ label: t("breadcrumb"), href: "/shop" }, { label: product.title }]} />

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <div className="relative border border-line bg-surface p-4 sm:p-8">
              <span aria-hidden="true" className="annot absolute left-4 top-3 text-muted">
                {product.code}
              </span>
              <PartDrawing
                family={product.drawing}
                title={product.title}
                locale={locale}
                size={product.specs.wr}
                caption={[product.specs.wr, product.specs.flanges].filter(Boolean).join(" · ") || undefined}
                className="h-auto w-full"
              />
            </div>

            <section className="mt-10" aria-labelledby="specs-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="specs-title" className="text-display-s font-bold">
                  {t("specsTitle")}
                </h2>
                {product.demo ? <DemoDataTag /> : null}
              </div>
              <table className="spec-table mt-4">
                <caption className="sr-only">{t("specsTitle")}</caption>
                <tbody>
                  {specs
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <tr key={k}>
                        <th scope="row" className="!normal-case">
                          {k}
                        </th>
                        <td className="tabular">{v}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="grid gap-6 lg:sticky lg:top-28">
              <div>
                <p className="annot text-primary-ink">{product.code}</p>
                <h1 className="mt-2 text-display-m font-extrabold wdth-wide">{product.title}</h1>
                <p className="mt-4 text-muted">{product.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                  <AvailabilityBadge value={variant.availability} label={t(`availability.${variant.availability}`)} className="font-medium" />
                  <span className="text-sm text-muted">{t(`availabilityHint.${variant.availability}`)}</span>
                </div>
              </div>

              <section aria-labelledby="tiers-title" className="border border-line bg-surface p-5 sm:p-6">
                <h2 id="tiers-title" className="mb-4 text-lg font-semibold">
                  {t("tiersTitle")}
                </h2>
                <AddToCart variantId={variant.id} code={product.code} handle={product.handle} listPrice={variant.price} available={variant.availableForSale} />
              </section>

              <div className="flex gap-3 border border-dashed border-line-strong p-5">
                <PencilRuler aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.75} />
                <div>
                  <QuoteLink source={`shop_variant_${product.code}`} href={quoteHref} className="font-semibold underline decoration-accent underline-offset-4 hover:text-accent">
                    {t("customVariant")}
                  </QuoteLink>
                  <p className="mt-1 text-sm text-muted">{t("customVariantHint")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="border-t border-line" aria-labelledby="related-title">
          <div className="container-site py-16">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <h2 id="related-title" className="text-display-m font-bold">
                {t("related")}
              </h2>
              <NextLink href={shopPath} className="font-medium underline decoration-accent underline-offset-4 hover:text-accent">
                {t("backToShop")}
              </NextLink>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.handle}>
                  <ProductCard product={p} href={`${shopPath}/${p.handle}`} locale={locale} t={(k, v) => t(k, v)} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </ShopMessages>
  );
}
