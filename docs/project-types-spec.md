# GiassAi — Specifica Funzionale dei 4 Tipi di Progetto

> **Versione:** 0.1.0  
> **Data:** 2026-06-12  
> **Autore:** Lead Architect  
> **Status:** Documento da Approvare dal Fondatore  

---

## Indice

1. [Costruttore ERP / Gestionale](#1-costruttore-erp--gestionale)
2. [Costruttore Landing Page](#2-costruttore-landing-page)
3. [Costruttore Workflow](#3-costruttore-workflow)
4. [Idee Video — Piano Editoriale](#4-idee-video--piano-editoriale)
5. [Collegamento Cross-Progetto](#5-collegamento-cross-progetto)
6. [Matrice Riepilogativa](#6-matrice-riepilogativa)

---

## 1. Costruttore ERP / Gestionale

### 1.1 Visione

Un **Airtable/Notion Database personalizzato** generato dall'AI a partire da una conversazione. L'utente descrive il suo business a voce/testo, l'AI Architetto genera uno schema relazionale completo con tabelle, colonne, relazioni, formule, permessi e audit log. L'utente poi interagisce con i dati tramite un'interfaccia auto-generata con viste, filtri e form CRUD.

### 1.2 Funzionalità Core

| Feature | Descrizione | Priorità |
|---------|-------------|----------|
| **Schema relazionale completo** | Tabelle con colonne tipizzate, relazioni 1:N e N:N, chiavi esterne | P0 |
| **Form CRUD auto-generati** | Per ogni tabella, un form di inserimento/modifica con validazione | P0 |
| **Viste multiple** | Tabella (default), Kanban (per campi status), Calendario (per campi data), Galleria (per campi immagine) | P0 |
| **Filtri e ordinamento** | L'utente può filtrare i record per qualsiasi colonna con operatori (=, !=, >, <, contiene) | P0 |
| **Formule derivate** | Campi calcolati: somme, medie, conteggi, concatenazioni, condizionali (`IF`) — stile Airtable | P1 |
| **Permessi per riga (RLS)** | Ogni utente/ruolo vede solo i record di sua competenza. L'AI genera le policy RLS su Supabase | P1 |
| **Audit log** | Ogni modifica a un record viene tracciata: chi, quando, campo, valore precedente, valore nuovo | P1 |
| **Versioning dei record** | Possibilità di ripristinare una versione precedente di un record (history) | P2 |
| **Import/Export** | Importa dati da CSV/Excel, esporta in CSV/PDF | P2 |
| **Ricerca globale** | Full-text search su tutti i campi testuali di tutte le tabelle | P2 |

### 1.3 User Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: CONVERSAZIONE CON PM AGENT                                   │
│                                                                       │
│ Utente: "Ho bisogno di gestire i clienti della mia agenzia.         │
│          Devo tracciare fatture, pagamenti e scadenze."               │
│                                                                       │
│ PM Agent (Haiku): Capisce l'intento, fa domande di chiarimento:      │
│   → "Quanti utenti useranno il gestionale?"                          │
│   → "Hai bisogno di calcoli automatici sulle fatture?"               │
│   → "I clienti hanno sotto-categorie?"                               │
│                                                                       │
│ PM genera un BRIEF strutturato e chiede conferma.                    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ Utente: "Sì, procedi"
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: GENERAZIONE SCHEMA (ARCHITECT AGENT — Opus)                  │
│                                                                       │
│ L'Architect riceve il brief e genera:                                │
│   1. Schema relazionale JSON (tabelle, colonne, relazioni, indici)   │
│   2. Formule derivate (es. totale_fatture = SUM di importo)          │
│   3. Policy RLS (chi vede cosa)                                       │
│   4. Viste suggerite (Kanban per stato_pagamento, Calendario per      │
│      data_scadenza)                                                   │
│   5. Form CRUD layout (quali campi, ordine, validazioni)             │
│                                                                       │
│ Output: GestionaleSchema JSON (vedi §1.5)                            │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: PREVIEW E APPROVAZIONE                                       │
│                                                                       │
│ Il frontend mostra un'anteprima live dello schema:                   │
│   - Diagramma ER interattivo delle tabelle                           │
│   - Preview della vista Tabella con dati di esempio                  │
│   - Preview del form CRUD                                            │
│                                                                       │
│ L'utente può: Approvare / Chiedere modifiche via chat                │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ Utente: "Approva"
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: DEPLOY SU SUPABASE                                           │
│                                                                       │
│ Il backend prende il GestionaleSchema JSON e:                        │
│   1. Crea le tabelle reali nello schema Supabase dell'organizzazione │
│   2. Applica le policy RLS                                            │
│   3. Crea gli indici                                                  │
│   4. Popola eventuali dati di esempio                                │
│   5. Registra lo schema nella tabella gestionale_schemas              │
│                                                                       │
│ Il gestionale è ora LIVE e l'utente può inserire dati reali.         │
└──────────────────────────────────────────────────────────────────────┘
```

### 1.4 Tipi di Colonna Supportati

```typescript
type ColumnType =
  | 'text'           // Testo breve (VARCHAR)
  | 'long_text'      // Testo lungo (TEXT)
  | 'number'         // Intero o decimale
  | 'currency'       // Numero con valuta (€, $, £)
  | 'percentage'     // Numero 0-100 con %
  | 'date'           // Data (senza ora)
  | 'datetime'       // Data e ora
  | 'boolean'        // Checkbox Sì/No
  | 'select'         // Scelta singola da opzioni predefinite
  | 'multi_select'   // Scelta multipla da opzioni predefinite
  | 'email'          // Email con validazione
  | 'phone'          // Telefono con formattazione
  | 'url'            // URL con validazione
  | 'image'          // Upload immagine (Supabase Storage)
  | 'file'           // Upload file generico
  | 'relation'       // Chiave esterna a un'altra tabella
  | 'formula'        // Campo calcolato (non editabile)
  | 'rollup'         // Aggregazione da tabella correlata
  | 'auto_number'    // Contatore auto-incrementante
  | 'created_at'     // Timestamp creazione (auto)
  | 'updated_at'     // Timestamp ultima modifica (auto)
  | 'created_by'     // Utente creatore (auto)
  | 'updated_by';    // Utente ultima modifica (auto)
```

### 1.5 Schema JSON Generato dall'Architect

```typescript
interface GestionaleSchema {
  version: number;
  tables: TableDefinition[];
  relations: RelationDefinition[];
  views: ViewDefinition[];
  permissions: PermissionPolicy[];
}

interface TableDefinition {
  name: string;                    // snake_case, es. "clienti"
  displayName: string;             // Italiano, es. "Clienti"
  icon: string;                    // Lucide icon name
  columns: ColumnDefinition[];
  primaryKey: string;              // Sempre "id" (UUID)
  indexes: IndexDefinition[];
}

interface ColumnDefinition {
  name: string;                    // snake_case
  displayName: string;             // Italiano
  type: ColumnType;
  nullable: boolean;
  defaultValue?: unknown;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;              // Regex
    options?: string[];            // Per select/multi_select
  };
  formula?: string;                // Es. "SUM(fatture.importo)"
  rollup?: {
    relationField: string;         // Nome del campo relazione
    targetField: string;           // Campo da aggregare
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
  showInListView: boolean;         // Visibile nella vista tabella?
  showInForm: boolean;             // Visibile nel form CRUD?
  order: number;                   // Ordine di visualizzazione
}

interface RelationDefinition {
  type: '1:N' | 'N:N';
  from: { table: string; column: string };
  to: { table: string; column: string };
  junctionTable?: string;          // Solo per N:N
  onDelete: 'cascade' | 'set_null' | 'restrict';
}

interface ViewDefinition {
  name: string;
  type: 'table' | 'kanban' | 'calendar' | 'gallery';
  table: string;
  config: {
    groupByField?: string;         // Per kanban
    dateField?: string;            // Per calendario
    imageField?: string;           // Per galleria
    defaultSort?: { field: string; direction: 'asc' | 'desc' };
    defaultFilters?: FilterCondition[];
    visibleColumns?: string[];
  };
}

interface PermissionPolicy {
  table: string;
  role: string;                    // 'owner' | 'admin' | 'member' | 'viewer'
  operations: ('select' | 'insert' | 'update' | 'delete')[];
  rowFilter?: string;              // Espressione SQL per RLS, es. "created_by = auth.uid()"
}
```

### 1.6 Audit Log — Struttura

```typescript
interface AuditEntry {
  id: string;
  tableSchema: string;             // Nome tabella
  recordId: string;                // ID del record modificato
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changedFields: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  performedBy: string;             // user_id
  performedAt: string;             // ISO timestamp
}
```

Implementato tramite **trigger PostgreSQL** + tabella `audit_log` creata automaticamente al deploy dello schema.

### 1.7 Versioning dei Record

Ogni `UPDATE` su un record salva una snapshot nella tabella `record_versions`:

```sql
CREATE TABLE org_{id}.record_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT NOT NULL,
  record_id     UUID NOT NULL,
  version       INTEGER NOT NULL,
  data          JSONB NOT NULL,     -- Snapshot completo del record
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

L'utente può vedere la timeline delle versioni e fare **rollback** a una qualsiasi.

---

## 2. Costruttore Landing Page

### 2.1 Visione

Un **editor visuale completo stile Webflow semplificato**, dove il punto di partenza NON è un template vuoto ma una **landing già generata e personalizzata** dal motore **ScarpingNia**. L'AI scrape il settore su Google, raccoglie informazioni, e genera una landing completa (HTML/CSS/JS). L'utente poi la personalizza con un editor drag & drop.

### 2.2 Pipeline di Generazione (ScarpingNia Integration)

```
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: CONVERSAZIONE CON PM AGENT                                   │
│                                                                       │
│ Utente: "Ho bisogno di una landing per il mio studio dentistico     │
│          a Milano. Voglio raccogliere prenotazioni."                  │
│                                                                       │
│ PM Agent raccoglie:                                                   │
│   → Tipo di attività: "studio dentistico"                            │
│   → Località: "Milano"                                                │
│   → Obiettivo: "prenotazioni"                                        │
│   → Tone of voice: professionale/rassicurante                        │
│   → Brand: nome, colori, logo (se disponibili)                       │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ Utente conferma il brief
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: SCRAPING & INTELLIGENCE (ScarpingNia — servizio esterno)     │
│                                                                       │
│ ScarpingNia riceve il brief e:                                       │
│   1. Scrape Google per "studio dentistico Milano":                   │
│      → Competitor analysis (struttura siti, USP, servizi offerti)    │
│      → Recensioni e parole chiave ricorrenti                         │
│      → Trend del settore (es. "sbiancamento", "invisalign")          │
│   2. Agente UX/UI Pro Max genera il layout ottimale                  │
│   3. Agenti specializzati generano copy, struttura, CTA             │
│   4. Output: HTML + CSS + JS della landing completa                  │
│                                                                       │
│ GiassAi riceve l'output e lo converte in LandingSchema JSON          │
│ (struttura a blocchi per l'editor visuale)                            │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: EDITOR VISUALE (Frontend)                                    │
│                                                                       │
│ L'utente vede la landing generata e può:                             │
│   → Drag & drop per riordinare le sezioni                            │
│   → Click su un testo per editarlo inline                            │
│   → Cambiare colori, font, spacing dal pannello proprietà            │
│   → Aggiungere/rimuovere sezioni dal catalogo blocchi                │
│   → Configurare i form (campi, destinazione dati)                    │
│   → Preview mobile/tablet/desktop                                    │
│   → Collegare un dominio custom                                      │
│                                                                       │
│ Ogni modifica è salvata in tempo reale nel LandingSchema JSON        │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ Utente: "Pubblica"
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: DEPLOY                                                       │
│                                                                       │
│   1. Il LandingSchema viene compilato in HTML/CSS/JS statico         │
│   2. Deploy su Supabase Storage (o CDN dedicato)                     │
│   3. Assegnazione URL: {org-slug}.giassai.app/nome-landing           │
│   4. (Opzionale) Collegamento dominio custom via CNAME                │
│   5. I form vengono collegati all'endpoint webhook di GiassAi        │
│      → I dati possono essere instradati a un Workflow o Gestionale   │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.3 Catalogo Blocchi (Sezioni Disponibili)

```typescript
type BlockType =
  | 'hero'              // Header principale con titolo, sottotitolo, CTA, immagine/video di sfondo
  | 'features'          // Griglia di feature (icona + titolo + descrizione)
  | 'testimonials'      // Carosello/griglia di testimonial
  | 'pricing'           // Tabella prezzi / piani
  | 'faq'               // Accordion FAQ
  | 'contact_form'      // Form di contatto (collegabile a Workflow/Gestionale)
  | 'booking_form'      // Form di prenotazione con date
  | 'gallery'           // Galleria immagini
  | 'video_embed'       // Video YouTube/Vimeo embed
  | 'stats'             // Contatori numerici animati
  | 'team'              // Griglia team con foto e ruolo
  | 'cta_banner'        // Banner con call-to-action
  | 'text_content'      // Blocco di testo libero (rich text)
  | 'logo_cloud'        // Loghi clienti/partner
  | 'comparison'        // Tabella comparativa
  | 'map'               // Mappa Google Maps embed
  | 'footer'            // Footer con link, contatti, social
  | 'navbar'            // Barra di navigazione
  | 'custom_html';      // Blocco HTML custom (per utenti avanzati)
```

### 2.4 LandingSchema JSON

```typescript
interface LandingSchema {
  version: number;
  metadata: {
    title: string;                 // SEO title
    description: string;           // SEO meta description
    favicon?: string;              // URL favicon
    ogImage?: string;              // Open Graph image
    language: string;              // 'it' | 'en' | ...
    analytics?: {
      googleAnalyticsId?: string;
      facebookPixelId?: string;
    };
  };
  theme: {
    primaryColor: string;          // HSL
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;            // Google Font name
    headingFontFamily: string;
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
    style: 'modern' | 'classic' | 'minimal' | 'bold';
  };
  blocks: LandingBlock[];
  forms: FormDefinition[];
}

interface LandingBlock {
  id: string;                      // UUID
  type: BlockType;
  order: number;                   // Ordine nella pagina
  visible: boolean;
  config: Record<string, unknown>; // Configurazione specifica per tipo
  styles: {
    paddingY: 'sm' | 'md' | 'lg' | 'xl';
    backgroundColor?: string;
    backgroundImage?: string;
    textAlign: 'left' | 'center' | 'right';
    maxWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  };
}

// Esempio config per un blocco Hero:
interface HeroConfig {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaUrl: string;
  ctaStyle: 'primary' | 'secondary' | 'outline';
  backgroundType: 'color' | 'image' | 'video' | 'gradient';
  backgroundValue: string;
  layout: 'centered' | 'split-left' | 'split-right';
  overlayOpacity: number;
}

interface FormDefinition {
  id: string;
  name: string;
  fields: {
    name: string;
    type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'date' | 'checkbox';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];           // Per select
  }[];
  submitButtonText: string;
  successMessage: string;
  destination: {
    type: 'webhook' | 'email' | 'supabase_table';
    target: string;               // URL webhook / email / table name
  };
}
```

### 2.5 Editor Visuale — Funzionalità

| Feature | Descrizione |
|---------|-------------|
| **Drag & Drop blocchi** | Riordinamento sezioni nella pagina |
| **Inline text editing** | Click su qualsiasi testo per modificarlo direttamente |
| **Pannello proprietà** | Sidebar destra con opzioni del blocco selezionato |
| **Theme editor** | Pannello per cambiare colori, font, border-radius globalmente |
| **Responsive preview** | Toggle Desktop / Tablet / Mobile |
| **Undo/Redo** | Ctrl+Z / Ctrl+Y su tutte le modifiche |
| **Aggiungi blocco** | Catalogo blocchi con preview, inserimento tramite click |
| **Duplica/Elimina blocco** | Azioni rapide su hover di ogni sezione |
| **Salvataggio auto** | Debounced auto-save ogni 2 secondi dopo una modifica |
| **Pubblica/Bozza** | Toggle stato pubblicazione |

---

## 3. Costruttore Workflow

### 3.1 Visione

Un **editor visuale a canvas completo**, stile Relay.app / n8n / Make.com, dove l'utente può:
1. **Creare workflow da zero** tramite drag & drop di nodi sul canvas
2. **Generare workflow dall'AI** tramite conversazione, e poi modificarli visualmente
3. **Testare workflow** con dati di esempio prima di attivarli

### 3.2 I 4+1 Tipi di Nodo

Oltre ai 4 nodi definiti nell'architettura, aggiungiamo il nodo **Condition** (branching):

```typescript
type NodeType = 'trigger' | 'condition' | 'action' | 'ai_task' | 'human_in_the_loop';
```

#### Nodo: Trigger (Punto di ingresso)

```typescript
interface TriggerConfig {
  source:
    | 'webhook'              // URL generato, riceve POST esterni
    | 'schedule'             // Cron expression (ogni giorno, ogni ora, ecc.)
    | 'form_submission'      // Form su una Landing Page GiassAi
    | 'database_change'      // INSERT/UPDATE/DELETE su tabella Gestionale
    | 'email_received'       // Email in arrivo (futuro)
    | 'manual';              // L'utente clicca "Esegui" dalla dashboard

  // Config specifiche per source
  webhookUrl?: string;
  cronExpression?: string;
  cronHumanLabel?: string;         // "Ogni lunedì alle 9:00"
  formId?: string;
  tableName?: string;
  tableOperation?: 'INSERT' | 'UPDATE' | 'DELETE';
  
  // Filtro opzionale sui dati in ingresso
  filters?: FilterCondition[];
}
```

#### Nodo: Condition (Branching — NUOVO)

```typescript
interface ConditionConfig {
  // Condizioni valutate come AND/OR
  logic: 'and' | 'or';
  conditions: {
    field: string;                 // Campo dal contesto: "trigger.data.importo"
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
    value: unknown;
  }[];
  // Il nodo Condition ha DUE uscite:
  trueNextNodeId: string;          // Se la condizione è vera → vai qui
  falseNextNodeId: string | null;  // Se falsa → vai qui (o fermati)
}
```

#### Nodo: Action (Operazione concreta)

```typescript
interface ActionConfig {
  integration: string;
  operation: string;
  params: Record<string, unknown>;
  inputMapping: Record<string, string>;  // Template: "{{trigger.data.email}}"
}

// Integrazioni disponibili al lancio (V1):
type Integration =
  | 'supabase'         // Insert/Update/Delete righe nel Gestionale
  | 'email_smtp'       // Invia email (SMTP generico)
  | 'email_resend'     // Invia email (via Resend API)
  | 'webhook_call'     // Chiama un URL esterno (POST/GET)
  | 'slack'            // Invia messaggio su Slack
  | 'whatsapp'         // Invia messaggio WhatsApp (via Twilio/360dialog)
  | 'google_sheets'    // Aggiungi riga a Google Sheet
  | 'stripe'           // Crea payment link / verifica pagamento
  | 'telegram'         // Invia messaggio Telegram bot
  | 'delay';           // Aspetta N minuti/ore prima del nodo successivo
```

#### Nodo: AI Task (Elaborazione intelligente)

```typescript
interface AiTaskConfig {
  taskType:
    | 'classify'        // Classifica un dato (es. priorità, categoria, sentiment)
    | 'extract'         // Estrai informazioni strutturate da testo libero
    | 'generate'        // Genera testo (email di risposta, riassunto, ecc.)
    | 'transform'       // Trasforma/arricchisci dati
    | 'decide';         // Prendi una decisione basata su regole complesse

  prompt: string;                  // Prompt template con {{variabili}}
  model: 'haiku' | 'mini';        // Solo modelli economici
  inputFields: string[];           // Campi iniettati dal contesto
  outputSchema: Record<string, 'string' | 'number' | 'boolean' | 'json'>;
  
  // Validazione output: se il modello non rispetta lo schema, retry automatico
  maxRetries: number;              // Default: 2
}
```

#### Nodo: Human-in-the-Loop (Approvazione umana)

```typescript
interface HumanReviewConfig {
  title: string;
  description: string;
  showFields: string[];            // Dati da mostrare
  actions: {
    label: string;                 // "Approva", "Rifiuta", "Modifica e Approva"
    value: string;
    style: 'primary' | 'danger' | 'secondary';
    requireComment: boolean;       // Richiedi un commento prima dell'azione
  }[];
  assignTo: 'any_member' | 'admin_only' | 'specific_user';
  specificUserId?: string;
  timeout?: {
    hours: number;
    defaultAction: string;
  };
  notifyVia: ('dashboard' | 'email' | 'push')[];
}
```

### 3.3 Canvas Visuale — Architettura Frontend

```
┌───────────────────────────────────────────────────────────────────┐
│                    WORKFLOW CANVAS EDITOR                          │
│                                                                    │
│  ┌──────────────┐                                                  │
│  │  TOOLBAR      │  Nodi trascinabili:                             │
│  │               │  [⚡ Trigger] [🔀 Condition] [⚙️ Action]       │
│  │  (sinistra)   │  [🤖 AI Task] [👤 Human Review]                │
│  └──────────────┘                                                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │     CANVAS (pannable, zoomable)                                │  │
│  │                                                                │  │
│  │     ┌─────────┐                                                │  │
│  │     │ Trigger  │──────┐                                        │  │
│  │     └─────────┘      │                                        │  │
│  │                       ▼                                        │  │
│  │                 ┌──────────┐                                   │  │
│  │                 │Condition │──── True ──→ ┌──────────┐         │  │
│  │                 │ > €500   │              │ AI Task  │         │  │
│  │                 └──────────┘              └──────────┘         │  │
│  │                       │                        │               │  │
│  │                    False                       ▼               │  │
│  │                       ▼                  ┌──────────┐          │  │
│  │                 ┌──────────┐              │  Human   │          │  │
│  │                 │ Action:  │              │  Review  │          │  │
│  │                 │ Log only │              └──────────┘          │  │
│  │                 └──────────┘                   │               │  │
│  │                                                ▼               │  │
│  │                                          ┌──────────┐          │  │
│  │                                          │ Action:  │          │  │
│  │                                          │ Send SMS │          │  │
│  │                                          └──────────┘          │  │
│  │                                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────┐                                                  │
│  │  PROPERTIES   │  Configurazione del nodo selezionato            │
│  │  PANEL        │  (pannello destro, collassabile)                │
│  │  (destra)     │                                                 │
│  └──────────────┘                                                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  BOTTOM BAR: [💾 Salva] [▶️ Test Run] [🟢 Attiva] [📊 Log] │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### 3.4 Canvas — Dettagli Tecnici

| Feature | Implementazione |
|---------|-----------------|
| **Rendering canvas** | React Flow (libreria open source per diagrammi a nodi) |
| **Drag & drop nodi** | Dal toolbar al canvas |
| **Connessioni** | Click su output port → drag verso input port del nodo successivo |
| **Branching** | Il nodo Condition ha 2 output ports (True / False) |
| **Zoom & Pan** | Scroll per zoom, click+drag sullo sfondo per spostare la vista |
| **Minimap** | Miniatura navigabile nell'angolo basso-destro |
| **Allineamento auto** | I nodi si allineano automaticamente alla griglia |
| **Selezione multipla** | Ctrl+Click o lasso selection per spostare più nodi insieme |
| **Copy/Paste** | Ctrl+C / Ctrl+V per duplicare nodi |

### 3.5 Test Run

Prima di attivare un workflow, l'utente può fare un **test run**:

1. Click su "▶️ Test Run"
2. Si apre un pannello con input di esempio (JSON editabile) che simula il trigger
3. Il workflow viene eseguito nodo per nodo, con evidenziazione visuale:
   - 🔵 In esecuzione (bordo blu pulsante)
   - 🟢 Completato (bordo verde)
   - 🔴 Errore (bordo rosso + messaggio)
   - ⏸️ In attesa di approvazione (bordo arancione)
4. Ogni nodo mostra input/output nel pannello proprietà
5. Le azioni reali (email, webhook) sono **dry-run** (simulate, non inviate)

### 3.6 WorkflowSchema JSON (aggiornato con Condition)

```typescript
interface WorkflowSchema {
  id: string;
  name: string;
  description: string;
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];          // Connessioni tra nodi (per il canvas)
  viewport: {                      // Posizione vista del canvas
    x: number;
    y: number;
    zoom: number;
  };
}

interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };  // Posizione sul canvas
  config: TriggerConfig | ConditionConfig | ActionConfig | AiTaskConfig | HumanReviewConfig;
  onError: 'stop' | 'skip' | 'retry';
}

interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  sourceHandle: 'default' | 'true' | 'false';  // 'true'/'false' per Condition
  targetNodeId: string;
}
```

---

## 4. Idee Video — Piano Editoriale

### 4.1 Visione

Un **piano editoriale video intelligente** con calendario, trend analysis e suggerimenti basati sul settore dell'utente. Non genera video, ma genera **idee, script e piani di pubblicazione** ottimizzati per i social dell'utente.

### 4.2 Funzionalità Core

| Feature | Descrizione | Priorità |
|---------|-------------|----------|
| **Calendario editoriale** | Vista mensile/settimanale con i video pianificati | P0 |
| **Generatore di idee** | L'AI analizza il settore e suggerisce N idee video con hook, script e CTA | P0 |
| **Scheda video dettagliata** | Per ogni idea: titolo, script completo, piattaforma target, hashtag suggeriti, orario ottimale di pubblicazione | P0 |
| **Trend analysis** | L'AI monitora trend del settore e suggerisce contenuti tempestivi | P1 |
| **Status tracking** | Ogni video ha uno stato: Idea → Script → Registrato → Montato → Pubblicato | P1 |
| **Multi-piattaforma** | Suggerimenti differenziati per TikTok, Instagram Reels, YouTube Shorts, LinkedIn | P1 |
| **Ricorrenze** | Suggerimenti basati su festività, eventi di settore, date rilevanti | P2 |
| **Analisi performance** | (Futuro) Collegamento con analytics social per feedback su cosa funziona | P3 |

### 4.3 User Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: SETUP INIZIALE (una tantum)                                  │
│                                                                       │
│ PM Agent chiede:                                                      │
│   → "Che tipo di attività hai?" (es. ristorante, coach, SaaS)        │
│   → "Su quali piattaforme pubblichi?" (TikTok, Reels, YT Shorts)    │
│   → "Quanti video vuoi pubblicare a settimana?" (es. 3)             │
│   → "Qual è il tuo tone of voice?" (serio, ironico, educativo)      │
│   → "Hai prodotti/servizi specifici da promuovere?"                  │
│                                                                       │
│ Output: VideoProfileConfig (salvato nel progetto)                    │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: GENERAZIONE PIANO (AI — Executor/Haiku)                     │
│                                                                       │
│ L'AI genera un piano editoriale per le prossime 4 settimane:         │
│   → N idee video (basate su frequenza richiesta)                     │
│   → Distribuite nel calendario (rispettando orari ottimali)          │
│   → Ogni idea ha: hook, script, hashtag, piattaforma target          │
│   → Include contenuti legati a trend attuali e ricorrenze            │
│                                                                       │
│ Output: VideoIdea[] posizionate nel calendario                        │
└──────────────────────────────┬───────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: INTERFACCIA CALENDARIO                                       │
│                                                                       │
│ L'utente vede:                                                        │
│   → Calendario mensile con card video posizionate                    │
│   → Ogni card: miniatura, titolo, piattaforma, stato                 │
│   → Click su card → dettaglio con script completo                    │
│   → Drag & drop per riposizionare nel calendario                     │
│   → "Genera altre idee" per aggiungere contenuti                     │
│   → "Modifica script" per personalizzare via chat con AI              │
│                                                                       │
│ L'utente gestisce il pipeline: Idea → Script → Registrato → ...      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.4 Data Model

```typescript
interface VideoProfileConfig {
  businessType: string;            // "ristorante", "coach", "SaaS"
  platforms: ('tiktok' | 'instagram_reels' | 'youtube_shorts' | 'linkedin')[];
  videosPerWeek: number;
  toneOfVoice: 'professional' | 'casual' | 'humorous' | 'educational' | 'inspirational';
  targetAudience: string;          // Descrizione libera
  products?: string[];             // Prodotti/servizi da promuovere
  competitors?: string[];          // Account competitor da monitorare (futuro)
  brandKeywords?: string[];        // Parole chiave del brand
}

interface VideoIdea {
  id: string;
  projectId: string;
  
  // Contenuto
  title: string;                   // Titolo breve (per il calendario)
  hook: string;                    // I primi 3 secondi — la frase di apertura
  script: string;                  // Script completo del video
  cta: string;                     // Call to action finale
  hashtags: string[];              // Hashtag suggeriti
  caption: string;                 // Testo del post sotto il video
  
  // Pianificazione
  scheduledDate: string;           // Data pianificata
  scheduledTime: string;           // Orario ottimale suggerito (es. "18:30")
  platform: 'tiktok' | 'instagram_reels' | 'youtube_shorts' | 'linkedin';
  
  // Produzione
  status: 'idea' | 'script_ready' | 'recording' | 'editing' | 'ready' | 'published';
  estimatedDuration: number;       // Secondi (15, 30, 60, 90)
  format: 'talking_head' | 'b_roll' | 'screen_record' | 'text_overlay' | 'tutorial' | 'behind_the_scenes';
  
  // AI Metadata
  trendSource?: string;            // Se l'idea è basata su un trend, link al trend
  category: 'educational' | 'promotional' | 'entertaining' | 'testimonial' | 'trending' | 'seasonal';
  
  // Tracking
  notes: string;                   // Note dell'utente
  createdAt: string;
  updatedAt: string;
}
```

### 4.5 Tabelle Database

```sql
CREATE TABLE public.video_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  config        JSONB NOT NULL,     -- VideoProfileConfig
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.video_ideas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  hook          TEXT NOT NULL,
  script        TEXT NOT NULL,
  cta           TEXT,
  hashtags      TEXT[] DEFAULT '{}',
  caption       TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  platform      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'idea',
  estimated_duration INTEGER,
  format        TEXT,
  trend_source  TEXT,
  category      TEXT NOT NULL DEFAULT 'educational',
  notes         TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
```

### 4.6 Interazione AI per Modifica Script

L'utente può cliccare su un'idea video e modificare lo script con l'AI:

```
Utente: "Rendi l'hook più provocatorio"
AI (Haiku): "Ecco la versione aggiornata dell'hook:
  PRIMA: 'Sai qual è il segreto dei ristoranti stellati?'
  DOPO:  'Il 90% dei ristoranti sbaglia questa cosa. Tu?'"
```

Questa interazione usa il **PM Agent (Haiku)** con il contesto dello script originale.

---

## 5. Collegamento Cross-Progetto

### 5.1 Principio

I collegamenti tra progetti sono **manuali**: l'utente decide esplicitamente cosa collegare. L'interfaccia rende facile il collegamento ma non lo impone.

### 5.2 Flusso di Collegamento

```
┌─────────────────────────────────────────────────────────────────────┐
│ L'utente va nella sezione "Collegamenti" di un progetto             │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  PROGETTO: Landing "Studio Dentistico"                         │  │
│  │                                                                 │  │
│  │  Collegamenti attivi:                                           │  │
│  │    (nessuno)                                                    │  │
│  │                                                                 │  │
│  │  [+ Aggiungi collegamento]                                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Click → mostra dialog:                                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Collega a:                                                     │  │
│  │  ┌─────────────────────────┐ ┌─────────────────────────────┐   │  │
│  │  │ 📊 CRM Clienti          │ │ ⚡ Workflow Lead Nurturing  │   │  │
│  │  │    (Gestionale)          │ │    (Workflow)                │   │  │
│  │  └─────────────────────────┘ └─────────────────────────────┘   │  │
│  │                                                                 │  │
│  │  Tipo di collegamento:                                          │  │
│  │  ○ Form → Workflow (i dati del form triggerano il workflow)     │  │
│  │  ○ Form → Gestionale (i dati del form vanno in una tabella)    │  │
│  │                                                                 │  │
│  │  Mappa i campi:                                                 │  │
│  │  Form "Nome"  →  Gestionale "nome_cliente"                     │  │
│  │  Form "Email" →  Gestionale "email"                            │  │
│  │  Form "Tel"   →  Gestionale "telefono"                         │  │
│  │                                                                 │  │
│  │  [Salva collegamento]                                           │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Tipi di Collegamento Supportati

| Da | A | Tipo Link | Cosa succede |
|---|---|-----------|-------------|
| Landing (form) | Workflow (trigger) | `form_to_workflow` | Il submit del form triggera il workflow |
| Landing (form) | Gestionale (tabella) | `form_to_table` | Il submit inserisce una riga nella tabella |
| Workflow (action) | Gestionale (tabella) | `workflow_to_table` | Un'azione del workflow scrive nel gestionale |
| Gestionale (record change) | Workflow (trigger) | `table_to_workflow` | Un INSERT/UPDATE/DELETE triggera un workflow |
| Video Idea (status change) | Workflow (trigger) | `video_to_workflow` | Quando un video cambia stato, triggera un workflow |

### 5.4 Tabella project_links (aggiornata)

```sql
CREATE TABLE public.project_links (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  target_project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  link_type           TEXT NOT NULL,
  field_mapping       JSONB DEFAULT '{}',   -- Mapping dei campi tra source e target
  config              JSONB DEFAULT '{}',   -- Config aggiuntiva
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_project_id, target_project_id, link_type)
);
```

---

## 6. Matrice Riepilogativa

| | **ERP/Gestionale** | **Landing Page** | **Workflow** | **Idee Video** |
|---|---|---|---|---|
| **Icona** | 📊 | 🌐 | ⚡ | 🎬 |
| **AI di Generazione** | Architect (Opus) | ScarpingNia (esterno) | Architect (Opus) oppure Canvas manuale | Executor (Haiku) |
| **AI di Interazione** | PM (Haiku) | PM (Haiku) | PM (Haiku) | PM (Haiku) |
| **Output AI** | `GestionaleSchema` JSON | `LandingSchema` JSON | `WorkflowSchema` JSON | `VideoIdea[]` |
| **Editor Utente** | Viste (tabella, kanban, calendario) + Form CRUD | Editor visuale drag & drop stile Webflow | Canvas drag & drop con nodi e connessioni | Calendario editoriale + editor script |
| **Deploy** | Tabelle reali su Supabase | HTML statico su CDN | Engine di esecuzione background | N/A (pianificazione) |
| **Collegabile a** | Workflow (trigger su DB change), Landing (form → tabella) | Workflow (form → trigger), Gestionale (form → riga) | Gestionale (action → insert), Landing (trigger da form) | Workflow (status change → trigger) |
| **Complessità V1** | 🔴 Alta | 🔴 Alta (ScarpingNia + Editor) | 🔴 Alta (Canvas + Engine) | 🟡 Media |
| **Persistenza dati** | Schema dinamico per org + audit | `landing_configs` | `workflows` + `workflow_runs` | `video_ideas` + `video_profiles` |

### Ordine di Implementazione Suggerito

```
Fase 1 (Foundation):  Chat PM Agent + Database core
Fase 2:               Costruttore ERP/Gestionale (più alto valore di business)
Fase 3:               Costruttore Workflow (serve per i collegamenti)
Fase 4:               Idee Video (complessità media, alto valore percepito)
Fase 5:               Costruttore Landing (richiede ScarpingNia + editor complesso)
Fase 6:               Collegamenti Cross-Progetto (richiede almeno 2 tipi di progetto)
```

### Aggiornamento al tipo `project.type`

```typescript
// Prima: 'gestionale' | 'landing' | 'workflow'
// Dopo:
type ProjectType = 'gestionale' | 'landing' | 'workflow' | 'video_ideas';
```
