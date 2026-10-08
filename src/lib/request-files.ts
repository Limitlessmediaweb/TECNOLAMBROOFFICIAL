"use client";

/**
 * File allegati ai singoli pezzi "su disegno", conservati nel browser (IndexedDB) finché la
 * richiesta non parte: così si possono aggiungere dal configuratore e ritrovarli in "La tua richiesta".
 */
const DB = "tl-request";
const STORE = "files";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = fn(db.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function saveItemFiles(itemId: string, files: File[]): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(files, itemId));
  } catch {
    // IndexedDB non disponibile (navigazione privata): i file si ricaricano nella pagina della richiesta
  }
}

export async function loadItemFiles(itemId: string): Promise<File[]> {
  try {
    return ((await tx<File[] | undefined>("readonly", (s) => s.get(itemId))) ?? []).filter((f) => f instanceof File);
  } catch {
    return [];
  }
}

export async function deleteItemFiles(itemId: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.delete(itemId));
  } catch {
    // ignorato
  }
}

export async function clearItemFiles(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    // ignorato
  }
}
