# GiassAi — Piano di Creazione: AI Master "Workflow"

> **Versione:** 0.1.0
> **Data:** 2026-06-16
> **Status:** Spec operativa — secondo dei tre AI Master
> **Prerequisiti:** `giassai-architecture.md`, `gestionale-agent-plan.md`, `ecosystem-integration-plan.md`

---

## 0. Cosa stiamo costruendo

Il motore di automazione stile **Relay.app**: da un brief in linguaggio naturale, l'AI genera un
**workflow** (grafo di nodi trigger → action → ai_task → human) e un **execution engine** lo esegue,
mettendosi in pausa sulle approvazioni umane e accumulando contesto tra i nodi.

Il Workflow è anche il **ponte logico** fra gli altri due ambienti: un form di una landing fa da
trigger, un'azione scrive in un gestionale. La parte di comunicazione è dettagliata in
`ecosystem-integration-plan.md`; qui copriamo la **generazione** e l'**esecuzione**.

---

## 1. Principi (ereditati dal master Gestionale)

- **Pattern B — codice orchestratore**: Opus chiamato 1 volta per disegnare il grafo; Haiku in
  fan-out per riempire i config e scrivere i prompt degli `ai_task`.
- **AI genera lo SPEC (JSON validato), non codice eseguibile.** L'engine che esegue è codice TS testato.
- **Approvazione umana prima di attivare** un workflow (`is_active=false` finché l'utente non conferma).

---

## 2. Topologia degli agenti (generazione)

```
Utente ──chat──> PM (Haiku) ── brief confermato ──┐
                                                   ▼
                                  ORCHESTRATORE (codice Node)
                                                   │
                  ┌──────────────────────────────────┤
                  ▼ (1 chiamata, temp 0.1, tool-use)  │
          ARCHITECT (Opus 4.8)                        │
          → WorkflowDef JSON (nodi + edge + links)    │
                  │                                    │
          [GATE] Zod + validazione grafo ──fail──> retry
                  │ ok                                 │
                  ▼ fan-out parallelo (codice)         │
        ┌─────────┼──────────────┐                     │
        ▼         ▼              ▼                     │
  ai_task prompt  inputMapping   labels/descr          │
  (Haiku ×N)      (Haiku ×N)     (Haiku)               │
        └─────────┴──────────────┘                     │
                  │                                     │
                  ▼                                     │
   Persist workflows(is_active=false) + project_links   │
                  │                                     │
        ANTEPRIMA grafo ──attiva──> registra trigger ───┘
```

L'**esecuzione** è un sottosistema separato (§6, l'Execution Engine) che NON usa Opus.

---

## 3. Assegnazione modelli

| Step | Agente | Modello | temp | Note |
|------|--------|---------|------|------|
| Brief in chat | PM | `claude-haiku-4-5-20251001` | 0.7 | |
| Design grafo workflow | Architect | `claude-opus-4-8` | 0.1 | logica dei nodi e delle dipendenze |
| Scrittura prompt degli `ai_task` | subagente | `claude-haiku-4-5-20251001` | 0.4 | un prompt per nodo ai_task |
| `inputMapping`/template variabili | subagente | `claude-haiku-4-5-20251001` | 0.2 | mappatura `{{...}}` deterministica |
| **Esecuzione** nodi `ai_task` (runtime) | Executor | `claude-haiku-4-5-20251001` | 0.3 | a ogni run, NON in generazione |

> Opus solo in fase di design. A runtime gli `ai_task` girano su Haiku (throughput + costo minimo).

---

## 4. Il contratto dati — `WorkflowDef`

In `lib/api-zod`. Persistito in `workflows.nodes` (+ `edges`). I 4 tipi di nodo seguono il documento
fondativo (§2 di `giassai-architecture.md`).

```typescript
// lib/api-zod/src/workflow-schema.ts

export const NodeType = z.enum(["trigger", "action", "ai_task", "human_in_the_loop"]);

export const TriggerConfig = z.object({
  source: z.enum(["webhook", "schedule", "database_change", "form_submission", "manual"]),
  webhookUrl: z.string().optional(),
  cronExpression: z.string().optional(),
  tableName: z.string().optional(),
  operation: z.enum(["INSERT", "UPDATE", "DELETE"]).optional(),
  formId: z.string().optional(),
  // collega il trigger a un progetto sorgente (landing/gestionale) → vedi ecosystem doc
  sourceProjectId: z.string().uuid().optional(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(["eq", "neq", "gt", "lt", "contains"]),
    value: z.unknown(),
  })).optional(),
});

export const ActionConfig = z.object({
  integration: z.enum(["supabase", "email", "slack", "http", "google_sheets"]),
  operation: z.string(),                       // es. 'insert_row' | 'send_email'
  params: z.record(z.unknown()),               // es. { table: 'clienti' }
  // collega l'azione a un progetto target (gestionale) → vedi ecosystem doc
  targetProjectId: z.string().uuid().optional(),
  inputMapping: z.record(z.string()),          // { nome: "{{trigger.data.name}}" }
});

export const AiTaskConfig = z.object({
  prompt: z.string(),                          // template con {{input.*}}
  model: z.enum(["haiku", "mini"]).default("haiku"),
  inputFields: z.array(z.string()),
  outputSchema: z.record(z.enum(["string", "number", "boolean", "json"])),
});

export const HumanReviewConfig = z.object({
  title: z.string(),
  description: z.string().optional(),
  showFields: z.array(z.string()),
  actions: z.array(z.object({
    label: z.string(), value: z.string(),
    style: z.enum(["primary", "danger", "secondary"]),
  })).min(1),
  timeout: z.object({ hours: z.number(), defaultAction: z.string() }).optional(),
  notifyVia: z.array(z.enum(["dashboard", "email", "push"])).default(["dashboard"]),
});

export const WorkflowNode = z.object({
  id: z.string(),                              // UUID v4
  type: NodeType,
  label: z.string(),
  position: z.number().int(),                  // ordine di esecuzione
  config: z.union([TriggerConfig, ActionConfig, AiTaskConfig, HumanReviewConfig]),
  nextNodeId: z.string().nullable(),           // linked list
  onError: z.enum(["stop", "skip", "retry"]).default("stop"),
});

export const WorkflowDef = z.object({
  name: z.string(),
  description: z.string().optional(),
  nodes: z.array(WorkflowNode).min(1),
  // collegamenti cross-progetto che l'Architect deve creare (vedi ecosystem doc)
  projectLinks: z.array(z.object({
    sourceProjectId: z.string().uuid(),
    targetProjectId: z.string().uuid(),
    linkType: z.string(),
    fieldMapping: z.record(z.string()).optional(),
  })).default([]),
});
```

**Invarianti che il validatore di grafo verifica dopo Zod:**
- esiste esattamente **un** nodo `trigger` ed è il primo (`position=0`);
- la catena `nextNodeId` è connessa e aciclica, termina con `null`;
- ogni variabile `{{x.y}}` in un `inputMapping`/`prompt` riferisce un output prodotto da un nodo
  **precedente** nella catena (no forward-reference);
- i `targetProjectId`/`sourceProjectId` esistono e appartengono alla stessa org;
- per ogni `targetProjectId` di tipo gestionale, la `table`/colonne in `inputMapping` esistono
  nello schema deployato del gestionale (cross-check con `gestionale_schemas`).

---

## 5. Pipeline dell'orchestratore (generazione)

`services/ai/workflow/orchestrator.ts`

```
generateWorkflow(projectId, brief, orgProjects):
  1. def = await architect(brief, orgProjects)   // Opus: gli passiamo l'elenco progetti dell'org
                                                  // così può collegare landing/gestionali esistenti
  2. parsed = WorkflowDef.safeParse(def)          // gate Zod
  3. validateGraph(parsed)                         // §4 invarianti, retry mirato su Opus se fallisce
  4. fan-out Haiku per ogni nodo ai_task: raffina prompt + outputSchema + inputMapping
  5. salva workflows (nodes, is_active=false) + crea project_links
  6. logga ai_usage_log
  7. ritorna def → anteprima grafo nel frontend
activateWorkflow(workflowId):                      // dopo approvazione
  8. registra il trigger nel Trigger Registry (§7)
  9. is_active=true
```

L'Architect riceve **l'elenco dei progetti dell'org** (gestionali + landing) così può agganciare
trigger/azioni a progetti reali e produrre i `projectLinks` corretti. È il cuore della coesistenza.

---

## 6. Execution Engine (runtime, zero Opus)

`services/workflow/engine.ts` — il pezzo più importante e più testabile.

```
runWorkflow(workflowId, triggerData):
  run = create workflow_runs(status='running', context={ trigger: { data: triggerData } })
  node = primo nodo dopo il trigger
  while node:
    switch node.type:
      action:    result = runAction(node.config, run.context)         // integration runner
      ai_task:   result = await runAiTask(node.config, run.context)    // Haiku, output validato vs outputSchema
      human_in_the_loop:
                 create pending_approvals(...)
                 update run(status='paused_human_review', current_node_id=node.id)
                 return            // l'engine si ferma; riprende su resolve dell'approvazione
    run.context[node.id] = result                                     // accumulo contesto
    persist run.context
    node = resolveNext(node, result)                                  // nextNodeId, o onError
  update run(status='completed', completed_at=now())

resumeWorkflow(runId, approvalValue):                                  // chiamato da POST /approvals/:id/resolve
  carica run, riparte dal nodo successivo all'human review con context['human_review']=approvalValue
```

Dettagli:
- **Context accumulation**: `run.context` è un oggetto `{ trigger: {...}, node_x: {...}, ... }`.
  Le variabili `{{trigger.data.email}}`, `{{node_2.output.priority}}` si risolvono da qui (resolver in codice).
- **Pausa/resume durabili**: lo stato vive in `workflow_runs.context` su DB → l'engine può morire e
  ripartire. Una human-review può restare in pausa giorni.
- **onError**: `stop` (fail run), `skip` (vai al nextNode), `retry` (N tentativi con backoff).
- **Action runner**: registry di integrazioni; `supabase.insert_row` scrive nel gestionale target
  (validando contro lo schema), `email.send` via Resend, `http` per webhook esterni.
- **Schedule trigger**: cron via worker (BullMQ o cron node) che invoca `runWorkflow`.

---

## 7. Trigger Registry — l'aggancio agli altri ambienti

Quando un workflow viene attivato, il suo trigger viene registrato così da poter essere "acceso"
da eventi degli altri ambienti (dettaglio completo in `ecosystem-integration-plan.md`):

| `source` | Chi lo accende | Meccanismo |
|----------|----------------|-----------|
| `form_submission` | una landing | il form POSTa a `/api/hooks/form/:formId` → lookup workflow → `runWorkflow` |
| `database_change` | un gestionale | trigger Postgres / Supabase Realtime su `org_{id}.{table}` → enqueue run |
| `webhook` | esterno | URL pubblico generato → `runWorkflow` |
| `schedule` | cron interno | worker temporizzato |
| `manual` | utente | bottone "Esegui ora" in dashboard |

---

## 8. API & file da creare (ordine di build)

- [ ] **1. Contratto** — `lib/api-zod/src/workflow-schema.ts` (§4)
- [ ] **2. Architect** — `services/ai/workflow/architect-agent.ts` (Opus + tool `emit_workflow`, riceve org projects)
- [ ] **3. Subagenti** — `services/ai/workflow/subagents/{ai-task-prompt,input-mapping}.ts` (Haiku)
- [ ] **4. Graph validator** — `services/workflow/validate-graph.ts` (§4 invarianti)
- [ ] **5. Orchestratore** — `services/ai/workflow/orchestrator.ts` (§5)
- [ ] **6. Execution Engine** — `services/workflow/engine.ts` (§6) + `context-resolver.ts` (`{{...}}`)
- [ ] **7. Action runner** — `services/workflow/actions/` (supabase, email, http, ...)
- [ ] **8. Trigger Registry** — `services/workflow/triggers.ts` (§7) + worker schedule
- [ ] **9. Route** — `routes/workflows.ts`:
      - `POST /api/workflows/:projectId/generate` → genera grafo (no attivazione)
      - `POST /api/workflows/:id/activate` → registra trigger
      - `POST /api/workflows/:id/test` → test run con dati fittizi
      - `GET  /api/workflows/:id/runs` → storico esecuzioni
      - `POST /api/workflows/:id/runs/:runId/approve` → risolve human-in-the-loop
      - `POST /api/hooks/form/:formId` → endpoint pubblico per i form delle landing
- [ ] **10. Frontend** — `pages/Workflow.tsx`: anteprima grafo (React Flow), dashboard run + approvazioni pendenti

Dipende dal `completeJson()` del model-adapter (lacuna già segnata nel piano Gestionale).

---

## 9. Costo

- **Generazione**: 1× Opus (grafo) + N× Haiku (prompt ai_task). Costo dominato da Opus, una tantum.
- **Esecuzione**: per ogni run, M× Haiku (uno per nodo `ai_task`). Throughput-friendly.
  Ogni run logga in `ai_usage_log` con `context_type='workflow_execution'`.

---

## 10. Questioni aperte

1. **Worker/queue**: BullMQ (Redis) vs cron semplice per schedule e retry. Redis aggiunge infra.
2. **database_change**: trigger Postgres nativi vs polling Supabase Realtime. Da prototipare.
3. **Sicurezza webhook**: firma/segreto sugli endpoint `/api/hooks/*` per evitare run abusivi.
4. **Idempotenza**: dedup di trigger ripetuti (stesso form inviato due volte).
