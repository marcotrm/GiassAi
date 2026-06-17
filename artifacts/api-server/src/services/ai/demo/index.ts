import {
  GestionaleSchemaDef,
  checkGestionaleInvariants,
  WorkflowDef,
  validateWorkflowGraph,
  LandingDef,
  checkLandingInvariants,
  BusinessProfile,
  VideoIdea,
  type GestionaleSchemaDef as GestionaleSchemaDefType,
  type WorkflowDef as WorkflowDefType,
  type LandingDef as LandingDefType,
  type BusinessProfile as BusinessProfileType,
  type VideoIdea as VideoIdeaType,
} from "@workspace/api-zod";
import { DEMO_GESTIONALI, DEMO_GESTIONALE_DEFAULT } from "./samples-gestionali.js";
import { DEMO_WORKFLOWS, DEMO_WORKFLOW_DEFAULT } from "./samples-workflows.js";
import { DEMO_LANDINGS, DEMO_LANDING_DEFAULT } from "./samples-landings.js";
import { logger } from "../../../lib/logger.js";

/**
 * Demo mode: no ANTHROPIC_API_KEY (or GIASSAI_DEMO=1). The app runs fully offline
 * with pre-baked, sector-matched sample outputs instead of live AI calls.
 */
export function isDemoMode(): boolean {
  if (process.env["GIASSAI_DEMO"] === "1") return true;
  if (process.env["GIASSAI_DEMO"] === "0") return false;
  return !process.env["ANTHROPIC_API_KEY"];
}

function scoreByKeywords(brief: string, keywords: string[]): number {
  const b = brief.toLowerCase();
  return keywords.reduce((n, k) => (b.includes(k.toLowerCase()) ? n + 1 : n), 0);
}

function pickBest<T extends { keywords: string[] }>(brief: string, items: T[]): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const item of items) {
    const s = scoreByKeywords(brief, item.keywords);
    if (s > bestScore) {
      bestScore = s;
      best = item;
    }
  }
  return best;
}

// ----------------------------------------------------------------------------
// Pickers — return validated objects, falling back to a default sample.
// ----------------------------------------------------------------------------

export function pickDemoGestionale(brief: string): GestionaleSchemaDefType {
  const match = pickBest(brief, DEMO_GESTIONALI);
  for (const candidate of [match?.def, DEMO_GESTIONALE_DEFAULT]) {
    if (!candidate) continue;
    const parsed = GestionaleSchemaDef.safeParse(candidate);
    if (parsed.success && checkGestionaleInvariants(parsed.data).length === 0) return parsed.data;
    logger.warn({ errors: parsed.success ? checkGestionaleInvariants(parsed.data) : parsed.error.issues }, "Demo gestionale sample invalid");
  }
  throw new Error("No valid demo gestionale sample");
}

export function pickDemoWorkflow(brief: string): WorkflowDefType {
  const match = pickBest(brief, DEMO_WORKFLOWS);
  for (const candidate of [match?.def, DEMO_WORKFLOW_DEFAULT]) {
    if (!candidate) continue;
    const parsed = WorkflowDef.safeParse(candidate);
    if (parsed.success && validateWorkflowGraph(parsed.data).length === 0) return parsed.data;
    logger.warn({ errors: parsed.success ? validateWorkflowGraph(parsed.data) : parsed.error.issues }, "Demo workflow sample invalid");
  }
  throw new Error("No valid demo workflow sample");
}

export interface DemoLandingResult {
  profile: BusinessProfileType;
  def: LandingDefType;
  ideas: VideoIdeaType[];
}

export function pickDemoLanding(brief: string): DemoLandingResult {
  const match = pickBest(brief, DEMO_LANDINGS) ?? DEMO_LANDING_DEFAULT;
  const profile = BusinessProfile.safeParse({
    businessName: "La tua attività",
    sector: "generico",
    visualDna: match.profile,
  });
  const def = LandingDef.safeParse(match.def);
  if (!def.success || checkLandingInvariants(def.data).length > 0 || !profile.success) {
    logger.warn("Demo landing sample invalid, using default");
    const d = LandingDef.parse(DEMO_LANDING_DEFAULT.def);
    const p = BusinessProfile.parse({ businessName: "La tua attività", sector: "generico", visualDna: DEMO_LANDING_DEFAULT.profile });
    const ideas = (DEMO_LANDING_DEFAULT.ideas as unknown[]).map((i) => VideoIdea.parse(i));
    return { profile: p, def: d, ideas };
  }
  const ideas = (match.ideas as unknown[])
    .map((i) => VideoIdea.safeParse(i))
    .filter((r) => r.success)
    .map((r) => (r as { data: VideoIdeaType }).data);
  return { profile: profile.data, def: def.data, ideas };
}

// ----------------------------------------------------------------------------
// Offline PM chat + intent (replace the Haiku calls when in demo mode).
// ----------------------------------------------------------------------------

const CONFIRM_RE = /\b(crea|genera|genera|procedi|conferma|costru\w+|fallo|vai|andiamo|partiamo|s[iì]\b|ok\b|va bene)\b/i;

const KIND_LABEL: Record<string, string> = {
  gestionale: "gestionale",
  workflow: "workflow",
  landing: "landing page",
  video_ideas: "piano video",
};

export function demoClassifyIntent(
  userMessage: string,
  priorUserMessages: string[],
): { confirmed: boolean; brief: string } {
  const confirmed = CONFIRM_RE.test(userMessage);
  const brief = [...priorUserMessages, userMessage].join("\n");
  return { confirmed, brief };
}

export function demoPmReply(userMessage: string, isFirst: boolean, projectKind?: string): string {
  const kind = KIND_LABEL[projectKind ?? ""] ?? "progetto";
  if (CONFIRM_RE.test(userMessage)) {
    return `Perfetto, procedo subito a generare il tuo ${kind}. Tra un istante vedrai l'anteprima qui a destra. ✨`;
  }
  if (isFirst) {
    return `Ciao! Sono il tuo AI Master (modalità demo). Raccontami che tipo di attività hai e cosa ti serve dal tuo ${kind}: settore, cosa vuoi gestire, eventuali dettagli. Quando sei pronto scrivi "crea" e lo genero per te.`;
  }
  return `Capito! Posso adattare il ${kind} a quello che mi hai descritto. Aggiungi pure altri dettagli, oppure scrivi "crea" e procedo a generarlo. 👍`;
}
