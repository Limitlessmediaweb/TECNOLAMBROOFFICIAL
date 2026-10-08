import { getTranslations } from "next-intl/server";
import { BadgeCheck, CalendarCheck, Clock, Factory, Globe2, ShieldCheck } from "lucide-react";
import { COMPANY } from "@/data/site";
import { localizedHref } from "./TrackedLink";
import { cn } from "@/lib/cn";

/**
 * Barra di fiducia: dati veri e verificabili. Desktop su una riga, telefono a scorrimento orizzontale
 * dentro il proprio contenitore (la pagina non scorre di lato). `vertical` per le colonne laterali.
 */
export async function TrustBar({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  const t = await getTranslations("trust");
  const qualityHref = await localizedHref("/qualita");
  const items = [
    { icon: CalendarCheck, text: t("since", { year: COMPANY.founded }) },
    { icon: ShieldCheck, text: "ISO 9001 · ISO 14001", href: qualityHref },
    { icon: Factory, text: t("ownProduction") },
    { icon: BadgeCheck, text: t("tested") },
    { icon: Clock, text: t("quote24") },
    { icon: Globe2, text: t("worldwide") },
  ];
  return (
    <div className={cn(vertical ? "" : "-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0", className)} data-lenis-prevent={vertical ? undefined : true}>
      <ul aria-label={t("label")} className={cn(vertical ? "grid gap-3" : "flex w-max gap-x-6 gap-y-2 lg:w-auto lg:flex-wrap lg:justify-between")}>
        {items.map(({ icon: Icon, text, href }) => (
          <li key={text} className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium">
            <Icon aria-hidden="true" className="size-4 shrink-0 text-accent" strokeWidth={1.75} />
            {href ? (
              <a href={href} className="underline decoration-accent/50 underline-offset-4 hover:text-accent">
                {text}
              </a>
            ) : (
              text
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
