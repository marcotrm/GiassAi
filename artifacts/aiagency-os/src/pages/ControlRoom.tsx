import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  FolderKanban, Database, MousePointerClick, Network, Bot,
  Loader2, PlusCircle, Sparkles, Pencil, Check, X,
} from "lucide-react";
import { CreationType } from "../App";
import { supabase } from "../lib/supabase";
import { API_BASE, authedFetch } from "../lib/api";

interface Project {
  id: string;
  name: string;
  description: string | null;
  type: CreationType;
  status: string;
  createdAt: string;
}

interface ControlRoomProps {
  onOpenCreation: (type: CreationType) => void;
  onOpenProject: (project: Project) => void;
}

type FilterType = "all" | "gestionale" | "workflow" | "landing";

const TYPE_ICON: Record<string, typeof Database> = {
  gestionale: Database,
  landing: MousePointerClick,
  workflow: Network,
};

function patchProject(id: string, body: { name?: string; description?: string | null }): Promise<Project> {
  return authedFetch(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export default function ControlRoom({ onOpenCreation, onOpenProject }: ControlRoomProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchProjects() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) { setProjects(data.projects ?? data ?? []); setError(null); }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Errore nel caricamento dei progetti");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProjects();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  const activeProjects = projects.filter(p => p.status !== "archived");
  const gestionali = projects.filter(p => p.type === "gestionale").length;
  const workflows = projects.filter(p => p.type === "workflow").length;
  const landings = projects.filter(p => p.type === "landing").length;

  const filtered = filter === "all"
    ? activeProjects
    : activeProjects.filter(p => p.type === filter);

  const metrics: { label: string; value: number; icon: typeof Database; color: string; bg: string; border: string; filter: FilterType }[] = [
    { label: "Progetti Attivi", value: activeProjects.length, icon: FolderKanban, color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    filter: "all" },
    { label: "Gestionali",      value: gestionali,            icon: Database,       color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", filter: "gestionale" },
    { label: "Workflow Attivi", value: workflows,             icon: Network,        color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   filter: "workflow" },
    { label: "Landing Online",  value: landings,              icon: MousePointerClick, color: "text-rose-500", bg: "bg-rose-500/10",    border: "border-rose-500/20",    filter: "landing" },
  ];

  function startRename(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    setRenamingId(project.id);
    setRenameValue(project.name);
  }

  async function commitRename(id: string) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) return;
    const prev = projects.find(p => p.id === id)?.name;
    if (name === prev) return;
    setProjects(ps => ps.map(p => p.id === id ? { ...p, name } : p));
    try { await patchProject(id, { name }); }
    catch { setProjects(ps => ps.map(p => p.id === id ? { ...p, name: prev ?? p.name } : p)); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      className="p-8 space-y-8"
    >
      {/* Metrics — clickable to filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => {
          const active = filter === metric.filter;
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setFilter(active ? "all" : metric.filter)}
              className={`glass-panel p-6 rounded-2xl glow-border flex flex-col gap-4 text-left transition-all duration-200 border-2 ${
                active
                  ? `${metric.border} ${metric.bg} ring-1 ring-offset-0 ring-current/20 scale-[1.02]`
                  : "bg-card border-border hover:border-primary/30 hover:scale-[1.01]"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl border ${metric.bg} ${metric.border} ${metric.color}`}>
                  <metric.icon className="w-6 h-6" />
                </div>
                {active && (
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${metric.bg} ${metric.color} border ${metric.border}`}>
                    filtro attivo
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-muted-foreground text-sm font-medium">{metric.label}</h3>
                <p className="text-3xl font-mono font-bold text-foreground mt-1">
                  {loading ? <Loader2 className="w-6 h-6 animate-spin inline" /> : metric.value}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
          Errore: {error}
        </motion.div>
      )}

      {/* Projects */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {filter === "all" ? "Progetti Attivi" : filter === "gestionale" ? "Gestionali" : filter === "workflow" ? "Workflow" : "Landing & Funnel"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {loading
                ? "Caricamento..."
                : filtered.length > 0
                  ? `${filtered.length} ${filtered.length === 1 ? "progetto" : "progetti"}${filter !== "all" ? " in questa categoria" : ""}.`
                  : filter !== "all" ? "Nessun progetto in questa categoria." : "Nessun progetto ancora. Crea il tuo primo!"}
            </p>
          </div>
          {filter !== "all" && (
            <button onClick={() => setFilter("all")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" /> Rimuovi filtro
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-8 glass-panel rounded-2xl border-dashed border-2 border-border bg-card/50"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Nessun progetto ancora</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              Inizia a creare il tuo primo progetto. L'AI Master ti guiderà passo dopo passo nella configurazione.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              {([
                { type: "gestionale" as CreationType, label: "Gestionale", icon: Database },
                { type: "landing" as CreationType, label: "Landing & Funnel", icon: MousePointerClick },
                { type: "workflow" as CreationType, label: "Workflow", icon: Network },
              ]).map(item => (
                <button
                  key={item.type}
                  onClick={() => onOpenCreation(item.type)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-medium transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-muted-foreground"
          >
            <FolderKanban className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nessun progetto in questa categoria.</p>
            <button onClick={() => setFilter("all")} className="mt-3 text-xs text-primary hover:underline">Mostra tutti</button>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((project, i) => {
                const Icon = TYPE_ICON[project.type] ?? FolderKanban;
                const isRenaming = renamingId === project.id;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    key={project.id}
                    onClick={() => !isRenaming && onOpenProject(project)}
                    className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-300 group hover:-translate-y-1 bg-card border-border relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Icon className="w-24 h-24 text-primary" />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FolderKanban className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          {project.type}
                        </span>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                          project.status === "active"
                            ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                            : "text-amber-500 bg-amber-500/10 border-amber-500/20"
                        }`}>
                          {project.status}
                        </span>
                      </div>

                      {/* Inline rename */}
                      {isRenaming ? (
                        <div className="flex items-center gap-1 mb-1" onClick={e => e.stopPropagation()}>
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") commitRename(project.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={() => commitRename(project.id)}
                            className="flex-1 bg-background border border-primary/50 rounded-lg px-2 py-1 text-sm font-bold text-foreground outline-none"
                          />
                          <button onClick={() => commitRename(project.id)} className="text-emerald-500 hover:text-emerald-400">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => setRenamingId(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-1 group/name">
                          <h3 className="font-bold text-foreground text-lg leading-tight">{project.name}</h3>
                          <button
                            onClick={e => startRename(e, project)}
                            title="Rinomina"
                            className="opacity-0 group-hover/name:opacity-100 transition-opacity text-muted-foreground hover:text-primary flex-shrink-0"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <p className="text-muted-foreground text-sm mb-4">{project.description || "Nessuna descrizione"}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        Creato: {new Date(project.createdAt).toLocaleDateString("it-IT")}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
