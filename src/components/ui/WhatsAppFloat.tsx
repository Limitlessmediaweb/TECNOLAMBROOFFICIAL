"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { whatsappHref } from "@/data/site";

/**
 * WhatsApp fisso in basso a sinistra, solo su mobile (su desktop sta in footer e contatti).
 * Nascosto nella pagina "La tua richiesta", dove in basso c'è il pulsante Invia.
 */
export function WhatsAppFloat() {
  const t = useT("common");
  const locale = useClientLocale();
  const path = usePathname();
  if (/\/shop\/(richiesta|request)(\/|$)/.test(path)) return null;
  return (
    <a
      href={whatsappHref(locale)}
      target="_blank"
      rel="noopener"
      aria-label={t("whatsappLabel")}
      data-area="whatsapp_float"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 grid size-12 place-items-center rounded-full bg-accent text-on-accent shadow-[0_6px_20px_var(--c-shadow)] transition-transform active:scale-95 lg:hidden"
      data-whatsapp-float
    >
      <MessageCircle aria-hidden="true" className="size-6" strokeWidth={1.75} />
    </a>
  );
}
