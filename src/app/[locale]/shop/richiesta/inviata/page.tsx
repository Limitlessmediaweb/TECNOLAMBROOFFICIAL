import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { pageMetadata } from "@/lib/page";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { PageMessages } from "@/components/ui/PageMessages";
import { SentDetails } from "@/components/request/SentDetails";

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/richiesta/inviata">): Promise<Metadata> {
  const { locale } = await params;
  const meta = await pageMetadata(locale, "requestSent", "/shop/richiesta/inviata");
  return { ...meta, robots: { index: false, follow: true } };
}

/** Conferma dopo l'invio: numero, cosa succede adesso (3 passi), riepilogo PDF, WhatsApp e telefono. */
export default async function RequestSentPage({ params }: PageProps<"/[locale]/shop/richiesta/inviata">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("requestSent");
  const next = t.raw("next") as { title: string; body: string }[];

  return (
    <PageMessages namespaces={["requestSent"]}>
      <div className="container-site pb-24 pt-32 lg:pt-40">
        <div className="max-w-3xl">
          <CheckCircle2 aria-hidden="true" className="size-12 text-ok" strokeWidth={1.5} />
          <h1 className="mt-6 text-display-l font-extrabold uppercase wdth-wide">{t("title")}</h1>
          <p className="mt-4 text-lead">{t("body")}</p>
          <div className="mt-8">
            <SentDetails />
          </div>
        </div>
        <section className="mt-16" aria-labelledby="next-title">
          <h2 id="next-title" className="text-display-m font-bold">
            {t("nextTitle")}
          </h2>
          <ol className="mt-8 grid gap-px border border-line bg-line md:grid-cols-3">
            {next.map((step, i) => (
              <li key={step.title} className="flex flex-col gap-3 bg-bg p-6">
                <span aria-hidden="true" className="font-mono text-sm text-accent">
                  0{i + 1}
                </span>
                <h3 className="text-display-s font-bold">{step.title}</h3>
                <p className="text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
        <div className="mt-12">
          <Link href="/shop" className="btn btn-ghost">
            {t("back")}
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </PageMessages>
  );
}
