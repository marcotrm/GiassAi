// Demo workflow samples — many ready-made automations, matched by brief keywords.
// `def` is validated against WorkflowDef + validateWorkflowGraph at pick time.

export interface DemoWorkflow {
  keywords: string[];
  def: unknown;
}

export const DEMO_WORKFLOWS: DemoWorkflow[] = [
  {
    keywords: ["lead", "qualifica", "contatto", "form contatti", "richiesta", "preventivo"],
    def: {
      name: "Qualificazione Lead",
      description: "Un lead dal form viene classificato, approvato e inserito nel CRM.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Nuovo lead dal form", position: 0, nextNodeId: "classifica", onError: "stop",
          config: { source: "form_submission", formId: "lead_form" } },
        { id: "classifica", type: "ai_task", label: "Classifica priorità", position: 1, nextNodeId: "revisione", onError: "stop",
          config: { prompt: "Classifica la priorità del lead {{trigger.data.nome}} ({{trigger.data.messaggio}}).", model: "haiku", inputFields: ["trigger.data"], outputSchema: { priorita: "string" } } },
        { id: "revisione", type: "human_in_the_loop", label: "Approva lead", position: 2, nextNodeId: "salva", onError: "stop",
          config: { title: "Nuovo lead", description: "Vuoi inserire questo lead nel CRM?", showFields: ["trigger.data.nome", "trigger.data.email", "classifica.priorita"], actions: [{ label: "Approva", value: "approved", style: "primary" }, { label: "Ignora", value: "rejected", style: "danger" }], notifyVia: ["dashboard", "email"] } },
        { id: "salva", type: "action", label: "Inserisci nel CRM", position: 3, nextNodeId: null, onError: "retry",
          config: { integration: "supabase", operation: "insert_row", params: { table: "clienti" }, inputMapping: { nome: "{{trigger.data.nome}}", email: "{{trigger.data.email}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["prenotazione", "appuntamento", "booking", "conferma prenotazione"],
    def: {
      name: "Conferma Prenotazione",
      description: "Conferma via email e registra la prenotazione.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Nuova prenotazione", position: 0, nextNodeId: "email", onError: "stop",
          config: { source: "form_submission", formId: "prenotazione_form" } },
        { id: "email", type: "action", label: "Email di conferma", position: 1, nextNodeId: "salva", onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "Prenotazione confermata" }, inputMapping: { to: "{{trigger.data.email}}" } } },
        { id: "salva", type: "action", label: "Registra prenotazione", position: 2, nextNodeId: null, onError: "retry",
          config: { integration: "supabase", operation: "insert_row", params: { table: "prenotazioni" }, inputMapping: { nome_cliente: "{{trigger.data.nome}}", data_ora: "{{trigger.data.data}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["recensione", "review", "feedback positivo", "google review"],
    def: {
      name: "Richiesta Recensione",
      description: "Dopo un ordine consegnato, chiede una recensione al cliente.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Ordine consegnato", position: 0, nextNodeId: "componi", onError: "stop",
          config: { source: "database_change", tableName: "ordini", operation: "UPDATE" } },
        { id: "componi", type: "ai_task", label: "Componi messaggio", position: 1, nextNodeId: "invia", onError: "stop",
          config: { prompt: "Scrivi un messaggio gentile per chiedere una recensione a {{trigger.data.nome}}.", model: "haiku", inputFields: ["trigger.data"], outputSchema: { messaggio: "string" } } },
        { id: "invia", type: "action", label: "Invia email", position: 2, nextNodeId: null, onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "Com'è andata?" }, inputMapping: { to: "{{trigger.data.email}}", body: "{{componi.messaggio}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["scadenza", "pagamento", "promemoria pagamento", "fattura", "sollecito"],
    def: {
      name: "Promemoria Pagamento",
      description: "Ogni mattina invia un promemoria per i pagamenti in scadenza.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Ogni giorno alle 9", position: 0, nextNodeId: "componi", onError: "stop",
          config: { source: "schedule", cronExpression: "0 9 * * *" } },
        { id: "componi", type: "ai_task", label: "Componi promemoria", position: 1, nextNodeId: "invia", onError: "stop",
          config: { prompt: "Scrivi un promemoria di pagamento cortese.", model: "haiku", inputFields: [], outputSchema: { testo: "string" } } },
        { id: "invia", type: "action", label: "Invia email", position: 2, nextNodeId: null, onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "Promemoria pagamento" }, inputMapping: { body: "{{componi.testo}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["onboarding", "benvenuto", "nuovo cliente", "welcome"],
    def: {
      name: "Onboarding Cliente",
      description: "Quando si aggiunge un cliente, invia il benvenuto e avvisa il team.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Nuovo cliente", position: 0, nextNodeId: "benvenuto", onError: "stop",
          config: { source: "database_change", tableName: "clienti", operation: "INSERT" } },
        { id: "benvenuto", type: "action", label: "Email di benvenuto", position: 1, nextNodeId: "notifica", onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "Benvenuto!" }, inputMapping: { to: "{{trigger.data.email}}" } } },
        { id: "notifica", type: "action", label: "Avvisa il team", position: 2, nextNodeId: null, onError: "skip",
          config: { integration: "slack", operation: "post_message", params: { channel: "#clienti" }, inputMapping: { text: "Nuovo cliente: {{trigger.data.nome}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["follow up", "follow-up", "post vendita", "post-vendita", "ricontatto"],
    def: {
      name: "Follow-up Post Vendita",
      description: "A intervalli regolari ricontatta i clienti dopo l'acquisto.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Ogni lunedì", position: 0, nextNodeId: "messaggio", onError: "stop",
          config: { source: "schedule", cronExpression: "0 10 * * 1" } },
        { id: "messaggio", type: "ai_task", label: "Scrivi follow-up", position: 1, nextNodeId: "invia", onError: "stop",
          config: { prompt: "Scrivi un messaggio di follow-up post-vendita amichevole.", model: "haiku", inputFields: [], outputSchema: { testo: "string" } } },
        { id: "invia", type: "action", label: "Invia email", position: 2, nextNodeId: null, onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "Tutto bene?" }, inputMapping: { body: "{{messaggio.testo}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["reclamo", "lamentela", "assistenza", "ticket", "supporto"],
    def: {
      name: "Gestione Reclami",
      description: "Classifica un reclamo, lo fa assegnare e lo registra.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Nuovo reclamo", position: 0, nextNodeId: "gravita", onError: "stop",
          config: { source: "form_submission", formId: "reclamo_form" } },
        { id: "gravita", type: "ai_task", label: "Valuta gravità", position: 1, nextNodeId: "assegna", onError: "stop",
          config: { prompt: "Valuta la gravità del reclamo: {{trigger.data.messaggio}}.", model: "haiku", inputFields: ["trigger.data"], outputSchema: { gravita: "string" } } },
        { id: "assegna", type: "human_in_the_loop", label: "Assegna a un operatore", position: 2, nextNodeId: "salva", onError: "stop",
          config: { title: "Reclamo da gestire", showFields: ["trigger.data.nome", "gravita.gravita"], actions: [{ label: "Prendi in carico", value: "taken", style: "primary" }], notifyVia: ["dashboard"] } },
        { id: "salva", type: "action", label: "Registra reclamo", position: 3, nextNodeId: null, onError: "retry",
          config: { integration: "supabase", operation: "insert_row", params: { table: "reclami" }, inputMapping: { cliente: "{{trigger.data.nome}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["ordine", "nuovo ordine", "notifica ordine", "vendita"],
    def: {
      name: "Notifica Nuovo Ordine",
      description: "Avvisa il team e il magazzino di ogni nuovo ordine.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Nuovo ordine", position: 0, nextNodeId: "slack", onError: "stop",
          config: { source: "database_change", tableName: "ordini", operation: "INSERT" } },
        { id: "slack", type: "action", label: "Notifica su Slack", position: 1, nextNodeId: "email", onError: "skip",
          config: { integration: "slack", operation: "post_message", params: { channel: "#ordini" }, inputMapping: { text: "Nuovo ordine {{trigger.data.numero}}" } } },
        { id: "email", type: "action", label: "Email al magazzino", position: 2, nextNodeId: null, onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "Nuovo ordine da preparare" }, inputMapping: {} } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["promemoria appuntamento", "reminder appuntamento", "24 ore", "ricordo"],
    def: {
      name: "Promemoria Appuntamento 24h",
      description: "Ricorda l'appuntamento ai clienti il giorno prima.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Ogni giorno alle 18", position: 0, nextNodeId: "componi", onError: "stop",
          config: { source: "schedule", cronExpression: "0 18 * * *" } },
        { id: "componi", type: "ai_task", label: "Scrivi promemoria", position: 1, nextNodeId: "invia", onError: "stop",
          config: { prompt: "Scrivi un promemoria appuntamento per domani.", model: "haiku", inputFields: [], outputSchema: { testo: "string" } } },
        { id: "invia", type: "action", label: "Invia email", position: 2, nextNodeId: null, onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "Promemoria appuntamento" }, inputMapping: { body: "{{componi.testo}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["form diretto", "salva contatto", "iscrizione", "newsletter"],
    def: {
      name: "Lead Diretto nel CRM",
      description: "Un form scrive direttamente un contatto nel gestionale, senza passaggi.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Iscrizione form", position: 0, nextNodeId: "salva", onError: "stop",
          config: { source: "form_submission", formId: "iscrizione_form" } },
        { id: "salva", type: "action", label: "Salva contatto", position: 1, nextNodeId: null, onError: "retry",
          config: { integration: "supabase", operation: "insert_row", params: { table: "clienti" }, inputMapping: { nome: "{{trigger.data.nome}}", email: "{{trigger.data.email}}" } } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["sondaggio", "raccolta feedback", "questionario", "soddisfazione"],
    def: {
      name: "Raccolta Feedback",
      description: "Invia un sondaggio periodico e raccoglie le risposte da rivedere.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Ogni primo del mese", position: 0, nextNodeId: "invia", onError: "stop",
          config: { source: "schedule", cronExpression: "0 9 1 * *" } },
        { id: "invia", type: "action", label: "Invia sondaggio", position: 1, nextNodeId: "rivedi", onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "La tua opinione conta" }, inputMapping: {} } },
        { id: "rivedi", type: "human_in_the_loop", label: "Rivedi risposte", position: 2, nextNodeId: null, onError: "stop",
          config: { title: "Risposte sondaggio", showFields: [], actions: [{ label: "Segna come visto", value: "seen", style: "primary" }], notifyVia: ["dashboard"] } },
      ],
      projectLinks: [],
    },
  },
  {
    keywords: ["spedizione", "tracking", "consegna", "corriere"],
    def: {
      name: "Notifica Spedizione",
      description: "Quando un ordine viene spedito, avvisa il cliente con il tracking.",
      nodes: [
        { id: "trigger", type: "trigger", label: "Ordine spedito", position: 0, nextNodeId: "componi", onError: "stop",
          config: { source: "database_change", tableName: "ordini", operation: "UPDATE" } },
        { id: "componi", type: "ai_task", label: "Scrivi avviso", position: 1, nextNodeId: "invia", onError: "stop",
          config: { prompt: "Scrivi un'email che avvisa della spedizione dell'ordine {{trigger.data.numero}}.", model: "haiku", inputFields: ["trigger.data"], outputSchema: { testo: "string" } } },
        { id: "invia", type: "action", label: "Invia email", position: 2, nextNodeId: null, onError: "skip",
          config: { integration: "email", operation: "send", params: { subject: "Il tuo ordine è in viaggio" }, inputMapping: { body: "{{componi.testo}}" } } },
      ],
      projectLinks: [],
    },
  },
];

export const DEMO_WORKFLOW_DEFAULT: unknown = DEMO_WORKFLOWS[0]!.def;
