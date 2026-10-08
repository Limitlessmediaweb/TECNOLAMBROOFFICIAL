import { getLocale, getTranslations } from "next-intl/server";
import { Mail, MapPin, MessageCircle, Phone, ShieldCheck, Smartphone } from "lucide-react";
import { ShortQuoteForm } from "@/components/domain/ShortQuoteForm";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { COMPANY, whatsappHref } from "@/data/site";
import { localizedHref } from "@/components/ui/TrackedLink";

/** Blocco preventivo: contatti diretti + modulo breve (richiesta su disegno). Ancora #preventivo. */
export async function QuoteSection({
  title,
  body,
  headingLevel = 2,
}: {
  title?: string;
  body?: string;
  headingLevel?: 1 | 2;
}) {
  const t = await getTranslations("quote");
  const locale = await getLocale();
  const privacyHref = await localizedHref("/privacy");
  const op = COMPANY.operationalAddress;
  const lg = COMPANY.legalAddress;
  const H = headingLevel === 1 ? "h1" : "h2";

  return (
    <section id="preventivo" data-area="quote_section" className="section-y scroll-mt-20 border-t border-line" aria-labelledby="quote-title">
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
                  <a href={`mailto:${COMPANY.email}`} className="tap text-lg hover:text-accent">
                    {COMPANY.email}
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Smartphone aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted">{t("phone_label")}</p>
                <p>
                  <a href={COMPANY.phoneHref} className="tap tabular text-lg hover:text-accent">
                    {COMPANY.phone}
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <MessageCircle aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted">WhatsApp</p>
                <p>
                  <a href={whatsappHref(locale)} target="_blank" rel="noopener" className="tap text-lg hover:text-accent">
                    {t("whatsapp")}
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Phone aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted">{t("phone2_label")}</p>
                <p>
                  <a href={COMPANY.phone2Href} className="tap tabular text-lg hover:text-accent">
                    {COMPANY.phone2}
                  </a>
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <ShieldCheck aria-hidden="true" className="mt-1 size-5 shrink-0 text-accent" strokeWidth={1.5} />
              <div>
                <p className="text-sm text-muted">{t("pec_label")}</p>
                <p>
                  <a href={`mailto:${COMPANY.pec}`} className="tap break-all hover:text-accent">
                    {COMPANY.pec}
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
          <ShortQuoteForm privacyHref={privacyHref} shopPath={await localizedHref("/shop")} sentPath={await localizedHref("/shop/richiesta/inviata")} />
        </div>
      </div>
    </section>
  );
}
