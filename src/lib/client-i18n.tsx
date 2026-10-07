"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

/**
 * Traduzioni per i componenti client, senza runtime ICU.
 * Il server (next-intl) passa solo i namespace necessari come stringhe; qui basta
 * l'interpolazione di {variabili}. Così use-intl/IntlMessageFormat non finiscono nel bundle.
 * Regola per messages/*.json: i namespace client (nav, common, bandFinder, quote, intro)
 * non usano plurali ICU; per i plurali si usano chiavi separate (es. errorSummaryOne / errorSummaryOther).
 */

type Messages = Record<string, unknown>;
type Ctx = { locale: string; messages: Messages };

const I18nContext = createContext<Ctx | null>(null);

/** Provider annidabile: i namespace del figlio si aggiungono a quelli del padre (pagine shop). */
export function ClientI18nProvider({ locale, messages, children }: Ctx & { children: ReactNode }) {
  const parent = useContext(I18nContext);
  const merged = parent ? { ...parent.messages, ...messages } : messages;
  return <I18nContext.Provider value={{ locale, messages: merged }}>{children}</I18nContext.Provider>;
}

function useCtx(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("ClientI18nProvider mancante");
  return ctx;
}

export function useClientLocale(): string {
  return useCtx().locale;
}

function lookup(messages: Messages, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Messages)[key] : undefined), messages);
}

export type TFunction = (key: string, values?: Record<string, string | number>) => string;

/** t("chiave", { var }) dentro un namespace. Se la chiave manca restituisce "namespace.chiave". */
export function useT(namespace: string): TFunction {
  const { messages } = useCtx();
  return useCallback<TFunction>(
    (key, values) => {
      const raw = lookup(messages, `${namespace}.${key}`);
      if (typeof raw !== "string") return `${namespace}.${key}`;
      if (!values) return raw;
      return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
    },
    [messages, namespace],
  );
}

/** Divide "testo <tag>link</tag> testo" in parti per rendere il tag come componente. */
export function splitTag(text: string, tag: string): [string, string, string] {
  const re = new RegExp(`^(.*?)<${tag}>(.*?)</${tag}>(.*)$`, "s");
  const m = text.match(re);
  return m ? [m[1], m[2], m[3]] : [text, "", ""];
}
