"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

export type FaqEntry = { id: string; q: string; a: React.ReactNode };

/**
 * Accordion accessibile: <button aria-expanded aria-controls> + pannello con
 * hidden="until-found" (il testo resta trovabile con Cerca nella pagina e si apre da solo).
 * Senza JavaScript tutte le risposte sono visibili.
 */
export function FaqAccordion({ items, headingLevel = 3 }: { items: FaqEntry[]; headingLevel?: 2 | 3 }) {
  const uid = useId();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const panels = useRef<Map<string, HTMLDivElement>>(new Map());
  const Heading = `h${headingLevel}` as "h2" | "h3";

  // Dopo il mount: i pannelli chiusi passano a hidden="until-found" (React non supporta il valore).
  useEffect(() => {
    panels.current.forEach((panel, id) => {
      if (open.has(id)) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "until-found");
      panel.dataset.ready = "1";
    });
  }, [open]);

  // Cerca nella pagina apre il pannello che contiene il testo trovato.
  useEffect(() => {
    const map = panels.current;
    const handlers: [HTMLDivElement, () => void][] = [];
    map.forEach((panel, id) => {
      const onMatch = () => setOpen((prev) => new Set(prev).add(id));
      panel.addEventListener("beforematch", onMatch);
      handlers.push([panel, onMatch]);
    });
    return () => handlers.forEach(([panel, fn]) => panel.removeEventListener("beforematch", fn));
  }, []);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="border-t border-line">
      {items.map((item) => {
        const isOpen = open.has(item.id);
        const btnId = `${uid}-${item.id}-q`;
        const panelId = `${uid}-${item.id}-a`;
        return (
          <div key={item.id} className="border-b border-line">
            <Heading className="m-0 font-sans text-base font-medium [font-variation-settings:normal] [letter-spacing:0]">
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className="group flex w-full items-start justify-between gap-6 py-5 text-left text-[1.0625rem] leading-snug text-fg transition-colors hover:text-accent sm:text-lg"
              >
                <span>{item.q}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border border-line-strong transition-transform duration-300 group-hover:border-accent",
                    isOpen && "rotate-45 border-accent text-accent",
                  )}
                >
                  <Plus className="size-4" strokeWidth={1.75} />
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              data-faq-panel
              data-open={isOpen ? "" : undefined}
              ref={(el) => {
                if (el) panels.current.set(item.id, el);
                else panels.current.delete(item.id);
              }}
            >
              <div className="max-w-[68ch] pb-6 pr-10 text-muted">{item.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
