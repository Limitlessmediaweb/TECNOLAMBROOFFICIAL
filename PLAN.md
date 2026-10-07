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

## Fase 3 — Modifiche v2 dopo la riunione del 7 ottobre (branch `modifiche-v2`)

Principio del titolare: **nessun acquisto diretto, ogni ordine è una richiesta di preventivo**. Nessun merge su `main`, nessuna pubblicazione.

### Interpretazioni (da confermare)
- **Transizioni e flange/kit** erano famiglie con tabelle dimostrative, non pezzi "su richiesta": le tolgo dalle famiglie (redirect 308 a `/prodotti`) e restano citabili nelle note della richiesta.
- La famiglia **"Costruzione su disegno"** (con l'elettroformatura in nichel) sparisce come famiglia: il servizio resta nella pagina `/su-misura`.
- **Radioamatori**: la pagina resta, senza illuminatore e prodotto QO-100. Parla di guida flessibile per i 10 GHz e porta al configuratore con la misura già scelta.
- **Numero di richiesta** `TL-AAAA-NNNNNN`: senza database non c'è una numerazione progressiva. Viene da data e ora, è unico in pratica e si legge al telefono.
- **File fino a 20 MB**: le funzioni Vercel accettano al massimo 4,5 MB per richiesta. Fino a 4 MB complessivi i file vanno allegati alla mail. Oltre, si caricano su Vercel Blob (se `BLOB_READ_WRITE_TOKEN` è impostato) e nella mail arriva il link. Senza Blob compare un messaggio chiaro con l'alternativa email.

### Passi
1. **Dati**
   - `src/data/waveguides.ts`: misure (IEC R, EIA WR, DEF WG), tabelle Twistabile, Seamless e Dimensioni TLFX, dimensioni interne standard EIA. Il file porta l'avviso "Da verificare con l'ufficio tecnico Tecnolambro".
   - `src/data/families.ts`: 3 famiglie visibili e 1 nascosta (`hidden`), con il flag `configurable`.
   - `src/data/flanges.ts`: tipi di flangia e opzioni `[DA CONFERMARE]`.
   - `site.ts`: fondazione 1987, cellulare per primo, PEC.
2. **Testi IT/EN**
   - Slogan senza anno, 1987 ovunque, niente Siemens, "in casa" e "sotto lo stesso tetto".
   - Fornitori storici, contatti nuovi, "entro 24 ore", "Prezzi su richiesta", magazzino 48 ore.
   - Nuovo titolo della ricerca per frequenza; il titolo "Avete un disegno…" è tolto.
   - "Come lavoriamo" in 4 blocchi: progettazione, produzione, trattamenti, collaudo finale al 100%.
3. **Rotte e redirect 308**
   - Nuove: `/prodotti/tabelle` (EN `/products/tables`), `/shop/richiesta` (EN `/shop/request`), `/shop/richiesta-inviata` (EN `/shop/request-sent`).
   - Redirect dalle famiglie tolte o rinominate, dalle schede `/shop/[handle]` e da `/shop/ordine`.
4. **Tabelle tecniche moderne** (`SpecTables`)
   - Tab Twistabile / Seamless / Dimensioni, colonna WR fissa con IEC e WG.
   - Intestazioni raggruppate con unità, `tabular-nums` e decimali per lingua.
   - Filtro in GHz, pulsante "Configura" su ogni riga, scheda tecnica PDF generata dai dati.
   - Disegno SVG quotato della guida flessibile.
5. **Shop → "Configura il tuo pezzo"**
   - Catalogo "Prodotti pronti" con filtri per famiglia, misura e GHz.
   - Configuratore a passi: tipo, misura o frequenza, lunghezza, flange A e B, opzioni.
   - Riepilogo sempre visibile con codice e dati elettrici.
   - Disegno 2D quotato con cartiglio; vista 3D Three.js con import dinamico; download di PDF, STL e GLB.
   - "La tua richiesta" in localStorage: quantità, note, file, dati cliente, invio, conferma.
6. **Invio**
   - `app/api/quote/route.ts`: email HTML a `QUOTE_TO_EMAIL` con allegati e PDF dei disegni, conferma al cliente.
   - Resend via REST, poi SMTP con nodemailer; webhook JSON facoltativo.
   - Validazione lato server, honeypot e limite di frequenza.
   - Anche il form di contatto usa la stessa rotta.
7. **Pulizia**
   - Tolti `lib/commerce`, carrello, checkout, Shopify, prezzi, IVA, filtro "Linea".
   - Ricerca delle parole vietate.
8. **Verifica e consegna**
   - lint, build, `check:alt`, link e redirect.
   - Nuovo test Playwright del percorso tabella → configuratore → 3D → download → richiesta → invio simulato → conferma.
   - Screenshot 390/1440 IT/EN, Lighthouse mobile su home e `/shop`.
   - README con i passaggi Resend/Vercel, commit su `modifiche-v2`.

### Skill
- `frontend-design` non è installata: uso `design-taste-frontend` (come nelle fasi precedenti).
- `searchfit-seo:on-page-seo` per title, description, H1 e link interni delle pagine nuove (keyword "guida d'onda flessibile" / "flexible waveguide").
- `design:ux-copy` per i testi; alla fine `design:accessibility-review` ed `engineering:code-review`.

### Stato (8 ottobre 2026)
- ✅ Passi 1-8 completati.
- Verifica: lint 0 problemi, build ok, `check:alt` ok, `check:links` ok su 102 pagine, redirect 308 ok, `check:a11y` 0 violazioni (chiaro e scuro).
- `test:request` superato IT/EN × 390/1440.
- Lighthouse mobile: home 91, `/shop` 92, Accessibility 100. Three.js e pdf-lib non sono nel JS iniziale.
- Revisione del codice (agente separato): corretti caricamento su Blob, conferma al cliente, lunghezza del 3D, link Blob, numero della richiesta, risorse WebGL, errori di download.
- In sospeso col titolare: verifica dei valori delle tabelle, flange e opzioni, quarta famiglia, misure a magazzino, chiave Resend o SMTP su Vercel.
