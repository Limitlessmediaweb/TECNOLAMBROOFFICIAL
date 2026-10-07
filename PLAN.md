# PLAN — Tecnolambro Microwave Components

Sito vetrina IT/EN, Next.js 16 (App Router) + TypeScript + Tailwind v4 + GSAP 3.15 + Lenis + next-intl.
Ogni task si chiude con `npm run build` verde prima di passare al successivo.

| # | Task | Stato |
|---|------|-------|
| 1 | Scaffold Next.js, dipendenze (gsap, @gsap/react, lenis, next-intl, clsx, tailwind-merge, lucide-react) | ✅ |
| 2 | Skill di base (modern-web-guidance, design-taste-frontend al posto di frontend-design, design-system, ux-copy) | ✅ |
| 3 | i18n: `src/i18n/{routing,request,navigation}.ts`, `src/proxy.ts`, slug tradotti (`/prodotti` ↔ `/en/products`) | ✅ |
| 4 | Design token in `@theme` (tema scuro + chiaro), font via `next/font` (Archivo wdth, IBM Plex Sans/Mono), griglia tecnica | ✅ |
| 5 | Dati tipizzati: `src/data/{bands,products,faq,todo,site}.ts` | ✅ |
| 6 | `messages/it.json` + `messages/en.json` (tutti i testi) | ✅ |
| 7 | Libreria motion `src/components/motion/*` (SplitReveal, ScrambleText, Reveal, Stagger, PinnedSteps, HorizontalScroll, Marquee, TiltCard, MagneticButton, ParallaxLayer, ScrollProgress, Counter, PageTransition, CursorFollower, DrawUnderline) + provider Lenis/ScrollTrigger | ✅ |
| 8 | Componenti di dominio: `Intro` (DrawSVG + wdth), `TE10Field` (canvas), `BandFinder`, `ExplodedPart`, disegni SVG delle 6 famiglie | ✅ |
| 9 | UI shell: Header (CTA sempre visibile, selettore lingua, tema), Footer (credito LIMITLESS), DemoBadge, SkipLink | ✅ |
| 10 | Form preventivo (validazione client, file PDF/DWG/DXF/STEP ≤ 20 MB, `lib/quote.ts` TODO) + precompilazione da BandFinder | ✅ |
| 11 | Home: 12 sezioni | ✅ |
| 12 | Pagine: prodotti, prodotti/[famiglia], su-misura, azienda, qualita, radioamatori, contatti, faq, privacy, termini, cookie, 404 | ✅ |
| 13 | SEO: `generateMetadata` per pagina, canonical + hreflang, OG/Twitter, JSON-LD Organization/LocalBusiness/WebSite/FAQPage/BreadcrumbList, robots.ts, sitemap.ts, noindex globale | ✅ |
| 14 | Analytics Plausible condizionale + `lib/analytics.ts` `track()` | ✅ |
| 15 | `scripts/check-alt.mjs` + `npm run check:alt`, `.env.example` | ✅ |
| 16 | Verifica: build, lint, check:alt, screenshot Playwright 390×844 e 1440×900 × IT/EN, Lighthouse mobile home | ✅ (Performance mobile mediana 95 dopo le ottimizzazioni) |
| 17 | Review finali (accessibility-review, design-critique, code-review) e correzioni | ✅ |
| 18 | README (avvio, variabili, DA COMPLETARE, decisioni, form) + riepilogo | ✅ |

---

## Fase 2 — Colori del logo e shop integrato (7 ottobre 2026)

| # | Task | Stato |
|---|------|-------|
| 19 | Estrazione colori da `public/brand/logo.png` con `sharp` (`scripts/extract-logo-colors.mjs`), valori nel README | ✅ |
| 20 | Nuovi token in `@theme`: primario blu logo, secondario grigio logo, neutri tinti di blu, un accento CTA (blu più saturo) verificato AA; ottone eliminato o ridotto a dettaglio; tema chiaro predefinito, scuro curato | ✅ |
| 21 | Bonifica colori scritti a mano: pagine, intro, canvas TE10, SVG, OG image, theme-color, logo plate | ✅ |
| 22 | Rimozione `shop.tecnolambro.com` e `NEXT_PUBLIC_SHOP_URL`; tutte le CTA shop → `/shop` (`/en/shop`) | ✅ |
| 23 | Commerce layer: `src/lib/commerce/{types,provider,local,shopify,index}.ts`, scelta provider in un punto solo; test con dati finti per Shopify | ✅ |
| 24 | Dati: 12 prodotti dimostrativi in `src/data/products.ts` (`SHOP_PRODUCTS`) + prezzi a scaglioni | ✅ |
| 25 | `/shop`: catalogo con filtri (famiglia, misura WR, linea), ricerca, schede con SVG/codice/WR/banda/prezzo/disponibilità; banner demo | ✅ |
| 26 | `/shop/[handle]`: tabella tecnica, prezzi per quantità, selettore quantità, aggiungi al carrello, link variante su misura → preventivo precompilato; JSON-LD Product + Offer | ✅ |
| 27 | Carrello: pannello laterale (focus trap, Esc), contatore nell'header, persistenza `localStorage` | ✅ |
| 28 | Checkout 3 passi (tipo cliente, dati, riepilogo con spedizione per zona e IVA con regola spiegata), `lib/order.ts` (TODO), pagina di conferma; Shopify → `checkoutUrl` | ✅ |
| 29 | i18n IT/EN, meta title, sitemap, analytics `view_product`, `add_to_cart`, `begin_checkout`, `order_request_submit` | ✅ |
| 30 | Verifica: build, lint, check:alt, test Playwright percorso completo + screenshot 390/1440 IT/EN, script controllo link interni, accessibility review, riepilogo | ✅ |
