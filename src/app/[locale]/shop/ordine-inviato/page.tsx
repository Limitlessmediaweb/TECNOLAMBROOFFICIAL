import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MailCheck, Truck, MapPinned, FileText } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { buildMetadata } from "@/lib/seo";
import { ShopLink } from "@/components/ui/TrackedLink";
import { OrderSent } from "@/components/shop/OrderSent";
import { ShopMessages } from "@/components/shop/ShopMessages";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/ordine-inviato">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta.orderSent" });
  return {
    ...buildMetadata({ locale: locale as Locale, href: "/shop/ordine-inviato", title: t("title"), description: t("description") }),
    robots: { index: false, follow: false },
  };
}

const ICONS = [MailCheck, Truck, MapPinned, FileText];

export default async function OrderSentPage({ params }: PageProps<"/[locale]/shop/ordine-inviato">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("orderSent");
  const steps = t.raw("next") as { title: string; body: string }[];

  return (
    <ShopMessages namespaces={["orderSent"]}>
      <div className="container-site grid gap-12 pb-24 pt-28 lg:grid-cols-12 lg:pt-36">
        <div className="lg:col-span-5">
          <h1 className="text-display-l font-extrabold uppercase wdth-wide">{t("title")}</h1>
          <p className="mt-5 text-lead text-muted">{t("body")}</p>
          <div className="mt-8">
            <OrderSent />
          </div>
        </div>
        <section className="lg:col-span-6 lg:col-start-7" aria-labelledby="next-title">
          <h2 id="next-title" className="text-display-s font-bold">
            {t("nextTitle")}
          </h2>
          <ol className="mt-6 grid gap-6">
            {steps.map((s, i) => {
              const Icon = ICONS[i];
              return (
                <li key={s.title} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line-strong text-primary">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="font-semibold">{s.title}</h3>
                    <p className="mt-1 text-muted">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <ShopLink source="order_sent" className="btn btn-ghost mt-10">
            {t("backToShop")}
          </ShopLink>
        </section>
      </div>
    </ShopMessages>
  );
}
