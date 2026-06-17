// Demo landing samples — full BusinessProfile + LandingDef (with section content
// already written) + social ideas. Rendered to HTML by the deterministic renderer.

export interface DemoLanding {
  keywords: string[];
  profile: unknown;
  def: unknown;
  ideas: unknown[];
}

function theme(p: string, s: string, a: string, hf: string, bf: string) {
  return { primaryColor: p, secondaryColor: s, accentColor: a, headingFont: hf, bodyFont: bf };
}
function visualDna(p: string, s: string, a: string, hf: string, bf: string, mood: string) {
  return { primaryColor: p, secondaryColor: s, accentColor: a, headingFont: hf, bodyFont: bf, mood };
}
function contactForm(formId: string) {
  return {
    formId,
    submitLabel: "Invia richiesta",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "telefono", label: "Telefono", type: "phone", required: false },
      { name: "messaggio", label: "Messaggio", type: "textarea", required: false },
    ],
  };
}
function idea(title: string, hook: string, script: string, format: string) {
  return { title, hook, script, platform: "instagram", format, category: "educational", hashtags: [] };
}

export const DEMO_LANDINGS: DemoLanding[] = [
  {
    keywords: ["palestra", "gym", "fitness", "personal trainer", "crossfit"],
    profile: visualDna("#e11d48", "#1e293b", "#f59e0b", "Poppins", "Inter", "energico, motivante"),
    def: {
      template: "modern",
      theme: theme("#e11d48", "#1e293b", "#f59e0b", "Poppins", "Inter"),
      forms: [contactForm("lead_form")],
      sections: [
        { id: "hero", type: "hero", order: 0, content: { title: "Trasforma il tuo corpo", subtitle: "Allenamenti su misura con i nostri personal trainer. Prima settimana di prova gratis.", ctaLabel: "Prenota la prova gratis", ctaHref: "#contatti" } },
        { id: "benefits", type: "benefits", order: 1, content: { title: "Perché sceglierci", items: [
          { title: "Trainer qualificati", description: "Schede personalizzate e seguite passo passo." },
          { title: "Aperti 7 giorni", description: "Ti alleni quando vuoi, mattina e sera." },
          { title: "Risultati garantiti", description: "Programmi misurabili con check mensili." } ] } },
        { id: "testi", type: "testimonials", order: 2, content: { title: "Dicono di noi", items: [
          { quote: "Ho perso 8 kg in tre mesi, mi sento un'altra persona.", author: "Marco R.", role: "Iscritto da 1 anno" },
          { quote: "Ambiente stimolante e staff sempre disponibile.", author: "Giulia P.", role: "Iscritta da 6 mesi" } ] } },
        { id: "faq", type: "faq", order: 3, content: { title: "Domande frequenti", items: [
          { question: "Serve esperienza?", answer: "No, costruiamo il percorso dal tuo livello attuale." },
          { question: "Posso disdire quando voglio?", answer: "Sì, gli abbonamenti sono flessibili." },
          { question: "C'è un'area attrezzi?", answer: "Sala pesi, functional e corsi inclusi." } ] } },
        { id: "form", type: "contact_form", order: 4, content: { title: "Prenota la tua prova gratuita" } },
        { id: "cta", type: "cta", order: 5, content: { title: "Inizia oggi il tuo cambiamento", ctaLabel: "Prova gratis", ctaHref: "#contatti" } },
      ],
    },
    ideas: [
      idea("3 errori in palestra", "Stai sprecando i tuoi allenamenti?", "Mostra 3 errori comuni e come correggerli.", "reel"),
      idea("Trasformazione cliente", "Da 0 a maratona in 6 mesi", "Racconto prima/dopo di un iscritto.", "reel"),
      idea("Esercizio del giorno", "Il segreto per glutei d'acciaio", "Tutorial di un esercizio chiave.", "reel"),
      idea("Mito sfatto cadere", "Il cardio brucia i muscoli?", "Sfati un mito del fitness.", "carosello"),
      idea("Giornata in palestra", "Una giornata da personal trainer", "Dietro le quinte della struttura.", "reel"),
    ],
  },
  {
    keywords: ["ristorante", "pizzeria", "trattoria", "cucina", "menu", "food"],
    profile: visualDna("#b91c1c", "#292524", "#f59e0b", "Playfair Display", "Inter", "caldo, accogliente"),
    def: {
      template: "modern",
      theme: theme("#b91c1c", "#292524", "#f59e0b", "Playfair Display", "Inter"),
      forms: [contactForm("prenotazione_form")],
      sections: [
        { id: "hero", type: "hero", order: 0, content: { title: "Il sapore della tradizione", subtitle: "Cucina genuina, ingredienti del territorio. Prenota il tuo tavolo.", ctaLabel: "Prenota un tavolo", ctaHref: "#contatti" } },
        { id: "benefits", type: "benefits", order: 1, content: { title: "La nostra cucina", items: [
          { title: "Prodotti freschi", description: "Materie prime locali selezionate ogni giorno." },
          { title: "Ricette di famiglia", description: "Piatti della tradizione tramandati da generazioni." },
          { title: "Ambiente curato", description: "Sala accogliente, perfetta per ogni occasione." } ] } },
        { id: "testi", type: "testimonials", order: 2, content: { title: "Recensioni", items: [
          { quote: "La miglior carbonara della città, senza dubbi.", author: "Luca M.", role: "Cliente abituale" },
          { quote: "Servizio impeccabile e prezzi onesti.", author: "Sara T.", role: "Recensione Google" } ] } },
        { id: "faq", type: "faq", order: 3, content: { title: "Informazioni", items: [
          { question: "Avete opzioni vegetariane?", answer: "Sì, un'ampia scelta di piatti veg e vegani." },
          { question: "Si può prenotare per gruppi?", answer: "Certo, contattaci per eventi e cerimonie." },
          { question: "C'è parcheggio?", answer: "Parcheggio gratuito nelle vicinanze." } ] } },
        { id: "form", type: "contact_form", order: 4, content: { title: "Prenota il tuo tavolo" } },
        { id: "cta", type: "cta", order: 5, content: { title: "Ti aspettiamo a tavola", ctaLabel: "Prenota ora", ctaHref: "#contatti" } },
      ],
    },
    ideas: [
      idea("Piatto del giorno", "Cosa bolle in pentola oggi?", "Mostra la preparazione di un piatto.", "reel"),
      idea("Dietro le quinte", "La nostra cucina alle 7 del mattino", "Lo chef prepara il servizio.", "reel"),
      idea("Ingrediente segreto", "Perché la nostra pasta è diversa", "Racconta un ingrediente speciale.", "carosello"),
      idea("Recensione cliente", "I clienti non sanno di essere ripresi", "Reazioni al primo morso.", "reel"),
      idea("Ricetta veloce", "La carbonara perfetta in 3 step", "Mini tutorial di una ricetta.", "reel"),
    ],
  },
  {
    keywords: ["dentista", "dentistico", "studio dentistico", "odontoiatra", "sorriso"],
    profile: visualDna("#0ea5e9", "#0f172a", "#22d3ee", "Inter", "Inter", "professionale, rassicurante"),
    def: {
      template: "modern",
      theme: theme("#0ea5e9", "#0f172a", "#22d3ee", "Inter", "Inter"),
      forms: [contactForm("lead_form")],
      sections: [
        { id: "hero", type: "hero", order: 0, content: { title: "Il tuo sorriso in mani sicure", subtitle: "Studio dentistico moderno, tecnologie all'avanguardia. Prima visita senza impegno.", ctaLabel: "Prenota una visita", ctaHref: "#contatti" } },
        { id: "benefits", type: "benefits", order: 1, content: { title: "I nostri servizi", items: [
          { title: "Igiene e prevenzione", description: "Controlli regolari per un sorriso sano." },
          { title: "Implantologia", description: "Soluzioni durature con tecnologia digitale." },
          { title: "Ortodonzia", description: "Allineatori trasparenti e apparecchi moderni." } ] } },
        { id: "testi", type: "testimonials", order: 2, content: { title: "I nostri pazienti", items: [
          { quote: "Finalmente uno studio dove non ho più paura.", author: "Anna L.", role: "Paziente" },
          { quote: "Professionalità e gentilezza, consigliatissimo.", author: "Paolo V.", role: "Paziente" } ] } },
        { id: "faq", type: "faq", order: 3, content: { title: "Domande frequenti", items: [
          { question: "La prima visita è gratuita?", answer: "Sì, include controllo e preventivo." },
          { question: "Accettate pagamenti rateali?", answer: "Sì, soluzioni personalizzate." },
          { question: "Trattate le emergenze?", answer: "Disponibilità per urgenze in giornata." } ] } },
        { id: "form", type: "contact_form", order: 4, content: { title: "Prenota la tua prima visita" } },
        { id: "cta", type: "cta", order: 5, content: { title: "Ritrova il piacere di sorridere", ctaLabel: "Prenota ora", ctaHref: "#contatti" } },
      ],
    },
    ideas: [
      idea("Mito sui denti", "Lo spazzolino dopo i pasti fa male?", "Sfati un mito sull'igiene orale.", "reel"),
      idea("Prima/dopo", "Una trasformazione del sorriso", "Mostra un caso (con consenso).", "carosello"),
      idea("Consiglio rapido", "Come sbiancare i denti in sicurezza", "Tips di igiene quotidiana.", "reel"),
      idea("Tour studio", "Visita il nostro studio", "Mostra ambienti e tecnologie.", "reel"),
    ],
  },
  {
    keywords: ["parrucchiere", "estetista", "salone", "beauty", "barbiere"],
    profile: visualDna("#db2777", "#1f2937", "#f472b6", "Poppins", "Inter", "elegante, glamour"),
    def: {
      template: "modern",
      theme: theme("#db2777", "#1f2937", "#f472b6", "Poppins", "Inter"),
      forms: [contactForm("prenotazione_form")],
      sections: [
        { id: "hero", type: "hero", order: 0, content: { title: "La tua bellezza, la nostra arte", subtitle: "Taglio, colore e trattamenti su misura. Prenota il tuo momento di relax.", ctaLabel: "Prenota ora", ctaHref: "#contatti" } },
        { id: "benefits", type: "benefits", order: 1, content: { title: "I nostri servizi", items: [
          { title: "Hair styling", description: "Tagli e colori personalizzati di tendenza." },
          { title: "Trattamenti", description: "Cura dei capelli e della pelle professionale." },
          { title: "Prodotti premium", description: "Solo marchi selezionati e di qualità." } ] } },
        { id: "testi", type: "testimonials", order: 2, content: { title: "Le nostre clienti", items: [
          { quote: "Esco sempre felice e coccolata.", author: "Federica B.", role: "Cliente" },
          { quote: "Hanno capito subito cosa volevo.", author: "Elena C.", role: "Cliente" } ] } },
        { id: "faq", type: "faq", order: 3, content: { title: "Informazioni", items: [
          { question: "Serve prenotare?", answer: "Consigliato, per garantirti il tuo orario." },
          { question: "Fate consulenze?", answer: "Sì, consulenza di immagine gratuita." },
          { question: "Avete offerte?", answer: "Promo mensili per nuovi clienti." } ] } },
        { id: "form", type: "contact_form", order: 4, content: { title: "Prenota il tuo appuntamento" } },
        { id: "cta", type: "cta", order: 5, content: { title: "Regalati un nuovo look", ctaLabel: "Prenota ora", ctaHref: "#contatti" } },
      ],
    },
    ideas: [
      idea("Transizione look", "Aspetta la fine...", "Trasformazione prima/dopo di una cliente.", "reel"),
      idea("Tendenza del mese", "Il colore che spopola questa stagione", "Mostra una tecnica di colore.", "reel"),
      idea("Tutorial styling", "La piega perfetta a casa", "Mini guida di hair styling.", "reel"),
      idea("Prodotto consigliato", "Il segreto per capelli sani", "Consiglio su un prodotto.", "carosello"),
    ],
  },
  {
    keywords: ["immobiliare", "agenzia immobiliare", "case", "vendita casa", "affitti"],
    profile: visualDna("#0d9488", "#0f172a", "#f59e0b", "Inter", "Inter", "affidabile, premium"),
    def: {
      template: "modern",
      theme: theme("#0d9488", "#0f172a", "#f59e0b", "Inter", "Inter"),
      forms: [contactForm("lead_form")],
      sections: [
        { id: "hero", type: "hero", order: 0, content: { title: "La casa dei tuoi sogni ti aspetta", subtitle: "Compra, vendi o affitta con un'agenzia che ti segue passo passo.", ctaLabel: "Richiedi una valutazione", ctaHref: "#contatti" } },
        { id: "benefits", type: "benefits", order: 1, content: { title: "Perché affidarti a noi", items: [
          { title: "Valutazione gratuita", description: "Stima professionale del tuo immobile." },
          { title: "Massima visibilità", description: "Annunci su tutti i portali principali." },
          { title: "Assistenza completa", description: "Ti seguiamo dal primo contatto al rogito." } ] } },
        { id: "stats", type: "stats", order: 2, content: { title: "I nostri numeri", items: [
          { value: "+500", label: "Immobili venduti" }, { value: "15", label: "Anni di esperienza" },
          { value: "98%", label: "Clienti soddisfatti" }, { value: "30gg", label: "Tempo medio vendita" } ] } },
        { id: "faq", type: "faq", order: 3, content: { title: "Domande frequenti", items: [
          { question: "Quanto costa la valutazione?", answer: "È gratuita e senza impegno." },
          { question: "Vi occupate dei documenti?", answer: "Sì, gestiamo tutta la parte burocratica." },
          { question: "Lavorate anche sugli affitti?", answer: "Sì, vendita e locazione." } ] } },
        { id: "form", type: "contact_form", order: 4, content: { title: "Richiedi una valutazione gratuita" } },
        { id: "cta", type: "cta", order: 5, content: { title: "Iniziamo insieme", ctaLabel: "Contattaci", ctaHref: "#contatti" } },
      ],
    },
    ideas: [
      idea("Tour immobile", "Entra in questa villa con noi", "Video tour di un immobile in vendita.", "reel"),
      idea("Consiglio mercato", "È il momento giusto per vendere?", "Analisi rapida del mercato.", "carosello"),
      idea("Errore da evitare", "L'errore n.1 di chi vende casa", "Consiglio per venditori.", "reel"),
      idea("Caso di successo", "Venduta in 10 giorni", "Storia di una vendita rapida.", "reel"),
    ],
  },
  {
    keywords: ["avvocato", "studio legale", "legale", "consulenza legale", "commercialista"],
    profile: visualDna("#1d4ed8", "#0f172a", "#94a3b8", "Playfair Display", "Inter", "autorevole, sobrio"),
    def: {
      template: "modern",
      theme: theme("#1d4ed8", "#0f172a", "#94a3b8", "Playfair Display", "Inter"),
      forms: [contactForm("lead_form")],
      sections: [
        { id: "hero", type: "hero", order: 0, content: { title: "Tuteliamo i tuoi diritti", subtitle: "Consulenza legale chiara e competente. Prima consulenza conoscitiva gratuita.", ctaLabel: "Richiedi consulenza", ctaHref: "#contatti" } },
        { id: "benefits", type: "benefits", order: 1, content: { title: "Aree di competenza", items: [
          { title: "Diritto civile", description: "Contratti, risarcimenti, controversie." },
          { title: "Diritto del lavoro", description: "Tutela per aziende e lavoratori." },
          { title: "Diritto di famiglia", description: "Separazioni, divorzi, successioni." } ] } },
        { id: "testi", type: "testimonials", order: 2, content: { title: "I nostri assistiti", items: [
          { quote: "Chiarezza e competenza dal primo incontro.", author: "G. Ferri", role: "Cliente" },
          { quote: "Mi hanno seguito con grande attenzione.", author: "M. Conti", role: "Cliente" } ] } },
        { id: "faq", type: "faq", order: 3, content: { title: "Domande frequenti", items: [
          { question: "La prima consulenza è gratuita?", answer: "Sì, un incontro conoscitivo senza impegno." },
          { question: "Operate solo in zona?", answer: "Anche consulenze online su tutto il territorio." },
          { question: "Come funzionano gli onorari?", answer: "Preventivo trasparente prima di iniziare." } ] } },
        { id: "form", type: "contact_form", order: 4, content: { title: "Richiedi una consulenza" } },
        { id: "cta", type: "cta", order: 5, content: { title: "Parla con un esperto", ctaLabel: "Contattaci", ctaHref: "#contatti" } },
      ],
    },
    ideas: [
      idea("Lo sapevi che", "Questo contratto è nullo se...", "Pillola legale utile.", "carosello"),
      idea("Diritto spiegato", "Cosa fare se non ti pagano", "Spiegazione semplice di un diritto.", "reel"),
      idea("Errore comune", "L'errore che fanno tutti nei contratti", "Consiglio pratico.", "reel"),
      idea("Domanda frequente", "Quanto costa un avvocato?", "Rispondi a un dubbio comune.", "reel"),
    ],
  },
  {
    keywords: ["hotel", "b&b", "albergo", "agriturismo", "struttura ricettiva", "camere"],
    profile: visualDna("#0f766e", "#1c1917", "#eab308", "Playfair Display", "Inter", "rilassante, naturale"),
    def: {
      template: "modern",
      theme: theme("#0f766e", "#1c1917", "#eab308", "Playfair Display", "Inter"),
      forms: [contactForm("prenotazione_form")],
      sections: [
        { id: "hero", type: "hero", order: 0, content: { title: "Il tuo rifugio lontano da tutto", subtitle: "Camere accoglienti, colazione genuina, relax assoluto. Prenota il tuo soggiorno.", ctaLabel: "Verifica disponibilità", ctaHref: "#contatti" } },
        { id: "benefits", type: "benefits", order: 1, content: { title: "La tua esperienza", items: [
          { title: "Camere confortevoli", description: "Spazi curati per un riposo perfetto." },
          { title: "Colazione inclusa", description: "Prodotti locali e fatti in casa." },
          { title: "Posizione ideale", description: "A due passi dalle principali attrazioni." } ] } },
        { id: "testi", type: "testimonials", order: 2, content: { title: "I nostri ospiti", items: [
          { quote: "Un'oasi di pace, torneremo sicuramente.", author: "Famiglia Russo", role: "Ospiti" },
          { quote: "Accoglienza calorosa e colazione top.", author: "Chiara D.", role: "Ospite" } ] } },
        { id: "faq", type: "faq", order: 3, content: { title: "Informazioni utili", items: [
          { question: "È possibile la cancellazione?", answer: "Gratuita fino a 48h prima." },
          { question: "Accettate animali?", answer: "Sì, siamo pet-friendly." },
          { question: "C'è il parcheggio?", answer: "Parcheggio privato gratuito." } ] } },
        { id: "form", type: "contact_form", order: 4, content: { title: "Verifica disponibilità" } },
        { id: "cta", type: "cta", order: 5, content: { title: "Concediti una pausa", ctaLabel: "Prenota ora", ctaHref: "#contatti" } },
      ],
    },
    ideas: [
      idea("Tour camera", "La vista che ti sveglia così", "Mostra una camera e la vista.", "reel"),
      idea("Colazione", "La colazione dei sogni", "Riprendi il buffet del mattino.", "reel"),
      idea("Dintorni", "5 cose da fare in zona", "Consigli sulle attrazioni vicine.", "carosello"),
      idea("Ospite felice", "Reazioni al check-in", "Accoglienza degli ospiti.", "reel"),
    ],
  },
  {
    keywords: ["ecommerce", "negozio", "shop", "prodotti", "online"],
    profile: visualDna("#7c3aed", "#1e1b4b", "#f59e0b", "Poppins", "Inter", "moderno, dinamico"),
    def: {
      template: "modern",
      theme: theme("#7c3aed", "#1e1b4b", "#f59e0b", "Poppins", "Inter"),
      forms: [contactForm("iscrizione_form")],
      sections: [
        { id: "hero", type: "hero", order: 0, content: { title: "I prodotti che ami, a casa tua", subtitle: "Spedizione rapida, resi gratuiti. Iscriviti e ottieni il 10% di sconto.", ctaLabel: "Ottieni lo sconto", ctaHref: "#contatti" } },
        { id: "benefits", type: "benefits", order: 1, content: { title: "Perché comprare da noi", items: [
          { title: "Spedizione 24/48h", description: "Ricevi i tuoi ordini in tempi record." },
          { title: "Resi gratuiti", description: "Cambia idea senza pensieri entro 30 giorni." },
          { title: "Pagamenti sicuri", description: "Transazioni protette e tracciabili." } ] } },
        { id: "stats", type: "stats", order: 2, content: { title: "I nostri numeri", items: [
          { value: "+10k", label: "Clienti felici" }, { value: "4.8/5", label: "Valutazione media" },
          { value: "24h", label: "Spedizione" }, { value: "30gg", label: "Reso gratuito" } ] } },
        { id: "faq", type: "faq", order: 3, content: { title: "Domande frequenti", items: [
          { question: "Quanto costa la spedizione?", answer: "Gratuita sopra i 49€." },
          { question: "Come funziona il reso?", answer: "Gratuito e semplice entro 30 giorni." },
          { question: "Quali pagamenti accettate?", answer: "Carte, PayPal e pagamento alla consegna." } ] } },
        { id: "form", type: "contact_form", order: 4, content: { title: "Iscriviti e ottieni il 10% di sconto" } },
        { id: "cta", type: "cta", order: 5, content: { title: "Inizia a fare shopping", ctaLabel: "Iscriviti ora", ctaHref: "#contatti" } },
      ],
    },
    ideas: [
      idea("Unboxing", "Apri il pacco con noi", "Unboxing di un prodotto best seller.", "reel"),
      idea("Top prodotti", "I 3 più venduti del mese", "Carosello dei prodotti top.", "carosello"),
      idea("Come si usa", "Il trucco che non sapevi", "Tutorial d'uso di un prodotto.", "reel"),
      idea("Recensione reale", "Cosa dicono i clienti", "Mostra recensioni e prodotto.", "reel"),
    ],
  },
];

export const DEMO_LANDING_DEFAULT: DemoLanding = DEMO_LANDINGS[0]!;
