"use client";

import { useEffect, useId, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { PRICE_TIERS, eur, formatMoney, tierFor, unitPrice } from "@/lib/commerce/pricing";
import type { Money } from "@/lib/commerce/types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

type Props = { variantId: string; code: string; handle: string; listPrice: Money; available: boolean };

/**
 * Quantità + prezzo per scaglione + "Aggiungi al carrello".
 * Lo scaglione attivo è evidenziato nella tabella; il prezzo si aggiorna mentre si cambia quantità.
 */
export function AddToCart({ variantId, code, handle, listPrice, available }: Props) {
  const t = useT("shop");
  const locale = useClientLocale();
  const { add, busy } = useCart();
  const uid = useId();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    track("view_product", { code });
  }, [code]);

  const tier = tierFor(qty);
  const unit = unitPrice(listPrice, qty);
  const total = eur(unit.amount * qty);
  const saving = eur((listPrice.amount - unit.amount) * qty);
  const setSafe = (n: number) => setQty(Math.max(1, Math.min(999, Math.round(n) || 1)));

  const onAdd = async () => {
    await add(variantId, qty, { code, handle });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="grid gap-6">
      <table className="spec-table">
        <caption className="sr-only">{t("tiersTitle")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("quantity")}</th>
            <th scope="col">{t("unitPrice")}</th>
          </tr>
        </thead>
        <tbody>
          {PRICE_TIERS.map((tr, i) => {
            const on = tr === tier;
            return (
              <tr key={tr.min} aria-current={on ? "true" : undefined} className={cn("transition-colors", on && "bg-surface-2")}>
                <td className={cn("pl-3", on && "text-accent")}>{t(`tierRange.t${i + 1}`)}</td>
                <td className="tabular">
                  {formatMoney(unitPrice(listPrice, tr.min), locale)}{" "}
                  <span className="annot text-muted">{tr.discount ? `−${Math.round(tr.discount * 100)}%` : t("tierList")}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="grid gap-2">
        <label htmlFor={`${uid}-qty`} className="field-label">
          {t("quantity")}
        </label>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSafe(qty - 1)} className="grid size-11 place-items-center rounded-full border border-line-strong hover:border-accent" aria-label={t("decrease")}>
            <Minus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </button>
          <input
            id={`${uid}-qty`}
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={qty}
            onChange={(e) => setSafe(Number(e.target.value))}
            className="input tabular h-11 w-20 text-center"
          />
          <button type="button" onClick={() => setSafe(qty + 1)} className="grid size-11 place-items-center rounded-full border border-line-strong hover:border-accent" aria-label={t("increase")}>
            <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div aria-live="polite" className="grid gap-1">
        <p className="flex items-baseline justify-between gap-4">
          <span className="text-muted">{t("lineTotal")}</span>
          <span className="tabular font-display text-display-s font-bold">{formatMoney(total, locale)}</span>
        </p>
        <p className="annot text-muted">
          {qty} × {formatMoney(unit, locale)} · {t("vatExcluded")}
        </p>
        {tier.discount > 0 ? <p className="text-sm font-medium text-ok">{t("youSave", { amount: formatMoney(saving, locale) })}</p> : null}
      </div>

      <button type="button" onClick={() => void onAdd()} disabled={!available || busy} className="btn btn-primary w-full sm:w-auto">
        {added ? <Check aria-hidden="true" className="size-4" strokeWidth={2} /> : <ShoppingBag aria-hidden="true" className="size-4" strokeWidth={1.75} />}
        {added ? t("added") : t("addToCart")}
      </button>
    </div>
  );
}
