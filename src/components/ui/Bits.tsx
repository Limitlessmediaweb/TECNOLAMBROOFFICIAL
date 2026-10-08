import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Camera, ChevronRight } from "lucide-react";
import { LocalLink as Link } from "@/components/ui/LocalLink";
import { ENV } from "@/data/site";
import { cn } from "@/lib/cn";

/** Badge fisso "Versione demo", visibile finché NEXT_PUBLIC_DEMO=true. */
export async function DemoBadge() {
  if (!ENV.demo) return null;
  const t = await getTranslations("common");
  return (
    <p
      role="note"
      className="annot pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[60] lg:left-4 lg:right-auto rounded-sm bg-todo px-2.5 py-1 font-medium uppercase tracking-[0.12em] text-on-todo shadow-[0_6px_20px_var(--c-shadow)]"
    >
      {t("demoBadge")}
    </p>
  );
}

const TODO_RE = /(\[(?:DA COMPLETARE|TO BE COMPLETED)[^\]]*\])/g;

/** Toglie i segnaposto [DA COMPLETARE] da un testo (per la versione pubblica). */
export function stripPlaceholders(text: string): string {
  return text.replace(TODO_RE, "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Segnaposto [DA COMPLETARE] / [TO BE COMPLETED] dentro un testo.
 * In anteprima (NEXT_PUBLIC_DEMO=true) restano evidenziati in giallo; nella versione pubblica
 * spariscono, e se il testo era solo un segnaposto non resta nulla.
 */
export function WithTodo({ text }: { text: string }) {
  if (!ENV.demo) return <>{stripPlaceholders(text)}</>;
  const parts = text.split(TODO_RE);
  return (
    <>
      {parts.map((part, i) =>
        /^\[(DA COMPLETARE|TO BE COMPLETED)/.test(part) ? (
          <span key={i} className="todo">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** true se il testo, tolti i segnaposto, è vuoto. */
export function isOnlyPlaceholder(text: string): boolean {
  return stripPlaceholders(text) === "";
}

/** Badge giallo "manca: …" visibile solo in anteprima (NEXT_PUBLIC_DEMO=true). */
export function MissingBadge({ label, className }: { label: string; className?: string }) {
  if (!ENV.demo) return null;
  return (
    <p role="note" className={cn("annot inline-flex w-max items-center gap-2 rounded-sm bg-todo px-2.5 py-1 text-on-todo", className)}>
      <span aria-hidden="true">●</span>
      {label}
    </p>
  );
}

/** Segnaposto foto: solo in anteprima. Nella versione pubblica il blocco non esiste. */
export async function PhotoPlaceholder({ ratio = "4/3", caption, className }: { ratio?: string; caption: string; className?: string }) {
  if (!ENV.demo) return null;
  const t = await getTranslations("common");
  return (
    <figure className={cn("relative grid place-items-center overflow-hidden border border-dashed border-line-strong bg-surface", className)} style={{ aspectRatio: ratio }}>
      <div className="grid justify-items-center gap-3 p-6 text-center">
        <Camera aria-hidden="true" className="size-7 text-muted" strokeWidth={1.5} />
        <p className="text-sm text-muted">{t("photoPlaceholder")}</p>
        <figcaption>
          <span className="todo">{caption}</span>
        </figcaption>
      </div>
    </figure>
  );
}

/** Contrassegno "Dati dimostrativi" sopra le tabelle con valori di esempio. */
export async function DemoDataTag() {
  if (!ENV.demo) return null;
  const t = await getTranslations("common");
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
      <span className="todo">{t("demoData")}</span>
      <span>{t("demoDataNote")}</span>
    </p>
  );
}

export type Crumb = { label: string; href?: Parameters<typeof Link>[0]["href"] };

export async function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = await getTranslations("common");
  return (
    <nav aria-label={t("breadcrumb")} className="annot text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-fg">
            {t("home")}
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight aria-hidden="true" className="size-3" strokeWidth={1.75} />
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-fg">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Intestazione delle pagine interne: breadcrumb, H1 unico, introduzione. */
export function PageHeader({ crumbs, title, intro, children }: { crumbs: ReactNode; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <header className="container-site pb-14 pt-28 lg:pb-20 lg:pt-36">
      {crumbs}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-12">{title}</div>
        {intro ? <div className="text-lead text-muted lg:col-span-7">{intro}</div> : null}
        {children ? <div className="lg:col-span-12">{children}</div> : null}
      </div>
    </header>
  );
}
