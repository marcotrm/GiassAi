import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Network, Activity, Play, ArrowRight, PlusCircle, Loader2, Trash2 } from "lucide-react";
import { CreationType } from "../App";
import { supabase } from "../lib/supabase";
import { API_BASE, deleteProject, type Project } from "../lib/api";
import CrmBoard from "../components/CrmBoard";

interface WorkflowProps {
  onOpenCreation: (type: CreationType, ctx?: { projectId?: string }) => void;
}

export default function Workflow({ onOpenCreation }: WorkflowProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openProject, setOpenProject] = useState<Project | null>(null);

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
        setProjects(all.filter((p: Project) => p.type === "workflow" && p.status !== "archived"));
      } catch (err) {
        console.error("Fetch workflow error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  if (openProject) {
    return (
      <CrmBoard
        project={openProject}
        onBack={() => setOpenProject(null)}
        onOpenEditor={() => onOpenCreation("workflow", { projectId: openProject.id })}
      />
    );
  }

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
        <Network className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-lg">Nessun workflow creato</p>
        <button
          onClick={() => onOpenCreation('workflow')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="w-5 h-5" />
          Crea il tuo primo workflow
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">I tuoi workflow</h2>
        <button
          onClick={() => onOpenCreation('workflow')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="w-4 h-4" /> Nuovo workflow
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={project.id}
            onClick={() =>
              project.config?.["crmEnabled"]
                ? setOpenProject(project)
                : onOpenCreation("workflow", { projectId: project.id })
            }
            className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-300 group bg-card border-border flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Network className="w-6 h-6 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  project.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-muted text-muted-foreground border-border'
                }`}>
                  {project.status === 'active' ? 'Attivo' : 'In Pausa'}
                </div>
                <button
                  onClick={(e) => handleDelete(e, project)}
                  disabled={deletingId === project.id}
                  title="Elimina"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  {deletingId === project.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-bold text-foreground text-xl">{project.name}</h3>
              {project.config?.["crmEnabled"] ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">CRM</span>
              ) : null}
            </div>
            
            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4"/> Stato</span>
                <span className="font-mono font-medium">{project.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Play className="w-4 h-4"/> Creato</span>
                <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString('it-IT') : '—'}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
              {project.config?.["crmEnabled"] ? "Apri CRM" : "Apri Editor"}
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
