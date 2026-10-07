# Tecnolambro Microwave Components — sito vetrina

Sito IT/EN per Tecnolambro S.a.s. di Marco Pasquini & C. (Miradolo Terme, PV): guide d'onda e componenti a microonde.
Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · GSAP 3.15 · Lenis · next-intl.
Realizzato e gestito da LIMITLESS.

## Avvio

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
npm run build && npm start
```

Script utili:

| Script | Cosa fa |
|---|---|
| `npm run lint` | ESLint (config Next) |
| `npm run build` | build di produzione (70 pagine statiche IT/EN, shop compreso) |
| `npm run check:alt` | fallisce se trova `<img>`/`<Image>` senza `alt` nei sorgenti o nell'HTML generato |
| `npm run verify` | lint + test commerce + build + check:alt |
| `npm run test:commerce` | test del provider Shopify con dati finti (`node --test`) |
| `BASE_URL=http://localhost:3000 npm run test:shop` | Playwright: catalogo → filtro → scheda → 5 pezzi → checkout "azienda UE" → conferma, IT/EN × 390/1440, screenshot in `screenshots/shop/` |
| `BASE_URL=http://localhost:3000 npm run check:links` | segue tutti i link interni da `/` e `/en` e fallisce se uno porta a una 404 |
| `BASE_URL=http://localhost:3000 npm run check:a11y` | axe-core (WCAG 2.1 AA) in tema chiaro e scuro, con carrello aperto e checkout |
| `npm run colors:logo` | estrae i colori reali da `public/brand/logo.png` |
| `BASE_URL=http://localhost:3000 npm run screenshots` | screenshot Playwright di tutte le pagine, 390×844 e 1440×900, IT ed EN, in `screenshots/` |
| `BASE_URL=http://localhost:3000 node scripts/lighthouse.mjs /` | Lighthouse mobile, report in `lighthouse/` |

> **Nota ambiente (solo su questa macchina, dentro la sandbox di Claude):** il binario nativo di SWC usato dal plugin next-intl non riusciva a scrivere la sua cache in `%LOCALAPPDATA%\swc`. Se `next build` fallisce con `ERR_SWC_NATIVE_CACHE`, lanciare con `SWC_NATIVE_BINDING_CACHE=.swc-cache` (cartella già ignorata). Da un terminale normale non dovrebbe servire.

## Variabili d'ambiente

| Variabile | Default | Note |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://www.tecnolambro.com` | canonical, hreflang, sitemap, Open Graph |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `false` | `false` = `noindex` globale + robots.txt `Disallow: /`. **Mettere a `true` solo al lancio.** |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | vuota | se vuota non viene caricato nessuno script di analytics |
| `NEXT_PUBLIC_LIMITLESS_URL` | `https://www.limitlessmedia.it` | credito nel footer |
| `NEXT_PUBLIC_DEMO` | `true` | badge "Versione demo", segnaposto `[DA COMPLETARE]` in giallo e avviso "Prezzi e prodotti dimostrativi" nello shop |
| `SHOPIFY_STORE_DOMAIN` | vuota | con il token sotto attiva il provider Shopify (solo server) |
| `SHOPIFY_STOREFRONT_TOKEN` | vuota | token della Storefront API (solo server, mai `NEXT_PUBLIC_`) |

## Colori del logo

Estratti con `npm run colors:logo` ([scripts/extract-logo-colors.mjs](scripts/extract-logo-colors.mjs): sharp + k-means sui pixel di `public/brand/logo.png`, esclusi trasparenze e bianco):

| Colore | Hex | Quota dei pixel | Uso |
|---|---|---|---|
| Blu del logo | `#0070bd` | 36,1% | **primario** (`--logo-blue`, `--c-primary` nel tema chiaro) |
| Grigio-azzurro della guida corrugata | `#a1adb7` | 17,0% | **secondario** (`--logo-grey`, `--c-secondary`) |
| Grafite del testo | `#3c404c` | 11,0% | riferimento per il testo (`--logo-graphite`) |
| Blu medio | `#296ea3` | 7,1% | sfumatura del blu, non usata come token |
| Grigio caldo (antialiasing) | `#c9c3bd` | 10,7% | non usato |
| Grigio chiaro | `#d9e4e5` | 10,6% | non usato |
| Rosso del tricolore | `#e33e25` | 4,3% | non usato (solo nel logo) |
| Verde del tricolore | `#0aa250` | 3,1% | non usato (solo nel logo) |

Token derivati (in [globals.css](src/app/globals.css), copia per i contesti senza CSS in [src/data/brand.ts](src/data/brand.ts)):

| Token | Chiaro (predefinito) | Scuro | Contrasto |
|---|---|---|---|
| `--c-bg` | `#f5f8fa` | `#09121a` | — |
| `--c-fg` testo | `#171e2c` | `#ebf0f4` | 15,7:1 / 16,4:1 |
| `--c-muted` testo secondario | `#495765` | `#99a9b8` | 7,0:1 / 7,8:1 |
| `--c-primary` blu logo | `#0070bd` | `#55ade7` | 4,9:1 / 7,6:1 |
| `--c-primary-ink` testo piccolo blu | `#005fa3` | `#55ade7` | 5,5:1 su superficie-2 |
| `--c-accent` **unico accento CTA** | `#0066cc` | `#3daef5` | testo sul bottone 5,45:1 / 7,7:1 |
| `--c-line-strong` bordi dei campi | `#6e8191` | `#5e778d` | 3,8:1 / 4,0:1 (≥ 3:1 per i componenti) |

I neutri sono tutti tinti sulla tonalità 207-210 del blu del logo. L'**ottone è stato eliminato**: con il blu e grigio del logo non si accordava. Il campo TE10 disegna E > 0 nel blu del logo ed E < 0 nel grigio del logo.

## Shop (`/shop`, `/en/shop`)

- **Catalogo** con filtri per famiglia (guida rigida, flessibile, curve, twist, transizioni, flange e kit, radioamatori), misura WR e linea (professionale / radioamatori), più ricerca per codice o nome. I filtri stanno nell'URL (`?famiglia=&misura=&linea=&q=`): dalla pagina Radioamatori lo shop si apre già filtrato.
- **Scheda** `/shop/[handle]`: disegno SVG del pezzo con la sua misura, tabella tecnica, prezzi per quantità (1-4 listino, 5-9 −8%, 10+ −15%), quantità con etichette, "Aggiungi al carrello", "Mi serve una variante su misura" (apre il preventivo con misura, famiglia e codice già compilati). JSON-LD `Product` + `Offer`.
- **Carrello** in un `<dialog>` laterale (focus intrappolato, Esc, sfondo inerte), aperto dal pulsante con il contatore nell'header, salvato nel `localStorage`.
- **Ordine** in 3 passi (`/shop/ordine`, `/en/shop/order`):
  1. tipo di cliente;
  2. dati, con P.IVA per le aziende e SDI o PEC solo per le aziende italiane, ed errori accanto al campo;
  3. riepilogo con spedizione per zona (12 / 25 / 45 €, dimostrativi) e IVA con la regola applicata spiegata:

  | Cliente | IVA |
  |---|---|
  | Azienda e privato Italia | 22% |
  | Privato UE | 22% |
  | Azienda UE | 0%, inversione contabile |
  | Fuori UE | 0%, export |

  Con il provider locale non si incassa: parte una **richiesta d'ordine** ([lib/order.ts](src/lib/order.ts), da collegare) e si arriva alla pagina di conferma con i prossimi passi.
- **Analytics**: `view_product`, `add_to_cart`, `begin_checkout`, `order_request_submit` (nessun dato personale).
- **SEO**: title `Shop guide d’onda e componenti | Tecnolambro` e `[Nome] [WR] | Tecnolambro Shop`; catalogo e schede in sitemap; ordine e conferma `noindex`.

### Architettura commerce

```
src/lib/commerce/
  types.ts      Product, Variant, Cart, CartLine, CheckoutResult
  provider.ts   interfaccia: listProducts, getProduct, createCart, getCart, addLine, updateLine, removeLine, checkout
  local.ts      dati di src/data/products.ts + carrello nel localStorage
  shopify.ts    Storefront API (prodotti, carrello, checkoutUrl) — pronto, con TODO
  index.ts      UNICO punto di scelta: Shopify se ci sono SHOPIFY_STORE_DOMAIN e SHOPIFY_STOREFRONT_TOKEN
  pricing.ts    scaglioni di prezzo · tax.ts  zone di spedizione e regole IVA
src/app/actions/cart.ts   server action del carrello per Shopify (il token resta sul server)
```

Le pagine dipendono solo da `CommerceProvider`: per passare a Shopify non si tocca nessuna pagina.

### Collegare Shopify

1. Creare lo store e un'app con accesso alla **Storefront API**; impostare `SHOPIFY_STORE_DOMAIN` (es. `tecnolambro.myshopify.com`) e `SHOPIFY_STOREFRONT_TOKEN` sul server.
2. Creare i metafield prodotto `tecnolambro.*`: `code`, `family`, `line`, `drawing`, `wr`, `band_min`, `band_max`, `length`, `flanges`, `material`, `vswr`, `demo`. Poi importare i prodotti con gli stessi `handle` di `src/data/products.ts`.
3. Traduzioni EN con Translate & Adapt (il provider usa `@inContext(language:)`).
4. Sconti per quantità con "volume pricing" (Shopify B2B) o con uno sconto automatico (5-9 pz −8%, 10+ −15%).
5. IVA, inversione contabile per aziende UE (app di validazione P.IVA), export e spedizioni si configurano in Shopify: il checkout ospitato li applica e il pulsante finale porta al `checkoutUrl`.
6. Verificare `API_VERSION` in `shopify.ts` e lanciare `npm run test:commerce`.

## Struttura

```
src/
  app/[locale]/…            pagine IT (/) ed EN (/en, slug tradotti: /en/products, /en/custom…)
  app/{robots,sitemap}.ts   robots e sitemap con alternates
  app/not-found.tsx         404 globale; app/[locale]/not-found.tsx = 404 "Segnale perso"
  proxy.ts                  next-intl (Next 16: "middleware" si chiama "proxy")
  components/motion/        SplitReveal, ScrambleText, Reveal, Stagger, PinnedSteps, HorizontalScroll,
                            Marquee, TiltCard, MagneticButton, ParallaxLayer, ScrollProgress, Counter,
                            PageTransition, CursorFollower, DrawUnderline, SmoothScroll (Lenis)
  components/domain/        Intro, TE10Field, BandFinder, ExplodedPart, PartDrawings, QuoteForm,
                            FaqAccordion, SignalLost
  components/sections/      sezioni della home e blocchi riusati
  components/ui/            Header, Footer, LanguageSwitcher, ThemeToggle, MotionToggle, JsonLd, Bits…
  data/                     bands.ts (WR standard), products.ts, faq.ts, todo.ts, site.ts
  lib/                      analytics.ts (track), quote.ts (invio form), order.ts (richiesta d'ordine), seo.ts, motion.ts, gsap-core.ts
  lib/commerce/             livello commerce (vedi "Shop")
  components/shop/          catalogo, scheda, carrello, checkout
messages/{it,en}.json       tutti i testi
public/brand/logo.png       logo originale
```

## Elenco `[DA COMPLETARE]`

L'elenco completo e aggiornato è in [src/data/todo.ts](src/data/todo.ts). Ogni voce corrisponde a un segnaposto visibile nel sito (giallo in demo):

1. **Certificazioni**: ISO 9001 e altre (ente, numero, scadenza, PDF), pagina `/qualita` e home.
2. **Controlli di laboratorio**: strumenti e parametri misurati.
3. **Foto reali** dall'officina di Miradolo Terme (home, `/azienda`).
4. **Dati tecnici reali** delle tabelle prodotto (ora "Dati dimostrativi"): misure, flange, VSWR, lunghezze.
5. **FAQ**: tempi di consegna, quantità minime, spedizioni UE ed extra UE (Incoterms, dogana), materiali e finiture, documentazione di collaudo.
6. **Radioamatori**: prodotti 10 GHz / QO-100 confermati dal titolare.
7. **Storia**: eventuali date successive al 1986 da pubblicare.
8. **Legale**: revisione di privacy, termini e cookie (sono bozze), tempi di conservazione, nomi dei fornitori (hosting, invio form), foro competente.
9. **Form**: servizio di invio e casella di destinazione (vedi sotto).
10. **Shop**: codici, prezzi, dati tecnici e disponibilità reali dei 12 pezzi; tariffe di spedizione reali; canale per le richieste d'ordine (`lib/order.ts`); eventuale store Shopify.
11. **Orari** della sede operativa (pagina contatti e JSON-LD `LocalBusiness`).

## Collegare il form preventivo

Il form ([QuoteForm.tsx](src/components/domain/QuoteForm.tsx)) valida tutto lato client (campi obbligatori, email, quantità, frequenza 1-110 GHz, file PDF/DWG/DXF/STEP ≤ 20 MB, consenso privacy), mostra gli errori accanto al campo e chiama `submitQuote()` in [src/lib/quote.ts](src/lib/quote.ts). Oggi l'invio è **simulato** (in demo compare un avviso). Per attivarlo:

- **Formspree** (più rapido): creare il form, aggiungere `NEXT_PUBLIC_FORMSPREE_ID` e scommentare la `fetch` nel `TODO` di `quote.ts`. Gli allegati richiedono un piano a pagamento.
- **Resend** (consigliato per gli allegati): creare `src/app/api/quote/route.ts`, rifare la validazione lato server (tipo e dimensione del file), inviare a info@tecnolambro.it con l'allegato. Serve `RESEND_API_KEY` (variabile **non** pubblica).
- Contiene già un campo trappola anti-spam (`website`). Al lancio valutare anche un limite di richieste lato server.

L'evento analytics `quote_submit` parte solo dopo un invio riuscito, con proprietà non personali (famiglia, misura, presenza di un file).

## Decisioni

- **Cartella nuova, design da zero.** Su richiesta del cliente non sono state usate come riferimento né le versioni precedenti del sito né l'anteprima "Tecnolambro Premium". Dai materiali esistenti è stato preso solo il logo.
- **Palette dal logo (fase 2).** Colori estratti con uno script e non scelti a occhio (vedi "Colori del logo"). Primario il blu `#0070bd`, secondario il grigio `#a1adb7`, un solo accento per le CTA (`#0066cc`, il blu del logo più saturo, AA). Ottone eliminato. **Tema chiaro predefinito**; lo scuro usa gli stessi colori schiariti. Il rosso e verde del tricolore restano solo nel logo, per non avere due accenti.
- **Nessun colore scritto a mano.** Componenti, intro, canvas TE10, SVG e immagine Open Graph usano i token. I contesti senza CSS (`theme-color`, OG image, fallback del canvas) leggono [src/data/brand.ts](src/data/brand.ts), allineato a `globals.css`. Verifica: nessun esadecimale né classe della palette Tailwind fuori da `globals.css` e `brand.ts`.
- **Shop dentro il sito.** Rimossi `shop.tecnolambro.com` e `NEXT_PUBLIC_SHOP_URL`; tutte le CTA "Vai allo shop" portano a `/shop`. Il codice del carrello si carica solo al primo uso: all'avvio l'header legge solo il numero di pezzi salvato, per non pesare sulle prestazioni.
- **Prezzi a scaglioni ricalcolati dal catalogo.** Nel carrello si salvano solo variante e quantità; prezzi e nomi si ricalcolano sempre dai dati, così un listino aggiornato vale anche per i carrelli aperti.
- **IVA privati UE al 22%** come da brief (vendita a distanza sotto la soglia OSS di 10.000 €/anno). Oltre la soglia va applicata l'aliquota del paese del cliente: da verificare con il commercialista.
- **`frontend-design` non installata**: al suo posto si usano `design-taste-frontend`, `design:design-system` (audit dei token) e `design:accessibility-review` (axe-core su chiaro e scuro).
- **Logo nel footer**: il PNG ha lo sfondo bianco, quindi sta su una targhetta chiara (`--c-plate`) leggibile in entrambi i temi.
- **Tipografia.** Archivo variabile con asse `wdth` (122-125% per i titoli, 62% per l'accento "dal 1986."), IBM Plex Sans per il testo, IBM Plex Mono con cifre tabulari per i dati. Scala fluida con `clamp()` in `@theme`.
- **Raggi.** Tutto squadrato (2 px, stile disegno tecnico), solo i bottoni a pillola.
- **i18n.** next-intl con `localePrefix: "as-needed"` (italiano su `/`, inglese su `/en`), slug tradotti (`/prodotti/rigida` ↔ `/en/products/rigid`), nessun redirect automatico in base alla lingua del browser (URL stabili per SEO). Gli `hreflang` li generiamo noi da `NEXT_PUBLIC_SITE_URL` (`alternateLinks: false` nel proxy).
- **`cacheComponents` disattivato.** Next 16 lo propone di default; per un sito vetrina statico il rendering statico classico con `setRequestLocale` + `generateStaticParams` è più semplice e robusto con next-intl.
- **GSAP in differita.** GSAP 3.15 include gratis tutti i plugin (SplitText, ScrambleText, DrawSVG, MorphSVG, Flip); usiamo ScrollTrigger, SplitText, ScrambleText e DrawSVG. Per non appesantire il primo caricamento GSAP e Lenis si caricano con `import()` dinamico ([lib/motion.ts](src/lib/motion.ts)). Al posto di `useGSAP` di `@gsap/react` c'è `useLazyGSAP`: stessa semantica (tutto in un `gsap.context`, cleanup con `ctx.revert()`), più due cose: il setup parte solo quando la sezione arriva a una schermata dal viewport, e un solo `ScrollTrigger.refresh()` con debounce. `@gsap/react` resta installato, ma il hook non viene più importato.
- **Animazioni.** Si animano solo `transform` e opacità (opacità solo nell'intro e nelle transizioni), mai il testo sbiadito in attesa dello scroll. `gsap.matchMedia()` gestisce mobile/desktop e `prefers-reduced-motion`. Con reduced motion: nessuna intro animata (dissolvenza di 300 ms), canvas fermo, niente pin/scrub, Lenis spento. Marquee e campo TE10 hanno un bottone pausa (WCAG 2.2.2).
- **H1 dell'hero senza SplitText.** Dividere il titolo dopo l'idratazione creava un nuovo paint e ritardava l'LCP: l'H1 anima le sue due righe già renderizzate dal server.
- **Intro.** Uno script inline nel `<head>` decide prima del primo paint se mostrarla: solo all'atterraggio sulla home, una volta per sessione. `?nointro` la salta (utile per test e QA). Senza JS non compare mai; c'è un timeout di sicurezza a 7 s.
- **Anni di attività calcolati.** Il brief dice "39 anni" (calcolo del 2025); nel 2026 sono 40. Il valore si calcola dall'anno corrente al momento della build.
- **FAQ.** Accordion con `button` + `aria-expanded` + `aria-controls` e pannelli `hidden="until-found"` (trovabili con Cerca nella pagina). Senza JS le risposte restano aperte. I segnaposto sono tolti dal JSON-LD `FAQPage`.
- **Disegni SVG fatti a mano**, perché fanno parte del linguaggio richiesto (disegno tecnico). Le quote riportano solo dimensioni standard EIA/IEC (WR-90 22,86 × 10,16 mm ecc.), non dati Tecnolambro. Le icone sono di `lucide-react`, come da brief.
- **Fatturazione UE nelle FAQ.** Reverse charge con P.IVA comunitaria valida (VIES) ed export non imponibile: è normativa generale, non un dato aziendale.
- **Intestazioni di sicurezza** in `next.config.ts` (HSTS, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy). La CSP rigorosa va definita al deploy: gli script inline (tema, intro, JSON-LD) richiedono nonce o hash.

## Verifica (6 ottobre 2026)

- `npm run lint`: 0 errori, 0 warning.
- `npm run build`: ok, 40 pagine statiche (IT ed EN, 6 famiglie × 2 lingue, OG image per lingua).
- `npm run check:alt`: ok.
- Stati HTTP: pagine 200; `/prodotti/inesistente`, `/en/x` e `/x.png` rispondono 404; `/it/...` → redirect a `/...`.
- Overflow orizzontale a 390 px: nessuno su tutte le pagine controllate.
- Screenshot Playwright: 76 file in `screenshots/{it,en}/{390,1440}/`. Le pagine intere sono con reduced motion (layout finale), a cui si aggiunge la prima schermata della home con le animazioni.
- **Lighthouse mobile, home** (macchina locale, profilo mobile predefinito):
  - Accessibility **100**, Best Practices **100**, CLS **0**.
  - SEO **69** in modalità pre-lancio (noindex voluto); con `NEXT_PUBLIC_ALLOW_INDEXING=true` è **100**.
  - Performance: **mediana 95** su 6 giri (94-96, con un giro isolato a 86 per il rumore della macchina), LCP simulato 2,6 s, TBT circa 150 ms. Misura: `RUNS=6 BASE_URL=… node scripts/lighthouse.mjs /`.
  - Interventi che hanno portato da circa 75 a 95:
    - font self-hosted e alleggeriti con fontTools (da 160 a 111 KB);
    - GSAP e Lenis caricati con `import()` dinamico e animazioni preparate solo vicino al viewport;
    - next-intl tolto dal bundle client: traduzioni client senza ICU, percorsi localizzati calcolati sul server, `getPathname` riscritta senza `createNavigation`;
    - tracciamento analytics con un solo ascoltatore delegato (`data-track`);
    - intro senza SplitText né filtro blur, con l'onda calcolata in matematica pura;
    - sezioni della home e footer in boundary `<Suspense>` (idratazione a blocchi).
- Skill usate: modern-web-guidance, design-taste-frontend (`frontend-design` **non è installata**: usata questa al suo posto), design:design-system, design:ux-copy, searchfit-seo:translate-content, searchfit-seo:technical-seo, searchfit-seo:schema-markup, design:accessibility-review, design:design-critique, engineering:code-review. `on-page-seo` e `seo-check` non sono state lanciate separatamente: title (≤ 60), description (≤ 155), H1 unico, canonical, OG, Twitter card, `theme-color` e `lang` sono stati verificati con uno script sui file `messages` e sull'HTML generato.
- HawkScan (scansione DAST richiesta dall'hook di sessione) non eseguita: runtime `hawk` non installato e `HAWK_API_KEY` assente.

## Verifica fase 2 — colori del logo e shop (7 ottobre 2026)

- `npm run lint` 0 problemi · `npm run build` 70 pagine · `npm run check:alt` ok · `npm run test:commerce` 4/4 test Shopify con dati finti.
- `npm run test:shop`: percorso completo superato in IT ed EN, a 390×844 e 1440×900. Catalogo (12) → filtro "flessibile" (2) → scheda → 5 pezzi (−8%: 5 × 312,80 = 1.564,00 €) → azienda UE: IVA 0% con inversione contabile, spedizione 25 €, totale 1.589,00 € → conferma con numero di richiesta. Screenshot di ogni passo in `screenshots/shop/`.
- `npm run check:links`: 150 pagine visitate a partire da `/` e `/en`, nessun link interno verso una 404.
- `npm run check:a11y`: axe-core WCAG 2.1 AA senza violazioni in tema chiaro e scuro, compresi carrello aperto e checkout con errori. Corretti due problemi esistenti: opacità dei passi non attivi (contrasto) e marquee non raggiungibile da tastiera con reduced motion.
- `npm run screenshots`: 88 screenshot (tutte le pagine, shop compreso, 390/1440 × IT/EN).
- Lighthouse mobile, mediana di 3 giri: home **95**, shop **95**; Accessibility 100, Best Practices 100.
- Audit dei token: nessun colore esadecimale né classe della palette Tailwind fuori da `globals.css` e `src/data/brand.ts`.
