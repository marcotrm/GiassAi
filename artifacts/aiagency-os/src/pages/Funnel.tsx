import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MousePointerClick, Eye, Target, ArrowRight, PlusCircle, Loader2, Trash2 } from "lucide-react";
import { CreationType } from "../App";
import { supabase } from "../lib/supabase";
import { API_BASE, deleteProject } from "../lib/api";

interface FunnelProps {
  onOpenCreation: (type: CreationType, ctx?: { projectId?: string }) => void;
}

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

export default function Funnel({ onOpenCreation }: FunnelProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    if (!window.confirm(`Eliminare "${project.name}"?`)) return;
    setDeletingId(project.id);
    try {
      await deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch {
      window.alert("Eliminazione fallita.");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${API_BASE}/projects`, {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const all = data.projects ?? data ?? [];
        setProjects(all.filter((p: Project) => p.type === "landing" && p.status !== "archived"));
      } catch (err) {
        console.error("Fetch funnel error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-64 space-y-4"
      >
        <MousePointerClick className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-lg">Nessun funnel creato</p>
        <button
          onClick={() => onOpenCreation('landing')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="w-5 h-5" />
          Crea il tuo primo funnel
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={project.id}
            onClick={() => onOpenCreation('landing', { projectId: project.id })}
            className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-300 group bg-card border-border flex flex-col relative"
          >
            <button
              onClick={(e) => handleDelete(e, project)}
              disabled={deletingId === project.id}
              title="Elimina"
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              {deletingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <MousePointerClick className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-xl mb-4 pr-8">{project.name}</h3>
            
            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Target className="w-4 h-4"/> Stato</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  project.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                }`}>{project.status === 'active' ? 'Attivo' : project.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Eye className="w-4 h-4"/> Creato</span>
                <span>{new Date(project.createdAt).toLocaleDateString('it-IT')}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
              Modifica Landing
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
