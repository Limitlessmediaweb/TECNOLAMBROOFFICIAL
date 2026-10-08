import { pick } from "@/i18n/locales";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Download, ShieldCheck } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import { CERTIFICATIONS, CERT_SCOPE, formatDate, isExpired } from "@/data/certifications";
import { publicExists } from "@/lib/public-files";
import { MissingBadge } from "@/components/ui/Bits";
import { PENDING_LABELS } from "@/data/pending";

/** Le due card delle certificazioni ISO per /qualita: miniatura (clic → PDF), dati, download. */
export async function CertificationCards() {
  const t = await getTranslations("qualityPage");
  const c = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {CERTIFICATIONS.map((cert) => {
        const hasPdf = publicExists(cert.pdf);
        const hasPreview = publicExists(cert.preview);
        const expired = isExpired(cert);
        return (
          <article key={cert.id} className="grid gap-5 border border-line bg-surface p-6 sm:grid-cols-[9rem_1fr] sm:p-7" data-cert={cert.id}>
            <div>
              {hasPdf && hasPreview ? (
                <a href={cert.pdf} target="_blank" rel="noopener" className="block border border-line bg-bg transition-colors hover:border-accent" data-track="cert_download" data-source={`thumb_${cert.id}`}>
                  <Image src={cert.preview} alt={t("previewAlt", { standard: cert.standard })} width={420} height={594} sizes="144px" className="h-auto w-full" />
                  <span className="sr-only"> {c("opensNewTab")}</span>
                </a>
              ) : (
                <div className="grid aspect-[1/1.414] place-items-center border border-dashed border-line-strong bg-bg">
                  <ShieldCheck aria-hidden="true" className="size-10 text-accent" strokeWidth={1.25} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-display-s font-extrabold wdth-wide">{cert.standard}</h3>
              <p className="font-medium">{cert.system[locale]}</p>
              {cert.extra ? <p className="text-sm text-muted">{cert.extra[locale]}</p> : null}
              <p className="text-sm text-muted">{t("certBy")}</p>
              <p className="annot mt-1 text-muted">{t("certNumber", { number: cert.number })}</p>
              <p className="text-sm">
                {expired ? (
                  <span className="font-medium text-accent">{t("renewing")}</span>
                ) : (
                  <span className="font-medium">{t("validUntil", { date: formatDate(cert.expiry, locale) })}</span>
                )}
                <span className="text-muted"> · {t("firstIssue", { date: formatDate(cert.firstIssue, locale) })}</span>
              </p>
              {hasPdf ? (
                <a href={cert.pdf} download className="btn btn-ghost btn-sm mt-3 self-start" data-track="cert_download" data-source={cert.id}>
                  <Download aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  {t("download")}
                </a>
              ) : (
                <MissingBadge label={c("missing", { what: pick(PENDING_LABELS.certPdf, locale) })} className="mt-3" />
              )}
            </div>
          </article>
        );
      })}
      <p className="text-sm text-muted md:col-span-2">
        <span className="font-medium text-fg">{t("scopeTitle")}:</span> {CERT_SCOPE[locale]}
      </p>
    </div>
  );
}

/** Badge testuali ISO (niente loghi PJR/ACCREDIA fuori dal PDF), con link a /qualita. */
export function IsoBadges({ href, className = "" }: { href: string; className?: string }) {
  return (
    <span className={`inline-flex flex-wrap gap-2 ${className}`}>
      {CERTIFICATIONS.map((c) => (
        <a key={c.id} href={href} className="annot inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-fg lg:min-h-0 transition-colors hover:border-accent hover:text-accent">
          <ShieldCheck aria-hidden="true" className="size-3.5 text-accent" strokeWidth={1.75} />
          {c.standard}
        </a>
      ))}
    </span>
  );
}
