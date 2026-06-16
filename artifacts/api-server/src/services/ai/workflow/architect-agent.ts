import {
  WorkflowDef,
  validateWorkflowGraph,
  type WorkflowDef as WorkflowDefType,
} from "@workspace/api-zod";
import { completeJson, type ChatMessage } from "../model-adapter.js";
import { MODELS } from "../models.js";
import type { OrgCatalog } from "../../ecosystem/org-catalog.js";
import { logger } from "../../../lib/logger.js";

const SYSTEM_PROMPT = `Sei l'Architetto di Workflow di GiassAi. Progetti automazioni stile Relay.app come grafo di nodi.

REGOLE FERREE:
- Produci ESCLUSIVAMENTE il workflow tramite lo strumento "emit_workflow". Nessun testo libero.
- Esattamente UN nodo "trigger", in position 0. I nodi formano una lista collegata via nextNodeId; l'ultimo ha nextNodeId=null.
- 4 tipi di nodo: trigger, action, ai_task, human_in_the_loop.
- Le variabili nei template usano l'ID del nodo che le produce: {{trigger.data.CAMPO}} per i dati del trigger, {{ID_NODO.CAMPO}} per l'output di un nodo precedente. NON usare nomi generici come {{ai_task.output}}: usa l'id reale del nodo.
- Una variabile può riferire SOLO output di nodi PRECEDENTI nella catena.
- Per le azioni "supabase" con operation "insert_row": imposta targetProjectId all'id di un GESTIONALE DEPLOYATO del catalogo, params.table a una sua tabella reale, e inputMapping solo su colonne reali di quella tabella.
- Genera i projectLinks necessari (es. form_to_workflow, workflow_to_gestionale) con gli id reali dei progetti coinvolti.
- Usa gli id dei progetti dal CATALOGO fornito. Se manca un progetto necessario, modella comunque il workflow ma lascia targetProjectId vuoto.`;

const EMIT_WORKFLOW_TOOL_INPUT = {
  type: "object",
  required: ["name", "nodes"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    nodes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "type", "label", "position", "nextNodeId", "config"],
        properties: {
          id: { type: "string" },
          type: { type: "string", enum: ["trigger", "action", "ai_task", "human_in_the_loop"] },
          label: { type: "string" },
          position: { type: "integer" },
          nextNodeId: { type: ["string", "null"] },
          onError: { type: "string", enum: ["stop", "skip", "retry"] },
          config: {
            type: "object",
            description:
              "trigger: {source, formId?, sourceProjectId?, cronExpression?, tableName?, operation?}; action: {integration, operation, params, targetProjectId?, inputMapping}; ai_task: {prompt, model, inputFields, outputSchema}; human_in_the_loop: {title, description?, showFields, actions:[{label,value,style}], notifyVia}",
          },
        },
      },
    },
    projectLinks: {
      type: "array",
      items: {
        type: "object",
        required: ["sourceProjectId", "targetProjectId", "linkType"],
        properties: {
          sourceProjectId: { type: "string" },
          targetProjectId: { type: "string" },
          linkType: { type: "string" },
          fieldMapping: { type: "object" },
        },
      },
    },
  },
} as const;

const MAX_ATTEMPTS = 3;

export interface WorkflowArchitectResult {
  def: WorkflowDefType;
  usage: { tokensIn: number; tokensOut: number };
}

export async function runWorkflowArchitect(
  brief: string,
  catalog: OrgCatalog,
  signal?: AbortSignal,
): Promise<WorkflowArchitectResult> {
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `CATALOGO PROGETTI DELL'ORGANIZZAZIONE (usa questi id):\n${JSON.stringify(catalog, null, 2)}\n\nBRIEF:\n${brief}`,
    },
  ];

  let totalIn = 0;
  let totalOut = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, usage } = await completeJson({
      model: MODELS.architect,
      system: SYSTEM_PROMPT,
      messages,
      tool: {
        name: "emit_workflow",
        description: "Emetti il workflow completo come grafo di nodi.",
        inputSchema: EMIT_WORKFLOW_TOOL_INPUT as unknown as Record<string, unknown>,
      },
      temperature: 0.1,
      maxTokens: 8192,
      ...(signal ? { signal } : {}),
    });
    totalIn += usage.tokensIn;
    totalOut += usage.tokensOut;

    const parsed = WorkflowDef.safeParse(data);
    const graphErrors = parsed.success ? validateWorkflowGraph(parsed.data) : [];

    if (parsed.success && graphErrors.length === 0) {
      return { def: parsed.data, usage: { tokensIn: totalIn, tokensOut: totalOut } };
    }

    const errors = parsed.success
      ? graphErrors
      : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

    logger.warn({ attempt, errors }, "Workflow architect output invalid, retrying");
    if (attempt === MAX_ATTEMPTS) {
      throw new Error(`Workflow architect failed after ${MAX_ATTEMPTS} attempts: ${errors.join("; ")}`);
    }

    messages.push({ role: "assistant", content: JSON.stringify(data) });
    messages.push({
      role: "user",
      content: `Il workflow ha questi errori. Correggili e ri-emetti con emit_workflow:\n- ${errors.join("\n- ")}`,
    });
  }

  throw new Error("Workflow architect: unexpected exit");
}
