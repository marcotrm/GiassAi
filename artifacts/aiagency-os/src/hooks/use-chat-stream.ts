import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { API_BASE } from "../lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface UseChatStreamOptions {
  onError?: (error: string) => void;
}

interface UseChatStreamReturn {
  messages: ChatMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  clearMessages: () => void;
}

interface SSEEvent {
  type: "token" | "done" | "error";
  content?: string;
  conversationId?: string;
  messageId?: string;
  message?: string;
}

export function useChatStream(options?: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
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
          body: JSON.stringify({ conversationId, message: text }),
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
  }, []);

  return { messages, conversationId, isStreaming, error, sendMessage, clearMessages };
}
