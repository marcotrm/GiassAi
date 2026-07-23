import type { BusinessProfile } from "@workspace/api-zod";
import { completeText } from "../model-adapter.js";
import { MODELS } from "../models.js";
import type { SectorDNA } from "./sector-dna.js";
import type { CopyPack, SeoPack, LayoutConcept } from "./agents.js";

// The "UX/UI PRO MAX" designer brief — encodes modern landing best practices.
const SYSTEM_PROMPT = `Sei un designer/sviluppatore frontend d'élite (skill "UX/UI PRO MAX"). Costruisci landing page che convertono, di livello agenzia premium. NON usi template: ogni sito è su misura per l'attività.

OUTPUT:
- Rispondi SOLO con HTML completo, da <!DOCTYPE html> FINO a </html> incluso. NIENTE markdown, niente \`\`\`.
- LA PAGINA DEVE ESSERE COMPLETA E CHIUSA: chiudi tutti i tag e termina con </body></html>. Non lasciare la pagina a metà.
- Scrivi markup EFFICIENTE: usa le classi utility di Tailwind, NON ripetere lunghi stili inline. Mantieni l'HTML compatto ma completo.
- Stack: TailwindCSS via CDN (<script src="https://cdn.tailwindcss.com"></script>), FontAwesome 6 (<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">), e i Google Fonts forniti.
- Definisci i colori come CSS variables in :root e usali ovunque. Imposta i font (heading vs body).

REGOLE DI DESIGN (applicale con rigore):
- Gerarchia tipografica forte: titoli grandi e d'impatto, sottotitoli, corpo leggibile. Tanto respiro (padding ampi, sezioni py-20+).
- Contenitori centrati (max-w-6xl mx-auto px-6). Mai testo a tutta larghezza schermo.
- Sezioni alternate (sfondo chiaro/scuro/gradiente) per ritmo visivo. Hero con overlay scuro sull'immagine + gradiente del settore.
- Componenti curati: card con bordi morbidi (rounded-2xl), ombre leggere, hover lift, icone FontAwesome a corredo.
- Micro-interazioni discrete (hover, transition). Responsive impeccabile (mobile-first, grid che collassa).
- CTA evidenti e ripetute (hero + sezione finale). Bottoni grandi col colore accent.
- Niente "AI slop": evita Inter/Arial generici se i font del settore sono altri, evita gradienti viola su bianco a caso. Segui il mood del settore.

LOGO: se il brief non fornisce un logo, disegna un LOGO TIPOGRAFICO curato nella navbar e nel footer: monogramma o nome stilizzato coi colori del brand (es. iniziale in un quadrato col colore primary + nome accanto). Deve sembrare un logo vero, non solo testo.

COPY: scrivi tu il copy in ITALIANO, persuasivo e specifico per questa attività (hero, chi siamo, servizi, perché noi, testimonianze realistiche, FAQ, contatti). Usa il NOME dell'attività ovunque. NESSUN placeholder tipo [Nome] o Lorem ipsum.

STRUTTURA: l'ARCHITETTURA della pagina la decide l'art director ed e' DIVERSA per ogni attivita' (te la passo nel brief: stile del hero, elenco sezioni in ordine, dettaglio firma). SEGUILA FEDELMENTE: costruisci ogni sezione indicata in modo ricco e completo, variando i layout tra le sezioni (griglie, split, timeline, accordion, card sovrapposte, bande diagonali...) cosi' che il sito non sembri MAI un template. Se non ricevi un'architettura, usa questa di riserva: navbar sticky, hero d'impatto, chi siamo, servizi, numeri, testimonianze, FAQ, contatti con FORM + footer. In ogni caso: navbar sticky in testa e in fondo la sezione contatti col FORM reale + footer.

IMMAGINI: se ti vengono fornite immagini, USALE TUTTE distribuite nelle sezioni (in <img> o background-image). Se NON ci sono immagini, progetta un layout elegante SENZA foto (gradienti, blocchi di colore, icone grandi, pattern) — comunque premium.



ANTI-PATTERN DA EVITARE ASSOLUTAMENTE (checklist di qualita' da agenzia vera):
- NIENTE gradiente viola/indaco su bianco "da AI slop" a meno che non sia coerente col brand.
- NIENTE piu' di 2 livelli di card annidate (card dentro card dentro card = confusione visiva).
- Contrasto testo/sfondo SEMPRE leggibile (WCAG AA come minimo: niente grigio chiaro su bianco).
- NON ripetere lo stesso font-pairing generico (Inter+Inter, Poppins+Poppins ovunque): usa la coppia
  heading/body indicata, e se manca scegline una che rifletta davvero il settore.
- Bottoni e CTA: uno stile primario coerente in tutta la pagina, non 3 stili diversi di bottone.
- Icone: usa FontAwesome in modo mirato (una per concetto), MAI decorazione a caso senza significato.
- Spaziatura: rispetta una scala consistente (non alternare py-4 e py-32 senza criterio).
- Immagini: mai stirate o deformate (object-cover), sempre con overlay leggibile se c'e' testo sopra.
- Mobile: verifica mentalmente che ogni sezione collassi bene (niente testo tagliato, niente grid
  che "esplode" su schermi stretti).
- Originalita': se ti accorgi che la struttura che stai per scrivere assomiglia a un template
  generico da "landing page builder", torna all'ARCHITETTURA SU MISURA che ti e' stata data e
  arricchiscila con dettagli specifici di QUESTA attivita' (nomi, numeri, dettagli concreti).

FORM: la sezione contatti DEVE avere un <form method="POST" action="{{FORM_ACTION}}"> con campi name="nome", name="email", name="telefono", name="messaggio" e un bottone "Invia". (Questo collega i lead al gestionale/workflow.)`;

export async function buildLandingHtml(opts: {
  profile: BusinessProfile;
  dna: SectorDNA;
  competitorInsights: string;
  formId: string;
  seo?: SeoPack | null;
  copy?: CopyPack | null;
  logoDataUri?: string;
  layout?: LayoutConcept | null;
  signal?: AbortSignal;
}): Promise<{ html: string; usage: { tokensIn: number; tokensOut: number } }> {
  const { profile, dna, competitorInsights, formId, seo, copy, logoDataUri, layout } = opts;
  const formAction = `/api/hooks/form/${formId}`;

  const userContent = `ATTIVITÀ:
${JSON.stringify({ businessName: profile.businessName, sector: profile.sector, location: profile.location, usp: profile.usp, targetAudience: profile.targetAudience, tone: profile.tone }, null, 2)}

DESIGN SYSTEM SU MISURA (creato dall'art director per QUESTA attività — rispettalo):
- Colori: primary ${dna.primary}, secondary ${dna.secondary}, accent ${dna.accent}
- Font: heading "${dna.headingFont}", body "${dna.bodyFont}"
- Google Fonts: ${dna.fontsUrl}
- Gradiente hero: ${dna.gradientHero}
- Mood: ${dna.mood}
- Note di stile: ${dna.styleNotes}

IMMAGINI DA USARE (${dna.images.length}):
${dna.images.length ? dna.images.map((u, i) => `  ${i + 1}. ${u}`).join("\n") : "  (nessuna immagine — progetta senza foto)"}

${seo ? `SEO (inseriscilo fedelmente):
- <title>: ${seo.title}
- <meta name="description">: ${seo.metaDescription}
- H1 del hero: ${seo.h1}
- Keyword da far comparire naturalmente nei testi: ${seo.keywords.join(", ")}
- Inserisci in <head> questo JSON-LD: <script type="application/ld+json">${seo.jsonLd}</script>
` : ""}
${copy ? `COPY DEL COPYWRITER (usalo FEDELMENTE, puoi solo rifinire per il layout):
${JSON.stringify(copy, null, 2)}
` : ""}
${competitorInsights ? `INSIGHT COMPETITOR (usali per differenziare il messaggio):\n${competitorInsights}\n` : ""}
${logoDataUri ? `LOGO DEL CLIENTE (PNG trasparente): inserisci ESATTAMENTE <img src="{{LOGO_SRC}}" alt="${profile.businessName}" class="h-12 w-auto object-contain"> nella navbar e (h-10) nel footer — il segnaposto verra' sostituito dal sistema, NON modificarlo. REGOLE DI ELEGANZA: niente riquadri o card intorno al logo, niente sfondi bianchi dietro; il logo respira da solo con un po' di padding. Se la navbar e' scura e temi poca leggibilita', rendi la navbar chiara (bianco/crema) invece di incorniciare il logo. Nel hero NON ripetere il logo. Accanto al logo in navbar niente nome ripetuto se il logo contiene gia' il nome. NON disegnare un logo tipografico.
` : ""}FORM_ACTION da usare nel form contatti: ${formAction}

${layout ? `ARCHITETTURA DELLA PAGINA (decisa dall'art director per QUESTA attivita' — seguila):
- Stile hero: ${layout.heroStyle}
- Sezioni in ordine: ${layout.sezioni.map((z, i) => `${i + 1}. ${z}`).join("  ")}
- Dettaglio firma da integrare nel design: ${layout.dettaglioFirma}
` : ""}Costruisci ora la landing page HTML completa.`;

  const { text, usage } = await completeText({
    model: MODELS.builder, // Sonnet
    system: SYSTEM_PROMPT.replace("{{FORM_ACTION}}", formAction),
    messages: [{ role: "user", content: userContent }],
    temperature: 0.6,
    maxTokens: 32000,
    ...(opts.signal ? { signal: opts.signal } : {}),
  });

  // Strip accidental markdown fences and any preamble before the doctype.
  let html = text.trim();
  const start = html.search(/<!DOCTYPE html>|<html/i);
  if (start > 0) html = html.slice(start);
  html = html.replace(/```html?/gi, "").replace(/```/g, "").trim();
  if (logoDataUri) html = html.split("{{LOGO_SRC}}").join(logoDataUri);
  // Safety net: if the output got cut off, close the document so it still renders.
  if (!/<\/html>/i.test(html)) {
    if (!/<\/body>/i.test(html)) html += "\n</body>";
    html += "\n</html>";
  }
  return { html, usage };
}
