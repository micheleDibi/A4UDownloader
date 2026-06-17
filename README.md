# A4U Downloader

> Web app per sfogliare e scaricare in massa le dispense e le slide dei corsi prodotti con la piattaforma **a4u**.

Niente più click manuali lezione per lezione: scarichi dispense (PDF), slide (PDF) e il CSV dei quiz — singolarmente, per intera lezione, o per intero modulo. Vengono mostrati **solo i corsi completi** (tutti i file generati) di una specifica organizzazione.

---

## Cosa fa

Legge i corsi **direttamente dal database PostgreSQL locale** della piattaforma a4u e recupera i file (PDF) **dallo storage OVH** servito via HTTP. Mostra **solo** i corsi dell'organizzazione configurata che hanno **tutti** i file pronti: per ogni lezione di contenuto la **dispensa** e le **slide**, e — se il corso ha le verifiche — il **quiz**.

Per ogni **lezione di contenuto**:

- **Dispensa** in PDF
- **Slide** in PDF
- **ZIP della lezione** che impacchetta dispensa + slide

Per ogni **lezione di valutazione** (quiz):

- **CSV** con domande a scelta multipla (opzioni + indice della risposta corretta) e domande aperte (risposta attesa) — separatore `;`, BOM UTF-8 per Excel italiano

Per ogni **modulo**:

- **ZIP del modulo** con sotto-cartelle ordinate (`01-titolo-lezione/`, `02-…/`)

I download di grandi dimensioni vengono **streamati** (no buffer in RAM).

---

## Stack

| Layer | Tecnologie |
|---|---|
| Frontend | Vite 6, React 18, TypeScript, Tailwind CSS 3, React Router 6, TanStack Query 5 |
| Backend | Node 20+, Express 4, TypeScript, `pg` (PostgreSQL), `archiver` (ZIP), `csv-stringify`, `jsonwebtoken`, `cookie-parser`, `express-rate-limit` |
| Dati | PostgreSQL locale della piattaforma a4u (sola lettura) + file PDF serviti via HTTP da OVH |
| Auth | Singolo utente, credenziali in `.env`, sessione via JWT firmato in cookie `HttpOnly + SameSite=Strict` |

Monorepo gestito con npm workspaces (`client/`, `server/`).

---

## Quick start

```powershell
# 1. install
npm install

# 2. configurazione
copy .env.example .env
# editare .env (vedi sezione sotto)

# 3. avvio dev
npm run dev
```

Apri il browser su <http://localhost:5173>, fai login con le credenziali del `.env`.

In sviluppo:
- Backend Express ascolta su `:3000`
- Vite serve il frontend su `:5173` con proxy automatico verso `:3000` per `/api` e `/auth`

> Il backend deve poter raggiungere il PostgreSQL di a4u (`DATABASE_URL`) e l'URL pubblico dei file (`MEDIA_BASE_URL`).

---

## Configurazione `.env`

| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | Connessione al PostgreSQL di a4u (sola lettura). Formato node-postgres: `postgres://user:pass@host:porta/db`. La piattaforma a4u usa il formato SQLAlchemy `postgresql+asyncpg://…`: togliere il `+asyncpg`. |
| `MEDIA_BASE_URL` | URL pubblica base da cui OVH serve i PDF (= `OVH_PUBLIC_BASE_URL` di a4u, es. `https://progettiersaf.com/media`). |
| `A4U_ORG_NAME` | Nome dell'organizzazione di cui mostrare i corsi (default `SSML`). |
| `AUTH_USERNAME` | Username per accedere all'app |
| `AUTH_PASSWORD` | Password per accedere all'app |
| `JWT_SECRET` | Stringa random di almeno 32 caratteri |
| `NODE_ENV` | `development` o `production` |
| `PORT` | Porta del backend (default `3000`) |

Per generare un `JWT_SECRET` robusto:

```powershell
# PowerShell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
```

```bash
# bash
openssl rand -hex 32
```

> **Deployment**: in `a4u/docker-compose.prod.yml` la porta di Postgres non è esposta pubblicamente. Per consentire al downloader (sul medesimo server) di connettersi, esporre la porta su `localhost` e impostare `DATABASE_URL` di conseguenza. È consigliato un utente DB **read-only**. `MEDIA_BASE_URL` funziona se a4u in produzione gira con `STORAGE_BACKEND=ovh_ftp` (file effettivamente su OVH).

---

## Build & produzione

```powershell
$env:NODE_ENV = "production"
npm run build
npm start
```

In produzione Express serve sia le API che lo statico React buildato (`client/dist/`) — un solo processo, una sola porta.

---

## Architettura

```
A4UDownloader/
├── client/                            # Vite + React + TS + Tailwind
│   └── src/
│       ├── pages/                     # LoginPage, CoursesPage, CourseDetailPage
│       ├── components/                # Layout, ModuleAccordion, LessonRow, DownloadButton, ...
│       ├── auth/                      # AuthContext + RequireAuth
│       └── api/                       # fetch client + tipi
└── server/                            # Express + TS
    └── src/
        ├── routes/                    # auth, courses, modules, lessons
        ├── services/                  # db (PostgreSQL), media (OVH), zipBuilder, csvBuilder
        ├── middleware/                # auth JWT, rate limit, error handler
        └── utils/                     # slugify, contentDisposition, limit
```

### Flusso dati

1. Client chiama il backend (`/api/...`) con cookie di sessione.
2. Backend valida la sessione, poi interroga **direttamente il PostgreSQL di a4u** (sola lettura) per corsi/moduli/lezioni.
3. Un corso compare **solo** se appartiene all'organizzazione configurata ed è **completo**: per ogni lezione non-assessment `pdf_status='ready'` (dispensa) e `slides_pdf_status='ready'` (slide); se le verifiche sono abilitate, ogni lezione assessment ha `content_status` pronto.
4. I PDF (path `generated_pdfs/{org}/{course}/{lesson}.pdf` su `MEDIA_BASE_URL`) vengono **proxati in streaming** dal backend, con un nome file leggibile.
5. Il quiz scaricabile è un **CSV generato al volo** dai dati JSON (`content_raw`) della lezione di verifica.
6. Per gli ZIP, `archiver` fa streaming dei file da OVH al client mentre l'archivio viene compresso al volo.

### Endpoint backend

Tutti protetti tranne `/health`, `/auth/login`, `/auth/logout`.

| Path | Descrizione |
|---|---|
| `POST /auth/login` | Setta il cookie di sessione |
| `POST /auth/logout` | Rimuove il cookie |
| `GET /auth/me` | 200 se autenticato, 401 altrimenti |
| `GET /api/courses` | Lista dei corsi **completi** dell'organizzazione configurata |
| `GET /api/courses/:id` | Dettaglio corso con lista moduli (404 se non completo/non in org) |
| `GET /api/modules/:id` | Dettaglio modulo con lista lezioni |
| `GET /api/lessons/:id` | Dettaglio lezione (flag disponibilità + tipo) |
| `GET /api/lessons/:id/pdf` | Dispensa PDF (stream proxy da OVH) |
| `GET /api/lessons/:id/file?kind=slides` | Slide PDF (stream proxy da OVH) |
| `GET /api/lessons/:id/quiz.csv` | CSV del quiz per lezione ASSESSMENT |
| `GET /api/lessons/:id/all.zip` | ZIP streaming dei file della lezione |
| `GET /api/modules/:id/all.zip` | ZIP streaming del modulo (cartelle per lezione) |

---

## Sicurezza

- Il backend interroga il DB in **sola lettura** e non espone credenziali al browser.
- Autenticazione tramite cookie `session` `HttpOnly + SameSite=Strict + Secure` (in produzione) + JWT HS256 a scadenza 7 giorni.
- Confronto password con `crypto.timingSafeEqual` (no timing attack).
- Rate limit di 5 tentativi/min su `/auth/login`.
- I path dei file vengono normalizzati e il path traversal (`..`) è rifiutato.
- `Set-Cookie` con `SameSite=Strict` rende l'app immune a CSRF (single-origin in prod).

---

## Comportamento robusto

- I corsi incompleti non sono raggiungibili neppure via URL diretto (`/api/courses/:id` ritorna 404).
- Se un file fallisce durante uno ZIP, lo ZIP non viene mai abortito: include un file `MANIFEST.txt` con la lista dei file mancanti.
- Se l'utente chiude la tab durante uno ZIP, lo streaming server-side viene interrotto pulitamente (no leak).

---

## Troubleshooting

**`Missing or placeholder env var` all'avvio del server**
Una variabile è vuota o contiene ancora il placeholder `__...__`. Aprire `.env` e valorizzare tutte le variabili.

**Login OK ma `GET /api/courses` ritorna errore / lista vuota**
Verificare che `DATABASE_URL` punti al PostgreSQL di a4u raggiungibile e che esista un'organizzazione con nome `A4U_ORG_NAME` con almeno un corso completo. Controllare i log del server.

**Download dispensa/slide non parte (404/502)**
Il file non è (ancora) sullo storage o `MEDIA_BASE_URL` non combacia con l'URL pubblico OVH di a4u. Verificare `MEDIA_BASE_URL` e che a4u in produzione usi `STORAGE_BACKEND=ovh_ftp`.

**ZIP scaricato ma alcuni file mancano**
Aprire `MANIFEST.txt` dentro lo ZIP per la lista esatta dei file non recuperati.

---

## Licenza

MIT
