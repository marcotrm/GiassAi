# GiassAi — Piano dell'Ecosistema: Come i Tre Ambienti Coesistono e Comunicano

> **Versione:** 0.1.0
> **Data:** 2026-06-16
> **Status:** Spec operativa — il collante tra i tre AI Master
> **Prerequisiti:** `gestionale-agent-plan.md`, `workflow-agent-plan.md`, `landing-agent-plan.md`

---

## 0. Perché questo documento

Gestionale, Workflow e Landing **non sono silos**. Il valore di GiassAi è che **coesistono e si
parlano**: un form di una landing genera un lead, un workflow lo qualifica, un'azione lo scrive nel
gestionale; un cambio nel gestionale può a sua volta far partire un workflow. Questo documento
definisce il **collante**: le strutture, gli endpoint e le regole che fanno fluire i dati tra ambienti.

Il **Workflow è il ponte logico** di default; in casi semplici un form può scrivere direttamente in un
gestionale senza workflow intermedio.

---

## 1. Il grafo dei collegamenti — `project_links`

La tabella esiste già (`project_links`: `sourceProjectId`, `targetProjectId`, `linkType`,
`fieldMapping`, `config`, `isActive`). È il **registro di tutte le connessioni** tra progetti di una org.

| `linkType` | source → target | Significato |
|-----------|-----------------|-------------|
| `form_to_workflow` | Landing → Workflow | un form invia dati come trigger di un workflow |
| `workflow_to_gestionale` | Workflow → Gestionale | un'azione del workflow scrive una riga in una tabella |
| `gestionale_to_workflow` | Gestionale → Workflow | un cambio DB (INSERT/UPDATE) fa partire un workflow |
| `landing_to_gestionale` | Landing → Gestionale | un form scrive diretto in una tabella (no workflow) |

`fieldMapping` descrive la corrispondenza dei campi tra source e target, es.:
```json
{ "nome": "trigger.data.name", "email": "trigger.data.email" }
```

**Chi crea i link:** l'**Architect** del workflow (o della landing) li genera nel proprio JSON di output
e l'orchestratore li persiste. Per farlo, l'Architect riceve sempre **l'elenco dei progetti dell'org**
nel contesto, così può riferirsi a gestionali/landing esistenti per id.

---

## 2. I tre flussi canonici

### 2.1 Landing → Workflow → Gestionale (il flusso principe)
```
Form "Contatti" (landing, formId)
   │ POST /api/hooks/form/:formId
   ▼
Trigger form_submission → runWorkflow(context.trigger.data = {name,email,message})
   ▼
ai_task (Haiku): classifica priorità lead
   ▼
human_in_the_loop: "Approvi questo lead?"  → pausa, pending_approvals
   ▼ (approvato)
action supabase.insert_row → org_{id}.clienti   (workflow_to_gestionale)
```

### 2.2 Landing → Gestionale (diretto, senza workflow)
```
Form → /api/hooks/form/:formId → link landing_to_gestionale → insert validato in org_{id}.{table}
```
Usato quando non serve logica: il dato va semplicemente salvato.

### 2.3 Gestionale → Workflow (reazione a un cambio dati)
```
INSERT/UPDATE su org_{id}.{table} → evento database_change → runWorkflow
es. nuovo ordine inserito → workflow invia email di conferma + notifica Slack
```

---

## 3. I tre meccanismi di comunicazione (implementazione)

### 3.1 Form hook (Landing → resto)
- Ogni `FormDef` ha un `formId` e una `destination` (`workflow` | `gestionale` + `targetProjectId`).
- Alla **pubblicazione** della landing, il `formId` viene registrato.
- Endpoint pubblico: **`POST /api/hooks/form/:formId`**
  1. lookup del `project_link` per `formId`;
  2. se `destination.kind = workflow` → `runWorkflow(workflowId, body)`;
  3. se `destination.kind = gestionale` → valida `body` contro lo schema e `insert_row`;
  4. risposta + (opz.) redirect/thank-you.
- **Sicurezza**: rate-limit, honeypot/anti-spam, segreto opzionale per form sensibili.

### 3.2 Action runner (Workflow → Gestionale / esterni)
- Il nodo `action` con `integration='supabase', operation='insert_row'` e `targetProjectId` scrive
  nella tabella del gestionale target.
- **Cross-check a generazione**: l'Architect del workflow verifica (via `gestionale_schemas`) che la
  tabella e le colonne in `inputMapping` esistano nello schema **deployato** del gestionale.
- Altre integrazioni: `email` (Resend), `slack`, `http` (webhook esterni), `google_sheets`.

### 3.3 Database-change listener (Gestionale → Workflow)
- Quando un workflow ha trigger `database_change` su `org_{id}.{table}`, l'attivazione registra un
  listener. Due strade da prototipare:
  - **Supabase Realtime** (sottoscrizione alle modifiche), oppure
  - **trigger Postgres** che scrive su una coda (`outbox`) consumata da un worker.
- Il worker chiama `runWorkflow` con `context.trigger.data = NEW row`.

---

## 4. Il contesto condiviso — come i dati "viaggiano"

Tutti gli ambienti parlano la stessa lingua di **template a variabili** risolte dall'engine workflow:

```
{{trigger.data.<campo>}}        // dati dal form o dalla riga DB che ha fatto da trigger
{{<nodeId>.output.<campo>}}     // output di un ai_task precedente
{{human_review.action}}         // valore scelto in un human-in-the-loop
```

Il `context` di un `workflow_run` accumula tutto (`{ trigger, node_x, human_review, ... }`) ed è
persistito su DB → durabile attraverso pause/resume. Il **context-resolver** (codice) sostituisce le
variabili al momento dell'esecuzione di ogni nodo. Questo è il "protocollo dati" comune dell'ecosistema.

---

## 5. Coerenza a tempo di generazione (regola d'oro dell'ecosistema)

Gli Architect dei vari master **non lavorano alla cieca**: ricevono sempre il **catalogo dei progetti
dell'org** (id, tipo, e per i gestionali lo schema deployato). Così:

- l'Architect Workflow può collegare un `action` a una tabella **realmente esistente** del gestionale;
- l'Architect Landing può puntare il `destination` di un form a un workflow/gestionale esistente;
- i `fieldMapping` referenziano **colonne vere**, validate prima del deploy.

Se il progetto target non esiste ancora, il PM lo segnala all'utente ("Vuoi che crei prima il
gestionale Clienti?") invece di generare link rotti. → la coesistenza è verificata, non sperata.

---

## 6. API & file da creare (ordine di build, dopo i tre master)

- [ ] **1. Project links service** — `services/ecosystem/links.ts`: CRUD + lookup `project_links`,
      validazione cross-schema (tabella/colonne target esistono e deployate).
- [ ] **2. Form hook** — `routes/hooks.ts` → `POST /api/hooks/form/:formId` (§3.1) + anti-spam/rate-limit
- [ ] **3. Action: supabase insert** — integrazione `workflow_to_gestionale` nell'action runner (§3.2)
- [ ] **4. DB-change listener** — `services/ecosystem/db-listener.ts` (Realtime o outbox+worker) (§3.3)
- [ ] **5. Context resolver** — già previsto nel workflow engine; qui si conferma il formato variabili (§4)
- [ ] **6. Org catalog provider** — `services/ecosystem/org-catalog.ts`: fornisce agli Architect il
      catalogo progetti+schemi dell'org (§5)
- [ ] **7. Frontend** — vista "Connessioni": grafo dei `project_links` di un'org (chi alimenta chi)

> Ordine consigliato: si costruisce **dopo** i tre master, ma i loro Architect vanno già progettati per
> **emettere `project_links`** e **ricevere il catalogo org** fin da subito (ganci §5 nei doc dei master).

---

## 7. Esempio end-to-end (palestra)

1. **Gestionale** "Palestra": tabelle `clienti`, `abbonamenti`, `pagamenti`. Deployato.
2. **Landing** "Prova gratuita": form `lead_form` (nome, email, telefono), `destination=workflow`.
3. **Workflow** "Gestione lead":
   - trigger `form_submission` (formId=`lead_form`)
   - ai_task: classifica interesse (alto/basso)
   - human_in_the_loop: lo staff approva
   - action `supabase.insert_row` → `org_x.clienti`
4. `project_links` creati: `form_to_workflow` (landing→workflow), `workflow_to_gestionale` (workflow→gestionale).
5. Un visitatore compila il form → lead classificato → approvato dallo staff → cliente creato nel gestionale.
   Tutto senza una riga di codice scritta dall'utente.

---

## 8. Questioni aperte

1. **Permessi cross-progetto**: un link è sempre intra-org; verificare RLS quando un workflow scrive in
   uno schema gestionale di un'altra membership.
2. **Eliminazione a cascata**: cosa succede ai link/run se l'utente cancella un progetto sorgente/target.
3. **Versioning schema gestionale**: se lo schema cambia dopo che un workflow lo referenzia, gestire il drift.
4. **Osservabilità**: una timeline unificata "evento landing → run workflow → riga gestionale" per debug.
