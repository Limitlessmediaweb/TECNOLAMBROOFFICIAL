"use client";

import { useSyncExternalStore } from "react";
import type { PartSpec } from "./part";

/**
 * "La tua richiesta": lista dei pezzi da quotare, salvata nel localStorage del browser
 * (nessun prezzo, nessun pagamento). Si svuota dopo l'invio.
 */
export type RequestItem = {
  id: string;
  /** configured = dal configuratore · ready = misura standard dal catalogo · custom = pezzo su disegno */
  kind: "configured" | "ready" | "custom";
  spec?: PartSpec;
  code: string;
  /** riga leggibile per l'email: tipo, misura, banda, lunghezza, flange */
  detail?: string;
  qty: number;
  notes: string;
};

const KEY = "tl-request-v1";
const EVENT = "tl:request";
const EMPTY: RequestItem[] = [];

let cache: RequestItem[] | null = null;

function read(): RequestItem[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? (parsed as RequestItem[]).filter((i) => i && typeof i.id === "string" && typeof i.code === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: RequestItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Archivio pieno o disabilitato: la lista resta in memoria per questa pagina.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** Lista della richiesta, sincronizzata tra componenti e schede del browser. */
export function useRequestItems(): RequestItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function requestCount(items: RequestItem[]): number {
  return items.length;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Aggiunge un pezzo; se lo stesso codice è già in lista ne aumenta la quantità. */
export function addItem(item: Omit<RequestItem, "id" | "qty" | "notes"> & { qty?: number; notes?: string }): void {
  const items = read();
  const same = item.kind !== "custom" ? items.find((i) => i.code === item.code && i.kind === item.kind) : undefined;
  if (same) {
    write(items.map((i) => (i === same ? { ...i, qty: i.qty + (item.qty ?? 1) } : i)));
    return;
  }
  write([...items, { id: newId(), qty: item.qty ?? 1, notes: item.notes ?? "", ...item }]);
}

export function updateItem(id: string, patch: Partial<Pick<RequestItem, "qty" | "notes">>): void {
  write(read().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export function removeItem(id: string): void {
  write(read().filter((i) => i.id !== id));
}

export function clearRequest(): void {
  write([]);
}

/* ---------------------------------------------- dati del cliente (bozza) */

const DRAFT_KEY = "tl-request-customer-v1";

export type CustomerDraft = { company: string; name: string; email: string; phone: string; country: string; vat: string };

export function loadDraft(): CustomerDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as CustomerDraft) : null;
  } catch {
    return null;
  }
}

/** I dati inseriti non si perdono se l'invio fallisce o la pagina si ricarica. */
export function saveDraft(draft: CustomerDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignorato
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignorato
  }
}

/** Numero dell'ultima richiesta inviata, per la pagina di conferma (solo questa sessione). */
export const LAST_REQUEST_KEY = "tl-last-request";
