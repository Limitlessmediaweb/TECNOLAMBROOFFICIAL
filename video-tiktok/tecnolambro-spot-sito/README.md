# Spot del sito Tecnolambro – "schermi nella stanza buia"

Spot verticale 9:16 di **26,4 s** a **100 BPM** (1 beat = 0,6 s) per il lancio del nuovo sito Tecnolambro Microwave Components.

- **Stile:** `limitless-spot-sito` (variante "lancio sito del cliente"), con il metodo `limitless-spot-cinema`.
- **Obiettivo:** lancio e notorietà del sito.
- **Costo zero:**
  - Three.js (MIT), HDRI Poly Haven (CC0), Instrument Serif (OFL), Archivo (il font del sito).
  - Due clip Pexels gratuite per uso commerciale.
  - Niente Higgsfield, niente servizi o API a pagamento.

Il video è muto (traccia AAC silenziosa): la musica si aggiunge nell'app, con un audio vicino ai 100 BPM.

## Consegna

| File | Contenuto |
|---|---|
| `out/tecnolambro-spot-sito.mp4` | 1080×1920, 30 fps costanti, H.264 High, yuv420p, CRF 18, preset slow, AAC muto, `+faststart` |
| `out/cover.jpg` | copertina 1080×1920 con "Guide d'onda. *Su misura.*" |
| `out/contact-sheet.jpg` | un fotogramma per beat, con beat e secondi |
| `out/ffprobe.json` | controllo finale di risoluzione, fps, pix_fmt e durata |

## Lista dei tagli (secondi)

Tutti i tagli cadono sul beat. I pezzi durano 1, 2 o mezzo beat, oppure multipli di questi nei passaggi lenti.

| Da | A | Beat | Inquadratura | Sullo schermo | Testo |
|---|---|---|---|---|---|
| 0,0 | 2,4 | 0-4 | Laptop chiuso al buio, il coperchio si apre e lo schermo illumina il tavolo (3D) | intro del sito | — |
| 2,4 | 4,8 | 4-8 | Macro di taglio sullo schermo (griglia dei subpixel); **zoom-through** negli ultimi 0,3 s | hero, "dal 1986." | "Dal *1986.*" |
| 4,8 | 7,2 | 8-12 | Tre quarti, la camera scivola di lato (la clip si pulisce in 0,2 s) | hero | "Guide d'onda. *Su misura.*" |
| 7,2 | 9,6 | 12-16 | Tre quarti dall'altro lato | famiglie di prodotto | (continua) |
| 9,6 | 13,2 | 16-22 | Quasi frontale, lenta avanzata | ricerca per frequenza, slider da 5 a 30 GHz | "Dici la frequenza. *Ti diamo la misura.*" |
| 13,2 | 16,8 | 22-28 | Telefono in mano (stock), il dito tocca "Aggiungi al carrello" e si apre il carrello | scheda prodotto dello shop | "Lo *shop* è online." |
| 16,8 | 17,1 | 28-28,5 | Raffica: macro sul numero dei GHz | ricerca per frequenza | — |
| 17,1 | 17,4 | 28,5-29 | Raffica: telefono in mano | home al telefono | — |
| 17,4 | 17,7 | 29-29,5 | Raffica: macro sui disegni | prodotti | — |
| 17,7 | 18,0 | 29,5-30 | Raffica: telefono sul tavolo dall'alto | home al telefono | — |
| 18,0 | 18,3 | 30-30,5 | Raffica: laptop di tre quarti | shop filtrato | — |
| 18,3 | 18,6 | 30,5-31 | Raffica: laptop frontale | marchio dell'intro | — |
| 18,6 | 19,8 | 31-33 | Respiro: laptop, carrello aperto | shop | — |
| 19,8 | 22,8 | 33-38 | Telefono sul tavolo dall'alto (stock), il dito tocca "Invia", arriva "Richiesta ricevuta." | form del preventivo | "Preventivo in *24 ore.*" |
| 22,8 | 26,4 | 38-44 | Packshot: laptop frontale, logo sullo schermo, lenta avanzata; dissolvenza al nero negli ultimi 0,5 s | logo | "Ora *online* · tecnolambro.com" |

Il loop si chiude perché l'ultimo fotogramma è nero, come il primo (il laptop chiuso al buio).

## Contenuti veri usati

Dichiarati dal brief e presenti sul sito:

- dal 1986;
- Miradolo Terme;
- guida d'onda flessibile di produzione propria;
- costruzione su disegno;
- preventivo in 24 ore;
- sito in italiano e inglese.

Nel video non ci sono:

- numeri, clienti, premi o certificazioni inventati;
- la scritta "concept";
- la scritta LIMITLESS.

Prezzi e prodotti dello shop restano quelli **dimostrativi** del sito. Sullo schermo si vede il badge "Versione demo", che è vero. Prima di pubblicare va registrato di nuovo con i dati definitivi.

## Da dove arrivano le immagini

1. **Registrazioni del sito** (`scripts/record.mjs`), dalla build di produzione su `http://localhost:3211`, tema chiaro predefinito. Metodo: Chrome con finestra, CDP `Page.startScreencast` ricostruito a 30 fps costanti, scroll con eventi di rotellina (Lenis).

   Laptop, 1440×900 a DPR 2:

   | Clip | Contenuto |
   |---|---|
   | `intro` | intro (con `tl-intro-seen` cancellato) |
   | `hero` | hero |
   | `products` | famiglie di prodotto |
   | `bandfinder` | slider da 5 a 30 GHz |
   | `shop` | filtro "flessibili", scheda, "Aggiungi al carrello" |

   Telefono, 540×960 a DPR 2 con user agent iPhone:

   | Clip | Contenuto |
   |---|---|
   | `home-mobile` | scorrimento della home |
   | `shop-mobile` | scheda prodotto e tocco su "Aggiungi al carrello" |
   | `quote-mobile` | form compilato, descrizione scritta, privacy, tocco su "Invia la richiesta", conferma |

   Nel form ci sono dati di esempio: "Marco Bassi", "Radiolink Srl", `acquisti@radiolink.example`. Il sito è in versione demo, quindi non parte nessun invio.

2. **Stock** (`stock/`, fuori da git) per le inquadrature dei telefoni in mano:

   | File | Fonte | Autore | Licenza |
   |---|---|---|---|
   | `hand_phone_dark.mp4` | [Pexels 6611945](https://www.pexels.com/video/6611945/) | Tima Miroshnichenko | [Pexels License](https://www.pexels.com/license/), uso commerciale gratuito |
   | `phone_table_top.mp4` | [Pexels 6611954](https://www.pexels.com/video/6611954/) | Tima Miroshnichenko | [Pexels License](https://www.pexels.com/license/), uso commerciale gratuito |

3. **Scena 3D** (`3d/`, Three.js). Contiene:
   - un laptop generico senza marchio, in alluminio spazzolato;
   - un tavolo scuro che riflette;
   - una luce laterale e un controluce, la polvere nell'aria;
   - la luce dello schermo che illumina il tavolo e la tastiera.

   Il render è ad accumulo, 16 campioni per fotogramma: antialias, profondità di campo con lente sottile (frustum off-axis) e motion blur a 180°, con tone mapping AgX.

   Altri asset:
   - HDRI "Studio Small 09" da [Poly Haven](https://polyhaven.com/a/studio_small_09), CC0 (`3d/assets/studio.hdr`, fuori da git: si riscarica da Poly Haven);
   - font [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif), SIL OFL.

**Nota onesta sul set:** il laptop non è aperto da una mano. Una mano in 3D sarebbe sembrata finta, e lo stock gratuito non ha laptop con schermo verde in stanze buie: le clip trovate erano uffici chiari. Per questo il coperchio si apre da solo, al buio. Se Riccardo gira la ripresa vera (mano che apre un laptop al buio, luce blu di lato), sostituisce il pezzo 0-2,4 s.

## Compositing degli schermi dei telefoni

`scripts/track_screens.py` segue lo schermo bianco fotogramma per fotogramma con OpenCV:

1. soglia e chiusura morfologica, che unisce i tagli fatti dalle dita;
2. `minAreaRect` dell'inviluppo come punto di partenza;
3. una retta per ogni lato (`fitLine` Huber sui punti del bordo vicini al lato), angoli dalle intersezioni;
4. scarto dei quadrilateri fuori forma (il telefono è rigido: proporzioni e area costanti), interpolazione dei buchi e levigatura su ±3 fotogrammi.

Si usano solo le finestre con tracciamento pulito: 4,6-8,6 s per la mano, 16,6-21 s per il tavolo.

`scripts/composite_screens.py` ricostruisce la schermata del telefono:

- barra di stato in alto;
- la registrazione al centro;
- la barra di Safari con "tecnolambro.com" in basso: lo schermo dello stock è più alto del 9:16 della registrazione, e così niente viene stirato.

Poi la mette nello schermo con un'omografia:

- una **chiave di luminanza** dello stock tiene davanti al sito le dita e il notch;
- i bordi sono morbidi;
- la sfumatura di luce dello stock resta in parte;
- un riflesso diagonale della stanza va sopra in **screen blend al 12%**.

I tocchi sono sincronizzati: "Aggiungi al carrello" con il dito dello stock a 7,35 s, e "Invia" con il tocco a 17,9 s.

## Look

Le clip stock passano prima per un grade di base (`plates`: il tavolo di legno chiaro viene scurito e raffreddato). Poi un unico grade per tutto il video:

- neri profondi, curva S, ombre verso il blu;
- bloom leggero;
- vignettatura 0,3 e grana 0,02.

Il motion blur c'è solo nello zoom-through e nell'otturatore 3D. Niente glitch, light leak o testi che rimbalzano.

**Colore della luce:** il logo non ha un ciano. Il suo blu è `#0070bd` (tonalità 205°). La luce della stanza usa la stessa tonalità portata a luminosità 55%: **`#1aa0ff`**. La parola chiave dei testi usa `#3daef5`, l'accento del tema scuro del sito.

## Testi

- **Font:** grottesco Archivo 800 (il font del sito); una parola chiave per frase in Instrument Serif corsivo, colore `#3daef5`.
- **Lunghezza:** massimo 6 parole per schermata.
- **Safe zone TikTok** (controllata da `scripts/overlays.mjs`): niente nei primi 150 px, negli ultimi 380 px e negli ultimi 140 px a destra.
- **Posizione:**
  - sopra il laptop i titoli stanno nella fascia 25-35% dell'altezza;
  - nelle inquadrature dei telefoni la fascia 25-35% coprirebbe lo schermo con il sito, quindi il testo sta sopra il telefono ("Lo *shop* è online.", y 220-322) o sotto ("Preventivo in *24 ore.*", y 1390-1478), sempre dentro la safe zone.

## Struttura e comandi

```
config.json                  soggetto, BPM, palette, grade, takes 3D, comps, tagli (in beat), testi
riprese/                     registrazioni del sito (+ frames/, fuori da git)
stock/                       clip Pexels (fuori da git) + frames/
3d/                          index.html, main.js (motore), laptop.js, shots.js (inquadrature), assets/
render/                      render 3D, tracciamenti, controlli (fuori da git)
overlays/                    testi PNG (fuori da git)
out/                         video, copertina, contact sheet, ffprobe (fuori da git)
scripts/record.mjs           registrazioni del sito
scripts/track_screens.py     tracciamento degli schermi nello stock
scripts/composite_screens.py sito dentro gli schermi dei telefoni
scripts/render3d.mjs         render 3D (Chrome headless + WebGL), con server.mjs
scripts/overlays.mjs         testi
scripts/build.py             montaggio sul beat, look, export, copertina, contact sheet, ffprobe
```

Per rifare tutto:

1. Avvia il sito in produzione sulla porta 3211:

   ```bash
   npx next start --port 3211
   ```

   Prima serve la build, con `SWC_NATIVE_BINDING_CACHE=$PWD/.swc-cache npx next build`.
2. Registra le clip del sito:

   ```bash
   node scripts/record.mjs
   ```

3. Estrai i fotogrammi delle registrazioni in `riprese/frames/<clip>/%05d.jpg`. Le clip del laptop vanno a 2304×1440, quelle del telefono a risoluzione piena.
4. Estrai i fotogrammi dello stock in `stock/frames/<clip>/%04d.jpg`, a 30 fps:
   - la mano a 1080×1920;
   - il tavolo con altezza 1920.
5. Segui gli schermi nello stock:

   ```bash
   python scripts/track_screens.py
   ```

6. Disegna i testi:

   ```bash
   node scripts/overlays.mjs
   ```

7. Monta ed esporta:

   ```bash
   python scripts/build.py
   ```

   Per controllare singoli fotogrammi prima di montare: `python scripts/build.py --frames 1.8,6.6,15,21.6`.

Three.js 0.170 sta in `node_modules/three`, copiato da `limitless-v3/video-tiktok/spot-smartphone`.

## Caption

**Instagram**

> Il nuovo sito di Tecnolambro è online. Guide d'onda dal 1986, a Miradolo Terme: dite la frequenza e vi diamo la misura, preventivo in 24 ore, shop dei pezzi standard. In italiano e in inglese.
> tecnolambro.com
> #guidedonda #microonde #waveguide #madeinitaly #radiofrequenza

**LinkedIn**

> Tecnolambro Microwave Components ha un nuovo sito. Dal 1986 progettiamo e costruiamo guide d'onda a Miradolo Terme, compresa la guida d'onda flessibile di produzione propria e i pezzi costruiti su disegno. Sul sito si parte dalla frequenza di lavoro per trovare la misura giusta, si ordinano i pezzi standard dallo shop e si chiede un preventivo, con risposta entro 24 ore. In italiano e in inglese: tecnolambro.com
> #waveguide #microwave #RFengineering #madeinitaly #guidedonda

Il cliente è reale: prima di pubblicare sui profili LIMITLESS serve il permesso di Tecnolambro.
