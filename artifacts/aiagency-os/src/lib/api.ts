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
}

export function createProject(body: {
  name: string;
  type: Project["type"];
  description?: string;
}): Promise<Project> {
  return authedFetch<Project>("/projects", { method: "POST", body: JSON.stringify(body) });
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
