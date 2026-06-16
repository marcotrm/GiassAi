# GiassAi — Piano di Creazione: AI Master "Gestionale"

> **Versione:** 0.1.0
> **Data:** 2026-06-16
> **Status:** Spec operativa — primo dei tre AI Master da implementare
> **Prerequisito:** `giassai-architecture.md` (documento fondativo)

---

## 0. Cosa stiamo costruendo

Il primo dei tre **AI Master** del prodotto: il sistema di agenti che, partendo da un brief in
linguaggio naturale, **genera e deploya un gestionale** (database relazionale + UI auto-generata)
nello schema Supabase dedicato all'organizzazione (`org_{org_id}`).

Gli altri due master (Workflow, Landing) riuseranno lo **stesso scheletro** descritto qui.

---

## 1. Principi architetturali (non negoziabili)

### 1.1 Pattern B — Codice Orchestratore (NON Opus agentico)

Il "master Opus + subagenti" **non** è Opus che decide autonomamente quando spawnare agenti.
È il **codice Node** a fare da direttore d'orchestra:

- Opus viene chiamato **una sola volta**, per il pezzo difficile: progettare lo schema.
- Il codice fa poi il **fan-out** di chiamate Haiku in parallelo per i task ripetitivi.
- Opus non "gestisce" i subagenti → non paghi token di coordinamento.

**Vantaggi:** più economico (Opus tocca solo il ragionamento critico), deterministico, testabile,
ogni step isolabile e ri-eseguibile.

### 1.2 L'AI genera lo SPEC, mai il SQL

L'LLM produce **solo JSON validato da Zod**. Un "compilatore" in TypeScript trasforma il JSON in DDL.
L'LLM non emette mai SQL eseguibile → impossibile che un'allucinazione droppi una tabella.

```
Opus → GestionaleSchema (JSON) → [gate Zod] → SchemaCompiler (TS) → DDL → deploy
```

### 1.3 Approvazione umana prima del deploy

Lo schema generato viene mostrato all'utente come **anteprima**. Nessun DDL viene eseguito
finché l'utente non clicca "Crea il gestionale".

---

## 2. Topologia degli agenti

```
Utente ──chat──> PM Agent (Haiku) ── brief confermato ──┐
                                                         ▼
                                       ORCHESTRATORE (codice Node)
                                                         │
                   ┌──────────────────────────────────────┤
                   ▼  (1 chiamata, temp 0.1, tool-use)     │
           ARCHITECT (Opus 4.8)                            │
           → GestionaleSchema JSON                         │
                   │                                        │
           [GATE] validazione Zod ──fail──> retry (max 2)   │
                   │ ok                                      │
                   ▼  fan-out parallelo (codice)             │
       ┌───────────┼────────────┬───────────────┐           │
       ▼           ▼            ▼               ▼           │
  Views gen    Form gen     Seed data      RLS+DDL          │
  (Haiku ×N)   (Haiku ×N)   (Haiku ×N)     (CODICE)         │
       └───────────┴────────────┴───────────────┘           │
                   │                                         │
                   ▼                                         │
        Persist GestionaleSchema (is_deployed=false)         │
                   │                                         │
        ANTEPRIMA all'utente ──approva──> DEPLOY su org_{id} ┘
```

---

## 3. Assegnazione modelli

| Step | Agente | Modello | temp | Perché |
|------|--------|---------|------|--------|
| Brief in chat | PM | `claude-haiku-4-5-20251001` | 0.7 | Volume alto, conversazionale |
| Design schema | Architect | `claude-opus-4-8` | 0.1 | Errore qui = fatale: relazioni, tipi, vincoli |
| Views per tabella | subagente | `claude-haiku-4-5-20251001` | 0.3 | Ripetitivo, guidato dallo schema |
| Form per tabella | subagente | `claude-haiku-4-5-20251001` | 0.3 | Idem |
| Seed data (opz.) | subagente | `claude-haiku-4-5-20251001` | 0.6 | Dati esempio realistici |
| RLS + DDL | — (codice) | — | — | Mai SQL all'LLM |

> Sonnet (`claude-sonnet-4-6`) **non serve** per il gestionale. Entrerà nel master Landing (build HTML).
> I prezzi per il calcolo costi vanno presi dal listino corrente (vedi §10) — gli ID modello nel
> documento fondativo erano placeholder vecchi e sono stati corretti qui.

---

## 4. Il contratto dati — `GestionaleSchema`

Unico output dell'Architect. Vive in `lib/api-zod` come schema Zod ed è il **gate**: se non valida,
non si procede. Persistito in `gestionale_schemas.schema_json`.

```typescript
// lib/api-zod/src/gestionale-schema.ts

export const ColumnType = z.enum([
  "text", "long_text", "number", "decimal", "currency",
  "boolean", "date", "datetime", "enum", "relation",
  "email", "phone", "url", "file",
]);

export const ColumnSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),   // snake_case
  label: z.string(),                              // "Nome cliente" (UI italiana)
  type: ColumnType,
  nullable: z.boolean().default(true),
  unique: z.boolean().default(false),
  default: z.unknown().optional(),
  enumName: z.string().optional(),                // se type=enum
  relationTo: z.string().optional(),              // se type=relation → table.name target
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    regex: z.string().optional(),
    maxLength: z.number().optional(),
  }).partial().optional(),
  helpText: z.string().optional(),
});

export const ViewConfigSchema = z.object({
  type: z.enum(["table", "kanban", "calendar", "gallery"]),
  label: z.string(),
  visibleColumns: z.array(z.string()),
  groupByColumn: z.string().optional(),           // per kanban
  dateColumn: z.string().optional(),              // per calendar
  defaultSort: z.object({ column: z.string(), dir: z.enum(["asc","desc"]) }).optional(),
});

export const TableSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),    // snake_case → org_{id}.clienti
  label: z.string(),                              // "Clienti"
  description: z.string().optional(),
  primaryDisplayColumn: z.string(),               // colonna che "rappresenta" la riga
  columns: z.array(ColumnSchema).min(1),
  views: z.array(ViewConfigSchema).optional(),    // ← riempito dal subagente, non da Opus
  formLayout: z.unknown().optional(),             // ← riempito dal subagente
});

export const RelationSchema = z.object({
  type: z.enum(["one_to_many", "many_to_many"]),
  from: z.string(),                               // table.name
  to: z.string(),                                 // table.name
  fromColumn: z.string().optional(),              // FK per 1:N
  joinTable: z.string().optional(),               // per N:M
});

export const EnumDefSchema = z.object({
  name: z.string(),
  values: z.array(z.object({ value: z.string(), label: z.string() })).min(1),
});

export const GestionaleSchemaSchema = z.object({
  version: z.number().int().default(1),
  name: z.string(),
  tables: z.array(TableSchema).min(1).max(20),
  relations: z.array(RelationSchema).default([]),
  enums: z.array(EnumDefSchema).default([]),
});

export type GestionaleSchemaDef = z.infer<typeof GestionaleSchemaSchema>;
```

**Invarianti che il compiler verifica DOPO Zod** (regole cross-field non esprimibili in Zod base):
- ogni `relation`/`enum` referenziata da una colonna esiste;
- `primaryDisplayColumn` e ogni colonna in una `view` esistono nella tabella;
- niente cicli di FK non risolvibili nell'ordine di creazione tabelle;
- nomi tabella/colonna non sono parole riservate SQL.

---

## 5. La pipeline dell'orchestratore

`artifacts/api-server/src/services/ai/gestionale/orchestrator.ts`

```
generateGestionale(projectId, brief):
  1. schema = await architect(brief)              // Opus, tool-use → JSON
  2. parsed = GestionaleSchemaSchema.safeParse(schema)
     se !parsed.ok → re-prompt Opus con gli errori (max 2 tentativi) → altrimenti errore
  3. invariants = checkInvariants(parsed)          // codice, §4
     se !ok → re-prompt mirato
  4. fan-out PARALLELO (Promise.all) per ogni tabella:
        views[t]   = haikuViews(table, schema)
        forms[t]   = haikuForm(table, schema)
        seeds[t]   = haikuSeed(table, schema)       // opzionale, dietro flag
  5. merge views/forms dentro lo schema
  6. salva in gestionale_schemas (is_deployed=false, version)
  7. logga costi in ai_usage_log per ogni chiamata
  8. ritorna schema completo → frontend mostra anteprima
deployGestionale(schemaId):                         // step separato, post-approvazione
  9. ddl = SchemaCompiler.toDDL(schema, org_id)
  10. esegui ddl in transazione su org_{org_id}
  11. genera + applica RLS policies (codice)
  12. insert seed data (se presenti)
  13. update gestionale_schemas: is_deployed=true, deployed_at=now()
```

Punti chiave:
- **Step 1–8** = "generazione" (reversibile, nessun effetto sul DB reale).
- **Step 9–13** = "deploy" (effetti reali), dietro approvazione umana esplicita.
- Ogni chiamata LLM logga `tokens_in/out` + `cost_usd` in `ai_usage_log`.

---

## 6. Prompt dell'Architect (Opus)

Chiamata **non-streaming, tool-use forzato** (lo strumento è lo schema `GestionaleSchema`).
Temperatura 0.1.

```
Sei l'Architetto di GiassAi. Il tuo unico compito è progettare lo SCHEMA RELAZIONALE
di un gestionale partendo dal brief dell'utente.

REGOLE FERREE:
- Produci ESCLUSIVAMENTE lo schema tramite lo strumento `emit_schema`. Nessun testo libero.
- Pensa come un DBA esperto: normalizza (3NF), evita ridondanze, usa relazioni esplicite.
- Tabelle e colonne in snake_case inglese; label in ITALIANO leggibile.
- Per ogni entità del business crea una tabella. Per i campi a scelta fissa usa `enum`.
- Per i legami fra entità usa `relation` (one_to_many con fromColumn, o many_to_many con joinTable).
- Ogni tabella DEVE avere una `primaryDisplayColumn` (la colonna che identifica la riga a colpo d'occhio).
- NON aggiungere id/created_at/updated_at: li aggiunge il sistema automaticamente.
- NON inventare entità non implicite nel brief. Se mancano informazioni critiche, NON deployare:
  scegli lo schema minimo ragionevole e segnala le assunzioni nel campo description delle tabelle.
- Massimo 20 tabelle. Se il dominio è più grande, modella il nucleo essenziale.

Esempio di ragionamento (palestra): clienti, abbonamenti (enum tipo: mensile/annuale),
pagamenti (relation→clienti), accessi (relation→clienti). Relazione clienti 1:N pagamenti.
```

`emit_schema` = tool con `input_schema` = JSON Schema derivato da `GestionaleSchemaSchema`.
Il tool-use garantisce output strutturato senza parsing fragile.

---

## 7. Prompt dei subagenti (Haiku)

Ognuno riceve **una sola tabella** + il contesto schema, e ritorna un frammento JSON.

### 7.1 Views generator
```
Data questa tabella di un gestionale, proponi 1-3 viste utili (table sempre; kanban se c'è
una colonna enum di "stato"; calendar se c'è una colonna date/datetime; gallery se c'è un file/immagine).
Per ogni vista specifica visibleColumns (le 4-6 più rilevanti) e defaultSort.
Rispondi SOLO con l'array JSON di ViewConfig. Tabella: {table_json}
```

### 7.2 Form generator
```
Genera il layout del form di inserimento/modifica per questa tabella: ordine logico dei campi,
raggruppamenti (sezioni), widget per tipo (es. relation→picker, enum→select, date→datepicker),
e testi di help in italiano per i campi non ovvi. Rispondi SOLO con il JSON formLayout. Tabella: {table_json}
```

### 7.3 Seed data generator (opzionale, dietro flag `withSeed`)
```
Genera da 3 a 5 righe di dati ESEMPIO realistici e coerenti col settore "{business}" per questa
tabella. Rispetta tipi, enum e vincoli. Per le relation usa indici 0-based delle righe seed
della tabella collegata. Rispondi SOLO con array JSON di righe. Tabella: {table_json}
```

---

## 8. Schema Compiler (JSON → DDL) — codice, zero AI

`artifacts/api-server/src/services/ai/gestionale/schema-compiler.ts`

Responsabilità:
- map `ColumnType` → tipo Postgres:
  `text/email/phone/url → text`, `long_text → text`, `number → integer`, `decimal → numeric`,
  `currency → numeric(12,2)`, `boolean → boolean`, `date → date`, `datetime → timestamptz`,
  `enum → text + CHECK IN (...)` (o tipo enum nativo), `relation → uuid + FK`, `file → text` (URL storage).
- ogni tabella ottiene automaticamente: `id uuid pk default gen_random_uuid()`,
  `created_at timestamptz default now()`, `updated_at timestamptz default now()`,
  `org_id uuid not null` (per RLS).
- many_to_many → genera la join table.
- ordina le tabelle per dipendenze FK (topological sort) prima di emettere il DDL.
- **whitelist rigida**: nomi validati contro regex + lista parole riservate; valori solo via
  query parametrizzate (mai string-interpolation di dati utente).
- output: array di statement DDL eseguiti in **una transazione** (tutto o niente).

### RLS (codice)
Per ogni tabella generata:
```sql
ALTER TABLE org_{org_id}.{table} ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation ON org_{org_id}.{table}
  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));
```

---

## 9. API & file da creare (ordine di build)

Checklist implementativa, in ordine di dipendenza:

- [ ] **1. Contratto** — `lib/api-zod/src/gestionale-schema.ts` (§4) + export in `index.ts`
- [ ] **2. Model adapter** — estendere `services/ai/model-adapter.ts` con `completeJson(model, messages, tool)`:
      chiamata Anthropic **non-streaming** con `tools` + `tool_choice` forzato, ritorna l'oggetto validato.
      (Oggi l'adapter è solo streaming → questa è la lacuna tecnica principale.)
- [ ] **3. Architect** — `services/ai/gestionale/architect-agent.ts` (§6): Opus + tool `emit_schema`, retry su Zod-fail.
- [ ] **4. Subagenti** — `services/ai/gestionale/subagents/{views,form,seed}.ts` (§7): Haiku, fan-out.
- [ ] **5. Compiler** — `services/ai/gestionale/schema-compiler.ts` (§8): JSON→DDL + RLS, transazione.
- [ ] **6. Orchestratore** — `services/ai/gestionale/orchestrator.ts` (§5): sequenzia tutto, logga `ai_usage_log`.
- [ ] **7. Route** — `routes/gestionali.ts`:
      - `POST /api/gestionali/:projectId/generate` → genera schema (no deploy), ritorna anteprima
      - `GET  /api/gestionali/:projectId/schema` → schema corrente
      - `POST /api/gestionali/:schemaId/deploy` → esegue DDL su org_{id}
      - `GET  /api/gestionali/:projectId/data?table=...` → query dati
      - `POST /api/gestionali/:projectId/data` → insert riga (validata contro lo schema)
- [ ] **8. Router** — aggiornare `services/ai/agent-router.ts`: rilevare intento "conferma creazione gestionale"
      e invocare l'orchestratore invece di rispondere col PM.
- [ ] **9. Frontend** — `pages/Gestionali.tsx`: schermata **anteprima schema** (tabelle/relazioni/viste)
      con bottone "Crea il gestionale" → chiama `/deploy`. Poi vista dati con le `views` generate.

Step **2** è il blocco tecnico da sbloccare per primo (serve la chiamata JSON non-streaming).

---

## 10. Modello di costo

Una creazione gestionale =
- **1× Opus** (schema): input = brief + system (~1–3k token), output = schema JSON (~2–6k token).
- **N× Haiku** in parallelo (N = numero tabelle, tipicamente 4–8), ognuna piccola (~1–2k token).

Il costo è **dominato dalla singola chiamata Opus**; tutto il fan-out Haiku è marginale.
Rispetto a un ipotetico "tutto Opus" (Opus anche per views/form/seed), si risparmia la gran parte
del costo variabile. → Allineare i prezzi unitari al listino Anthropic corrente prima di pubblicare
numeri (i valori nel documento fondativo erano su model-ID obsoleti).

Ogni chiamata scrive una riga in `ai_usage_log` (`agent_role`, `model`, token, `cost_usd`,
`context_type='project_generation'`) → dashboard costi reale, non stimata.

---

## 11. Questioni aperte (da decidere strada facendo)

1. **Tipo enum nativo Postgres vs CHECK constraint** — il CHECK è più semplice da alterare quando
   l'utente aggiunge un valore; l'enum nativo è più "pulito". Proposta: CHECK constraint.
2. **Schema per-org (`org_{id}`) vs tabelle prefissate in `public`** — il doc fondativo dice schema
   dedicato; va verificato che il ruolo Supabase abbia i permessi `CREATE SCHEMA`/`CREATE TABLE` a runtime.
3. **Versioning/migrazioni** quando l'utente modifica un gestionale già deployato (ALTER vs ricreazione).
   Fuori scope per la v1 (solo create), ma la colonna `version` è già pronta.
4. **Limite tabelle/colonne** per piano (`free`/`pro`) — gancio in `organizations.plan`.

---

## 12. Riuso per gli altri due master

Lo stesso scheletro (Architect Opus → gate Zod → fan-out Haiku → compiler codice → deploy con
approvazione) si applica a:
- **Workflow**: Opus disegna il grafo nodi (trigger/action/ai_task/human) → Haiku riempie config e
  prompt degli `ai_task` → "compiler" = validazione grafo + persistenza → engine esegue.
- **Landing**: Opus/Sonnet fa strategia+struttura sezioni → **Sonnet costruisce l'HTML** (logica
  ScrapingNia riscritta in Node) → Haiku genera le 10 idee social. Subagenti dedicati per
  analisi attività/competitor/immagini.
```
