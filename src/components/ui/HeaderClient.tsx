"use client";

import { useEffect, useRef, type ReactNode } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { isActivePath } from "@/i18n/switch-path";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string };

/** Voci di navigazione con aria-current sulla pagina attiva. */
export function NavList({ items, variant }: { items: Item[]; variant: "desktop" | "mobile" }) {
  const pathname = usePathname();

  if (variant === "desktop") {
    return (
      <ul className="flex items-center gap-1">
        {items.map((item) => (
          <li key={item.href}>
            <NextLink
              href={item.href}
              aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
              className={cn(
                "relative rounded-full px-3 py-2 text-[0.9rem] text-muted transition-colors hover:text-fg",
                "aria-[current=page]:text-fg aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-3 aria-[current=page]:after:-bottom-0.5 aria-[current=page]:after:h-px aria-[current=page]:after:bg-accent",
              )}
            >
              {item.label}
            </NextLink>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid">
      {items.map((item) => (
        <li key={item.href} className="border-b border-line/60">
          <NextLink
            href={item.href}
            aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
            className="flex items-center justify-between py-4 font-display text-display-s font-bold wdth-wide aria-[current=page]:text-accent"
          >
            {item.label}
            <ArrowRight aria-hidden="true" className="size-5 text-muted" strokeWidth={1.5} />
          </NextLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * Menu mobile in un <dialog> nativo (focus intrappolato, Esc, sfondo inerte).
 * Il contenuto arriva già renderizzato dal server; ogni click su un link chiude il menu.
 */
export function MobileMenu({
  openLabel,
  closeLabel,
  label,
  wordmark,
  children,
}: {
  openLabel: string;
  closeLabel: string;
  label: string;
  wordmark: ReactNode;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    dialog.current?.close();
  }, [pathname]);

  const open = () => {
    dialog.current?.showModal();
    window.__lenis?.stop();
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="grid size-11 place-items-center rounded-full border border-line-strong lg:hidden"
        aria-label={openLabel}
        aria-haspopup="dialog"
      >
        <Menu aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </button>
      <dialog
        ref={dialog}
        onClose={() => window.__lenis?.start()}
        onClick={(e) => {
          if ((e.target as Element).closest("a")) close();
        }}
        aria-label={label}
        className="m-0 h-[100dvh] max-h-none w-full max-w-none bg-bg p-0 text-fg backdrop:bg-bg/80 open:flex open:flex-col lg:hidden"
      >
        <div className="container-site flex h-16 shrink-0 items-center justify-between border-b border-line">
          {wordmark}
          <button
            type="button"
            onClick={close}
            className="grid size-11 place-items-center rounded-full border border-line-strong"
            aria-label={closeLabel}
            autoFocus
          >
            <X aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
