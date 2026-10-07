import { getTranslations } from "next-intl/server";
import type { Locale, StaticPathname } from "@/i18n/routing";
import { breadcrumbsFor } from "@/lib/page";
import { Breadcrumbs, WithTodo } from "@/components/ui/Bits";
import { JsonLd } from "@/components/ui/JsonLd";

type Section = { h: string; p: string[] };

/** Pagina legale (bozza): privacy, termini, cookie. Testi in messages → legal.<ns>. */
export async function LegalPage({ ns, href, locale }: { ns: "privacy" | "terms" | "cookie"; href: StaticPathname; locale: Locale }) {
  const t = await getTranslations(`legal.${ns}`);
  const common = await getTranslations("common");
  const sections = t.raw("sections") as Section[];

  return (
    <>
      <JsonLd data={await breadcrumbsFor(locale, [{ name: t("title"), href }])} />
      <article className="container-site pb-24 pt-28 lg:pt-36">
        <Breadcrumbs items={[{ label: t("title") }]} />
        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-8">
          <header className="lg:col-span-4">
            <h1 className="text-display-l font-extrabold uppercase wdth-wide">{t("title")}</h1>
            <p className="annot mt-4 text-muted">{common("updated", { date: t("updated") })}</p>
            <p className="mt-6 text-sm">
              <span className="todo">{common("draftNote")}</span>
            </p>
          </header>
          <div className="grid max-w-[70ch] gap-10 lg:col-span-8">
            {sections.map((s) => (
              <section key={s.h}>
                <h2 className="text-display-s font-bold">{s.h}</h2>
                <div className="mt-4 grid gap-3 text-muted">
                  {s.p.map((p, i) => (
                    <p key={i}>
                      <WithTodo text={p} />
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}
