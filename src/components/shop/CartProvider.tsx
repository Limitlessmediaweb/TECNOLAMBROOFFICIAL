"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Cart } from "@/lib/commerce/types";
import type { CommerceProvider } from "@/lib/commerce/provider";
import type { CommerceMode } from "@/lib/commerce";
import { track } from "@/lib/analytics";

/**
 * Stato del carrello per tutto il sito.
 * - Provider locale: il codice del provider (catalogo + localStorage) si carica solo al primo uso;
 *   all'avvio basta leggere il numero di pezzi salvato, per il contatore nell'header.
 * - Provider Shopify: le operazioni passano dalle server action (il token resta sul server);
 *   qui si conserva solo l'id del carrello Shopify.
 */

type CartContext = {
  mode: CommerceMode;
  cart: Cart | null;
  count: number;
  busy: boolean;
  error: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  ensureCart: () => Promise<Cart>;
  add: (variantId: string, quantity: number, info: { code: string; handle: string }) => Promise<void>;
  update: (lineId: string, quantity: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  /** dopo il checkout locale: azzera lo stato in memoria */
  reset: () => void;
};

const Ctx = createContext<CartContext | null>(null);

const LOCAL_KEY = "tl-cart-v1";
const SHOPIFY_KEY = "tl-shopify-cart";
const COUNT_KEY = "tl-cart-count";

function readStoredCount(mode: CommerceMode): number {
  try {
    if (mode === "local") {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as { lines?: { quantity: number }[] };
      return (parsed.lines ?? []).reduce((n, l) => n + (l.quantity || 0), 0);
    }
    return Number(localStorage.getItem(COUNT_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

let localProviderPromise: Promise<CommerceProvider> | null = null;
function loadLocal(): Promise<CommerceProvider> {
  localProviderPromise ??= import("@/lib/commerce/local").then((m) => m.localProvider);
  return localProviderPromise;
}

async function loadShopifyActions() {
  return import("@/app/actions/cart");
}

export function CartProvider({ mode, children }: { mode: CommerceMode; children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const cartRef = useRef<Cart | null>(null);

  const commit = useCallback(
    (next: Cart) => {
      cartRef.current = next;
      setCart(next);
      setCount(next.totalQuantity);
      if (mode === "shopify") {
        try {
          localStorage.setItem(SHOPIFY_KEY, next.id);
          localStorage.setItem(COUNT_KEY, String(next.totalQuantity));
        } catch {
          /* ignora */
        }
      }
    },
    [mode],
  );

  // Contatore subito disponibile dal salvataggio, senza caricare il provider.
  useEffect(() => {
    const id = requestAnimationFrame(() => setCount(readStoredCount(mode)));
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_KEY || e.key === COUNT_KEY) {
        setCount(readStoredCount(mode));
        cartRef.current = null;
        setCart(null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("storage", onStorage);
    };
  }, [mode]);

  const ensureCart = useCallback(async (): Promise<Cart> => {
    if (cartRef.current) return cartRef.current;
    if (mode === "local") {
      const provider = await loadLocal();
      const c = await provider.createCart();
      commit(c);
      return c;
    }
    const actions = await loadShopifyActions();
    let storedId: string | null = null;
    try {
      storedId = localStorage.getItem(SHOPIFY_KEY);
    } catch {
      /* ignora */
    }
    const c = (storedId ? await actions.getCartAction(storedId) : null) ?? (await actions.createCartAction());
    commit(c);
    return c;
  }, [mode, commit]);

  const run = useCallback(
    async (fn: (cart: Cart) => Promise<Cart>) => {
      setBusy(true);
      setError(false);
      try {
        const current = await ensureCart();
        commit(await fn(current));
      } catch {
        setError(true);
      } finally {
        setBusy(false);
      }
    },
    [ensureCart, commit],
  );

  const add = useCallback<CartContext["add"]>(
    async (variantId, quantity, info) => {
      await run(async (c) => {
        if (mode === "local") return (await loadLocal()).addLine(c.id, variantId, quantity);
        return (await loadShopifyActions()).addLineAction(c.id, variantId, quantity);
      });
      track("add_to_cart", { code: info.code, quantity });
      setIsOpen(true);
    },
    [run, mode],
  );

  const update = useCallback<CartContext["update"]>(
    (lineId, quantity) =>
      run(async (c) => {
        if (mode === "local") return (await loadLocal()).updateLine(c.id, lineId, quantity);
        return (await loadShopifyActions()).updateLineAction(c.id, lineId, quantity);
      }),
    [run, mode],
  );

  const remove = useCallback<CartContext["remove"]>(
    (lineId) =>
      run(async (c) => {
        if (mode === "local") return (await loadLocal()).removeLine(c.id, lineId);
        return (await loadShopifyActions()).removeLineAction(c.id, lineId);
      }),
    [run, mode],
  );

  const open = useCallback(() => {
    setIsOpen(true);
    void ensureCart().catch(() => setError(true));
  }, [ensureCart]);

  const value = useMemo<CartContext>(
    () => ({
      mode,
      cart,
      count,
      busy,
      error,
      isOpen,
      open,
      close: () => setIsOpen(false),
      ensureCart,
      add,
      update,
      remove,
      reset: () => {
        cartRef.current = null;
        setCart(null);
        setCount(0);
      },
    }),
    [mode, cart, count, busy, error, isOpen, open, ensureCart, add, update, remove],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("CartProvider mancante");
  return ctx;
}
