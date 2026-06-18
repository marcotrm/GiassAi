import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { FolderKanban, Database, MousePointerClick, Network, Bot, Loader2, PlusCircle, Sparkles } from "lucide-react";
import { CreationType } from "../App";
import { supabase } from "../lib/supabase";
import { API_BASE } from "../lib/api";

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

const TYPE_ICON: Record<string, typeof Database> = {
  gestionale: Database,
  landing: MousePointerClick,
  workflow: Network,
};

export default function ControlRoom({ onOpenCreation, onOpenProject }: ControlRoomProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (!cancelled) {
          setProjects(data.projects ?? data ?? []);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Errore nel caricamento dei progetti");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProjects();
    return () => { cancelled = true; };
  }, []);

  // Compute metrics from real data
  const activeProjects = projects.filter(p => p.status !== "archived");
  const gestionali = projects.filter(p => p.type === "gestionale").length;
  const workflows = projects.filter(p => p.type === "workflow").length;
  const landings = projects.filter(p => p.type === "landing").length;

  const metrics = [
    { label: "Progetti Attivi", value: activeProjects.length, icon: FolderKanban, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { label: "Gestionali", value: gestionali, icon: Database, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Workflow Attivi", value: workflows, icon: Network, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    { label: "Landing Online", value: landings, icon: MousePointerClick, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      className="p-8 space-y-8"
    >
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="glass-panel p-6 rounded-2xl glow-border flex flex-col gap-4 bg-card border-border"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-xl border ${metric.bg} ${metric.border} ${metric.color}`}>
                <metric.icon className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-muted-foreground text-sm font-medium">{metric.label}</h3>
              <p className="text-3xl font-mono font-bold text-foreground mt-1">
                {loading ? <Loader2 className="w-6 h-6 animate-spin inline" /> : metric.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
          Errore: {error}
        </motion.div>
      )}

      {/* Projects */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Progetti Attivi</h2>
            <p className="text-muted-foreground text-sm">
              {loading
                ? "Caricamento..."
                : activeProjects.length > 0
                  ? `I tuoi agenti stanno lavorando su ${activeProjects.length} ${activeProjects.length === 1 ? "progetto" : "progetti"}.`
                  : "Nessun progetto ancora. Crea il tuo primo!"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeProjects.length === 0 ? (
          /* Empty state */
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((project, i) => {
              const Icon = TYPE_ICON[project.type] ?? FolderKanban;
              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  key={project.id}
                  onClick={() => onOpenProject(project)}
                  data-testid={`project-card-${i}`}
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
                    <div className="flex items-center gap-2 mb-1">
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
                    <h3 className="font-bold text-foreground text-lg mb-1">{project.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">{project.description || "Nessuna descrizione"}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Creato: {new Date(project.createdAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
