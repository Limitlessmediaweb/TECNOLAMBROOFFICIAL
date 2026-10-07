"use client";

import { Moon, Sun } from "lucide-react";
import { useT } from "@/lib/client-i18n";

/** Alterna tema scuro/chiaro. Le icone si scambiano via CSS per evitare mismatch di idratazione. */
export function ThemeToggle() {
  const t = useT("nav");

  const toggle = () => {
    const html = document.documentElement;
    const next = html.dataset.theme === "light" ? "dark" : "light";
    const apply = () => {
      html.dataset.theme = next;
      try {
        localStorage.setItem("tl-theme", next);
      } catch {
        /* preferenza non salvata */
      }
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("startViewTransition" in document && !reduce) document.startViewTransition(apply);
    else apply();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-11 place-items-center rounded-full border border-line-strong text-fg transition-colors hover:border-accent"
      aria-label={t("theme")}
      title={t("theme")}
    >
      <Sun aria-hidden="true" className="size-4 [:root[data-theme=light]_&]:hidden" strokeWidth={1.75} />
      <Moon aria-hidden="true" className="hidden size-4 [:root[data-theme=light]_&]:block" strokeWidth={1.75} />
    </button>
  );
}
