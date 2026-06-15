# GiassAi — Architettura Backend & Sistema Multi-Agente

> **Versione:** 0.1.0  
> **Data:** 2026-06-12  
> **Autore:** Lead Architect  
> **Status:** Documento Fondativo — Da Approvare

---

## Sommario Esecutivo

GiassAi è una piattaforma AI-first che permette a utenti non tecnici di creare **Gestionali** (database relazionali su Supabase), **Landing Page** e **Workflow automatizzati** attraverso una conversazione in linguaggio naturale. L'architettura è costruita su tre principi: **Model Routing cost-optimized**, **Workflow engine ispirato a Relay.app**, e un **ecosistema di progetti interconnessi** dove i dati fluiscono tra gestionale, landing e automazioni.

---

## 1. Architettura Multi-Agente e Model Routing Rigido

### 1.1 Principio Fondamentale

Ogni richiesta dell'utente NON viene inviata indiscriminatamente a un singolo modello. Un **Router Layer** classifica l'intento e instrada la richiesta all'agente specializzato corretto, ottimizzando il rapporto costo/qualità.

### 1.2 Matrice degli Agenti

| Agente | Ruolo | Modello Primario | Modello Fallback | Priorità | Trigger di Attivazione |
|--------|-------|-------------------|------------------|----------|------------------------|
| **PM Agent** | Interfaccia umana, interpretazione intento, riassunti | `claude-haiku-4-5-20250609` | `gpt-4.1-mini` | Velocità + costo minimo | Ogni messaggio utente in chat |
| **Architect Agent** | Generazione strutture dati, workflow JSON, schemi DB | `claude-opus-4-20250514` | Nessuno (task critico) | Logica assoluta, zero hallucination | Solo su conferma esplicita utente ("Crea progetto") |
| **Executor Agents** | Esecuzione automazioni background, task ripetitivi | `claude-haiku-4-5-20250609` | `gpt-4.1-mini` | Throughput + costo minimo | Trigger di workflow schedulati/event-driven |

### 1.3 Diagramma del Flusso di Routing

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UTENTE (Frontend)                          │
│                      POST /api/chat/message                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY (Express)                        │
│                   Validazione Zod · Rate Limiting                   │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      AGENT ROUTER SERVICE                           │
│                                                                      │
│  1. Analizza il messaggio utente + contesto conversazione            │
│  2. Classifica l'intento:                                            │
│     ├─ CHAT/EXPLORE/CLARIFY  ──→  PM Agent (Haiku)                  │
│     ├─ CREATE_PROJECT        ──→  Architect Agent (Opus)             │
│     ├─ MODIFY_SCHEMA         ──→  Architect Agent (Opus)             │
│     └─ EXECUTE_WORKFLOW      ──→  Executor Agent (Haiku)             │
│  3. Costruisce il prompt con contesto specifico per l'agente         │
│  4. Chiama il modello AI corretto                                    │
│  5. Salva risposta + metadata nel DB                                 │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.4 Dettaglio di Implementazione del Router

```typescript
// server/services/agent-router.ts

type AgentRole = 'pm' | 'architect' | 'executor';

interface RoutingDecision {
  agent: AgentRole;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

// Il PM Agent stesso classifica l'intento (meta-routing)
// usando il messaggio utente + gli ultimi N messaggi di contesto.
// Se il PM rileva un intento di creazione confermato, delega all'Architect.

const AGENT_CONFIG: Record<AgentRole, {
  primaryModel: string;
  fallbackModel: string | null;
  temperature: number;
  maxTokens: number;
}> = {
  pm: {
    primaryModel: 'claude-haiku-4-5-20250609',
    fallbackModel: 'gpt-4.1-mini',
    temperature: 0.7,
    maxTokens: 1024,
  },
  architect: {
    primaryModel: 'claude-opus-4-20250514',
    fallbackModel: null, // Nessun fallback: task critico
    temperature: 0.1,    // Deterministico: zero allucinazioni
    maxTokens: 8192,
  },
  executor: {
    primaryModel: 'claude-haiku-4-5-20250609',
    fallbackModel: 'gpt-4.1-mini',
    temperature: 0.3,
    maxTokens: 2048,
  },
};
```

### 1.5 Strategia di Cost Optimization

| Scenario | Modello | Costo Stimato per 1M tokens (input+output) |
|----------|---------|---------------------------------------------|
| 100 messaggi chat/giorno (PM) | Haiku | ~$0.10 |
| 2 creazioni progetto/giorno (Architect) | Opus | ~$0.90 |
| 50 esecuzioni workflow/giorno (Executor) | Haiku | ~$0.05 |
| **Totale giornaliero stimato per utente** | | **~$1.05** |

Con un modello "tutto Opus", lo stesso volume costerebbe **~$15/giorno**. Il routing riduce i costi del **93%**.

---

## 2. Workflow Engine in stile Relay.app

### 2.1 I 4 Tipi di Nodo

L'Architect Agent genera workflow come JSON strutturati con esattamente 4 tipi di nodo:

```typescript
// shared/types/workflow.ts

type NodeType = 'trigger' | 'action' | 'ai_task' | 'human_in_the_loop';

interface WorkflowNode {
  id: string;                    // UUID v4
  type: NodeType;
  label: string;                 // Nome leggibile (es. "Nuovo lead da form")
  position: number;              // Ordine di esecuzione
  config: TriggerConfig | ActionConfig | AiTaskConfig | HumanReviewConfig;
  nextNodeId: string | null;     // Nodo successivo (linked list)
  onError: 'stop' | 'skip' | 'retry';
}
```

#### Nodo 1: **Trigger** — Il Punto di Ingresso

```typescript
interface TriggerConfig {
  source: 'webhook' | 'schedule' | 'database_change' | 'form_submission' | 'manual';
  // Webhook: URL generato automaticamente
  webhookUrl?: string;
  // Schedule: espressione cron
  cronExpression?: string;
  // Database change: tabella + operazione monitorata
  tableName?: string;
  operation?: 'INSERT' | 'UPDATE' | 'DELETE';
  // Form submission: ID del form sulla landing page
  formId?: string;
  // Filtri opzionali
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
    value: unknown;
  }>;
}
```

#### Nodo 2: **Action** — Operazione Concreta

```typescript
interface ActionConfig {
  integration: string;            // 'supabase' | 'email' | 'slack' | 'google_sheets' | ...
  operation: string;              // 'insert_row' | 'send_email' | 'post_message' | ...
  params: Record<string, unknown>; // Parametri specifici per l'integrazione
  // Template con variabili dal contesto: {{trigger.data.email}}
  inputMapping: Record<string, string>;
}
```

#### Nodo 3: **AI Task** — Elaborazione Intelligente Mid-Workflow

```typescript
interface AiTaskConfig {
  prompt: string;                 // Prompt template con variabili {{input.*}}
  model: 'haiku' | 'mini';       // Solo modelli economici per execution
  inputFields: string[];          // Campi dal contesto da iniettare nel prompt
  outputSchema: Record<string, 'string' | 'number' | 'boolean' | 'json'>;
  // Schema atteso dell'output per validazione
}
```

**Esempio:** Un lead arriva dal form → l'AI Task analizza il messaggio e classifica la priorità (alta/media/bassa) → il risultato viene passato al nodo successivo.

#### Nodo 4: **Human-in-the-Loop** — Approvazione Umana

```typescript
interface HumanReviewConfig {
  title: string;                  // Titolo mostrato sulla dashboard
  description: string;            // Descrizione del punto decisionale
  showFields: string[];           // Dati dal contesto da mostrare all'utente
  actions: Array<{
    label: string;                // "Approva", "Rifiuta", "Modifica"
    value: string;                // Valore passato al nodo successivo
    style: 'primary' | 'danger' | 'secondary';
  }>;
  timeout?: {                     // Timeout opzionale
    hours: number;
    defaultAction: string;        // Azione automatica se l'utente non risponde
  };
  notifyVia: ('dashboard' | 'email' | 'push')[];
}
```

**Comportamento:** Quando l'esecuzione raggiunge un nodo `human_in_the_loop`, il **Workflow Engine si ferma**. Crea una entry nella tabella `pending_approvals`. L'utente vede una notifica sulla dashboard, clicca "Approva" o "Rifiuta", e l'engine riprende l'esecuzione dal nodo successivo con il valore scelto.

### 2.2 Struttura JSON Completa di un Workflow

```json
{
  "id": "wf_abc123",
  "name": "Lead Qualification Pipeline",
  "version": 1,
  "nodes": [
    {
      "id": "node_1",
      "type": "trigger",
      "label": "Nuovo lead dal form contatti",
      "position": 0,
      "config": {
        "source": "form_submission",
        "formId": "form_landing_xyz"
      },
      "nextNodeId": "node_2",
      "onError": "stop"
    },
    {
      "id": "node_2",
      "type": "ai_task",
      "label": "Classifica priorità lead",
      "position": 1,
      "config": {
        "prompt": "Analizza questo lead e classifica la priorità. Nome: {{trigger.data.name}}, Email: {{trigger.data.email}}, Messaggio: {{trigger.data.message}}. Rispondi con JSON: {priority: 'high'|'medium'|'low', reason: '...'}",
        "model": "haiku",
        "inputFields": ["trigger.data"],
        "outputSchema": {
          "priority": "string",
          "reason": "string"
        }
      },
      "nextNodeId": "node_3",
      "onError": "stop"
    },
    {
      "id": "node_3",
      "type": "human_in_the_loop",
      "label": "Revisione lead ad alta priorità",
      "position": 2,
      "config": {
        "title": "Nuovo Lead Alta Priorità",
        "description": "L'AI ha classificato questo lead come prioritario. Vuoi procedere?",
        "showFields": ["trigger.data.name", "trigger.data.email", "ai_task.output.reason"],
        "actions": [
          { "label": "Approva e Contatta", "value": "approved", "style": "primary" },
          { "label": "Ignora", "value": "rejected", "style": "danger" }
        ],
        "timeout": { "hours": 24, "defaultAction": "approved" },
        "notifyVia": ["dashboard", "email"]
      },
      "nextNodeId": "node_4",
      "onError": "stop"
    },
    {
      "id": "node_4",
      "type": "action",
      "label": "Inserisci nel CRM",
      "position": 3,
      "config": {
        "integration": "supabase",
        "operation": "insert_row",
        "params": { "table": "clienti" },
        "inputMapping": {
          "nome": "{{trigger.data.name}}",
          "email": "{{trigger.data.email}}",
          "priorita": "{{ai_task.output.priority}}",
          "stato": "{{human_review.action}}"
        }
      },
      "nextNodeId": null,
      "onError": "retry"
    }
  ]
}
```

### 2.3 Workflow Execution Engine — Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW EXECUTION ENGINE                      │
│                                                                   │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌──────────┐ │
│  │  TRIGGER   │───▶│  AI TASK   │───▶│  HUMAN    │───▶│  ACTION  │ │
│  │  Listener  │    │  Executor  │    │  REVIEW   │    │  Runner  │ │
│  └───────────┘    └───────────┘    │  (PAUSED)  │    └──────────┘ │
│                                     └─────┬─────┘                 │
│                                           │                       │
│                                     ┌─────▼─────┐                 │
│                                     │  Dashboard │                 │
│                                     │  Approval  │                 │
│                                     │  Widget    │                 │
│                                     └───────────┘                 │
└─────────────────────────────────────────────────────────────────┘

Stato di esecuzione persistito in DB:
  workflow_runs (id, workflow_id, status, current_node_id, context, started_at, completed_at)
  pending_approvals (id, run_id, node_id, data, status, resolved_by, resolved_at)
```

---

## 3. Database su Supabase

### 3.1 Migrazione da Neon a Supabase

Lo schema attuale usa `@neondatabase/serverless`. La migrazione richiede:

1. **Driver swap**: `@neondatabase/serverless` → `postgres` (pg) o `@supabase/supabase-js` per chiamate che necessitano di Row Level Security (RLS).
2. **Drizzle rimane**: Lo schema Drizzle è database-agnostico per PostgreSQL. Zero modifiche allo schema.
3. **Supabase Auth**: Integrazione con `supabase.auth` per ottenere il `user_id` JWT da inserire nel contesto delle query.

### 3.2 Schema Database Completo (Target)

```sql
-- ============================================
-- CORE: Utenti e Organizzazioni
-- ============================================
-- auth.users è gestito da Supabase Auth (non toccare)

CREATE TABLE public.organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  owner_id      UUID NOT NULL REFERENCES auth.users(id),
  plan          TEXT NOT NULL DEFAULT 'free',  -- 'free' | 'pro' | 'enterprise'
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.org_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  role          TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  joined_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ============================================
-- PROJECTS: I Tre Pilastri
-- ============================================

CREATE TABLE public.projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('gestionale', 'landing', 'workflow')),
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'active' | 'archived'
  config        JSONB DEFAULT '{}',
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHAT: Conversazioni AI
-- ============================================

CREATE TABLE public.conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  title         TEXT,
  status        TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'resolved' | 'archived'
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,
  agent_role    TEXT,    -- 'pm' | 'architect' | 'executor' | NULL
  model_used    TEXT,    -- 'claude-haiku-4-5' | 'claude-opus-4' | 'gpt-4.1-mini'
  tokens_in     INTEGER,
  tokens_out    INTEGER,
  cost_usd      NUMERIC(10, 6),  -- Tracking costi per messaggio
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- GESTIONALI: Schemi Dinamici (generati dall'Architect)
-- ============================================

CREATE TABLE public.gestionale_schemas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL DEFAULT 1,
  schema_json   JSONB NOT NULL,  -- Schema relazionale generato dall'AI
  -- schema_json contiene: tables[], relations[], indexes[]
  -- Ogni table ha: name, columns[{name, type, nullable, default, constraints}]
  is_deployed    BOOLEAN DEFAULT FALSE,
  deployed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Tabelle generate dinamicamente dall'Architect vivono in uno schema
-- Supabase dedicato per organizzazione: `org_{org_id}`
-- Esempio: org_abc123.clienti, org_abc123.ordini, etc.

-- ============================================
-- WORKFLOWS: Definizioni e Esecuzioni
-- ============================================

CREATE TABLE public.workflows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  nodes         JSONB NOT NULL DEFAULT '[]',  -- Array di WorkflowNode
  is_active     BOOLEAN DEFAULT FALSE,
  version       INTEGER DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.workflow_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'running',
  -- 'running' | 'paused_human_review' | 'completed' | 'failed' | 'cancelled'
  current_node_id TEXT,            -- ID del nodo corrente in esecuzione
  context       JSONB DEFAULT '{}', -- Dati accumulati durante l'esecuzione
  error         TEXT,
  started_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE TABLE public.pending_approvals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id       TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  display_data  JSONB DEFAULT '{}',  -- Dati da mostrare all'utente
  actions       JSONB NOT NULL,       -- Opzioni di azione disponibili
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'timeout'
  resolved_by   UUID REFERENCES auth.users(id),
  resolved_action TEXT,               -- Il valore dell'azione scelta
  timeout_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);

-- ============================================
-- LANDINGS: Configurazione Pagine
-- ============================================

CREATE TABLE public.landing_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template      TEXT NOT NULL,        -- Template ID scelto dall'AI
  sections      JSONB NOT NULL,       -- Configurazione sezioni della pagina
  forms         JSONB DEFAULT '[]',   -- Form configurati (collegati ai workflow)
  custom_domain TEXT,
  is_published  BOOLEAN DEFAULT FALSE,
  published_url TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ECOSYSTEM: Collegamenti Cross-Progetto
-- ============================================

CREATE TABLE public.project_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  target_project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  link_type     TEXT NOT NULL,  -- 'form_to_workflow' | 'workflow_to_gestionale' | 'landing_to_workflow'
  config        JSONB DEFAULT '{}',  -- Configurazione del collegamento
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_project_id, target_project_id, link_type)
);

-- ============================================
-- USAGE TRACKING: Monitoraggio Costi AI
-- ============================================

CREATE TABLE public.ai_usage_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  agent_role    TEXT NOT NULL,  -- 'pm' | 'architect' | 'executor'
  model         TEXT NOT NULL,
  tokens_in     INTEGER NOT NULL,
  tokens_out    INTEGER NOT NULL,
  cost_usd      NUMERIC(10, 6) NOT NULL,
  context_type  TEXT,           -- 'chat' | 'workflow_execution' | 'project_generation'
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Row Level Security (RLS) — Pattern

```sql
-- Ogni utente vede solo i dati della propria organizzazione
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON projects
  USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));
```

---

## 4. Ecosistema Connesso

### 4.1 Il Principio del Ponte

Gestionali, Landing Page e Workflow **non sono compartimenti stagni**. I Workflow fungono da **ponte logico** tra progetti diversi dello stesso utente.

### 4.2 Flusso Tipo: Landing → Workflow → Gestionale

```
┌─────────────────┐          ┌──────────────────────┐          ┌──────────────────┐
│   LANDING PAGE   │          │      WORKFLOW          │          │    GESTIONALE     │
│                   │          │                        │          │                   │
│  Form "Contatti"  │──POST──▶│  Trigger: form_submit  │          │  Tabella: clienti │
│  (form_xyz)       │          │         │               │          │                   │
│                   │          │         ▼               │          │                   │
│                   │          │  AI Task: classifica    │          │                   │
│                   │          │  priorità del lead      │          │                   │
│                   │          │         │               │          │                   │
│                   │          │         ▼               │          │                   │
│                   │          │  Human Review: approva? │          │                   │
│                   │          │         │               │          │                   │
│                   │          │         ▼               │          │                   │
│                   │          │  Action: INSERT ────────│──────────▶│  Nuovo record    │
│                   │          │  nella tabella clienti  │          │  in "clienti"     │
└─────────────────┘          └──────────────────────┘          └──────────────────┘
```

### 4.3 Tabella `project_links` — Il Grafo dei Collegamenti

La tabella `project_links` registra le connessioni tra progetti:

| link_type | source | target | Descrizione |
|-----------|--------|--------|-------------|
| `form_to_workflow` | Landing | Workflow | Un form invia dati come trigger |
| `workflow_to_gestionale` | Workflow | Gestionale | Un'azione scrive in una tabella |
| `gestionale_to_workflow` | Gestionale | Workflow | Un cambio DB triggera un workflow |
| `landing_to_gestionale` | Landing | Gestionale | Diretto (senza workflow intermedio) |

Quando l'Architect Agent genera un workflow, include automaticamente i `project_links` necessari nel JSON di output.

---

## 5. Stack Tecnologico Completo

### 5.1 Frontend (Esistente)

| Layer | Tecnologia | Stato |
|-------|-----------|-------|
| Framework | React 19.1 + Vite 7 | ✅ Implementato |
| Routing | Wouter | ✅ Implementato |
| State/Data | TanStack React Query | ✅ Configurato |
| UI Components | Radix UI + shadcn/ui pattern | ✅ Implementato |
| Styling | Tailwind CSS 4 | ✅ Implementato |
| Animations | Framer Motion | ✅ Disponibile |
| API Client | Orval (codegen) + Zod | ⚠️ Scaffold pronto |

### 5.2 Backend (Da Implementare)

| Layer | Tecnologia | Stato |
|-------|-----------|-------|
| Runtime | Node.js 20+ | ✅ Configurato |
| Framework | Express 5.1 | ✅ Skeleton |
| Validation | Zod | ✅ Schemi pronti |
| ORM | Drizzle ORM | ✅ Schema base |
| Database | Supabase (PostgreSQL) | 🔄 Migrazione da Neon |
| Auth | Supabase Auth (JWT) | 🆕 Da implementare |
| AI SDKs | `@anthropic-ai/sdk`, `openai` | 🆕 Da implementare |
| Workflow Engine | Custom (Node.js + BullMQ) | 🆕 Da implementare |
| Realtime | Supabase Realtime / SSE | 🆕 Da implementare |
| Build | esbuild | ✅ Configurato |

### 5.3 Modelli AI — Specifiche Tecniche

| Modello | Provider | Max Context | Output Max | Costo Input/1M | Costo Output/1M |
|---------|----------|-------------|------------|-----------------|------------------|
| `claude-haiku-4-5-20250609` | Anthropic | 200K | 8K | $0.80 | $4.00 |
| `claude-opus-4-20250514` | Anthropic | 200K | 32K | $15.00 | $75.00 |
| `gpt-4.1-mini` | OpenAI | 1M | 32K | $0.40 | $1.60 |

### 5.4 API Endpoints Pianificati

```
POST   /api/auth/login              → Supabase Auth
POST   /api/auth/register           → Supabase Auth
GET    /api/auth/me                 → Profilo utente corrente

POST   /api/chat/message            → Invia messaggio al PM Agent (streaming SSE)
GET    /api/chat/conversations      → Lista conversazioni
GET    /api/chat/conversations/:id  → Storico messaggi di una conversazione

POST   /api/projects                → Crea progetto (triggerato dall'Architect)
GET    /api/projects                → Lista progetti dell'organizzazione
GET    /api/projects/:id            → Dettaglio progetto
PATCH  /api/projects/:id            → Aggiorna progetto
DELETE /api/projects/:id            → Archivia progetto

POST   /api/workflows/:id/activate  → Attiva un workflow
POST   /api/workflows/:id/test      → Esegui test run
GET    /api/workflows/:id/runs      → Storico esecuzioni
POST   /api/workflows/:id/runs/:runId/approve  → Approva Human-in-the-loop

GET    /api/approvals/pending       → Lista approvazioni in attesa (dashboard)
POST   /api/approvals/:id/resolve   → Risolvi un'approvazione

POST   /api/gestionali/:id/deploy   → Deploy schema su Supabase
GET    /api/gestionali/:id/data     → Query dati dal gestionale
POST   /api/gestionali/:id/data     → Inserisci riga nel gestionale

GET    /api/usage                   → Report utilizzo AI e costi
```

---

## 6. File di Connessione Frontend ↔ PM Agent

### Il file da modificare per primo:

**`artifacts/aiagency-os/src/pages/NewProject.tsx`**

Questo file contiene:
- L'interfaccia chat completa con l'utente
- Un `sendMessage()` con risposta simulata via `setTimeout`
- Un commento esplicito: `// Simulate AI response - this will be replaced with actual API call`
- Lo stato `Message[]` con la struttura `{ id, role, content, timestamp }`

La sostituzione richiederà:
1. Creare un hook `useChatStream()` che chiami `POST /api/chat/message`
2. Gestire la risposta in streaming (SSE) per mostrare il testo token-by-token
3. Sostituire `getSimulatedResponse()` con la chiamata reale al PM Agent
4. Persistere i messaggi nel DB tramite l'API

---

## Appendice: Monorepo Structure

```
GiassAi/
├── artifacts/
│   ├── aiagency-os/          # Frontend React (Vite)
│   ├── api-server/           # Backend Express (da espandere)
│   ├── giassai-mobile/       # Mobile app (futuro)
│   └── mockup-sandbox/       # Sandbox prototipi
├── lib/
│   ├── api-spec/             # OpenAPI spec + Orval codegen
│   ├── api-zod/              # Zod validation schemas (shared)
│   ├── api-client-react/     # TanStack Query client (shared)
│   └── db/                   # Drizzle ORM schema + migrations
├── docs/
│   └── giassai-architecture.md  # 📍 Questo documento
└── scripts/
    └── src/dev.ts            # Dev orchestrator (API + Frontend)
```
