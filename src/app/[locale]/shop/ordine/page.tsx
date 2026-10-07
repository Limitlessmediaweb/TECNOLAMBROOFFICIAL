import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/ui/Bits";
import { localizedHref } from "@/components/ui/TrackedLink";
import { CheckoutFlow } from "@/components/shop/CheckoutFlow";
import { ShopMessages } from "@/components/shop/ShopMessages";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/ordine">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.checkout" });
  return {
    ...buildMetadata({ locale: locale as Locale, href: "/shop/ordine", title: t("title"), description: t("description") }),
    // Pagina di servizio: mai in indice
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/shop/ordine">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const shop = await getTranslations("shop");

  return (
    <ShopMessages namespaces={["checkout"]}>
      <div className="container-site pb-20 pt-28 lg:pt-36">
        <Breadcrumbs items={[{ label: shop("breadcrumb"), href: "/shop" }, { label: t("title") }]} />
        <h1 className="mb-10 mt-6 text-display-l font-extrabold uppercase wdth-wide">{t("title")}</h1>
        <CheckoutFlow
          privacyHref={await localizedHref("/privacy")}
          shopPath={await localizedHref("/shop")}
          sentPath={await localizedHref("/shop/ordine-inviato")}
        />
      </div>
    </ShopMessages>
  );
}
