"use client";

import { useEffect } from "react";
import { PART_TYPES, type PartType } from "@/data/configurator/types";
import { defaultSpec, specToParams } from "@/data/configurator/defaults";
import { useT } from "@/lib/client-i18n";
import { track } from "@/lib/analytics";
import type { ConfigureDetail } from "./Configurator";

declare global {
  interface Window {
    /** solo con ?render=thumbs: usato da scripts/render-thumbs.mjs per le miniature statiche */
    __tlThumb?: (type: PartType, plane?: "E" | "H") => Promise<string>;
  }
}

/** I 6 tipi di pezzo, con la miniatura 3D statica: aprono il configuratore sul tipo scelto. */
export function TypeTiles({ thumbs }: { thumbs: Record<string, string> }) {
  const t = useT("configurator");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("render") !== "thumbs") return;
    window.__tlThumb = async (type, plane) => {
      const { renderThumbnail } = await import("@/lib/part3d");
      const spec = defaultSpec(type);
      if (plane) spec.plane = plane;
      return renderThumbnail(spec, 640, 400);
    };
  }, []);

  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {PART_TYPES.map((d) => {
        const thumb = thumbs[d.type === "bend" ? "bend-E" : d.type];
        return (
          <li key={d.type}>
            <a
              href={`?${specToParams(defaultSpec(d.type))}#configura`}
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent<ConfigureDetail>("tl:configure", { detail: { type: d.type } }));
                track("config_type", { type: d.type, source: "tiles" });
              }}
              className="group flex h-full flex-col border border-line bg-surface p-4 transition-colors hover:border-accent focus-visible:border-accent"
              data-type-link={d.type}
            >
              <span className="mb-3 grid aspect-[8/5] place-items-center overflow-hidden bg-[radial-gradient(120%_90%_at_50%_30%,var(--c-surface),var(--c-surface-2))]">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" width={320} height={200} loading="lazy" decoding="async" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span aria-hidden="true" className="font-mono text-xs text-muted">
                    {d.type === "custom" ? "STEP · STL · PDF" : "3D"}
                  </span>
                )}
              </span>
              <span className="font-semibold leading-snug">{t(`types.${d.type}.name`)}</span>
              <span className="mt-1 text-xs text-muted">{t(`types.${d.type}.short`)}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
