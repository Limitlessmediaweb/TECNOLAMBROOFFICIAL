"use client";

import { useEffect, useState } from "react";
import { FileDown, MessageCircle, Phone } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { loadSent, type SentSummary } from "@/lib/quote";
import { COMPANY, whatsappHref } from "@/data/site";

/** Numero dell'ultima richiesta inviata in questa sessione, riepilogo PDF, WhatsApp e telefono. */
export function SentDetails() {
  const t = useT("requestSent");
  const locale = useClientLocale();
  const [sent, setSent] = useState<SentSummary | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSent(loadSent()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const download = async () => {
    if (!sent) return;
    setBusy(true);
    try {
      const { downloadBytes, summaryPdf } = await import("@/lib/pdf");
      const bytes = await summaryPdf(sent, {
        title: t("pdfTitle"),
        number: t("number"),
        date: t("date"),
        customer: t("customer"),
        items: t("items"),
        qty: t("qty"),
        reply: t("body"),
        contacts: `${COMPANY.brandFull} · ${COMPANY.phone} · ${COMPANY.email}`,
      });
      downloadBytes(bytes, `${sent.number}.pdf`, "application/pdf");
    } finally {
      setBusy(false);
    }
  };

  const contacts = (
    <div className="flex flex-wrap gap-3">
      <a href={whatsappHref(locale)} target="_blank" rel="noopener" className="btn btn-ghost">
        <MessageCircle aria-hidden="true" className="size-4" strokeWidth={1.75} />
        {t("whatsapp")}
      </a>
      <a href={COMPANY.phoneHref} className="btn btn-ghost tabular">
        <Phone aria-hidden="true" className="size-4" strokeWidth={1.75} />
        {COMPANY.phone}
      </a>
    </div>
  );

  if (sent === undefined) return <div className="h-[4.5rem]" aria-hidden="true" />;
  if (!sent)
    return (
      <div className="grid gap-6">
        <p className="text-muted">{t("missing")}</p>
        {contacts}
      </div>
    );
  return (
    <div className="grid gap-6">
      <p className="grid gap-1">
        <span className="annot uppercase tracking-[0.14em] text-muted">{t("number")}</span>
        <span className="font-mono text-display-m font-semibold tabular" data-request-number>
          {sent.number}
        </span>
      </p>
      <p className="text-muted">{t("copy")}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={download} disabled={busy} data-summary-pdf>
          <FileDown aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t("downloadPdf")}
        </button>
      </div>
      {contacts}
    </div>
  );
}
