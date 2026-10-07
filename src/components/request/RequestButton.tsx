"use client";

import NextLink from "next/link";
import { ClipboardList } from "lucide-react";
import { useT } from "@/lib/client-i18n";
import { useRequestItems } from "@/lib/request";

/** Pulsante dell'header verso "La tua richiesta", con il numero di pezzi in lista. */
export function RequestButton({ href }: { href: string }) {
  const t = useT("request");
  const count = useRequestItems().length;
  const label = count === 0 ? t("open") : count === 1 ? t("openWithOne") : t("openWithCount", { count });
  return (
    <NextLink href={href} aria-label={label} title={label} className="relative grid size-10 place-items-center sm:size-11 rounded-full border border-line-strong transition-colors hover:border-accent" data-request-button>
      <ClipboardList aria-hidden="true" className="size-5" strokeWidth={1.75} />
      {count > 0 ? (
        <span aria-hidden="true" className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.6875rem] font-semibold leading-5 text-on-accent tabular">
          {count}
        </span>
      ) : null}
    </NextLink>
  );
}
