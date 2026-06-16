import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { API_BASE } from "../lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

// Minimal mirror of the backend GestionaleSchemaDef, enough to render a preview.
export interface GestionaleColumnView {
  name: string;
  label: string;
  type: string;
  nullable?: boolean;
  unique?: boolean;
  relationTo?: string;
  enumName?: string;
}
export interface GestionaleTableView {
  name: string;
  label: string;
  description?: string;
  primaryDisplayColumn: string;
  columns: GestionaleColumnView[];
}
export interface GestionaleDef {
  name: string;
  tables: GestionaleTableView[];
  relations: { type: string; from: string; to: string }[];
  enums: { name: string; values: { value: string; label: string }[] }[];
}

// Minimal mirror of the backend WorkflowDef for preview.
export interface WorkflowNodeView {
  id: string;
  type: "trigger" | "action" | "ai_task" | "human_in_the_loop";
  label: string;
  position: number;
  nextNodeId: string | null;
}
export interface WorkflowDefView {
  name: string;
  description?: string;
  nodes: WorkflowNodeView[];
}

export type GenerationState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "ready"; kind: "gestionale"; schemaId: string; projectId: string; def: GestionaleDef }
  | { status: "ready"; kind: "workflow"; workflowId: string; projectId: string; def: WorkflowDefView }
  | { status: "ready"; kind: "landing"; landingId: string; projectId: string; html: string; ideasCount: number }
  | { status: "error"; message: string };

interface UseChatStreamOptions {
  onError?: (error: string) => void;
}

interface SendExtra {
  projectId?: string;
  projectType?: string;
}

interface UseChatStreamReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  error: string | null;
  generation: GenerationState;
  sendMessage: (text: string, extra?: SendExtra) => void;
  clearMessages: () => void;
}

interface SSEEvent {
  type:
    | "token" | "done" | "error" | "generating"
    | "gestionale_ready" | "workflow_ready" | "landing_ready" | "generation_error";
  content?: string;
  conversationId?: string;
  messageId?: string;
  message?: string;
  // generation payloads
  projectId?: string;
  schemaId?: string;
  workflowId?: string;
  landingId?: string;
  html?: string;
  ideasCount?: number;
  version?: number;
  def?: unknown;
}

export function useChatStream(options?: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<GenerationState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string, extra?: SendExtra) => {
      setError(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };

      const assistantPlaceholderId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantPlaceholderId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`${API_BASE}/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            conversationId,
            message: text,
            ...(extra?.projectId ? { projectId: extra.projectId } : {}),
            ...(extra?.projectType ? { projectType: extra.projectType } : {}),
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            let event: SSEEvent;
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            if (event.type === "token" && event.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantPlaceholderId
                    ? { ...m, content: m.content + event.content }
                    : m,
                ),
              );
            } else if (event.type === "done") {
              if (event.conversationId) setConversationId(event.conversationId);
              if (event.messageId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantPlaceholderId
                      ? { ...m, id: event.messageId! }
                      : m,
                  ),
                );
              }
              setIsStreaming(false);
            } else if (event.type === "generating") {
              setGeneration({ status: "generating" });
            } else if (event.type === "gestionale_ready") {
              if (event.schemaId && event.projectId && event.def) {
                setGeneration({
                  status: "ready",
                  kind: "gestionale",
                  schemaId: event.schemaId,
                  projectId: event.projectId,
                  def: event.def as GestionaleDef,
                });
              }
            } else if (event.type === "workflow_ready") {
              if (event.workflowId && event.projectId && event.def) {
                setGeneration({
                  status: "ready",
                  kind: "workflow",
                  workflowId: event.workflowId,
                  projectId: event.projectId,
                  def: event.def as WorkflowDefView,
                });
              }
            } else if (event.type === "landing_ready") {
              if (event.landingId && event.projectId && typeof event.html === "string") {
                setGeneration({
                  status: "ready",
                  kind: "landing",
                  landingId: event.landingId,
                  projectId: event.projectId,
                  html: event.html,
                  ideasCount: event.ideasCount ?? 0,
                });
              }
            } else if (event.type === "generation_error") {
              setGeneration({ status: "error", message: event.message ?? "Generazione fallita" });
            } else if (event.type === "error") {
              setMessages((prev) =>
                prev.filter((m) => m.id !== assistantPlaceholderId),
              );
              setIsStreaming(false);
              const errMsg = event.message ?? "Unknown error";
              setError(errMsg);
              options?.onError?.(errMsg);
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;

        // Remove the placeholder assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantPlaceholderId));
        setIsStreaming(false);

        const errMsg = err instanceof Error ? err.message : "Connessione al server non riuscita";
        setError(errMsg);
        options?.onError?.(errMsg);
      }
    },
    [conversationId, options],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setGeneration({ status: "idle" });
  }, []);

  return { messages, conversationId, isStreaming, error, generation, sendMessage, clearMessages };
}
