# A4U Downloader

> Web app per scaricare in massa le risorse didattiche dei corsi completati di una organizzazione su [Avatar4University](https://app.avatar4university.org/).

Niente più click manuali lezione per lezione: scarichi PDF, slide, video, video con avatar e CSV dei quiz — singolarmente, per intera lezione, o per intero modulo.

---

## Cosa fa

Per ogni **lezione di contenuto** vengono offerti i pulsanti per scaricare:

- **PDF** della lezione (generato dall'API a partire dalle sezioni)
- **Slide** in PDF
- **Video** con slide + audio
- **Video con avatar**
- **ZIP della lezione** che impacchetta tutti e quattro

Per ogni **lezione di valutazione** (quiz):

- **CSV** con domande e opzioni — separatore `;`, BOM UTF-8 per Excel italiano, campo `difficulty` escluso

Per ogni **modulo**:

- **ZIP del modulo** con sotto-cartelle ordinate (`01-titolo-lezione/`, `02-…/`) e dentro tutti i file della rispettiva lezione

I download di grandi dimensioni vengono **streamati** (no buffer in RAM): puoi scaricare interi moduli da gigabyte senza far crashare niente.

---

## Stack

| Layer | Tecnologie |
|---|---|
| Frontend | Vite 6, React 18, TypeScript, Tailwind CSS 3, React Router 6, TanStack Query 5 |
| Backend | Node 20+, Express 4, TypeScript, `archiver` (ZIP), `csv-stringify`, `jsonwebtoken`, `cookie-parser`, `express-rate-limit` |
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

---

## Configurazione `.env`

| Variabile | Descrizione |
|---|---|
| `A4U_API_BASE_URL` | URL base delle API (default: `https://app.avatar4university.org/data-api/api/v1`) |
| `A4U_API_KEY` | API key dell'organizzazione. Non viene mai esposta al browser. |
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
        ├── services/                  # a4uClient, zipBuilder, csvBuilder
        ├── middleware/                # auth JWT, rate limit, error handler
        └── utils/                     # slugify, contentDisposition, limit
```

### Flusso dati

1. Client chiama il backend (`/api/...`) con cookie di sessione.
2. Backend valida la sessione, poi fa proxy verso `app.avatar4university.org/data-api/api/v1/...` aggiungendo l'header `X-API-Key`.
3. Per i file binari grandi (slide/video) il backend risponde con un **redirect 302** all'URL S3 pubblico (`audios-avatar.s3.eu-north-1.amazonaws.com`) — niente traffico inutile sul backend.
4. Per i pacchetti ZIP, il backend usa `archiver` e fa streaming dei file da S3 al client mentre l'archivio viene compresso al volo.

### Endpoint backend

Tutti protetti tranne `/health`, `/auth/login`, `/auth/logout`.

| Path | Descrizione |
|---|---|
| `POST /auth/login` | Setta il cookie di sessione |
| `POST /auth/logout` | Rimuove il cookie |
| `GET /auth/me` | 200 se autenticato, 401 altrimenti |
| `GET /api/courses` | Lista dei corsi con `is_completed = true` |
| `GET /api/courses/:id` | Dettaglio corso con lista moduli |
| `GET /api/modules/:id` | Dettaglio modulo con lista lezioni |
| `GET /api/lessons/:id` | Dettaglio lezione (usato per i quiz) |
| `GET /api/lessons/:id/pdf` | PDF della lezione (stream proxy) |
| `GET /api/lessons/:id/file?kind=slides\|video\|avatar` | 302 al file S3 corrispondente |
| `GET /api/lessons/:id/quiz.csv` | CSV delle domande per lezione ASSESSMENT |
| `GET /api/lessons/:id/all.zip` | ZIP streaming di tutti i file della lezione |
| `GET /api/modules/:id/all.zip` | ZIP streaming del modulo (cartelle per lezione) |

---

## Sicurezza

- **API key mai esposta al browser**: vive solo nel `.env` lato server.
- Autenticazione tramite cookie `session` `HttpOnly + SameSite=Strict + Secure` (in produzione) + JWT HS256 a scadenza 7 giorni.
- Confronto password con `crypto.timingSafeEqual` (no timing attack).
- Rate limit di 5 tentativi/min su `/auth/login`.
- Redirect S3 con **host whitelist** (`audios-avatar.s3.eu-north-1.amazonaws.com`) per prevenire open-redirect.
- `Set-Cookie` con `SameSite=Strict` rende l'app immune a CSRF (single-origin in prod).

---

## Comportamento robusto

- Se un URL della lezione è `null` nei dati API, il pulsante corrispondente è disabilitato con tooltip "File non disponibile".
- Se un file fallisce durante uno ZIP, lo ZIP non viene mai abortito: include un file `MANIFEST.txt` con la lista dei file mancanti.
- Se l'utente chiude la tab durante uno ZIP, lo streaming server-side viene interrotto pulitamente (no leak).
- Retry automatico con backoff sui 5xx dell'API upstream.

---

## Troubleshooting

**`Missing or placeholder env var` all'avvio del server**
Una variabile è vuota o contiene ancora il placeholder `__...__`. Aprire `.env` e valorizzare tutte le variabili.

**Login OK ma `GET /api/courses` ritorna 502**
Probabile API key sbagliata o scaduta. Verificare `A4U_API_KEY` nel `.env` e i log del server.

**Pulsante grigio "File non disponibile"**
La lezione non ha quel campo URL popolato nell'API (es. `slides_pdf_url` è `null`).

**ZIP scaricato ma alcuni file mancano**
Normale se l'API o S3 hanno restituito errori per quei file specifici. Aprire `MANIFEST.txt` dentro lo ZIP per la lista esatta.

---

## Licenza

MIT
