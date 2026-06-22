import { db } from "@workspace/db";
import { crmStages, projects } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { completeJson } from "../ai/model-adapter.js";
import { MODELS } from "../ai/models.js";
import { isDemoMode } from "../ai/demo/index.js";
import { logger } from "../../lib/logger.js";

export type StageKind = "normal" | "won" | "lost";
export interface StageSeed {
  name: string;
  color: string;
  kind: StageKind;
}

/** Sensible default pipeline used in demo mode or when AI generation fails. */
export const DEFAULT_STAGES: StageSeed[] = [
  { name: "Nuovo", color: "#3b82f6", kind: "normal" },
  { name: "Contattato", color: "#f59e0b", kind: "normal" },
  { name: "In trattativa", color: "#8b5cf6", kind: "normal" },
  { name: "Appuntamento fissato", color: "#10b981", kind: "won" },
  { name: "Perso", color: "#ef4444", kind: "lost" },
];

// Heuristic: does this brief describe a contact/lead pipeline (needs a CRM)?
const CRM_KEYWORDS = [
  "contatt", "lead", "client", "landing", "prenotazion", "appuntament", "vendit",
  "iscriz", "prospect", "trattativ", "preventiv", "richiest", "form", "crm", "kanban",
  "prova gratuita", "consulenza", "chiamat",
];
function looksLikeCrm(brief: string): boolean {
  const b = brief.toLowerCase();
  return CRM_KEYWORDS.some((k) => b.includes(k));
}

export interface CrmPlan {
  enabled: boolean;
  stages: StageSeed[];
}

/**
 * Decide whether this workflow manages a pipeline of contacts (→ CRM board) or is
 * a plain automation (reminder, notification, report → no board). When it's a CRM,
 * also returns sector-appropriate Kanban columns.
 */
export async function planCrm(brief: string, signal?: AbortSignal): Promise<CrmPlan> {
  if (isDemoMode() || !brief.trim()) {
    return { enabled: looksLikeCrm(brief), stages: DEFAULT_STAGES };
  }
  try {
    const { data } = await completeJson({
      model: MODELS.executor,
      system:
        "Decidi se questo workflow gestisce una PIPELINE DI CONTATTI/LEAD (es. raccoglie contatti da una landing e li lavora fino a fissare un appuntamento) → in tal caso serve una board CRM Kanban; oppure è una semplice automazione SENZA gestione contatti (reminder, notifica, report, scadenza, pubblicazione) → niente CRM. " +
        "Se è una pipeline di contatti, fornisci anche le colonne: 4-6 colonne in italiano, ordinate dal primo contatto all'obiettivo finale, includendo SEMPRE una colonna finale di successo kind='won' e una di scarto kind='lost'. Rispondi solo tramite lo strumento emit_plan.",
      messages: [{ role: "user", content: `Workflow richiesto:\n${brief}` }],
      tool: {
        name: "emit_plan",
        description: "Indica se serve un CRM e le eventuali colonne.",
        inputSchema: {
          type: "object",
          properties: {
            crm: { type: "boolean", description: "true se serve una board CRM di contatti" },
            stages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  color: { type: "string", description: "colore hex, es. #3b82f6" },
                  kind: { type: "string", enum: ["normal", "won", "lost"] },
                },
                required: ["name", "kind"],
              },
            },
          },
          required: ["crm"],
        },
      },
      maxTokens: 1024,
      ...(signal ? { signal } : {}),
    });

    const o = (data ?? {}) as { crm?: unknown; stages?: unknown };
    const enabled = o.crm === true;
    let stages = DEFAULT_STAGES;
    if (enabled && Array.isArray(o.stages)) {
      const cleaned = o.stages
        .map((s) => {
          const r = (s ?? {}) as Record<string, unknown>;
          const color = typeof r["color"] === "string" && (r["color"] as string).startsWith("#") ? (r["color"] as string) : "#64748b";
          const kind = r["kind"] === "won" || r["kind"] === "lost" ? (r["kind"] as StageKind) : "normal";
          return { name: String(r["name"] ?? "").trim(), color, kind };
        })
        .filter((s) => s.name);
      if (cleaned.length >= 2) stages = cleaned;
    }
    return { enabled, stages };
  } catch (err) {
    logger.warn({ err }, "CRM planning failed; falling back to heuristic");
    return { enabled: looksLikeCrm(brief), stages: DEFAULT_STAGES };
  }
}

/** Insert the given pipeline columns for a project (assumes none exist yet). */
export async function seedStages(projectId: string, stages: StageSeed[]): Promise<void> {
  if (stages.length === 0) return;
  await db.insert(crmStages).values(
    stages.map((s, i) => ({ projectId, name: s.name, color: s.color, kind: s.kind, position: i })),
  );
}

async function hasStages(projectId: string): Promise<boolean> {
  const [s] = await db.select({ id: crmStages.id }).from(crmStages).where(eq(crmStages.projectId, projectId)).limit(1);
  return !!s;
}

/** Record whether a project exposes a CRM board (stored on project.config). */
async function setCrmEnabled(projectId: string, enabled: boolean): Promise<void> {
  const [proj] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const cfg = (proj?.config && typeof proj.config === "object" ? proj.config : {}) as Record<string, unknown>;
  await db.update(projects).set({ config: { ...cfg, crmEnabled: enabled }, updatedAt: new Date().toISOString() }).where(eq(projects.id, projectId));
}

/**
 * Decide + provision the CRM for a freshly generated workflow. Only seeds a board
 * when the workflow is a contact pipeline; otherwise marks crmEnabled=false.
 * No-op if the project already has stages.
 */
export async function applyCrmPlan(projectId: string, brief: string, signal?: AbortSignal): Promise<void> {
  if (await hasStages(projectId)) return;
  const plan = await planCrm(brief, signal);
  await setCrmEnabled(projectId, plan.enabled);
  if (plan.enabled) {
    await seedStages(projectId, plan.stages);
    logger.info({ projectId, stages: plan.stages.length }, "CRM provisioned for workflow");
  } else {
    logger.info({ projectId }, "Workflow has no CRM (plain automation)");
  }
}

/** Ensure a project has a CRM board (used when linking a landing). Idempotent. */
export async function ensureCrm(projectId: string): Promise<void> {
  if (await hasStages(projectId)) {
    await setCrmEnabled(projectId, true);
    return;
  }
  await seedStages(projectId, DEFAULT_STAGES);
  await setCrmEnabled(projectId, true);
}

/** The leftmost (first) stage of a project's pipeline, or null if none exist. */
export async function getFirstStageId(projectId: string): Promise<string | null> {
  const [s] = await db
    .select({ id: crmStages.id })
    .from(crmStages)
    .where(eq(crmStages.projectId, projectId))
    .orderBy(asc(crmStages.position))
    .limit(1);
  return s?.id ?? null;
}
