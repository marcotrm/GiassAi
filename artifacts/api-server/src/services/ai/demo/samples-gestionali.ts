// Demo gestionale samples — used when no ANTHROPIC_API_KEY is set, so the app
// is fully clickable offline. Each sample is matched to a brief by keywords.
// `def` is validated against GestionaleSchemaDef at pick time.

export interface DemoGestionale {
  keywords: string[];
  def: unknown;
}

export const DEMO_GESTIONALI: DemoGestionale[] = [
  {
    keywords: ["palestra", "gym", "fitness", "abbonamenti", "crossfit", "centro sportivo"],
    def: {
      name: "Gestionale Palestra",
      enums: [{ name: "tipo_abbonamento", values: [
        { value: "mensile", label: "Mensile" }, { value: "trimestrale", label: "Trimestrale" },
        { value: "annuale", label: "Annuale" }] }],
      tables: [
        { name: "clienti", label: "Clienti", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "email", label: "Email", type: "email", unique: true },
          { name: "telefono", label: "Telefono", type: "phone" },
          { name: "data_iscrizione", label: "Data iscrizione", type: "date" } ] },
        { name: "abbonamenti", label: "Abbonamenti", primaryDisplayColumn: "tipo", columns: [
          { name: "tipo", label: "Tipo", type: "enum", enumName: "tipo_abbonamento", nullable: false },
          { name: "cliente", label: "Cliente", type: "relation", relationTo: "clienti" },
          { name: "scadenza", label: "Scadenza", type: "date" },
          { name: "prezzo", label: "Prezzo", type: "currency" } ] },
        { name: "pagamenti", label: "Pagamenti", primaryDisplayColumn: "importo", columns: [
          { name: "cliente", label: "Cliente", type: "relation", relationTo: "clienti" },
          { name: "importo", label: "Importo", type: "currency", nullable: false },
          { name: "data", label: "Data", type: "date" } ] },
        { name: "accessi", label: "Accessi", primaryDisplayColumn: "data_ora", columns: [
          { name: "cliente", label: "Cliente", type: "relation", relationTo: "clienti" },
          { name: "data_ora", label: "Data e ora", type: "datetime", nullable: false } ] },
      ],
      relations: [
        { type: "one_to_many", from: "clienti", to: "abbonamenti", fromColumn: "cliente" },
        { type: "one_to_many", from: "clienti", to: "pagamenti", fromColumn: "cliente" },
        { type: "one_to_many", from: "clienti", to: "accessi", fromColumn: "cliente" },
      ],
    },
  },
  {
    keywords: ["ristorante", "pizzeria", "trattoria", "osteria", "menu", "tavoli", "cucina"],
    def: {
      name: "Gestionale Ristorante",
      enums: [
        { name: "stato_prenotazione", values: [
          { value: "confermata", label: "Confermata" }, { value: "in_attesa", label: "In attesa" },
          { value: "annullata", label: "Annullata" }] },
        { name: "categoria_piatto", values: [
          { value: "antipasti", label: "Antipasti" }, { value: "primi", label: "Primi" },
          { value: "secondi", label: "Secondi" }, { value: "dolci", label: "Dolci" }] }],
      tables: [
        { name: "tavoli", label: "Tavoli", primaryDisplayColumn: "numero", columns: [
          { name: "numero", label: "Numero", type: "number", nullable: false },
          { name: "posti", label: "Posti", type: "number" } ] },
        { name: "prenotazioni", label: "Prenotazioni", primaryDisplayColumn: "nome_cliente", columns: [
          { name: "nome_cliente", label: "Cliente", type: "text", nullable: false },
          { name: "telefono", label: "Telefono", type: "phone" },
          { name: "tavolo", label: "Tavolo", type: "relation", relationTo: "tavoli" },
          { name: "data_ora", label: "Data e ora", type: "datetime" },
          { name: "coperti", label: "Coperti", type: "number" },
          { name: "stato", label: "Stato", type: "enum", enumName: "stato_prenotazione" } ] },
        { name: "menu_piatti", label: "Menu", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Piatto", type: "text", nullable: false },
          { name: "categoria", label: "Categoria", type: "enum", enumName: "categoria_piatto" },
          { name: "prezzo", label: "Prezzo", type: "currency" } ] },
      ],
      relations: [{ type: "one_to_many", from: "tavoli", to: "prenotazioni", fromColumn: "tavolo" }],
    },
  },
  {
    keywords: ["dentista", "dentistico", "medico", "clinica", "studio medico", "pazienti", "ambulatorio"],
    def: {
      name: "Gestionale Studio Medico",
      enums: [{ name: "stato_appuntamento", values: [
        { value: "programmato", label: "Programmato" }, { value: "completato", label: "Completato" },
        { value: "annullato", label: "Annullato" }] }],
      tables: [
        { name: "pazienti", label: "Pazienti", primaryDisplayColumn: "cognome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "cognome", label: "Cognome", type: "text", nullable: false },
          { name: "codice_fiscale", label: "Codice fiscale", type: "text", unique: true },
          { name: "telefono", label: "Telefono", type: "phone" },
          { name: "email", label: "Email", type: "email" } ] },
        { name: "appuntamenti", label: "Appuntamenti", primaryDisplayColumn: "data_ora", columns: [
          { name: "paziente", label: "Paziente", type: "relation", relationTo: "pazienti" },
          { name: "data_ora", label: "Data e ora", type: "datetime", nullable: false },
          { name: "motivo", label: "Motivo", type: "text" },
          { name: "stato", label: "Stato", type: "enum", enumName: "stato_appuntamento" } ] },
        { name: "trattamenti", label: "Trattamenti", primaryDisplayColumn: "descrizione", columns: [
          { name: "paziente", label: "Paziente", type: "relation", relationTo: "pazienti" },
          { name: "descrizione", label: "Descrizione", type: "text", nullable: false },
          { name: "costo", label: "Costo", type: "currency" },
          { name: "data", label: "Data", type: "date" } ] },
      ],
      relations: [
        { type: "one_to_many", from: "pazienti", to: "appuntamenti", fromColumn: "paziente" },
        { type: "one_to_many", from: "pazienti", to: "trattamenti", fromColumn: "paziente" },
      ],
    },
  },
  {
    keywords: ["parrucchiere", "estetista", "estetico", "beauty", "salone", "barbiere", "spa"],
    def: {
      name: "Gestionale Salone",
      enums: [{ name: "categoria_servizio", values: [
        { value: "taglio", label: "Taglio" }, { value: "colore", label: "Colore" },
        { value: "trattamento", label: "Trattamento" }, { value: "estetica", label: "Estetica" }] }],
      tables: [
        { name: "clienti", label: "Clienti", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "telefono", label: "Telefono", type: "phone" },
          { name: "email", label: "Email", type: "email" } ] },
        { name: "servizi", label: "Servizi", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Servizio", type: "text", nullable: false },
          { name: "categoria", label: "Categoria", type: "enum", enumName: "categoria_servizio" },
          { name: "prezzo", label: "Prezzo", type: "currency" },
          { name: "durata_min", label: "Durata (min)", type: "number" } ] },
        { name: "appuntamenti", label: "Appuntamenti", primaryDisplayColumn: "data_ora", columns: [
          { name: "cliente", label: "Cliente", type: "relation", relationTo: "clienti" },
          { name: "servizio", label: "Servizio", type: "relation", relationTo: "servizi" },
          { name: "data_ora", label: "Data e ora", type: "datetime", nullable: false } ] },
      ],
      relations: [
        { type: "one_to_many", from: "clienti", to: "appuntamenti", fromColumn: "cliente" },
        { type: "one_to_many", from: "servizi", to: "appuntamenti", fromColumn: "servizio" },
      ],
    },
  },
  {
    keywords: ["ecommerce", "negozio", "shop", "magazzino", "prodotti", "vendita", "inventario"],
    def: {
      name: "Gestionale Negozio",
      enums: [
        { name: "stato_ordine", values: [
          { value: "nuovo", label: "Nuovo" }, { value: "spedito", label: "Spedito" },
          { value: "consegnato", label: "Consegnato" }] },
        { name: "categoria_prodotto", values: [
          { value: "abbigliamento", label: "Abbigliamento" }, { value: "accessori", label: "Accessori" },
          { value: "casa", label: "Casa" }, { value: "altro", label: "Altro" }] }],
      tables: [
        { name: "prodotti", label: "Prodotti", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "categoria", label: "Categoria", type: "enum", enumName: "categoria_prodotto" },
          { name: "prezzo", label: "Prezzo", type: "currency" },
          { name: "giacenza", label: "Giacenza", type: "number" } ] },
        { name: "clienti", label: "Clienti", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "email", label: "Email", type: "email", unique: true },
          { name: "indirizzo", label: "Indirizzo", type: "text" } ] },
        { name: "ordini", label: "Ordini", primaryDisplayColumn: "numero", columns: [
          { name: "numero", label: "Numero ordine", type: "text", nullable: false },
          { name: "cliente", label: "Cliente", type: "relation", relationTo: "clienti" },
          { name: "totale", label: "Totale", type: "currency" },
          { name: "stato", label: "Stato", type: "enum", enumName: "stato_ordine" },
          { name: "data", label: "Data", type: "date" } ] },
      ],
      relations: [{ type: "one_to_many", from: "clienti", to: "ordini", fromColumn: "cliente" }],
    },
  },
  {
    keywords: ["immobiliare", "agenzia immobiliare", "immobili", "affitti", "case", "appartamenti"],
    def: {
      name: "Gestionale Immobiliare",
      enums: [
        { name: "tipo_immobile", values: [
          { value: "appartamento", label: "Appartamento" }, { value: "villa", label: "Villa" },
          { value: "ufficio", label: "Ufficio" }, { value: "negozio", label: "Negozio" }] },
        { name: "stato_immobile", values: [
          { value: "disponibile", label: "Disponibile" }, { value: "venduto", label: "Venduto" },
          { value: "affittato", label: "Affittato" }] }],
      tables: [
        { name: "immobili", label: "Immobili", primaryDisplayColumn: "titolo", columns: [
          { name: "titolo", label: "Titolo", type: "text", nullable: false },
          { name: "tipo", label: "Tipo", type: "enum", enumName: "tipo_immobile" },
          { name: "indirizzo", label: "Indirizzo", type: "text" },
          { name: "prezzo", label: "Prezzo", type: "currency" },
          { name: "mq", label: "Metri quadri", type: "number" },
          { name: "stato", label: "Stato", type: "enum", enumName: "stato_immobile" } ] },
        { name: "clienti", label: "Clienti", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "telefono", label: "Telefono", type: "phone" },
          { name: "email", label: "Email", type: "email" } ] },
        { name: "visite", label: "Visite", primaryDisplayColumn: "data_ora", columns: [
          { name: "immobile", label: "Immobile", type: "relation", relationTo: "immobili" },
          { name: "cliente", label: "Cliente", type: "relation", relationTo: "clienti" },
          { name: "data_ora", label: "Data e ora", type: "datetime", nullable: false } ] },
      ],
      relations: [
        { type: "one_to_many", from: "immobili", to: "visite", fromColumn: "immobile" },
        { type: "one_to_many", from: "clienti", to: "visite", fromColumn: "cliente" },
      ],
    },
  },
  {
    keywords: ["officina", "autofficina", "meccanico", "auto", "carrozzeria", "gommista", "riparazioni"],
    def: {
      name: "Gestionale Officina",
      enums: [{ name: "stato_intervento", values: [
        { value: "in_lavorazione", label: "In lavorazione" }, { value: "completato", label: "Completato" },
        { value: "consegnato", label: "Consegnato" }] }],
      tables: [
        { name: "clienti", label: "Clienti", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "telefono", label: "Telefono", type: "phone" } ] },
        { name: "veicoli", label: "Veicoli", primaryDisplayColumn: "targa", columns: [
          { name: "targa", label: "Targa", type: "text", nullable: false, unique: true },
          { name: "marca", label: "Marca", type: "text" },
          { name: "modello", label: "Modello", type: "text" },
          { name: "cliente", label: "Proprietario", type: "relation", relationTo: "clienti" } ] },
        { name: "interventi", label: "Interventi", primaryDisplayColumn: "descrizione", columns: [
          { name: "veicolo", label: "Veicolo", type: "relation", relationTo: "veicoli" },
          { name: "descrizione", label: "Descrizione", type: "long_text", nullable: false },
          { name: "costo", label: "Costo", type: "currency" },
          { name: "stato", label: "Stato", type: "enum", enumName: "stato_intervento" },
          { name: "data", label: "Data", type: "date" } ] },
      ],
      relations: [
        { type: "one_to_many", from: "clienti", to: "veicoli", fromColumn: "cliente" },
        { type: "one_to_many", from: "veicoli", to: "interventi", fromColumn: "veicolo" },
      ],
    },
  },
  {
    keywords: ["avvocato", "legale", "studio legale", "pratiche", "cause", "notaio", "commercialista"],
    def: {
      name: "Gestionale Studio Legale",
      enums: [{ name: "stato_pratica", values: [
        { value: "aperta", label: "Aperta" }, { value: "in_corso", label: "In corso" },
        { value: "chiusa", label: "Chiusa" }] }],
      tables: [
        { name: "clienti", label: "Clienti", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "email", label: "Email", type: "email" },
          { name: "telefono", label: "Telefono", type: "phone" } ] },
        { name: "pratiche", label: "Pratiche", primaryDisplayColumn: "oggetto", columns: [
          { name: "oggetto", label: "Oggetto", type: "text", nullable: false },
          { name: "cliente", label: "Cliente", type: "relation", relationTo: "clienti" },
          { name: "stato", label: "Stato", type: "enum", enumName: "stato_pratica" },
          { name: "data_apertura", label: "Apertura", type: "date" } ] },
        { name: "udienze", label: "Udienze", primaryDisplayColumn: "data_ora", columns: [
          { name: "pratica", label: "Pratica", type: "relation", relationTo: "pratiche" },
          { name: "data_ora", label: "Data e ora", type: "datetime", nullable: false },
          { name: "note", label: "Note", type: "long_text" } ] },
      ],
      relations: [
        { type: "one_to_many", from: "clienti", to: "pratiche", fromColumn: "cliente" },
        { type: "one_to_many", from: "pratiche", to: "udienze", fromColumn: "pratica" },
      ],
    },
  },
  {
    keywords: ["veterinario", "veterinaria", "animali", "clinica veterinaria", "ambulatorio veterinario"],
    def: {
      name: "Gestionale Veterinario",
      enums: [{ name: "specie", values: [
        { value: "cane", label: "Cane" }, { value: "gatto", label: "Gatto" },
        { value: "coniglio", label: "Coniglio" }, { value: "altro", label: "Altro" }] }],
      tables: [
        { name: "proprietari", label: "Proprietari", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "telefono", label: "Telefono", type: "phone" },
          { name: "email", label: "Email", type: "email" } ] },
        { name: "animali", label: "Animali", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "specie", label: "Specie", type: "enum", enumName: "specie" },
          { name: "razza", label: "Razza", type: "text" },
          { name: "proprietario", label: "Proprietario", type: "relation", relationTo: "proprietari" } ] },
        { name: "visite", label: "Visite", primaryDisplayColumn: "data", columns: [
          { name: "animale", label: "Animale", type: "relation", relationTo: "animali" },
          { name: "data", label: "Data", type: "date", nullable: false },
          { name: "diagnosi", label: "Diagnosi", type: "long_text" },
          { name: "costo", label: "Costo", type: "currency" } ] },
      ],
      relations: [
        { type: "one_to_many", from: "proprietari", to: "animali", fromColumn: "proprietario" },
        { type: "one_to_many", from: "animali", to: "visite", fromColumn: "animale" },
      ],
    },
  },
  {
    keywords: ["hotel", "b&b", "bed and breakfast", "albergo", "struttura ricettiva", "camere", "agriturismo"],
    def: {
      name: "Gestionale Hotel",
      enums: [
        { name: "tipo_camera", values: [
          { value: "singola", label: "Singola" }, { value: "doppia", label: "Doppia" },
          { value: "suite", label: "Suite" }] },
        { name: "stato_prenotazione", values: [
          { value: "confermata", label: "Confermata" }, { value: "check_in", label: "Check-in" },
          { value: "check_out", label: "Check-out" }] }],
      tables: [
        { name: "camere", label: "Camere", primaryDisplayColumn: "numero", columns: [
          { name: "numero", label: "Numero", type: "text", nullable: false },
          { name: "tipo", label: "Tipo", type: "enum", enumName: "tipo_camera" },
          { name: "prezzo_notte", label: "Prezzo/notte", type: "currency" } ] },
        { name: "ospiti", label: "Ospiti", primaryDisplayColumn: "nome", columns: [
          { name: "nome", label: "Nome", type: "text", nullable: false },
          { name: "email", label: "Email", type: "email" },
          { name: "telefono", label: "Telefono", type: "phone" } ] },
        { name: "prenotazioni", label: "Prenotazioni", primaryDisplayColumn: "check_in", columns: [
          { name: "camera", label: "Camera", type: "relation", relationTo: "camere" },
          { name: "ospite", label: "Ospite", type: "relation", relationTo: "ospiti" },
          { name: "check_in", label: "Check-in", type: "date", nullable: false },
          { name: "check_out", label: "Check-out", type: "date" },
          { name: "stato", label: "Stato", type: "enum", enumName: "stato_prenotazione" } ] },
      ],
      relations: [
        { type: "one_to_many", from: "camere", to: "prenotazioni", fromColumn: "camera" },
        { type: "one_to_many", from: "ospiti", to: "prenotazioni", fromColumn: "ospite" },
      ],
    },
  },
];

// Generic fallback when nothing matches the brief.
export const DEMO_GESTIONALE_DEFAULT: unknown = {
  name: "Gestionale CRM",
  enums: [{ name: "stato_ordine", values: [
    { value: "nuovo", label: "Nuovo" }, { value: "in_corso", label: "In corso" },
    { value: "completato", label: "Completato" }] }],
  tables: [
    { name: "clienti", label: "Clienti", primaryDisplayColumn: "nome", columns: [
      { name: "nome", label: "Nome", type: "text", nullable: false },
      { name: "email", label: "Email", type: "email", unique: true },
      { name: "telefono", label: "Telefono", type: "phone" } ] },
    { name: "prodotti_servizi", label: "Prodotti / Servizi", primaryDisplayColumn: "nome", columns: [
      { name: "nome", label: "Nome", type: "text", nullable: false },
      { name: "prezzo", label: "Prezzo", type: "currency" } ] },
    { name: "ordini", label: "Ordini", primaryDisplayColumn: "numero", columns: [
      { name: "numero", label: "Numero", type: "text", nullable: false },
      { name: "cliente", label: "Cliente", type: "relation", relationTo: "clienti" },
      { name: "totale", label: "Totale", type: "currency" },
      { name: "stato", label: "Stato", type: "enum", enumName: "stato_ordine" } ] },
  ],
  relations: [{ type: "one_to_many", from: "clienti", to: "ordini", fromColumn: "cliente" }],
};
