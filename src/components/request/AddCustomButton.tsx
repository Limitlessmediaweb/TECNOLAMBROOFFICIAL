"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/client-i18n";
import { addItem } from "@/lib/request";
import { track } from "@/lib/analytics";

/** Aggiunge alla richiesta una voce "pezzo su disegno" e apre "La tua richiesta". */
export function AddCustomButton({ href, label, icon }: { href: string; label: string; icon?: ReactNode }) {
  const t = useT("request");
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-primary"
      onClick={() => {
        addItem({ kind: "custom", code: t("customItemCode") });
        track("request_add", { kind: "custom" });
        router.push(href);
      }}
    >
      {icon}
      {label}
    </button>
  );
}
