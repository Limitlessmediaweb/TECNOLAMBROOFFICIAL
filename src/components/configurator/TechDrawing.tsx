"use client";

import { useMemo } from "react";
import { drawingSvg, drawingDate, type DrawingInput, type DrawingLabels } from "@/lib/drawing";
import { cn } from "@/lib/cn";

type Props = Omit<DrawingInput, "palette" | "labels" | "locale" | "date" | "logoHref"> & {
  labels: DrawingLabels;
  locale: string;
  /** testo alternativo del disegno (role="img") */
  alt: string;
  className?: string;
};

/**
 * Disegno tecnico quotato a schermo. L'SVG è costruito da lib/drawing.ts solo con dati
 * del sito (tabelle, codici, elenchi di flange): nessun testo inserito dall'utente.
 */
export function TechDrawing({ labels, locale, alt, className, ...spec }: Props) {
  const svg = useMemo(
    () => drawingSvg({ ...spec, labels, locale, palette: "screen", logoHref: "/brand/logo.png", date: drawingDate(locale) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.wr, spec.twist, spec.lengthMm, spec.flangeA, spec.flangeB, spec.code, spec.generic, labels, locale],
  );
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn("tech-drawing w-full [&_svg]:h-auto [&_svg]:w-full", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
