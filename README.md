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
| `npm run build` | build di produzione (44 pagine statiche IT/EN più le rotte `/api/quote`) |
| `npm run check:alt` | fallisce se trova `<img>`/`<Image>` senza `alt` nei sorgenti o nell'HTML generato |
| `npm run verify` | lint + build + check:alt |
| `BASE_URL=http://localhost:3000 npm run test:request` | Playwright: tabelle → "Configura" → configuratore → lunghezza e flange → 3D → PDF e STL → richiesta con 2 pezzi, note e 2 file → invio simulato → conferma (più invio fallito: dati conservati), IT/EN × 390/1440, screenshot in `screenshots/v2/` |
| `BASE_URL=http://localhost:3000 npm run check:links` | segue tutti i link interni da `/` e `/en` e fallisce se uno porta a una 404 |
| `BASE_URL=http://localhost:3000 npm run check:a11y` | axe-core (WCAG 2.1 AA) in tema chiaro e scuro: pagine, tabelle con filtro, configuratore, vista 3D, richiesta con errori |
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
| `NEXT_PUBLIC_DEMO` | `true` | badge "Versione demo" e segnaposto `[DA COMPLETARE]` in giallo |
| `QUOTE_TO_EMAIL` | `riccardo.pasquini2k8@gmail.com` | casella che riceve le richieste di preventivo |
| `QUOTE_FROM_EMAIL` | `onboarding@resend.dev` (Resend) / `SMTP_USER` | mittente; con Resend un indirizzo del dominio verificato |
| `RESEND_API_KEY` | vuota | invio con Resend (consigliato). Solo server |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | vuote, porta 587 | invio SMTP con nodemailer, usato solo se manca `RESEND_API_KEY` |
| `QUOTE_WEBHOOK_URL` | vuota | facoltativa: la stessa richiesta in JSON al futuro gestionale |
| `BLOB_READ_WRITE_TOKEN` | vuota | facoltativa: file oltre 4 MB in totale caricati su Vercel Blob (link nella mail) |

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

## Modifiche v2 (riunione del 7 ottobre 2026)

Principio del titolare: **niente acquisto diretto**, ogni ordine è una richiesta di preventivo. Il piano è in [PLAN.md](PLAN.md) (fase 3).

### Testi e dati
- Slogan "Guidiamo le microonde" senza anno; **fondazione 1987** ovunque: intro, hero, storia, JSON-LD `foundingDate`.
- Tolti Siemens, "in casa", "sotto lo stesso tetto". Al loro posto: "In collaborazione con le più grandi aziende di telecomunicazioni" e "Progettiamo, costruiamo e collaudiamo i nostri componenti".
- Contatti: cellulare **+39 375 577 1084** per primo, fisso +39 0382 75385, PEC **tecnolambrosnc@pec.it** (contatti, footer, JSON-LD).
- Altre formule:
  - "Preventivo entro 24 ore" ovunque.
  - "Prezzi su richiesta: ogni preventivo è personalizzato".
  - "Materiale disponibile a magazzino: spedizione in 48 ore".
  - "Spedizione in tutto il mondo: modalità e costi indicati nel preventivo".
- Come lavoriamo: progettazione → produzione → **Trattamenti** (un solo blocco) → **Collaudo finale al 100%**.

### Famiglie e redirect
- Le famiglie stanno in [src/data/families.ts](src/data/families.ts):
  - guida d'onda flessibile **twistabile**;
  - guida d'onda flessibile **seamless**;
  - **curve, twist e disassati** (su richiesta, senza tabella);
  - una quarta famiglia nascosta (`hidden: true`), `[FAMIGLIA DA DEFINIRE]`.

  Per aggiungerne una basta una voce lì e i testi in `products.items`.
- Tolti illuminatori, il prodotto QO-100, elettroformati e la parola "rigida". Tolte anche transizioni e flange/kit: erano famiglie con dati dimostrativi, non pezzi "su richiesta".
- Redirect 308 in [next.config.ts](next.config.ts), dalle famiglie vecchie, dalle 12 schede del vecchio shop e da `/shop/ordine`.
- Radioamatori: la pagina resta, senza illuminatore e QO-100. Porta al configuratore con WR-90 o WR-75 già scelte.

### Tabelle tecniche (`/prodotti/tabelle`, `/en/products/tables`, e dentro ogni famiglia)
- Dati tipizzati in [src/data/waveguides.ts](src/data/waveguides.ts): twistabile, seamless, dimensioni TLFX.
- **Da verificare con l'ufficio tecnico Tecnolambro:** i valori sono trascritti a mano da un'immagine a bassa risoluzione. In `public/brand/` non c'è l'originale da confrontare.
- Struttura delle tabelle:
  - tab accessibili;
  - colonna della misura fissa (WR in evidenza, sotto IEC R e WG);
  - intestazioni raggruppate con le unità;
  - numeri a destra in `tabular-nums`, virgola in IT e punto in EN;
  - "—" per i valori mancanti, "Su richiesta" per seamless WR-34 e WR-159.
- Funzioni:
  - filtro in GHz che evidenzia le misure;
  - "Configura" su ogni riga;
  - scheda tecnica PDF generata dai dati;
  - disegno quotato SVG nel tab Dimensioni.
- Su telefono la tabella scorre dentro il suo contenitore: la pagina non scorre mai di lato (verificato dal test).

### Configura il tuo pezzo (`/shop`) e La tua richiesta (`/shop/richiesta`)
- **Prodotti pronti**: le 14 misure × twistabile e seamless, con filtri tipo, misura e frequenza. Il badge "Disponibile a magazzino" si attiva in `STOCK` (`families.ts`); di default non c'è su nessuna misura.
- **Componi il pezzo**, a passi:
  1. tipo;
  2. misura dall'elenco o "dimmi la frequenza";
  3. lunghezza con scorciatoie 300/600/1000, avviso oltre il limite della tabella;
  4. flange A e B da [src/data/flanges.ts](src/data/flanges.ts) `[DA CONFERMARE]`;
  5. opzioni `[DA CONFERMARE]`, nascoste finché non vengono confermate.
- **Riepilogo** sempre visibile (a destra su desktop, sotto su telefono): codice leggibile `TLFX-100 · TWIST · L600 · UBR100/PBR100` e dati elettrici della misura.
- **Disegno 2D**:
  - si genera in [src/lib/drawing.ts](src/lib/drawing.ts), con quote reali dalla tabella e la scritta "Disegno indicativo – il disegno definitivo arriva con il preventivo";
  - cartiglio con logo, codice, materiale e data.
- **Vista 3D** ([src/lib/waveguide3d.ts](src/lib/waveguide3d.ts)): guida corrugata in ottone con flange, ruotabile con mouse e dita. Three.js arriva solo con l'**import dinamico** al clic su "Vedi in 3D" (verificato: non è tra i JS iniziali di `/shop`).
- **Download** del disegno in PDF (pdf-lib) e del modello 3D in STL e GLB (exporter di Three.js). Si generano nel browser, con il codice nel nome del file. Ogni download ha il suo evento analytics.
- **La tua richiesta**:
  - lista nel `localStorage`, con quantità e note per pezzo e la voce "pezzo su disegno";
  - file STEP/STP, IGES/IGS, STL, PDF, DWG, DXF, più di uno, fino a 20 MB ciascuno;
  - dati del cliente, salvati come bozza: non si perdono se l'invio fallisce;
  - all'invio si allega anche il PDF del disegno di ogni pezzo configurato.
- **Conferma**: "Richiesta ricevuta. Ti rispondiamo con il preventivo entro 24 ore.", con il numero `TL-AAAA-NNNNNN`. Senza database il numero si ricava da data e ora, non è progressivo.
- Tolti prezzi, sconti, IVA, costi di spedizione, pagamento, carrello e il layer `lib/commerce` con Shopify.

## Invio delle richieste di preventivo (email)

La rotta [src/app/api/quote/route.ts](src/app/api/quote/route.ts) riceve configuratore, "La tua richiesta" e modulo contatti (stessa rotta). Cosa fa:

- valida di nuovo tutto sul server, con trappola anti-spam (campo `website`) e un limite di 5 richieste ogni 10 minuti per IP (in memoria, per singola istanza);
- manda all'ufficio un'email HTML leggibile con pezzi, codici, quantità, note, dati del cliente e allegati (file del cliente e PDF dei disegni);
- manda al cliente la conferma nella sua lingua;
- se è impostata `QUOTE_WEBHOOK_URL`, manda la stessa richiesta in JSON.

**Risposte della rotta** (verificate):

| Caso | Risposta |
|---|---|
| Richiesta valida | 200 con il numero |
| Dati non validi | 400 con i campi errati |
| Tipo di file non accettato | 400 |
| Corpo oltre 4,5 MB | 413 |
| Troppe richieste | 429 |
| Nessun servizio email configurato | 503 `notConfigured` |

In tutti i casi di errore il sito mostra il motivo e **non perde i dati inseriti**.

**Sicurezza (dopo la revisione del codice):**
- La conferma al cliente contiene solo codici e quantità, mai le note: il modulo non serve per mandare testi a indirizzi di terzi.
- Nella mail all'ufficio finiscono solo i link del proprio store Blob, nella cartella `richieste/`.
- Il token di caricamento si concede solo alle pagine del sito (controllo dell'Origin), con un massimo di 20 file per IP ogni ora.
- Il limite di frequenza è in memoria, quindi vale per singola istanza Vercel. Se arrivasse spam, aggiungere un limite condiviso (es. Upstash Redis dal Marketplace di Vercel) o Cloudflare Turnstile.
- Se `QUOTE_TO_EMAIL` non è impostata, le richieste vanno all'indirizzo indicato nel brief (`riccardo.pasquini2k8@gmail.com`). Al lancio impostarla esplicitamente (es. info@tecnolambro.it).

### Attivare Resend (consigliato)
1. Creare un account su [resend.com](https://resend.com).
2. **Domains → Add Domain**: aggiungere `tecnolambro.com` (o un sottodominio, es. `mail.tecnolambro.com`) e inserire nel DNS i record SPF, DKIM e MX indicati da Resend. Attendere lo stato "Verified".
3. **API Keys → Create API Key**, permesso "Sending access", limitata al dominio. Copiare la chiave (`re_…`): si vede una volta sola.
4. Su Vercel: **Project → Settings → Environment Variables**, ambiente *Production* (e *Preview* per provarla). Aggiungere:
   - `RESEND_API_KEY` = la chiave;
   - `QUOTE_TO_EMAIL` = `riccardo.pasquini2k8@gmail.com`;
   - `QUOTE_FROM_EMAIL` = `Tecnolambro <preventivi@tecnolambro.com>` (un indirizzo del dominio verificato).
5. **Deployments → Redeploy** (le variabili valgono dal deploy successivo). Provare una richiesta: in **Resend → Emails** si vede l'invio.

Senza dominio verificato Resend manda solo dall'indirizzo di prova `onboarding@resend.dev` e solo alla casella del proprietario dell'account: va bene per un test, non per il lancio.

### In alternativa: SMTP
Impostare `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS, 465 SSL), `SMTP_USER` e `SMTP_PASS` (es. la casella aziendale o il provider della PEC) e lasciare vuota `RESEND_API_KEY`.

### File grandi
Le funzioni Vercel accettano al massimo **4,5 MB** per richiesta. Fino a 4 MB complessivi i file viaggiano come allegati. Oltre, il browser li carica su **Vercel Blob** e nella mail arriva il link. Per attivarlo: Vercel → **Storage → Create → Blob** e collegarlo al progetto, che imposta `BLOB_READ_WRITE_TOKEN`. Senza Blob il sito spiega di mandare i file per email citando la richiesta.

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
  app/api/quote/            invio delle richieste (route.ts) e token per Vercel Blob (upload/route.ts)
  data/                     waveguides.ts (tabelle), families.ts, flanges.ts, faq.ts, todo.ts, site.ts, brand.ts
  lib/                      analytics.ts, quote*.ts (invio, validazione, email), request.ts (La tua richiesta),
                            part.ts (codice del pezzo), drawing.ts (disegno SVG), pdf.ts, waveguide3d.ts, seo.ts, motion.ts
  components/configurator/  Configurator, ReadyCatalog, TechDrawing, Viewer3D
  components/request/       RequestForm, RequestButton, RequestNumber, AddCustomButton
  components/tables/        SpecTables
messages/{it,en}.json       tutti i testi
public/brand/logo.png       logo originale
```

## Elenco `[DA COMPLETARE]`

L'elenco completo e aggiornato è in [src/data/todo.ts](src/data/todo.ts). Ogni voce corrisponde a un segnaposto visibile nel sito (giallo in demo):

1. **Certificazioni**: ISO 9001 e altre (ente, numero, scadenza, PDF), pagina `/qualita` e home.
2. **Controlli di laboratorio**: strumenti e parametri misurati.
3. **Foto reali** dall'officina di Miradolo Terme (home, `/azienda`).
4. **Tabelle tecniche**: verifica dei valori trascritti ([src/data/waveguides.ts](src/data/waveguides.ts)); **flange** reali per misura e **opzioni** del configuratore ([src/data/flanges.ts](src/data/flanges.ts)); misure **a magazzino** (`STOCK`); la **quarta famiglia**.
5. **FAQ**: tempi di consegna, quantità minime, spedizioni UE ed extra UE (Incoterms, dogana), materiali e finiture, documentazione di collaudo.
6. **Spedizioni**: corriere, Incoterms, documenti doganali.
7. **Storia**: eventuali date successive al 1987 da pubblicare.
8. **Legale**: revisione di privacy, termini e cookie (sono bozze), tempi di conservazione, nomi dei fornitori (Vercel, Resend), foro competente.
9. **Email**: chiave Resend (o SMTP) e dominio verificato su Vercel (vedi "Invio delle richieste").
10. **Orari** della sede operativa (pagina contatti e JSON-LD `LocalBusiness`).

## Decisioni

- **Cartella nuova, design da zero.** Su richiesta del cliente non sono state usate come riferimento né le versioni precedenti del sito né l'anteprima "Tecnolambro Premium". Dai materiali esistenti è stato preso solo il logo.
- **Palette dal logo (fase 2).** Colori estratti con uno script e non scelti a occhio (vedi "Colori del logo"). Primario il blu `#0070bd`, secondario il grigio `#a1adb7`, un solo accento per le CTA (`#0066cc`, il blu del logo più saturo, AA). Ottone eliminato. **Tema chiaro predefinito**; lo scuro usa gli stessi colori schiariti. Il rosso e verde del tricolore restano solo nel logo, per non avere due accenti.
- **Nessun colore scritto a mano.** Componenti, intro, canvas TE10, SVG e immagine Open Graph usano i token. I contesti senza CSS (`theme-color`, OG image, fallback del canvas) leggono [src/data/brand.ts](src/data/brand.ts), allineato a `globals.css`. Verifica: nessun esadecimale né classe della palette Tailwind fuori da `globals.css` e `brand.ts`.
- **Shop → richiesta di preventivo (v2).** Fase 2 aveva uno shop con prezzi, carrello e checkout; dopo la riunione del 7 ottobre ogni ordine è una richiesta di preventivo: `/shop` è il configuratore, la lista "La tua richiesta" si salva nel browser e il codice 3D/PDF si carica solo quando serve.
- **`frontend-design` non installata**: al suo posto si usano `design-taste-frontend`, `design:design-system` (audit dei token) e `design:accessibility-review` (axe-core su chiaro e scuro).
- **Logo nel footer**: il PNG ha lo sfondo bianco, quindi sta su una targhetta chiara (`--c-plate`) leggibile in entrambi i temi.
- **Tipografia.** Archivo variabile con asse `wdth` (122-125% per i titoli, 62% per gli accenti), IBM Plex Sans per il testo, IBM Plex Mono con cifre tabulari per i dati. Scala fluida con `clamp()` in `@theme`.
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
