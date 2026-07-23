// Per-sector visual DNA (ported & adapted from ScrapingNia's _NICHE_VISUAL_DNA).
// Drives the bespoke Sonnet HTML build: colors, fonts, gradient, mood, style
// notes and curated imagery — so the look is chosen by sector, not a template.

export interface SectorDNA {
  primary: string;
  secondary: string;
  accent: string;
  headingFont: string;
  bodyFont: string;
  fontsUrl: string;
  gradientHero: string;
  mood: string;
  styleNotes: string;
  images: string[]; // curated Unsplash URLs; empty → Sonnet designs without photos
}

// Curated, real Unsplash image families (hero @1400, others @800).
const IMG = {
  fitness: [
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80",
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
    "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&q=80",
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80",
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80",
    "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80",
    "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&q=80",
    "https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&q=80",
  ],
  streetfood: [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1400&q=80",
    "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80",
    "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  ],
  dental: [
    "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1400&q=80",
    "https://images.unsplash.com/photo-1588776814546-1ffbb2c17cda?w=800&q=80",
    "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&q=80",
    "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=800&q=80",
    "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=800&q=80",
    "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=80",
  ],
  hair: [
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1400&q=80",
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800&q=80",
    "https://images.unsplash.com/photo-1470259078422-826894b933aa?w=800&q=80",
    "https://images.unsplash.com/photo-1595475038665-ca62e84a5f3f?w=800&q=80",
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
    "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=800&q=80",
  ],
  creative: [
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1400&q=80",
    "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=800&q=80",
    "https://images.unsplash.com/photo-1562962230-16e3edc43b92?w=800&q=80",
    "https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?w=800&q=80",
    "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80",
    "https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=800&q=80",
  ],
  business: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
  ],
  legal: [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1400&q=80",
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
  ],
  realestate: [
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80",
    "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?w=800&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
  ],
  shop: [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80",
    "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=800&q=80",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80",
  ],
  auto: [
    "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=1400&q=80",
    "https://images.unsplash.com/photo-1416339306562-f3d12fefd36f?w=800&q=80",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  ],
};

const FONTS = (heading: string, body: string) =>
  `https://fonts.googleapis.com/css2?family=${heading.replace(/ /g, "+")}:wght@400;500;600;700&family=${body.replace(/ /g, "+")}:wght@300;400;500;600;700&display=swap`;

/** URL Google Fonts per una coppia heading/body (usato anche dall'agente UX/UI). */
export const fontsUrlFor = FONTS;

interface Entry extends SectorDNA {
  keywords: string[];
}

const SECTORS: Entry[] = [
  {
    keywords: ["palestra", "gym", "fitness", "crossfit", "personal trainer", "centro sportivo"],
    primary: "#FF6B35", secondary: "#1A1A2E", accent: "#FFFFFF",
    headingFont: "Rajdhani", bodyFont: "Roboto", fontsUrl: FONTS("Rajdhani", "Roboto"),
    gradientHero: "linear-gradient(135deg, rgba(10,10,15,0.92) 0%, rgba(255,107,53,0.45) 100%)",
    mood: "energia esplosiva, trasformazione fisica, motivazione",
    styleNotes: "Sfondo scuro #0A0A0F con accenti arancio fuoco. Font condensato bold Rajdhani. Statistiche PRIMA/DOPO, counter (2000+ iscritti). Badge PROVA GRATUITA. Foto di atleti in azione.",
    images: IMG.fitness,
  },
  {
    keywords: ["ristorante", "trattoria", "osteria", "cucina", "fine dining"],
    primary: "#7B3F00", secondary: "#C9A227", accent: "#E8D5B7",
    headingFont: "Cormorant Garamond", bodyFont: "Lato", fontsUrl: FONTS("Cormorant Garamond", "Lato"),
    gradientHero: "linear-gradient(135deg, rgba(28,10,0,0.85) 0%, rgba(123,63,0,0.65) 100%)",
    mood: "eleganza italiana, atmosfera calda, cucina tradizionale",
    styleNotes: "Marrone terracotta e oro su crema. Serif Cormorant Garamond elegante. Atmosfera intima, candele, bokeh. Sezione vini e menù stagionale. Quote dello chef.",
    images: IMG.restaurant,
  },
  {
    keywords: ["pizzeria", "pizza"],
    primary: "#C0392B", secondary: "#27AE60", accent: "#F39C12",
    headingFont: "Oswald", bodyFont: "Nunito", fontsUrl: FONTS("Oswald", "Nunito"),
    gradientHero: "linear-gradient(135deg, rgba(20,10,5,0.86) 0%, rgba(192,57,43,0.6) 100%)",
    mood: "autentico, conviviale, forno a legna, tradizione napoletana",
    styleNotes: "Rosso pomodoro e verde basilico. Oswald bold. Foto di pizze fumanti dal forno. Badge 'FORNO A LEGNA', 'IMPASTO 48H'. Menù fotografico con prezzi grandi.",
    images: IMG.restaurant,
  },
  {
    keywords: ["paninoteca", "paninoterie", "panini", "street food", "burger", "hamburgeria"],
    primary: "#C0392B", secondary: "#E67E22", accent: "#F39C12",
    headingFont: "Oswald", bodyFont: "Nunito", fontsUrl: FONTS("Oswald", "Nunito"),
    gradientHero: "linear-gradient(135deg, rgba(26,10,0,0.88) 0%, rgba(192,57,43,0.65) 100%)",
    mood: "street food autentico, caldo, rustico e invitante",
    styleNotes: "Toni caldi rosso/arancio su sfondi carbone. Oswald bold. Badge 'ARTIGIANALE', 'FATTO IN CASA'. Menù fotografico, foto di panini fumanti e ingredienti freschi.",
    images: IMG.streetfood,
  },
  {
    keywords: ["bar", "caffetteria", "caffè", "cocktail", "pub", "lounge"],
    primary: "#6F4E37", secondary: "#D4A373", accent: "#FAEDCD",
    headingFont: "Playfair Display", bodyFont: "Nunito", fontsUrl: FONTS("Playfair Display", "Nunito"),
    gradientHero: "linear-gradient(135deg, rgba(20,12,6,0.86) 0%, rgba(111,78,55,0.6) 100%)",
    mood: "accogliente, aromatico, ritrovo quotidiano",
    styleNotes: "Toni caffè e crema. Foto di tazze, aperitivi, ambiente. Sezione 'aperitivo' e orari. Atmosfera calda.",
    images: IMG.streetfood,
  },
  {
    keywords: ["dentista", "dentistico", "odontoiatra", "studio dentistico"],
    primary: "#00A8CC", secondary: "#00D4AA", accent: "#E8F4FD",
    headingFont: "Nunito Sans", bodyFont: "Source Sans Pro", fontsUrl: FONTS("Nunito Sans", "Source Sans Pro"),
    gradientHero: "linear-gradient(135deg, rgba(10,22,40,0.9) 0%, rgba(0,168,204,0.5) 100%)",
    mood: "professionale, fiducia, pulizia, sorrisi sani",
    styleNotes: "Azzurro e turchese su bianco pulito. Nunito Sans arrotondato. Foto di sorrisi felici. Certificazioni e tecnologie. FAQ paure dentali. Form prenotazione visita gratuita.",
    images: IMG.dental,
  },
  {
    keywords: ["medico", "clinica", "ambulatorio", "fisioterapista", "fisioterapia", "poliambulatorio", "veterinario"],
    primary: "#0EA5A4", secondary: "#0F766E", accent: "#CCFBF1",
    headingFont: "Nunito Sans", bodyFont: "Source Sans Pro", fontsUrl: FONTS("Nunito Sans", "Source Sans Pro"),
    gradientHero: "linear-gradient(135deg, rgba(8,20,28,0.9) 0%, rgba(14,165,164,0.5) 100%)",
    mood: "cura, competenza, benessere, rassicurante",
    styleNotes: "Verde acqua e bianco. Tipografia leggibile e arrotondata. Foto di ambiente clinico curato. Certificazioni, equipe, prenotazione visita.",
    images: IMG.dental,
  },
  {
    keywords: ["parrucchiere", "barbiere", "hair", "salone"],
    primary: "#2C3E50", secondary: "#E8C547", accent: "#BDC3C7",
    headingFont: "Josefin Sans", bodyFont: "Open Sans", fontsUrl: FONTS("Josefin Sans", "Open Sans"),
    gradientHero: "linear-gradient(135deg, rgba(13,17,23,0.92) 0%, rgba(44,62,80,0.75) 100%)",
    mood: "stile contemporaneo, professionale, tendenze",
    styleNotes: "Dark elegante con accenti oro. Josefin Sans geometrico. Gallery portfolio tagli e colore. Sezione 'I nostri stilisti'. Prenotazione online in evidenza.",
    images: IMG.hair,
  },
  {
    keywords: ["estetista", "estetico", "beauty", "centro estetico", "spa", "nail", "make up"],
    primary: "#DB2777", secondary: "#1F2937", accent: "#FBCFE8",
    headingFont: "Poppins", bodyFont: "Open Sans", fontsUrl: FONTS("Poppins", "Open Sans"),
    gradientHero: "linear-gradient(135deg, rgba(20,12,18,0.88) 0%, rgba(219,39,119,0.55) 100%)",
    mood: "elegante, glamour, cura di sé, raffinato",
    styleNotes: "Rosa elegante e antracite. Poppins. Foto curate di trattamenti, dettagli. Listino servizi, prima/dopo, prenotazione.",
    images: IMG.hair,
  },
  {
    keywords: ["tatuatori", "tatuaggi", "tattoo", "piercing"],
    primary: "#E63946", secondary: "#F4A261", accent: "#264653",
    headingFont: "Bebas Neue", bodyFont: "Montserrat", fontsUrl: FONTS("Bebas Neue", "Montserrat"),
    gradientHero: "linear-gradient(135deg, rgba(10,10,10,0.96) 0%, rgba(230,57,70,0.4) 100%)",
    mood: "arte, creatività, identità unica, underground premium",
    styleNotes: "Quasi nero con accenti rosso/arancio. Bebas Neue condensato urbano. Portfolio artwork in griglia. Stili offerti. Prenotazione consulenza gratuita.",
    images: IMG.creative,
  },
  {
    keywords: ["fotografo", "fotografi", "fotografia", "studio fotografico", "video maker"],
    primary: "#111827", secondary: "#9CA3AF", accent: "#F59E0B",
    headingFont: "Bebas Neue", bodyFont: "Montserrat", fontsUrl: FONTS("Bebas Neue", "Montserrat"),
    gradientHero: "linear-gradient(135deg, rgba(8,8,10,0.9) 0%, rgba(17,24,39,0.6) 100%)",
    mood: "visivo, artistico, racconto per immagini",
    styleNotes: "Minimal scuro, la foto è protagonista. Gallery a tutta larghezza. Pacchetti (matrimoni, ritratti). Prenotazione shooting.",
    images: IMG.creative,
  },
  {
    keywords: ["consulenza", "consulente", "agenzia", "marketing", "servizi alle imprese", "business", "software", "web agency", "commercialista", "contabile"],
    primary: "#1D4ED8", secondary: "#0F172A", accent: "#38BDF8",
    headingFont: "Outfit", bodyFont: "Inter", fontsUrl: FONTS("Outfit", "Inter"),
    gradientHero: "linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(29,78,216,0.55) 100%)",
    mood: "competenza, risultati misurabili, partner di crescita",
    styleNotes: "Blu professionale su slate scuro. Outfit pulito. Sezione risultati con numeri (fatturato, clienti). Case study o processo in 3 step. CTA 'consulenza gratuita'.",
    images: IMG.business,
  },
  {
    keywords: ["avvocato", "studio legale", "legale", "notaio"],
    primary: "#1E293B", secondary: "#B45309", accent: "#F1F5F9",
    headingFont: "Playfair Display", bodyFont: "Source Sans Pro", fontsUrl: FONTS("Playfair Display", "Source Sans Pro"),
    gradientHero: "linear-gradient(135deg, rgba(10,15,25,0.94) 0%, rgba(30,41,59,0.75) 100%)",
    mood: "autorevolezza, riservatezza, precisione",
    styleNotes: "Blu notte e ottone. Serif autorevole. Aree di competenza in card sobrie. Bio dei professionisti. CTA 'richiedi un parere'.",
    images: IMG.legal,
  },
  {
    keywords: ["immobiliare", "agenzia immobiliare", "case", "affitti", "real estate"],
    primary: "#0F766E", secondary: "#134E4A", accent: "#FBBF24",
    headingFont: "Outfit", bodyFont: "Inter", fontsUrl: FONTS("Outfit", "Inter"),
    gradientHero: "linear-gradient(135deg, rgba(8,20,18,0.9) 0%, rgba(15,118,110,0.55) 100%)",
    mood: "fiducia, casa, investimento sicuro",
    styleNotes: "Verde petrolio e ambra. Immobili in card con foto grandi. Valutazione gratuita in evidenza. Zone servite.",
    images: IMG.realestate,
  },
  {
    keywords: ["negozio", "boutique", "abbigliamento", "shop", "store", "gioielleria", "ottica", "svapo", "sigarette elettroniche"],
    primary: "#7C3AED", secondary: "#111827", accent: "#F59E0B",
    headingFont: "Poppins", bodyFont: "Inter", fontsUrl: FONTS("Poppins", "Inter"),
    gradientHero: "linear-gradient(135deg, rgba(17,24,39,0.9) 0%, rgba(124,58,237,0.5) 100%)",
    mood: "prodotti curati, esperienza in negozio, novita'",
    styleNotes: "Viola e ambra su scuro. Vetrina prodotti in griglia. Orari e indicazioni ben visibili. Novita'/promo in evidenza.",
    images: IMG.shop,
  },
  {
    keywords: ["officina", "meccanico", "gommista", "carrozzeria", "auto", "moto", "elettrauto"],
    primary: "#DC2626", secondary: "#1C1917", accent: "#FACC15",
    headingFont: "Oswald", bodyFont: "Roboto", fontsUrl: FONTS("Oswald", "Roboto"),
    gradientHero: "linear-gradient(135deg, rgba(12,10,9,0.92) 0%, rgba(220,38,38,0.5) 100%)",
    mood: "affidabilita', rapidita', mani esperte",
    styleNotes: "Rosso e giallo su antracite. Oswald bold. Servizi con tempi chiari (tagliando in giornata). Preventivo gratuito. Badge esperienza.",
    images: IMG.auto,
  },
  {
    keywords: ["idraulico", "elettricista", "impresa edile", "ristrutturazioni", "imbianchino", "fabbro", "giardiniere", "pulizie"],
    primary: "#EA580C", secondary: "#1E293B", accent: "#FDBA74",
    headingFont: "Outfit", bodyFont: "Roboto", fontsUrl: FONTS("Outfit", "Roboto"),
    gradientHero: "linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(234,88,12,0.55) 100%)",
    mood: "concretezza, intervento rapido, lavoro fatto bene",
    styleNotes: "Arancio cantiere su blu scuro. Interventi/urgenze con numero in evidenza. Prima/dopo dei lavori. Preventivo gratuito.",
    images: IMG.business,
  },
];

const DEFAULT_DNA: SectorDNA = {
  primary: "#4F46E5", secondary: "#0F172A", accent: "#F59E0B",
  headingFont: "Outfit", bodyFont: "Inter", fontsUrl: FONTS("Outfit", "Inter"),
  gradientHero: "linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(79,70,229,0.55) 100%)",
  mood: "moderno, professionale, affidabile",
  styleNotes: "Stile SaaS moderno: indaco e ambra, tanto spazio, tipografia pulita. Usa le foto fornite per hero e sezioni, con overlay scuro per un look ordinato e premium.",
  // Mai piu' landing senza foto: il default usa il set business generico.
  images: IMG.business,
};

export function pickSectorDNA(sector: string, brief: string): SectorDNA {
  const hay = `${sector} ${brief}`.toLowerCase();
  // Match a PAROLA INTERA: "bar" non deve matchare dentro "barberia"/"barbiere".
  const hasWord = (k: string) => {
    const esc = k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-zà-ù])${esc}([^a-zà-ù]|$)`, "i").test(hay);
  };
  let best: Entry | null = null;
  let bestScore = 0;
  for (const e of SECTORS) {
    const score = e.keywords.reduce((n, k) => (hasWord(k) ? n + 1 : n), 0);
    if (score > bestScore) { bestScore = score; best = e; }
  }
  if (!best) return DEFAULT_DNA;
  const { keywords: _k, ...dna } = best;
  return dna;
}
