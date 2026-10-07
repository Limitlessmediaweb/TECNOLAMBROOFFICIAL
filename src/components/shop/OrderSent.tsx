"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { formatMoney } from "@/lib/commerce/pricing";
import type { Money } from "@/lib/commerce/types";
import { LAST_ORDER_KEY } from "./CheckoutFlow";

type LastOrder = { number: string; demo: boolean; total: Money; email: string };

/** Riepilogo della richiesta appena inviata (letto da sessionStorage, mai dall'URL: niente dati personali nei link). */
export function OrderSent() {
  const t = useT("orderSent");
  const locale = useClientLocale();
  const [order, setOrder] = useState<LastOrder | null | undefined>(undefined);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const raw = sessionStorage.getItem(LAST_ORDER_KEY);
        setOrder(raw ? (JSON.parse(raw) as LastOrder) : null);
      } catch {
        setOrder(null);
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (order === undefined) return <div className="min-h-24" aria-hidden="true" />;
  if (order === null) return <p className="text-muted">{t("missing")}</p>;

  return (
    <div role="status" className="grid gap-3 border border-line bg-surface p-6">
      <CheckCircle2 aria-hidden="true" className="size-8 text-ok" strokeWidth={1.5} />
      <p className="annot text-muted">{t("number")}</p>
      <p className="font-mono text-display-s font-medium" data-order-number>
        {order.number}
      </p>
      <p className="tabular text-muted">{formatMoney(order.total, locale)}</p>
      {order.demo ? (
        <p className="text-sm">
          <span className="todo">{t("demo")}</span>
        </p>
      ) : null}
    </div>
  );
}
