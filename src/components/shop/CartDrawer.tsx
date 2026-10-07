"use client";

import { useEffect, useRef } from "react";
import NextLink from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./CartProvider";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { formatMoney, tierFor } from "@/lib/commerce/pricing";
import { cn } from "@/lib/cn";

/** Pulsante carrello nell'header, con il numero di pezzi. */
export function CartButton({ className }: { className?: string }) {
  const { count, open } = useCart();
  const t = useT("cart");
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      aria-label={count ? t("openWithCount", { count }) : t("open")}
      className={cn("relative grid size-11 place-items-center rounded-full border border-line-strong text-fg transition-colors hover:border-accent", className)}
    >
      <ShoppingBag aria-hidden="true" className="size-[1.15rem]" strokeWidth={1.75} />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="tabular absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.6875rem] font-semibold leading-none text-on-accent"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Pannello laterale del carrello. <dialog> modale: focus intrappolato, Esc per chiudere,
 * resto della pagina inerte. Quantità con etichette esplicite per ogni riga.
 */
export function CartDrawer({ shopPath, checkoutPath }: { shopPath: string; checkoutPath: string }) {
  const { cart, isOpen, close, update, remove, busy, error } = useCart();
  const t = useT("cart");
  const locale = useClientLocale();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (isOpen && !d.open) {
      d.showModal();
      window.__lenis?.stop();
    } else if (!isOpen && d.open) {
      d.close();
    }
  }, [isOpen]);

  const lines = cart?.lines ?? [];

  return (
    <dialog
      ref={dialog}
      aria-labelledby="cart-title"
      onClose={() => {
        close();
        window.__lenis?.start();
      }}
      onClick={(e) => {
        // Click sullo sfondo (fuori dal pannello) o su un link: chiude
        if (e.target === dialog.current || (e.target as Element).closest("a")) dialog.current?.close();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-md bg-bg p-0 text-fg shadow-[0_0_60px_var(--c-shadow)] backdrop:bg-fg/30 open:flex open:flex-col"
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
        <h2 id="cart-title" className="font-display text-display-s font-bold wdth-wide">
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          className="grid size-11 place-items-center rounded-full border border-line-strong hover:border-accent"
          aria-label={t("close")}
          autoFocus
        >
          <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4" data-lenis-prevent aria-live="polite" aria-busy={busy}>
        {!cart ? (
          <p className="py-10 text-muted">{t("loading")}</p>
        ) : lines.length === 0 ? (
          <div className="grid justify-items-start gap-4 py-10">
            <p className="text-muted">{t("empty")}</p>
            <NextLink href={shopPath} className="btn btn-primary">
              {t("emptyCta")}
            </NextLink>
          </div>
        ) : (
          <ul className="grid gap-4">
            {lines.map((line) => {
              const tier = tierFor(line.quantity);
              const inputId = `qty-${line.id}`;
              return (
                <li key={line.id} className="grid gap-3 border-b border-line pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="annot text-primary-ink">{line.code}</p>
                      <NextLink href={`${shopPath}/${line.handle}`} className="font-medium hover:text-accent">
                        {line.title}
                      </NextLink>
                    </div>
                    <button
                      type="button"
                      onClick={() => void remove(line.id)}
                      className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:text-error"
                      aria-label={t("remove", { code: line.code })}
                    >
                      <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void update(line.id, line.quantity - 1)}
                        className="grid size-11 place-items-center rounded-full border border-line-strong hover:border-accent"
                        aria-label={t("decrease", { code: line.code })}
                      >
                        <Minus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                      </button>
                      <label htmlFor={inputId} className="sr-only">
                        {t("quantityFor", { code: line.code })}
                      </label>
                      <input
                        id={inputId}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={999}
                        value={line.quantity}
                        onChange={(e) => void update(line.id, Number(e.target.value))}
                        className="input tabular h-11 w-16 px-2 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => void update(line.id, line.quantity + 1)}
                        className="grid size-11 place-items-center rounded-full border border-line-strong hover:border-accent"
                        aria-label={t("increase", { code: line.code })}
                      >
                        <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="tabular font-medium">{formatMoney(line.lineTotal, locale)}</p>
                      <p className="annot text-muted">
                        {line.quantity} × {formatMoney(line.unitPrice, locale)}
                      </p>
                    </div>
                  </div>
                  {tier.discount > 0 ? (
                    <p className="annot text-ok">{t("discountApplied", { percent: Math.round(tier.discount * 100) })}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {error ? (
          <p role="alert" className="field-error mt-4">
            {t("error")}
          </p>
        ) : null}
      </div>

      {lines.length > 0 && cart ? (
        <footer className="grid gap-3 border-t border-line bg-surface px-5 py-5">
          <p className="annot text-muted">{t("tiers")}</p>
          <div className="flex items-baseline justify-between">
            <span className="font-medium">{t("subtotal")}</span>
            <span className="tabular font-display text-display-s font-bold">{formatMoney(cart.subtotal, locale)}</span>
          </div>
          <p className="text-sm text-muted">{t("vatExcluded")}</p>
          <NextLink href={checkoutPath} className="btn btn-primary w-full">
            {t("checkout")}
          </NextLink>
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-ghost w-full">
            {t("continue")}
          </button>
        </footer>
      ) : null}
    </dialog>
  );
}
