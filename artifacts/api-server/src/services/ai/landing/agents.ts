// Squadra di agenti per la landing bespoke, coordinati dall'orchestratore (Sonnet):
//   - UX/UI  (Sonnet): identita' visiva SU MISURA per la singola attivita'
//   - SEO    (Haiku) : title/meta/H1/keyword locali + JSON-LD deterministico
//   - COPY   (Sonnet): tutti i testi, sezione per sezione
//   - IMAGES         : foto pertinenti via Unsplash API (fallback: set curati)
// Ogni agente degrada con grazia: se fallisce, la pipeline continua col fallback.

import type { BusinessProfile } from "@workspace/api-zod";
import { completeJson } from "../model-adapter.js";
import { MODELS } from "../models.js";
import { fontsUrlFor, type SectorDNA } from "./sector-dna.js";
import { logger } from "../../../lib/logger.js";

export interface Usage {
  tokensIn: number;
  tokensOut: number;
}
const NO_USAGE: Usage = { tokensIn: 0, tokensOut: 0 };

// ---------------------------------------------------------------- UX/UI (Sonnet)
export async function designVisualIdentity(
  profile: BusinessProfile,
  inspiration: SectorDNA,
  brief: string,
  signal?: AbortSignal,
): Promise<{ dna: SectorDNA; usage: Usage }> {
  try {
    const { data, usage } = await completeJson({
      model: MODELS.builder, // Sonnet
      system:
        "Sei un art director UX/UI senior. Progetti l'identita' visiva di UNA specifica attivita' locale: " +
        "palette (hex), coppia di Google Fonts (heading+body), gradiente hero, mood e note di stile operative. " +
        "NON ricadere nel cliche' del settore: parti dall'ispirazione fornita ma DIFFERENZIA davvero in base a " +
        "nome, brief, target e tono di QUESTA attivita' (due ristoranti non devono uscire uguali). " +
        "Vincoli: contrasto leggibile, font Google reali, colori coerenti tra loro. Rispondi solo con lo strumento emit_design.",
      messages: [
        {
          role: "user",
          content:
            `ATTIVITA':\n${JSON.stringify({ businessName: profile.businessName, sector: profile.sector, location: profile.location, usp: profile.usp, targetAudience: profile.targetAudience, tone: profile.tone })}\n\n` +
            `BRIEF ORIGINALE:\n${brief.slice(0, 1200)}\n\n` +
            `ISPIRAZIONE DI SETTORE (da cui DIFFERENZIARE, non copiare):\n` +
            JSON.stringify({ primary: inspiration.primary, secondary: inspiration.secondary, accent: inspiration.accent, headingFont: inspiration.headingFont, bodyFont: inspiration.bodyFont, mood: inspiration.mood }),
        },
      ],
      tool: {
        name: "emit_design",
        description: "Identita' visiva della landing",
        inputSchema: {
          type: "object",
          required: ["primary", "secondary", "accent", "headingFont", "bodyFont", "gradientHero", "mood", "styleNotes"],
          properties: {
            primary: { type: "string", description: "hex" },
            secondary: { type: "string", description: "hex" },
            accent: { type: "string", description: "hex" },
            headingFont: { type: "string", description: "Google Font esistente" },
            bodyFont: { type: "string", description: "Google Font esistente" },
            gradientHero: { type: "string", description: "CSS linear-gradient con rgba, overlay scuro leggibile" },
            mood: { type: "string" },
            styleNotes: { type: "string", description: "indicazioni operative di stile per il builder (3-5 frasi)" },
          },
        },
      },
      temperature: 0.7,
      maxTokens: 1200,
      ...(signal ? { signal } : {}),
    });
    const d = data as Record<string, string>;
    const dna: SectorDNA = {
      primary: d["primary"] || inspiration.primary,
      secondary: d["secondary"] || inspiration.secondary,
      accent: d["accent"] || inspiration.accent,
      headingFont: d["headingFont"] || inspiration.headingFont,
      bodyFont: d["bodyFont"] || inspiration.bodyFont,
      fontsUrl: fontsUrlFor(d["headingFont"] || inspiration.headingFont, d["bodyFont"] || inspiration.bodyFont),
      gradientHero: d["gradientHero"] || inspiration.gradientHero,
      mood: d["mood"] || inspiration.mood,
      styleNotes: d["styleNotes"] || inspiration.styleNotes,
      images: inspiration.images,
    };
    return { dna, usage };
  } catch (err) {
    logger.warn({ err }, "UX/UI agent failed, using sector inspiration");
    return { dna: inspiration, usage: NO_USAGE };
  }
}

// ---------------------------------------------------------------- SEO (Haiku)
export interface SeoPack {
  title: string;
  metaDescription: string;
  h1: string;
  keywords: string[];
  jsonLd: string;
}

export async function generateSeo(
  profile: BusinessProfile,
  signal?: AbortSignal,
): Promise<{ seo: SeoPack; usage: Usage }> {
  const city = profile.location || "";
  const fallback: SeoPack = {
    title: `${profile.businessName}${city ? ` — ${city}` : ""}`,
    metaDescription: `${profile.businessName}: ${profile.sector}${city ? ` a ${city}` : ""}. Contattaci per informazioni.`,
    h1: profile.businessName,
    keywords: [profile.sector, city].filter(Boolean) as string[],
    jsonLd: buildJsonLd(profile),
  };
  try {
    const { data, usage } = await completeJson({
      model: MODELS.executor, // Haiku
      system:
        "Sei un esperto SEO locale italiano. Genera i metadati per la landing di un'attivita' locale: " +
        "title (max 60 char, con citta'), meta description (max 155 char, con invito all'azione), " +
        "H1 d'impatto e 5-8 keyword locali (es. 'gommista caserta'). Rispondi solo con emit_seo.",
      messages: [
        { role: "user", content: JSON.stringify({ businessName: profile.businessName, sector: profile.sector, location: profile.location, usp: profile.usp, targetAudience: profile.targetAudience }) },
      ],
      tool: {
        name: "emit_seo",
        description: "Metadati SEO",
        inputSchema: {
          type: "object",
          required: ["title", "metaDescription", "h1", "keywords"],
          properties: {
            title: { type: "string" },
            metaDescription: { type: "string" },
            h1: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
          },
        },
      },
      temperature: 0.4,
      maxTokens: 700,
      ...(signal ? { signal } : {}),
    });
    const d = data as Record<string, unknown>;
    return {
      seo: {
        title: String(d["title"] || fallback.title),
        metaDescription: String(d["metaDescription"] || fallback.metaDescription),
        h1: String(d["h1"] || fallback.h1),
        keywords: Array.isArray(d["keywords"]) ? (d["keywords"] as string[]) : fallback.keywords,
        jsonLd: buildJsonLd(profile),
      },
      usage,
    };
  } catch (err) {
    logger.warn({ err }, "SEO agent failed, using fallback meta");
    return { seo: fallback, usage: NO_USAGE };
  }
}

function buildJsonLd(profile: BusinessProfile): string {
  // Deterministico (niente allucinazioni su dati strutturati).
  const obj = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: profile.businessName,
    description: (profile.usp || []).join(". "),
    ...(profile.location ? { address: { "@type": "PostalAddress", addressLocality: profile.location } } : {}),
  };
  return JSON.stringify(obj);
}

// ---------------------------------------------------------------- COPY (Sonnet)
export interface CopyPack {
  hero: { titolo: string; sottotitolo: string; cta: string };
  chiSiamo: string;
  servizi: { nome: string; descrizione: string }[];
  punti: { valore: string; etichetta: string }[];
  testimonianze: { nome: string; testo: string }[];
  faq: { domanda: string; risposta: string }[];
  contattiIntro: string;
}

export async function writeCopy(
  profile: BusinessProfile,
  competitorInsights: string,
  signal?: AbortSignal,
): Promise<{ copy: CopyPack | null; usage: Usage }> {
  try {
    const { data, usage } = await completeJson({
      model: MODELS.builder, // Sonnet
      system:
        "Sei un copywriter direct-response italiano di alto livello. Scrivi il copy COMPLETO della landing di " +
        "un'attivita' locale: specifico, concreto, zero frasi fatte, benefici prima delle caratteristiche. " +
        "Usa il nome dell'attivita'. Testimonianze realistiche (nomi italiani comuni, dettagli credibili). " +
        "FAQ che sciolgono vere obiezioni d'acquisto. Rispondi solo con emit_copy.",
      messages: [
        {
          role: "user",
          content:
            `ATTIVITA':\n${JSON.stringify({ businessName: profile.businessName, sector: profile.sector, location: profile.location, usp: profile.usp, targetAudience: profile.targetAudience, tone: profile.tone })}` +
            (competitorInsights ? `\n\nINSIGHT COMPETITOR (differenzia il messaggio):\n${competitorInsights.slice(0, 1500)}` : ""),
        },
      ],
      tool: {
        name: "emit_copy",
        description: "Copy completo della landing",
        inputSchema: {
          type: "object",
          required: ["hero", "chiSiamo", "servizi", "punti", "testimonianze", "faq", "contattiIntro"],
          properties: {
            hero: {
              type: "object",
              required: ["titolo", "sottotitolo", "cta"],
              properties: { titolo: { type: "string" }, sottotitolo: { type: "string" }, cta: { type: "string" } },
            },
            chiSiamo: { type: "string", description: "80-120 parole" },
            servizi: {
              type: "array",
              items: { type: "object", required: ["nome", "descrizione"], properties: { nome: { type: "string" }, descrizione: { type: "string" } } },
            },
            punti: {
              type: "array",
              items: { type: "object", required: ["valore", "etichetta"], properties: { valore: { type: "string" }, etichetta: { type: "string" } } },
            },
            testimonianze: {
              type: "array",
              items: { type: "object", required: ["nome", "testo"], properties: { nome: { type: "string" }, testo: { type: "string" } } },
            },
            faq: {
              type: "array",
              items: { type: "object", required: ["domanda", "risposta"], properties: { domanda: { type: "string" }, risposta: { type: "string" } } },
            },
            contattiIntro: { type: "string" },
          },
        },
      },
      temperature: 0.7,
      maxTokens: 3000,
      ...(signal ? { signal } : {}),
    });
    return { copy: data as unknown as CopyPack, usage };
  } catch (err) {
    logger.warn({ err }, "Copy agent failed, builder will write copy itself");
    return { copy: null, usage: NO_USAGE };
  }
}

// ---------------------------------------------------------------- IMAGES (Unsplash API)
export async function findImages(
  profile: BusinessProfile,
  fallback: string[],
  signal?: AbortSignal,
): Promise<{ images: string[]; usage: Usage }> {
  const key = process.env["UNSPLASH_ACCESS_KEY"];
  if (!key) return { images: fallback, usage: NO_USAGE };
  try {
    // 1) query di ricerca mirate (Haiku, in inglese: Unsplash indicizza in EN)
    const { data, usage } = await completeJson({
      model: MODELS.executor,
      system:
        "Generate 3 short English photo-search queries (2-4 words each) to find professional stock photos " +
        "for this local business website: interior/ambience, people/service in action, product/detail. " +
        "Concrete and visual, no brand names. Reply only with emit_queries.",
      messages: [{ role: "user", content: JSON.stringify({ businessName: profile.businessName, sector: profile.sector, usp: profile.usp }) }],
      tool: {
        name: "emit_queries",
        description: "Photo search queries",
        inputSchema: {
          type: "object",
          required: ["queries"],
          properties: { queries: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 } },
        },
      },
      temperature: 0.4,
      maxTokens: 300,
      ...(signal ? { signal } : {}),
    });
    const queries = ((data as { queries?: string[] }).queries || []).slice(0, 3);

    // 2) ricerca Unsplash: 2 foto per query, landscape, dedupe
    const urls: string[] = [];
    for (const q of queries) {
      const resp = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=3&orientation=landscape&content_filter=high`,
        { headers: { Authorization: `Client-ID ${key}` }, ...(signal ? { signal } : {}) },
      );
      if (!resp.ok) continue;
      const j = (await resp.json()) as { results?: { urls?: { regular?: string } }[] };
      for (const r of j.results || []) {
        const u = r.urls?.regular;
        if (u && !urls.includes(u)) urls.push(u);
        if (urls.length >= 6) break;
      }
      if (urls.length >= 6) break;
    }
    if (urls.length < 3) {
      logger.warn({ found: urls.length }, "Unsplash search thin, topping up with curated set");
      for (const u of fallback) {
        if (!urls.includes(u)) urls.push(u);
        if (urls.length >= 6) break;
      }
    }
    return { images: urls.slice(0, 6), usage };
  } catch (err) {
    logger.warn({ err }, "Image agent failed, using curated fallback");
    return { images: fallback, usage: NO_USAGE };
  }
}
