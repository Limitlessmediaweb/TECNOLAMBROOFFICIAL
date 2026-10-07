import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { QuoteLink } from "@/components/ui/TrackedLink";
import { SignalLost } from "@/components/domain/SignalLost";

/** 404 localizzata "Segnale perso" (risposta con status 404). */
export default async function NotFound() {
  const t = await getTranslations("notFound");
  const meta = await getTranslations("meta.notFound");

  return (
    <>
      <title>{meta("title")}</title>
      <meta name="description" content={meta("description")} />
      <meta name="robots" content="noindex" />
      <section className="container-site grid min-h-[100dvh] content-center gap-10 pb-20 pt-28">
        <SignalLost />
        <div>
          <p className="annot text-accent">{t("code")}</p>
          <h1 className="mt-3 text-display-l font-extrabold uppercase wdth-wide [overflow-wrap:break-word] md:text-display-xl">{t("title")}</h1>
          <p className="mt-6 max-w-[48ch] text-lead text-muted">{t("body")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-primary">
              {t("home")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </Link>
            <Link href="/prodotti" className="btn btn-ghost">
              {t("products")}
            </Link>
            <QuoteLink source="404" className="btn btn-ghost">
              {t("quote")}
            </QuoteLink>
          </div>
        </div>
      </section>
    </>
  );
}
