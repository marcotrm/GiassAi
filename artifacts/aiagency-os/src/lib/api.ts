import { supabase } from "../lib/supabase";

export const API_BASE = "/api";

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

/** Authenticated JSON fetch against the API. Throws on non-2xx. */
export async function authedFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const headers = { ...(await authHeaders()), ...(init?.headers as Record<string, string> | undefined) };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.message ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Project {
  id: string;
  name: string;
  type: "gestionale" | "landing" | "workflow" | "video_ideas";
  status: string;
  config?: Record<string, unknown> | null;
  createdAt?: string;
}

export function createProject(body: {
  name: string;
  type: Project["type"];
  description?: string;
}): Promise<Project> {
  return authedFetch<Project>("/projects", { method: "POST", body: JSON.stringify(body) });
}

export function getProjects(): Promise<Project[]> {
  return authedFetch<Project[]>("/projects");
}

// ============================================================================
// CRM / Kanban
// ============================================================================

export interface CrmStage {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
  kind: "normal" | "won" | "lost";
}

export interface CrmContact {
  id: string;
  projectId: string;
  stageId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  fields: Record<string, unknown> | null;
  notes: string | null;
  aiDraft: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessScheda {
  nomeAttivita: string;
  settore: string;
  orari: string;
  servizi: string;
  obiettivo: string;
  tono: string;
  noteAggiuntive: string;
}

export function getCrmBoard(projectId: string): Promise<{ stages: CrmStage[]; contacts: CrmContact[] }> {
  return authedFetch(`/crm/${projectId}`);
}

export function createStage(projectId: string, body: { name: string; color?: string; kind?: CrmStage["kind"] }): Promise<CrmStage> {
  return authedFetch(`/crm/${projectId}/stages`, { method: "POST", body: JSON.stringify(body) });
}

export function updateStage(stageId: string, body: Partial<Pick<CrmStage, "name" | "color" | "kind" | "position">>): Promise<CrmStage> {
  return authedFetch(`/crm/stages/${stageId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteStage(stageId: string): Promise<{ ok: boolean }> {
  return authedFetch(`/crm/stages/${stageId}`, { method: "DELETE" });
}

export function createContact(
  projectId: string,
  body: { name?: string; email?: string; phone?: string; stageId?: string; notes?: string },
): Promise<CrmContact> {
  return authedFetch(`/crm/${projectId}/contacts`, { method: "POST", body: JSON.stringify(body) });
}

export function updateContact(
  contactId: string,
  body: Partial<{ name: string | null; email: string | null; phone: string | null; stageId: string | null; notes: string; aiDraft: string | null; position: number }>,
): Promise<CrmContact> {
  return authedFetch(`/crm/contacts/${contactId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteContact(contactId: string): Promise<{ ok: boolean }> {
  return authedFetch(`/crm/contacts/${contactId}`, { method: "DELETE" });
}

export function getScheda(projectId: string): Promise<BusinessScheda | null> {
  return authedFetch(`/crm/${projectId}/scheda`);
}

export function saveScheda(projectId: string, scheda: BusinessScheda): Promise<{ ok: boolean }> {
  return authedFetch(`/crm/${projectId}/scheda`, { method: "PUT", body: JSON.stringify(scheda) });
}

export function prefillScheda(projectId: string): Promise<BusinessScheda> {
  return authedFetch(`/crm/${projectId}/scheda/prefill`, { method: "POST" });
}

export function generateContactDraft(contactId: string): Promise<{ draft: string }> {
  return authedFetch(`/crm/contacts/${contactId}/generate-draft`, { method: "POST" });
}

export function linkLandingToWorkflow(projectId: string, landingProjectId: string): Promise<{ ok: boolean; formId: string }> {
  return authedFetch(`/workflows/${projectId}/link-landing`, {
    method: "POST",
    body: JSON.stringify({ landingProjectId }),
  });
}

export function deployGestionale(schemaId: string): Promise<{ schemaName: string; statementsRun: number; seededRows: number }> {
  return authedFetch(`/gestionali/${schemaId}/deploy`, { method: "POST" });
}

export function activateWorkflow(workflowId: string): Promise<{ workflowId: string; isActive: boolean }> {
  return authedFetch(`/workflows/${workflowId}/activate`, { method: "POST" });
}

export function publishLanding(landingId: string): Promise<{ publishedUrl: string }> {
  return authedFetch(`/landing/${landingId}/publish`, { method: "POST" });
}

export interface LandingResponse {
  landingId: string;
  isPublished: boolean;
  publishedUrl: string | null;
  html: string;
  def: unknown;
}

export function getLanding(projectId: string): Promise<LandingResponse> {
  return authedFetch(`/landing/${projectId}`);
}

export function editLandingElement(landingId: string, elementHtml: string, instruction: string): Promise<{ html: string }> {
  return authedFetch(`/landing/${landingId}/edit`, {
    method: "POST",
    body: JSON.stringify({ elementHtml, instruction }),
  });
}

export function saveLandingHtml(landingId: string, html: string): Promise<{ ok: boolean }> {
  return authedFetch(`/landing/${landingId}/html`, {
    method: "PUT",
    body: JSON.stringify({ html }),
  });
}

export function deleteProject(id: string): Promise<unknown> {
  return authedFetch(`/projects/${id}`, { method: "DELETE" });
}

export interface GestionaleColumnDef {
  name: string;
  label: string;
  type: string;
  nullable?: boolean;
  enumName?: string;
  relationTo?: string;
}
export interface GestionaleTableDef {
  name: string;
  label: string;
  primaryDisplayColumn: string;
  columns: GestionaleColumnDef[];
}
export interface GestionaleSchemaResponse {
  schemaId: string;
  version: number;
  isDeployed: boolean;
  def: {
    name: string;
    tables: GestionaleTableDef[];
    enums: { name: string; values: { value: string; label: string }[] }[];
  };
}

export function getGestionaleSchema(projectId: string): Promise<GestionaleSchemaResponse> {
  return authedFetch(`/gestionali/${projectId}/schema`);
}

export function getGestionaleData(projectId: string, table: string): Promise<Record<string, unknown>[]> {
  return authedFetch(`/gestionali/${projectId}/data?table=${encodeURIComponent(table)}`);
}

export function insertGestionaleRow(
  projectId: string,
  table: string,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return authedFetch(`/gestionali/${projectId}/data`, {
    method: "POST",
    body: JSON.stringify({ table, values }),
  });
}

export function deleteGestionaleRow(projectId: string, table: string, id: string): Promise<unknown> {
  return authedFetch(`/gestionali/${projectId}/data`, {
    method: "DELETE",
    body: JSON.stringify({ table, id }),
  });
}

export interface ConversationSummary {
  id: string;
  projectId: string | null;
  title: string | null;
  status: string;
  createdAt: string;
}

export function getConversations(): Promise<ConversationSummary[]> {
  return authedFetch(`/chat/conversations`);
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export function getConversationMessages(conversationId: string): Promise<StoredMessage[]> {
  return authedFetch(`/chat/conversations/${conversationId}/messages`);
}

export async function sendCommandToGiassAi(
  message: string,
): Promise<{ conversationId?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let conversationId: string | undefined;

  if (reader) {
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "done") conversationId = parsed.conversationId;
          } catch {
            // ignore parse errors
          }
        }
      }
    }
  }

  return { conversationId };
}
