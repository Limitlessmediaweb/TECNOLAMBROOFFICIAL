import NextLink from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PartDrawing } from "@/components/domain/PartDrawings";
import { formatMoney } from "@/lib/commerce/pricing";
import { formatGHz } from "@/data/bands";
import type { Availability, Product } from "@/lib/commerce/types";
import type { TFunction } from "@/lib/client-i18n";
import { cn } from "@/lib/cn";

/** Stato di disponibilità: pallino + testo (il colore non è l'unica informazione). */
export function AvailabilityBadge({ value, label, className }: { value: Availability; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full",
          value === "in_stock" && "bg-ok",
          value === "low_stock" && "bg-accent",
          value === "on_order" && "bg-line-strong",
        )}
      />
      {label}
    </span>
  );
}

/** "da 380,00 € + IVA": prezzo in evidenza, "da" e "+ IVA" in piccolo (testo dal messaggio shop.priceFrom). */
export function PriceFrom({ price, t }: { price: string; t: TFunction }) {
  const MARK = "@@PRICE@@";
  const [before, after = ""] = t("priceFrom", { price: MARK }).split(MARK);
  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      {before.trim() ? <span className="text-sm text-muted">{before.trim()}</span> : null}
      <span className="tabular whitespace-nowrap font-display text-[1.375rem] font-bold leading-none wdth-wide">{price}</span>
      {after?.trim() ? <span className="text-sm text-muted">{after.trim()}</span> : null}
    </p>
  );
}

export function bandLabel(band: Product["specs"]["band"], locale: string): string | null {
  return band ? `${formatGHz(band.min, locale)}-${formatGHz(band.max, locale)} GHz` : null;
}

/**
 * Scheda del catalogo: disegno SVG, codice, misura WR, banda, prezzo "da … + IVA", disponibilità.
 * Senza hook di stato: va bene sia nel catalogo client sia in pagine server.
 */
export function ProductCard({ product, href, locale, t }: { product: Product; href: string; locale: string; t: TFunction }) {
  const variant = product.variants[0];
  const band = bandLabel(product.specs.band, locale);
  return (
    <article className="group relative flex h-full flex-col border border-line bg-surface p-5 transition-colors duration-300 hover:border-accent">
      <div className="-mx-1 mb-4">
        <PartDrawing family={product.drawing} compact className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <p className="annot text-primary-ink">{product.code}</p>
      <h3 className="mt-1 text-[1.125rem] font-semibold leading-snug">
        <NextLink href={href} className="after:absolute after:inset-0 after:content-[''] hover:text-accent">
          {product.title}
        </NextLink>
      </h3>
      <dl className="annot mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted">
        {product.specs.wr ? (
          <>
            <dt>WR</dt>
            <dd className="text-fg">{product.specs.wr}</dd>
          </>
        ) : null}
        {band ? (
          <>
            <dt>{t("band")}</dt>
            <dd className="text-fg">{band}</dd>
          </>
        ) : null}
      </dl>
      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <div>
          <PriceFrom price={formatMoney(product.priceFrom, locale)} t={t} />
          {variant ? <AvailabilityBadge value={variant.availability} label={t(`availability.${variant.availability}`)} className="mt-2 text-muted" /> : null}
        </div>
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-on-accent"
        >
          <ArrowUpRight className="size-4" strokeWidth={1.75} />
        </span>
      </div>
    </article>
  );
}
