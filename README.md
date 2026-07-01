# GiassAi

**Crea gestionali, landing page e automazioni — parlando.**

GiassAi è una piattaforma AI-first che permette a chiunque, anche senza competenze tecniche, di costruire tre tipi di progetto conversando in linguaggio naturale con un AI Master:

- 🗄️ **Gestionali** (ERP/CRM) — database relazionali reali su Postgres, con UI auto-generata
- 🖼️ **Landing page** — siti su misura generati dall'AI (non template), con copy e immagini per settore
- ⚙️ **Workflow** — automazioni stile Relay.app (trigger → azioni → AI task → approvazioni umane)

I tre ambienti **coesistono e si collegano tra loro**: una landing raccoglie un lead → un workflow lo qualifica → un'azione lo scrive nel gestionale.

---

## Come funziona

Parli in chat, l'AI ti fa qualche domanda (**human-in-the-loop**) per capire bene cosa ti serve, poi costruisce il progetto e te ne mostra l'anteprima. Confermi e viene creato per davvero.

### Architettura AI (Pattern B — "codice orchestratore")

Il codice Node è il direttore d'orchestra: **Opus** viene chiamato una sola volta per il ragionamento critico, poi il codice fa il fan-out verso modelli più economici. Ottimizza qualità e costi.

| Agente | Modello | Ruolo |
|--------|---------|-------|
| **PM** | Claude Haiku 4.5 | Chat con l'utente, interpretazione intento |
| **Architect** | Claude Opus 4.8 | Progetta schema DB / grafo workflow / struttura landing |
| **Builder** | Claude Sonnet 4.6 | Genera l'HTML bespoke delle landing + copy |
| **Executor** | Claude Haiku 4.5 | Fan-out per task ripetitivi, esecuzione workflow |

**Regola d'oro:** l'AI genera solo uno **spec JSON validato (Zod)**, mai SQL o codice eseguibile. Un compilatore deterministico traduce il JSON in DDL Postgres — l'AI non può mai rompere il database.

### Modalità demo (offline, gratis)

Senza `ANTHROPIC_API_KEY` (o con `GIASSAI_DEMO=1`), l'app gira interamente offline con esempi preconfezionati per settore: puoi cliccare e dimostrare tutto il prodotto a costo zero. Aggiungendo la chiave passa all'AI vera.

---

## Stack tecnologico

**Frontend** — React 19 · Vite · TailwindCSS · Radix/shadcn · Framer Motion · Wouter
**Backend** — Node 20+ · Express 5 · Drizzle ORM · Supabase (PostgreSQL + Auth)
**AI** — Anthropic Claude (Opus 4.8 / Sonnet 4.6 / Haiku 4.5) via `@anthropic-ai/sdk`, tool-use per output strutturato, `web_search` per l'analisi competitor
**Monorepo** — pnpm workspaces · build con esbuild (backend) e Vite (frontend)

---

## Struttura del monorepo

```
GiassAi/
├── artifacts/
│   ├── aiagency-os/       # Frontend React (Vite) — la SPA
│   ├── api-server/        # Backend Express + agenti AI
│   ├── giassai-mobile/    # App mobile (futuro)
│   └── mockup-sandbox/    # Prototipi
├── lib/
│   ├── db/                # Schema Drizzle + client Postgres
│   ├── api-zod/           # Contratti Zod condivisi (gestionale/workflow/landing)
│   ├── api-client-react/  # Client TanStack Query
│   └── api-spec/          # OpenAPI + codegen
├── docs/                  # Documenti di architettura dei 3 master + ecosistema
└── scripts/               # Utility di sviluppo
```

---

## Setup

### Prerequisiti
- Node 20+ e **pnpm** (`corepack enable`)
- Un progetto **Supabase** (PostgreSQL + Auth)
- (Opzionale, per l'AI reale) una **API key Anthropic** — [console.anthropic.com](https://console.anthropic.com/settings/keys)

### Variabili d'ambiente (`.env` nella root)

```bash
DATABASE_URL=postgresql://...            # connessione Supabase (pooler)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...             # opzionale: senza, parte in demo mode
# PORT viene iniettato in produzione (Railway). GIASSAI_DEMO=1 forza la demo.
```

### Installazione e schema DB

```bash
pnpm install
pnpm --filter @workspace/db push        # applica lo schema a Supabase
```

### Sviluppo locale

```bash
# Backend (build + start su :3000, serve anche la SPA se già buildata)
pnpm --filter @workspace/api-server dev

# Frontend (Vite dev server, proxy /api → :3000)
pnpm --filter @workspace/aiagency-os dev
```
