# Messa online: tecnolambro.it su Vercel

Promemoria per il giorno del lancio. **Non farlo prima** che il titolare abbia approvato testi e traduzioni.

## 1. Collegare il dominio su Vercel

1. Vercel → progetto del sito → **Settings → Domains → Add**:
   - aggiungi `tecnolambro.it`;
   - aggiungi `www.tecnolambro.it`, scegliendo **Redirect to `tecnolambro.it` (308)**.
2. Vercel mostra i record DNS da creare. Di norma sono:

   | Tipo | Nome (host) | Valore |
   |---|---|---|
   | A | `@` (dominio nudo) | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |

   Usa **i valori che mostra Vercel in quel momento**: a volte indica un indirizzo dedicato al progetto.

## 2. DNS su Aruba

**Aruba → Pannello di controllo → Gestione domini → tecnolambro.it → Gestione DNS:**

- modifica il record **A** di `@` (oggi punta all'hosting Aruba) con il valore di Vercel;
- crea o modifica il **CNAME** di `www`;
- **non toccare i record MX** (`mx.tecnolambro.it` o simili), né SPF, DKIM e DMARC esistenti: l'email info@tecnolambro.it continua a passare da Aruba;
- restano anche i record di Resend sul sottodominio `send` (vedi README → Resend).

La propagazione richiede da pochi minuti a qualche ora. Vercel emette il certificato HTTPS da solo.

## 3. Redirect al dominio

- **www → tecnolambro.it**: lo fa Vercel (punto 1).
- **tecnolambroooo.vercel.app → tecnolambro.it**: imposta le variabili del punto 4. Il sito risponde con un 308 verso il dominio. Le anteprime dei branch (`*-git-*.vercel.app`) restano raggiungibili.

## 4. Variabili d'ambiente (Production)

| Variabile | Valore |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://tecnolambro.it` |
| `NEXT_PUBLIC_DEMO` | `false` |
| `NEXT_PUBLIC_ALLOW_INDEXING` | `true` |
| `CANONICAL_REDIRECT` | `true` |
| `REDIRECT_HOSTS` | `www.tecnolambro.it,tecnolambroooo.vercel.app` |
| `QUOTE_TO_EMAIL` | `info@tecnolambro.it` |
| `QUOTE_FROM_EMAIL` | `Tecnolambro <info@tecnolambro.it>` |
| `QUOTE_BCC_EMAIL` | facoltativa |
| `RESEND_API_KEY` **oppure** `SMTP_PASS` | chiave Resend o password della casella Aruba |
| `BLOB_READ_WRITE_TOKEN` | da Vercel → Storage → Blob |

Dopo aver cambiato le variabili: **Deployments → Redeploy**.

## 5. Checklist del lancio

- [ ] `NEXT_PUBLIC_DEMO=false`: nessun badge "Versione demo" e nessun segnaposto giallo
- [ ] `NEXT_PUBLIC_ALLOW_INDEXING=true`: robots.txt consente l'indicizzazione
- [ ] Variabili email impostate; dominio verificato su Resend (record nel README)
- [ ] **Test di invio reale**: una richiesta da "La tua richiesta" e una dal modulo breve. Controlla che info@ riceva l'email con allegati e `richiesta.json`, e che arrivi la conferma al cliente
- [ ] Prova i redirect: `www.tecnolambro.it`, `tecnolambroooo.vercel.app`, `/radioamatori`
- [ ] **Google Search Console**: aggiungi la proprietà `tecnolambro.it` (verifica con un record TXT su Aruba) e invia la sitemap `https://tecnolambro.it/sitemap.xml`
- [ ] **Scheda Google Business** di Tecnolambro: aggiorna il sito con `https://tecnolambro.it` e controlla gli orari (lun–ven 8:00–12:00 e 13:30–17:30)
- [ ] Vercel → Analytics → Enable
- [ ] Testi legali rivisti da un legale; traduzioni riviste da madrelingua (se le lingue nuove vanno online)
