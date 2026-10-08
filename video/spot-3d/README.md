# Spot 3D provvisorio dei prodotti Tecnolambro

Spot di **26,4 s a 100 BPM** (1 beat = 0,6 s) fatto **solo con i modelli 3D del configuratore del sito**, in attesa delle riprese vere di sabato. Ogni scena è uno *slot*: si sostituisce con il video reale senza rifare il resto.

- **Stile:** `limitless-spot-prodotto` (still life da studio: luce radente, rotazioni lente, pochi testi), con il metodo `limitless-spot-cinema`.
- **Costo zero:** nessun servizio a pagamento, niente Higgsfield, niente modelli scaricati.
- **Geometria:** è la stessa del sito. [`src/lib/part3d.ts`](../../src/lib/part3d.ts) viene impacchettato con esbuild (`scripts/bundle.mjs`) e comprende twistabile corrugata, seamless, curva E/H, twist, disassato e flange con i fori. Le viti della scena 3 seguono la stessa regola dei fori.
- **Video muto:** c'è una traccia AAC silenziosa. La musica si aggiunge nell'app, con un audio vicino ai 100 BPM.

## File

| File | Contenuto |
|---|---|
| `out/tecnolambro-spot-3d-9x16.mp4` | 1080×1920 per i social; safe zone TikTok rispettate |
| `out/tecnolambro-spot-3d-16x9.mp4` | 1920×1080 per sito e LinkedIn |
| `out/cover-9x16.jpg`, `out/cover-16x9.jpg` | copertine ("Guidiamo le *microonde*.") |
| `out/contact-9x16.jpg`, `out/contact-16x9.jpg` | un fotogramma per beat; sul 9:16 il riquadro rosso è la safe zone |
| `out/loop-twistable-1920x1080.mp4` / `.webm` | loop di 8 s senza testi, sotto i 4 MB. **Non è nel sito**: è solo il file |
| `out/ffprobe.json` | controllo finale |

Formato: H.264 High, yuv420p, CRF 18, preset slow, 30 fps costanti, AAC muto, `+faststart`. Mai yuv444p.

## Lista dei tagli

Tutti i tagli cadono sul beat.

| Da | A | Beat | Scena | Testo | Slot reale (sabato) |
|---|---|---|---|---|---|
| 0,0 | 2,4 | 0–4 | Macro della corrugazione che scorre, luce radente | — | **officina** |
| 2,4 | 4,8 | 4–8 | La twistabile si torce e si piega da sola | "Guidiamo le *microonde*." | resta 3D |
| 4,8 | 7,2 | 8–12 | La flangia si svita, si allontana con le viti e torna | "Dal *1987*." | **mani che assemblano** |
| 7,2 | 9,6 | 12–16 | Una curva E si costruisce lungo il percorso | "Progettiamo. *Costruiamo.*" | **fresatura** |
| 9,6 | 12,0 | 16–20 | Twist a 90° che ruota, poi un disassato | "*Collaudiamo* il 100%." | resta 3D |
| 12,0 | 15,6 | 20–26 | Carrellata sulle 5 famiglie, dalla misura più grande (WR-284) alla più piccola (WR-22) | "Da WR-22 a *WR-284*." | resta 3D |
| 15,6 | 18,0 | 26–30 | Raffica di 6 dettagli da mezzo beat: viti, ondulazione, sezione, seamless, curva, twist | — | **collaudo** |
| 18,0 | 21,6 | 30–36 | Sezione della guida tagliata con l'onda TE10 animata dentro | "Diteci la frequenza. *Vi diciamo la guida.*" | resta 3D |
| 21,6 | 24,0 | 36–40 | Configuratore stilizzato: a ogni beat cambia tipo, piano o angolo e il pezzo cambia forma | "Componilo in *3D*. Preventivo in 24 ore." | resta 3D |
| 24,0 | 26,4 | 40–44 | Logo vero che si forma dalla scia blu, ISO 9001 · ISO 14001 | "tecnolambro.it" | resta così |

## Come sostituire una scena con il video reale

1. Copia il video in `riprese/` col nome indicato in `config.json` → `scenes[].slot.real` (es. `riprese/01-officina.mp4`).
2. `python scripts/build.py`: i fotogrammi di quella scena vengono presi dal video (scalato e ritagliato al formato), il resto resta in 3D.

Il testo della scena resta quello di `config.json`. Per cambiarlo si modifica `text` e si rilancia `node scripts/render.mjs <formato> --only <id> --force`.

## Rifare tutto

```bash
cd video/spot-3d
npm install
node scripts/bundle.mjs
node scripts/render.mjs 9x16
node scripts/render.mjs 16x9
node scripts/render.mjs loop
python scripts/build.py
```

Il rendering è **offline, fotogramma per fotogramma**, non una registrazione dello schermo. Three.js gira in Chrome headless su GPU, con tempo deterministico a 30 fps e `preserveDrawingBuffer`. Ogni fotogramma accumula 10 campioni: antialias, profondità di campo (lente sottile) e motion blur a 180° solo nei movimenti veloci (flangia, carrellata, raffica). Tone mapping AgX e testi in HTML sopra il canvas. Servono circa 0,5 s per fotogramma.

## Look

- **Ottone PBR:** metalness 1, roughness 0,30 (flange 0,34), clearcoat leggero.
- **Luci:**
  - chiave calda `#ffd9b0` in alto a sinistra;
  - controluce `#1aa0ff` da dietro;
  - riempimento freddo;
  - ambiente HDRI da studio.
- **Fondo:** scuro con gradiente radiale.
- **Grade unico:** vignettatura leggera e grana fine.
- **Ciano del logo:** il logo non contiene un ciano. Il #3FC7D0 indicato nel brief non è nei pixel del logo, i cui colori sono `#0070b8`, i grigi e il grafite. Ho usato il blu del logo schiarito (`#1aa0ff`) per la luce e il blu chiaro del sito (`#3daef5`) per le parole chiave, come nello spot del sito.
- **Testi:** grottesco bold Archivo (il font del sito, OFL) con una parola chiave in Instrument Serif Italic (OFL) nel blu chiaro. Al massimo 6–7 parole. In 9:16 i testi stanno nella fascia alta, dentro la safe zone (150 px sopra, 380 sotto, 140 a destra).

## Fonti e licenze

- **Three.js:** MIT.
- **HDRI "Studio Small 09"** da [Poly Haven](https://polyhaven.com/a/studio_small_09): CC0. È lo stesso file dello spot del sito (`assets/studio.hdr`, fuori da git, si riscarica da Poly Haven).
- **Archivo:** SIL Open Font License 1.1, dal sito (`src/app/fonts/archivo-var-latin.woff2`).
- **Instrument Serif Italic:** SIL Open Font License 1.1 (`assets/InstrumentSerif-Italic.ttf`).
- **Logo:** `public/brand/logo.png`, logo vero di Tecnolambro.
- Nessun modello, clip o immagine di terzi.

## Onestà

- Nessun numero, cliente o premio inventato.
- "Dal 1987", "Collaudiamo il 100%", "Preventivo in 24 ore", ISO 9001 · ISO 14001 e le misure da WR-22 a WR-284 sono dati del sito.
- I modelli sono quelli generici del configuratore. Per lo spot definitivo vanno sostituiti con le riprese vere dei prodotti, almeno nelle scene indicate.
