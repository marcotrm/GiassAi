# GiassAi — Piano di Creazione: AI Master "Landing / Campagne"

> **Versione:** 0.1.0
> **Data:** 2026-06-16
> **Status:** Spec operativa — terzo dei tre AI Master
> **Prerequisiti:** `giassai-architecture.md`, `gestionale-agent-plan.md`, `ecosystem-integration-plan.md`
> **Riferimento logica:** progetto `ScrapingNia` (Python) — ne **riusiamo la logica**, riscritta in Node.

---

## 0. Cosa stiamo costruendo

Il master che, partendo da un'attività (nome/settore/zona), **analizza il business e i competitor,
genera copy e struttura, costruisce la landing in HTML, e produce ~10 idee di contenuti social**.
È la versione "prodotto, in Node, con Claude" della pipeline che oggi vive in ScrapingNia.

Differenza chiave rispetto al gestionale/workflow: qui **Sonnet** ha un ruolo di primo piano
(costruzione HTML di qualità), coerente con l'idea originale ("manda a Sonnet che costruisce bene il sito").

I **form** della landing sono il punto di contatto con gli altri ambienti: un form genera un evento
`form_submission` che fa da trigger a un workflow (vedi `ecosystem-integration-plan.md`).

---

## 1. Cosa riusiamo da ScrapingNia (e cosa cambia)

| Stadio ScrapingNia | Stato lì | Nel nostro master |
|--------------------|----------|-------------------|
| Analisi tipo attività | reale (mappa + LLM) | **Subagente Haiku** (analisi settore) |
| Ricerca info online | reale (Google Places) | **Tool** `web_search`/places nel subagente analista |
| Analisi competitor | **stub** (l'LLM indovina) | **Reale**: subagente con `web_search` su competitor di zona |
| Generazione copy | reale (Llama) | **Subagente Sonnet** (copywriter) — qualità superiore |
| Generazione immagini | **stub** (Unsplash fissi) | v1: libreria curata per settore; v2: generazione AI |
| Costruzione HTML | reale (Llama) | **Sonnet** (build HTML/sezioni) — punto forte |
| 10 idee social | **assente** | **Subagente Haiku** → tabelle `video_profiles`/`video_ideas` |

> Nota: ScrapingNia usa Llama/Qwen gratis via OpenRouter. Qui standardizziamo su Claude
> (Opus/Sonnet/Haiku) come deciso. Niente Python in produzione: logica riscritta in Node.

---

## 2. Topologia degli agenti

```
Utente ──chat──> PM (Haiku) ── brief attività confermato ──┐
                                                            ▼
                                       ORCHESTRATORE (codice Node)
                                                            │
            ┌─────────────────────────────────────────────────┤
            ▼ fan-out parallelo (analisi)                      │
     ┌──────────────┬───────────────────┐                     │
     ▼              ▼                   ▼                     │
 Analista settore  Competitor analyst  Brand/visual DNA       │
 (Haiku+web)       (Haiku+web)         (Haiku)                │
     └──────────────┴───────────────────┘                     │
                    │ (sintesi: BusinessProfile)               │
                    ▼ (1 chiamata, temp 0.2)                   │
            ARCHITECT struttura (Opus 4.8)                     │
            → LandingDef JSON (sezioni + form + tema)          │
                    │  [GATE] Zod                              │
        ┌───────────┼───────────────────────┐                 │
        ▼           ▼                       ▼                 │
   BUILD HTML    Copy per sezione       10 idee social        │
   (Sonnet)      (Sonnet)               (Haiku)               │
        └───────────┴───────────────────────┘                 │
                    │                                          │
                    ▼                                          │
   Persist landing_configs + video_ideas + project_links       │
                    │                                          │
        ANTEPRIMA ──pubblica──> deploy URL / dominio ──────────┘
```

---

## 3. Assegnazione modelli

| Step | Agente | Modello | temp | Note |
|------|--------|---------|------|------|
| Brief in chat | PM | `claude-haiku-4-5-20251001` | 0.7 | |
| Analisi settore/competitor | subagenti | `claude-haiku-4-5-20251001` + `web_search` | 0.4 | ricerca reale online |
| Struttura/strategia landing | Architect | `claude-opus-4-8` | 0.2 | sezioni, gerarchia, form, conversione |
| **Build HTML** | builder | `claude-sonnet-4-6` | 0.5 | punto forte di Sonnet |
| Copy per sezione | copywriter | `claude-sonnet-4-6` | 0.7 | persuasivo, in italiano |
| 10 idee social | subagente | `claude-haiku-4-5-20251001` | 0.8 | hook/script/hashtag/caption |

> Qui Opus fa la **strategia** (poche, dense decisioni), Sonnet fa il **lavoro creativo voluminoso**
> (HTML + copy). È l'unico master dove Sonnet è protagonista.

---

## 4. Contratti dati

Persistiti in `landing_configs` (template, sections, forms) e `video_ideas`/`video_profiles`.

```typescript
// lib/api-zod/src/landing-schema.ts

export const BusinessProfile = z.object({          // output della fase di analisi
  businessName: z.string(),
  sector: z.string(),
  location: z.string().optional(),
  usp: z.array(z.string()),                         // punti di forza
  targetAudience: z.string(),
  tone: z.string(),
  competitors: z.array(z.object({
    name: z.string(), strength: z.string(), gap: z.string(),
  })).default([]),
  visualDna: z.object({
    primaryColor: z.string(), secondaryColor: z.string(), accentColor: z.string(),
    headingFont: z.string(), bodyFont: z.string(), mood: z.string(),
  }),
});

export const SectionType = z.enum([
  "hero", "features", "benefits", "testimonials", "pricing", "faq",
  "gallery", "about", "contact_form", "cta", "stats", "logos",
]);

export const LandingSection = z.object({
  id: z.string(),
  type: SectionType,
  order: z.number().int(),
  content: z.record(z.unknown()),                   // riempito dal copywriter (Sonnet)
});

export const FormDef = z.object({
  formId: z.string(),                               // referenziato dal trigger workflow
  fields: z.array(z.object({
    name: z.string(), label: z.string(),
    type: z.enum(["text","email","phone","textarea","select"]),
    required: z.boolean().default(false),
  })),
  submitLabel: z.string().default("Invia"),
  // dove vanno i dati: collega a un workflow (preferito) o diretto a un gestionale
  destination: z.object({
    kind: z.enum(["workflow", "gestionale"]),
    targetProjectId: z.string().uuid(),
  }).optional(),
});

export const LandingDef = z.object({
  template: z.string(),
  theme: z.object({                                 // dal visualDna
    primaryColor: z.string(), secondaryColor: z.string(), accentColor: z.string(),
    headingFont: z.string(), bodyFont: z.string(),
  }),
  sections: z.array(LandingSection).min(1),
  forms: z.array(FormDef).default([]),
});

export const VideoIdea = z.object({                 // 10× → tabella video_ideas
  title: z.string(), hook: z.string(), script: z.string(),
  cta: z.string().optional(), hashtags: z.array(z.string()).default([]),
  caption: z.string().optional(), platform: z.string(),
  format: z.string().optional(), category: z.string().default("educational"),
});
```

---

## 5. Pipeline dell'orchestratore

`services/ai/landing/orchestrator.ts`

```
generateLanding(projectId, brief):
  1. profile = fan-out Haiku+web → BusinessProfile (analista + competitor + visual DNA, poi sintesi)
  2. def = await architect(profile)                 // Opus: struttura sezioni + form + tema
  3. GATE: LandingDef.safeParse(def)
  4. fan-out:
       html      = sonnetBuildHtml(def, profile)     // HTML completo per sezione/pagina
       sections  = sonnetCopy(def, profile)          // copy che riempie content delle sezioni
       ideas[10] = haikuSocialIdeas(profile)         // 10 VideoIdea
  5. salva landing_configs (template, sections, forms) + video_ideas + video_profiles
  6. se un form ha destination → crea project_link(landing→workflow/gestionale)  // ecosystem
  7. logga ai_usage_log
  8. anteprima HTML nel frontend
publishLanding(landingId, domain?):                  // post-approvazione
  9. render finale + deploy (static host / CDN), salva published_url, is_published=true
  10. registra il/i formId nel form-hook registry → /api/hooks/form/:formId attivo
```

Il punto **6** e **10** sono ciò che rende la landing "viva" nell'ecosistema: i suoi form diventano
trigger reali (vedi `ecosystem-integration-plan.md`).

---

## 6. Prompt principali

**Architect struttura (Opus):** "Dato questo BusinessProfile, progetta la STRUTTURA della landing
orientata alla conversione: scegli e ordina le sezioni, definisci il/i form e quali campi raccogliere,
e il tema visivo dal visual DNA. Output solo via tool `emit_landing`. Non scrivere copy né HTML."

**Builder (Sonnet):** "Costruisci l'HTML completo, responsive, accessibile (TailwindCSS), fedele al
tema e alle sezioni fornite. HTML valido da `<!DOCTYPE html>` a `</html>`. Usa i placeholder immagine forniti."

**Copywriter (Sonnet):** "Scrivi il copy italiano persuasivo per ogni sezione (hero, benefit,
testimonial, FAQ, CTA) coerente con tono e target. Output: JSON `content` per sezione."

**Social ideas (Haiku):** "Genera 10 idee di contenuti social per questa attività: hook, script breve,
CTA, hashtag, caption, piattaforma e formato. Varia i format (reel, carosello, post). Output: array di VideoIdea."

---

## 7. API & file da creare (ordine di build)

- [ ] **1. Contratti** — `lib/api-zod/src/landing-schema.ts` (§4)
- [ ] **2. Analisi** — `services/ai/landing/analysis/{sector,competitor,visual-dna}.ts` (Haiku + web_search)
- [ ] **3. Architect** — `services/ai/landing/architect-agent.ts` (Opus + tool `emit_landing`)
- [ ] **4. Builder** — `services/ai/landing/builder.ts` (Sonnet, HTML) + `copywriter.ts` (Sonnet)
- [ ] **5. Social** — `services/ai/landing/social-ideas.ts` (Haiku → video_ideas)
- [ ] **6. Orchestratore** — `services/ai/landing/orchestrator.ts` (§5)
- [ ] **7. Publish/deploy** — `services/landing/publish.ts` (render + host) + form-hook registry
- [ ] **8. Route** — `routes/landing.ts`:
      - `POST /api/landing/:projectId/generate` → genera (no publish), ritorna anteprima HTML
      - `POST /api/landing/:id/publish` → pubblica, attiva i form
      - `GET  /api/landing/:projectId` → config corrente
      - `GET  /api/video-ideas/:projectId` → le 10 idee
- [ ] **9. Frontend** — `pages/Funnel.tsx`: anteprima landing + editor sezioni; calendario `video_ideas`

Dipende dal `completeJson()` del model-adapter + da un wrapper `web_search` per i subagenti di analisi.

---

## 8. Costo

- **Analisi**: alcune chiamate Haiku+web (economiche).
- **Strategia**: 1× Opus (densa, una tantum).
- **Build**: Sonnet per HTML + copy (il grosso del costo, ma molto < Opus a parità di volume).
- **Social**: 1× Haiku per le 10 idee.

Logga tutto in `ai_usage_log` con `context_type='project_generation'`.

---

## 9. Questioni aperte

1. **Hosting landing pubblicate**: static su CDN, dominio custom, certificati. Va scelto il target.
2. **Immagini**: v1 libreria curata per settore (come ScrapingNia) vs v2 generazione AI — decidere quando.
3. **web_search a runtime**: quale provider/tool per analisi settore e competitor reali.
4. **Editor visuale**: quanto editing manuale post-generazione offrire nella v1.
