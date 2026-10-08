# Lavoro della notte (8–9 ottobre 2026)

Branch `modifiche-v2`. Niente merge su `main` e niente pubblicazione in produzione. Ogni sotto-punto ha il suo commit.

> **Traduzioni ES/ZH/DE da far rivedere a un madrelingua prima della messa online.**
> Finché non sono riviste, metti `NEXT_PUBLIC_NEW_LOCALES_NOINDEX=true` su Vercel: le pagine `/es`, `/zh` e `/de` restano in `noindex` e fuori da sitemap e hreflang.

## In breve

| Blocco | Stato | Commit |
|---|---|---|
| A · Sito in spagnolo, cinese e tedesco | fatto | 069f7b5, 715c1da, 67a26ff, bc77ed2, 73654ba |
| B · Spot 3D provvisorio | fatto (i video sono solo in locale, vedi sotto) | 8ddb382 |
| C · Schede tecniche PDF | fatto | af2cd19 |
| Verifica finale | fatta: tutto ok, tranne Lighthouse sulla home cinese (77) | 73654ba, b0246f7 |

## A · Sito in 5 lingue

**Fatto**
- Traduzioni complete in spagnolo, cinese semplificato (zh-Hans) e tedesco, con circa 830 testi per lingua. Comprendono:
  - pagine, metadati, JSON-LD e FAQ;
  - configuratore, pagina richiesta e pagina di conferma;
  - email al cliente e PDF di riepilogo.

  Glossario tecnico in `messages/glossario.md`.
- **Indirizzi:**
  - prefissi `/es`, `/zh` e `/de`;
  - slug tradotti in spagnolo e tedesco (es. `/de/shop/anfrage`), slug inglesi per il cinese;
  - hreflang per le 5 lingue più x-default, e sitemap.
- **Selettore e banner:**
  - selettore IT · EN · ES · 中文 · DE nell'header e nel menu mobile;
  - banner che propone la lingua del browser, senza nessun redirect automatico.
- **Cinese:**
  - font di sistema (PingFang, Microsoft YaHei, Noto Sans CJK);
  - niente corsivo, sostituito dal grassetto;
  - punteggiatura cinese e punto decimale.
- **Email:** quella all'ufficio resta in italiano; quella al cliente è nella sua lingua.
- **Controlli:** `npm run i18n:check` controlla chiavi mancanti, segnaposto ICU e tag; `scripts/i18n-pages.mjs` fa il controllo Playwright per lingua.
- **Titolo della home su telefono:** "MIKROWELLEN" (tedesco) e "MICROONDAS" (spagnolo) uscivano dal margine, e anche l'italiano a 320 px. Sotto i 640 px il corpo del titolo ora si adatta alla parola più lunga di ogni lingua.

**Non fatto o da sapere**
- Le traduzioni sono fatte da me (IA) e vanno riviste da un madrelingua, soprattutto:
  - le pagine legali (privacy e termini);
  - le email al cliente.
- Ho visto due volte un errore JavaScript intermittente sulla home cinese ("Cannot read properties of undefined (reading 'end')") durante il controllo automatico. Non sono riuscito a riprodurlo in 4 tentativi successivi e non blocca la pagina. Da tenere d'occhio nella console della preview.

## B · Spot 3D provvisorio

Cartella `video/spot-3d/`. I sorgenti sono in git; i video si trovano solo sul tuo PC perché pesano 20 MB l'uno e si rigenerano con gli script.

| File | Dettagli |
|---|---|
| `video/spot-3d/out/tecnolambro-spot-3d-9x16.mp4` | 1080×1920, 26,4 s, H.264 High, yuv420p, 30 fps, AAC muto, 20,3 MB |
| `video/spot-3d/out/tecnolambro-spot-3d-16x9.mp4` | 1920×1080, stesso formato, 20,4 MB |
| `video/spot-3d/out/loop-twistable-1920x1080.mp4` / `.webm` | loop di 8 s senza testi, 0,7 MB / 1,0 MB, **non messo nel sito** |
| `video/spot-3d/out/cover-9x16.jpg`, `cover-16x9.jpg` | copertine |
| `video/spot-3d/out/contact-9x16.jpg`, `contact-16x9.jpg` | un fotogramma per beat con le safe zone |
| `video/spot-3d/out/ffprobe.json` | controllo tecnico finale (nessun beat nero) |

Costo zero: niente Higgsfield, niente servizi a pagamento. La geometria è quella del configuratore, l'HDRI è CC0 (Poly Haven) e i font sono OFL.

**Lista dei tagli (100 BPM, 1 beat = 0,6 s)**

| Da (s) | A (s) | Scena | Testo | Da sostituire con le riprese di sabato |
|---|---|---|---|---|
| 0,0 | 2,4 | 1 · Macro della corrugazione | — | **sì: officina** → `riprese/01-officina.mp4` |
| 2,4 | 4,8 | 2 · La twistabile si torce e si piega | "Guidiamo le *microonde*." | no |
| 4,8 | 7,2 | 3 · La flangia si svita e torna | "Dal *1987*." | **sì: mani che assemblano** → `riprese/03-mani.mp4` |
| 7,2 | 9,6 | 4 · Una curva E si costruisce | "Progettiamo. *Costruiamo.*" | **sì: fresatura** → `riprese/04-fresatura.mp4` |
| 9,6 | 12,0 | 5 · Twist a 90° e disassato | "*Collaudiamo* il 100%." | no |
| 12,0 | 15,6 | 6 · Carrellata sulle famiglie | "Da WR-22 a *WR-284*." | no |
| 15,6 | 18,0 | 7 · Raffica di dettagli | — | **sì: collaudo** → `riprese/07-collaudo.mp4` |
| 18,0 | 21,6 | 8 · Sezione con l'onda TE10 | "Diteci la frequenza. *Vi diciamo la guida.*" | no |
| 21,6 | 24,0 | 9 · Configuratore stilizzato | "Componilo in *3D*. Preventivo in 24 ore." | no |
| 24,0 | 26,4 | 10 · Logo, ISO 9001 · ISO 14001, tecnolambro.it | — | no |

I nomi esatti dei file sono in `video/spot-3d/config.json` → `scenes[].slot.real`. Per sostituire una scena:
1. Copia il video in `video/spot-3d/riprese/` con quel nome.
2. Lancia `python scripts/build.py`.

Il resto resta in 3D. Gira le riprese a 30 fps, in orizzontale **e** in verticale se puoi, almeno 3 s per scena.

**Da sapere**
- Il logo non contiene il ciano #3FC7D0 del brief. Ho usato il blu del logo schiarito (`#1aa0ff`) per la luce e il blu chiaro del sito per le parole chiave. È scritto nel README dello spot.
- Il video è muto: la musica va aggiunta nell'app, con un audio vicino ai 100 BPM.

## C · Schede tecniche PDF

- 95 PDF di una pagina in `public/schede/<lingua>/`: una scheda per ogni misura WR e una per ogni famiglia, in 5 lingue.
- Ogni scheda contiene:
  - logo, dati e disegno;
  - ISO 9001 · ISO 14001 (solo testo, niente loghi PJR o ACCREDIA);
  - contatti e QR alla pagina del sito.
- Pulsante "Scarica la scheda tecnica" nelle pagine WR, nelle tabelle e nelle pagine famiglia.
- **Generazione:** le schede si creano prima, non a richiesta, con `npm run datasheets` (Chromium in locale) e sono committate. Vercel non ha Chromium né i font cinesi, quindi **dopo ogni modifica a misure o testi va rilanciato `npm run datasheets`** e committato il risultato.
- I PDF riportano "Dati indicativi: i valori definitivi sono nel preventivo".

## Verifiche

Tutte eseguite sulla build di produzione (`NEXT_PUBLIC_DEMO=false`) con le email in modalità test: nessuna email vera è partita.

| Controllo | Risultato |
|---|---|
| `npm run build` | ok, 176 pagine |
| `npm run lint` | 0 errori (9 avvisi su variabili inutilizzate negli script dello spot e nei test) |
| `npm run i18n:check` | 0 errori, 0 avvisi |
| Segnaposto visibili | nessuno in 167 pagine, 5 lingue |
| Link interni | nessuno rotto in 549 pagine |
| Configuratore (e2e) | tutti i controlli superati |
| Richiesta (e2e, modalità test) | tutti i controlli superati |
| Telefono 390 px (home, shop, richiesta, /es, /zh, /de) | nessun problema di area tocco, sbordamento o console |
| Configuratore su telefono | barra fissa ok, WhatsApp nascosto con la barra, console pulita |
| Accessibilità (axe, WCAG 2.1 AA) | nessuna violazione |
| Titolo della home a 320, 360, 390 e 430 px | sta nello schermo in tutte e 5 le lingue |

**Lighthouse mobile della home** (Moto G Power, 4G lento, CPU 4×; mediana di 3 giri, 5 per il cinese):

| Lingua | Performance | LCP | Note |
|---|---|---|---|
| IT `/` | **90** | 3,4 s | Accessibilità 97: Lighthouse misura il contrasto della tagline mentre è a metà dell'animazione di entrata; axe, a pagina ferma, non trova problemi |
| ES `/es` | **92** | 3,4 s | |
| DE `/de` | **91** | 3,4 s | |
| ZH `/zh` | **77** ✗ | 3,4 s | sotto l'obiettivo di 85 |

Per ES, ZH e DE la voce SEO è 69 solo perché le pagine sono in `noindex` (voluto finché le traduzioni non sono riviste).

**Il cinese non arriva a 85.** Il JavaScript è lo stesso delle altre lingue: la differenza è un unico calcolo di layout di circa 650 ms (con CPU rallentata 4×) al primo disegno della pagina, quando Chromium carica il font cinese di sistema (Microsoft YaHei, un file di circa 20 MB). Sul layout passano 1,4 s contro i 0,4 s del tedesco. Non ho trovato una correzione sicura di notte. Le strade possibili:
1. Misurare con PageSpeed Insights sulla preview di Vercel, che gira su Linux con Noto Sans CJK: il valore reale potrebbe essere diverso da quello del mio PC Windows.
2. Rimandare il disegno delle sezioni sotto la piega (`content-visibility`) sulla home cinese. Va però provato con le animazioni allo scroll, che misurano le posizioni.

Screenshot:
- 390×844 e 1440×900 di home e `/shop` in ES, ZH e DE: `screenshots/lingue/`;
- ritocchi v4 su telefono: `screenshots/v4/`.

## Cosa devi controllare tu

1. **Traduzioni ES, ZH e DE:** falle rivedere a un madrelingua, a partire da home, shop, richiesta, privacy, termini e email al cliente. Fino ad allora tieni `NEXT_PUBLIC_NEW_LOCALES_NOINDEX=true`.
2. **Lo spot:** guarda i due MP4 e le contact sheet. Scegli se la palette blu va bene e prepara le 4 riprese di sabato (officina, mani che assemblano, fresatura, collaudo).
3. **Le schede tecniche:** aprine qualcuna, ad esempio `public/schede/it/wr-90.pdf` e `public/schede/zh/twistable.pdf`, e controlla dati e disegno.
4. **Privacy e termini:** vanno fatti vedere al consulente. Contengono i tempi di conservazione (24 mesi, 10 anni, 12 mesi) e il foro di Pavia.
5. **Dominio:** il sito ora usa `https://tecnolambro.it` come indirizzo principale. Se il dominio giusto è un altro, cambia `NEXT_PUBLIC_SITE_URL`.
6. **Vercel:**
   - non ho potuto collegare il repo `TECNOLAMBROO` né pubblicare la preview, perché Vercel non risulta loggato nel browser;
   - quando colleghi il progetto, inserisci tu `RESEND_API_KEY` (oppure `SMTP_PASS`) e le altre variabili;
   - la guida è in `docs/messa-online.md`.

## Domande per il titolare

1. **WR-22:** c'è un limite di lunghezza (ad esempio 3 ft) per la twistabile in WR-22? Oggi tutte le misure offrono 300, 600, 900, 1000 e 1200 mm e lunghezze libere da 100 a 3000 mm.
2. **Codici mancanti:** quali sono i codici TLFX per WR-34 e WR-159?
3. **Flange:** qual è l'elenco definitivo delle flange per ogni misura (UG, CPR, PDR, UBR…)?
4. **Guide rigide:** qual è lo spessore di parete standard? E il raggio di curvatura minimo per le curve E e H?
5. **Pagina azienda:** possiamo avere una frase del titolare da citare e qualche foto vera dell'officina e del collaudo?
6. **Famiglie:** c'è una quarta famiglia di prodotti da aggiungere (ad esempio transizioni o carichi)? Il catalogo è già pronto: basta aggiungere i dati (`docs/aggiungere-prodotti.md`).
7. **AR:** la vista in realtà aumentata su Android non è stata fatta. Serve?
