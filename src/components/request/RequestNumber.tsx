"use client";

import { useEffect, useState } from "react";
import { LAST_REQUEST_KEY } from "@/lib/request";

/** Numero dell'ultima richiesta inviata in questa sessione (lo salva RequestForm). */
export function RequestNumber({ label, missing }: { label: string; missing: string }) {
  const [number, setNumber] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        setNumber(window.sessionStorage.getItem(LAST_REQUEST_KEY));
      } catch {
        setNumber(null);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  if (number === undefined) return <p className="h-[4.5rem]" aria-hidden="true" />;
  if (!number) return <p className="text-muted">{missing}</p>;
  return (
    <p className="grid gap-1">
      <span className="annot uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="font-mono text-display-m font-semibold tabular" data-request-number>
        {number}
      </span>
    </p>
  );
}
