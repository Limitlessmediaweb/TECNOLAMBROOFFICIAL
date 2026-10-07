import { getTranslations } from "next-intl/server";
import { Mail, Phone, MapPin } from "lucide-react";
import { QuoteForm, type FamilyOption } from "@/components/domain/QuoteForm";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { FAMILIES, type FamilyKey } from "@/data/products";
import { COMPANY } from "@/data/site";
import { localizedHref } from "@/components/ui/TrackedLink";

export async function familyOptions(): Promise<FamilyOption[]> {
  const t = await getTranslations("products.items");
  return FAMILIES.map((f) => ({ value: f.key, label: t(`${f.key}.name`) }));
}

/** Blocco preventivo: contatti diretti + form completo. Ancora #preventivo. */
export async function QuoteSection({
  title,
  body,
  defaultFamily,
  headingLevel = 2,
}: {
  title?: string;
  body?: string;
  defaultFamily?: FamilyKey;
  headingLevel?: 1 | 2;
}) {
  const t = await getTranslations("quote");
  const families = await familyOptions();
  const privacyHref = await localizedHref("/privacy");
  const op = COMPANY.operationalAddress;
  const lg = COMPANY.legalAddress;
  const H = headingLevel === 1 ? "h1" : "h2";

  return (
    <section id="preventivo" className="section-y scroll-mt-20 border-t border-line" aria-labelledby="quote-title">
      <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-4">
          <SplitReveal as={H} id="quote-title" className="max-w-[12ch] text-display-l font-bold" by="words">
            {title ?? t("title")}
          </SplitReveal>
          <p className="mt-5 max-w-[38ch] text-lead text-muted">{body ?? t("body")}</p>

          <p className="annot mt-10 uppercase tracking-[0.14em] text-muted">{t("contactTitle")}</p>
          <ul className="mt-4 grid gap-5">
            <li className="flex gap-3">
              <Mail aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted">{t("email_label")}</p>
                <p>
                  <a href={`mailto:${COMPANY.email}`} className="text-lg hover:text-accent">
                    {COMPANY.email}
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Phone aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted">{t("phone_label")}</p>
                <p>
                  <a href={COMPANY.phoneHref} className="tabular text-lg hover:text-accent">
                    {COMPANY.phone}
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted">{t("operational")}</p>
                <p>
                  {op.street}, {op.postalCode} {op.city} ({op.province})
                </p>
                <p className="mt-3 text-sm text-muted">{t("legal")}</p>
                <p className="text-muted">
                  {lg.street}, {lg.postalCode} {lg.city} ({lg.province})
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-8">
          <QuoteForm families={families} defaultFamily={defaultFamily} privacyHref={privacyHref} />
        </div>
      </div>
    </section>
  );
}
