"use client";

import { useMemo, useState } from "react";
import NextLink from "next/link";
import { ArrowRight } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import type { PartType } from "@/data/configurator/types";
import { defaultSpec, specToParams } from "@/data/configurator/defaults";
import { TechDrawing } from "./TechDrawing";
import { Viewer3D } from "./Viewer3D";
import { useDrawingLabels, usePartText } from "./Configurator";

/** Pagina famiglia: il pezzo standard (WR-90) in 3D e in disegno, con il link al configuratore. */
export function FamilyDemo3D({ type, shopPath }: { type: PartType; shopPath: string }) {
  const t = useT("configurator");
  const locale = useClientLocale();
  const labels = useDrawingLabels();
  const text = usePartText();
  const spec = useMemo(() => defaultSpec(type), [type]);
  const code = text.reference(spec);
  const [view, setView] = useState<"3d" | "2d">("3d");
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
      <figure className="border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
          <figcaption className="annot break-all text-muted">{code}</figcaption>
          <button type="button" className="btn btn-ghost btn-sm" aria-pressed={view === "2d"} onClick={() => setView(view === "3d" ? "2d" : "3d")}>
            {view === "3d" ? t("drawingButton") : t("view3d")}
          </button>
        </div>
        {view === "3d" ? (
          <Viewer3D spec={spec} label={t("viewerLabel", { code })} />
        ) : (
          <TechDrawing spec={spec} flangeA={text.flange(spec.f1)} flangeB={text.flange(spec.f2)} code={code} labels={labels} locale={locale} alt={t("drawingAlt", { code })} />
        )}
      </figure>
      <div className="grid gap-4">
        <p className="text-muted">{text.detail(spec)}</p>
        <NextLink href={`${shopPath}?${specToParams(spec)}#configura`} className="btn btn-primary justify-self-start">
          {t("customize")}
          <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
        </NextLink>
      </div>
    </div>
  );
}
