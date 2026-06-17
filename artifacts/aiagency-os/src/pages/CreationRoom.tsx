import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, Play, Loader2, Code, Database, MousePointerClick, Network, AlertCircle, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { CreationType } from "../App";
import { useChatStream, type ChatMessage } from "../hooks/use-chat-stream";
import { createProject, getConversations, getConversationMessages } from "../lib/api";
import GestionaleSchemaPreview from "../components/GestionaleSchemaPreview";
import WorkflowPreview from "../components/WorkflowPreview";
import LandingPreview from "../components/LandingPreview";

interface CreationRoomProps {
  type: CreationType;
  existingProjectId?: string;
  onNavigate: () => void;
}

const TYPE_LABEL: Record<CreationType, string> = {
  gestionale: "Gestionale",
  landing: "Landing & Funnel",
  workflow: "Workflow",
  video_ideas: "Piano Editoriale Video",
};

const TYPE_ICON: Record<string, typeof Database> = {
  gestionale: Database,
  landing: MousePointerClick,
  workflow: Network,
};

export default function CreationRoom({ type, existingProjectId, onNavigate }: CreationRoomProps) {
  const chat = useChatStream();
  const { seed } = chat;
  const [resuming, setResuming] = useState(!!existingProjectId);

  // Welcome only for a fresh creation (not when resuming an existing project).
  const welcomeMessages = existingProjectId
    ? []
    : [{ id: "welcome-1", role: "assistant" as const, content: `Ciao! Sono il tuo AI Master. Dimmi cosa vorresti creare per il tuo ${TYPE_LABEL[type]}.` }];

  const allMessages = [
    ...welcomeMessages.map(m => ({ id: m.id, role: m.role, content: m.content })),
    ...chat.messages.map(m => ({ id: m.id, role: m.role, content: m.content })),
  ];

  const [inputText, setInputText] = useState("");
  const projectIdRef = useRef<string | null>(existingProjectId ?? null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resume an existing project's conversation.
  useEffect(() => {
    if (!existingProjectId) return;
    let cancelled = false;
    (async () => {
      try {
        const convs = await getConversations();
        const conv = convs.find((c) => c.projectId === existingProjectId);
        if (conv && !cancelled) {
          const msgs = await getConversationMessages(conv.id);
          const mapped: ChatMessage[] = msgs
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content, createdAt: m.createdAt }));
          if (!cancelled) seed(conv.id, mapped);
        }
      } catch {
        /* ignore — start with an empty chat */
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();
    return () => { cancelled = true; };
  }, [existingProjectId, seed]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length, chat.isStreaming]);

  // Create the backing project lazily on the first message, then reuse its id.
  async function ensureProject(firstMessage: string): Promise<string | null> {
    if (projectIdRef.current) return projectIdRef.current;
    try {
      const project = await createProject({
        name: `${TYPE_LABEL[type]} — ${firstMessage.slice(0, 40)}`,
        type,
      });
      projectIdRef.current = project.id;
      return project.id;
    } catch {
      return null; // chat still works; the Architect handoff just won't fire
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || chat.isStreaming) return;
    setInputText("");

    const projectId = await ensureProject(text);
    chat.sendMessage(text, { projectType: type, ...(projectId ? { projectId } : {}) });
  };

  const Icon = TYPE_ICON[type] ?? Database;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.2 } }}
      className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground"
    >
      {/* Left Column: AI Chat */}
      <div className="w-1/2 flex flex-col border-r border-border glass-panel relative z-10 bg-card">
        <header className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onNavigate}
              data-testid="btn-back"
              className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg leading-tight">AI Master</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {chat.error ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Errore di connessione
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_var(--color-emerald-500)] animate-pulse" />
                      Online e pronto
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {allMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}
              >
                {msg.role !== "user" ? (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex-shrink-0 flex items-center justify-center border border-primary/20 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center border border-border mt-1 overflow-hidden">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=Admin&backgroundColor=transparent" alt="User" className="w-full h-full" />
                  </div>
                )}
                
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-primary text-primary-foreground shadow-[0_4px_20px_hsl(var(--primary)/30%)] rounded-tr-none" 
                    : "bg-muted border border-border text-foreground rounded-tl-none"
                }`}>
                  {msg.content || <span className="animate-pulse">●●●</span>}
                </div>
              </motion.div>
            ))}

            {chat.isStreaming && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-3 ml-12"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Elaborazione...
                  </div>
                </div>
              </motion.div>
            )}

            {chat.error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="ml-12 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{chat.error}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-border">
          <form onSubmit={handleSend} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-2xl blur opacity-25 group-focus-within:opacity-75 transition duration-500"></div>
            <div className="relative flex items-center bg-background rounded-xl border border-border focus-within:border-primary/50 overflow-hidden">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Descrivi cosa vuoi creare..."
                className="flex-1 bg-transparent border-none outline-none text-foreground px-4 py-4 placeholder:text-muted-foreground"
                disabled={chat.isStreaming || resuming}
                data-testid="chat-input"
              />
              <button 
                type="submit" 
                disabled={chat.isStreaming || !inputText.trim()}
                className="p-3 mr-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary text-primary-foreground transition-colors"
                data-testid="chat-submit"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Column: Preview */}
      <div className="w-1/2 flex flex-col bg-muted/30 relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50 z-0"></div>
        
        <header className="px-8 py-4 border-b border-border flex items-center justify-between bg-background/80 backdrop-blur-md z-10 sticky top-0">
          <h2 className="font-mono text-sm tracking-widest text-muted-foreground flex items-center gap-3">
            <Code className="w-4 h-4" />
            PREVIEW
          </h2>
        </header>

        <div className="flex-1 min-h-0 z-10">
          {chat.generation.status === "ready" && chat.generation.kind === "gestionale" ? (
            <GestionaleSchemaPreview
              def={chat.generation.def}
              schemaId={chat.generation.schemaId}
            />
          ) : chat.generation.status === "ready" && chat.generation.kind === "workflow" ? (
            <WorkflowPreview
              def={chat.generation.def}
              workflowId={chat.generation.workflowId}
            />
          ) : chat.generation.status === "ready" && chat.generation.kind === "landing" ? (
            <LandingPreview
              html={chat.generation.html}
              landingId={chat.generation.landingId}
              ideasCount={chat.generation.ideasCount}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8">
              <div className="flex flex-col items-center text-center max-w-md">
                {chat.generation.status === "generating" ? (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Sto costruendo il tuo {TYPE_LABEL[type]}…</h3>
                    <p className="text-muted-foreground text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      L'Architetto sta progettando lo schema
                    </p>
                  </>
                ) : chat.generation.status === "error" ? (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                      <AlertCircle className="w-8 h-8 text-rose-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Generazione non riuscita</h3>
                    <p className="text-muted-foreground text-sm">{chat.generation.message}</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{TYPE_LABEL[type]}</h3>
                    <p className="text-muted-foreground text-sm">
                      Descrivi il tuo progetto all'AI Master nella chat. Quando confermi, l'anteprima verrà generata qui.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
