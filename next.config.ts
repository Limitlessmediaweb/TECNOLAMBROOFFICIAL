import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Al lancio (docs/messa-online.md): con CANONICAL_REDIRECT=true gli host secondari (www e l'indirizzo
 * *.vercel.app di produzione, in REDIRECT_HOSTS separati da virgola) portano al dominio di
 * NEXT_PUBLIC_SITE_URL con un redirect 308. Spento finché la variabile non è impostata.
 */
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tecnolambro.it").replace(/\/$/, "");
const HOST_REDIRECTS =
  process.env.CANONICAL_REDIRECT === "true"
    ? (process.env.REDIRECT_HOSTS ?? "www.tecnolambro.it,tecnolambroooo.vercel.app")
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h && h !== new URL(SITE_URL).host)
        .map((host) => ({ source: "/:path*", has: [{ type: "host" as const, value: host }], destination: `${SITE_URL}/:path*`, permanent: true }))
    : [];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Pagine tolte o rinominate nella versione 2 (riunione del 7 ottobre 2026): redirect permanenti 308.
  async redirects() {
    const family: [string, string][] = [
      ["/prodotti/rigida", "/prodotti/curve"],
      ["/prodotti/curve-twist-disassati", "/prodotti/curve"],
      ["/prodotti/flessibile", "/prodotti/guida-flessibile-twistabile"],
      ["/prodotti/illuminatori", "/prodotti"],
      ["/prodotti/transizioni", "/prodotti"],
      ["/prodotti/flange-e-kit", "/prodotti"],
      ["/prodotti/su-disegno", "/su-misura"],
      ["/en/products/rigid", "/en/products/bends"],
      ["/en/products/bends-twists-offsets", "/en/products/bends"],
      ["/en/products/flexible", "/en/products/twistable-flexible-waveguide"],
      ["/en/products/feed-horns", "/en/products"],
      ["/en/products/transitions", "/en/products"],
      ["/en/products/flanges-and-kits", "/en/products"],
      ["/en/products/custom-built", "/en/custom"],
      ["/shop/ordine", "/shop/richiesta"],
      ["/shop/ordine-inviato", "/shop/richiesta/inviata"],
      ["/shop/richiesta-inviata", "/shop/richiesta/inviata"],
      ["/en/shop/order", "/en/shop/request"],
      ["/en/shop/order-sent", "/en/shop/request/sent"],
      ["/en/shop/request-sent", "/en/shop/request/sent"],
      // la pagina radioamatori (10 GHz) non c'è più: porta alla WR-90 (8,2–12,5 GHz)
      ["/radioamatori", "/prodotti/guida-flessibile/wr-90"],
      ["/en/ham-radio", "/en/products/flexible-waveguide/wr-90"],
    ];
    // Vecchie schede dello shop con i prezzi: ora c'è il configuratore
    const handles = [
      "flex-twist-wr75-600", "flex-twist-wr90-600", "bend-e-wr90-90", "bend-h-wr90-90", "twist-wr75-90", "straight-wr90-300",
      "flange-adapter-wr90", "install-kit-wr75", "transition-wr90-n", "termination-wr90", "feed-10ghz-qo100", "transition-10ghz-sma",
    ];
    return [
      ...HOST_REDIRECTS,
      ...family.map(([source, destination]) => ({ source, destination, permanent: true })),
      ...handles.flatMap((h) => [
        { source: `/shop/${h}`, destination: "/shop", permanent: true },
        { source: `/en/shop/${h}`, destination: "/en/shop", permanent: true },
      ]),
    ];
  },
  // Intestazioni di sicurezza per tutte le risposte. La CSP rigorosa va definita al deploy
  // (script inline del tema/intro e JSON-LD richiedono nonce o hash).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
