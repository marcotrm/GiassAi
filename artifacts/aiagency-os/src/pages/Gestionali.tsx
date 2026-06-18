import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Database, Clock, Users, ArrowRight, PlusCircle, Loader2, Trash2 } from "lucide-react";
import { CreationType } from "../App";
import { supabase } from "../lib/supabase";
import { API_BASE, deleteProject } from "../lib/api";
import GestionaleDataView from "../components/GestionaleDataView";

interface GestionaliProps {
  onOpenCreation: (type: CreationType, ctx?: { projectId?: string }) => void;
  autoOpenId?: string;
}

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Gestionali({ onOpenCreation, autoOpenId }: GestionaliProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        const list = all.filter((p: Project) => p.type === "gestionale" && p.status !== "archived");
        setProjects(list);
        if (autoOpenId) {
          const p = list.find((x: Project) => x.id === autoOpenId);
          if (p) setSelected(p);
        }
      } catch (err) {
        console.error("Fetch gestionali error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  async function handleDelete(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    if (!window.confirm(`Eliminare "${project.name}"? L'azione archivia il progetto.`)) return;
    setDeletingId(project.id);
    try {
      await deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      console.error("Delete error:", err);
      window.alert("Eliminazione fallita.");
    } finally {
      setDeletingId(null);
    }
  }

  if (selected) {
    return (
      <GestionaleDataView
        projectId={selected.id}
        projectName={selected.name}
        onBack={() => setSelected(null)}
        onResumeChat={() => onOpenCreation('gestionale', { projectId: selected.id })}
        onDeleted={() => {
          setProjects((prev) => prev.filter((p) => p.id !== selected.id));
          setSelected(null);
        }}
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
        <Database className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-lg">Nessun gestionale creato</p>
        <button
          onClick={() => onOpenCreation('gestionale')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="w-5 h-5" />
          Crea il tuo primo gestionale
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
        <h2 className="text-2xl font-bold text-foreground">I tuoi gestionali</h2>
        <button
          onClick={() => onOpenCreation('gestionale')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <PlusCircle className="w-4 h-4" /> Nuovo
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={project.id}
            onClick={() => setSelected(project)}
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
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-xl mb-4 pr-8">{project.name}</h3>

            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4"/> Stato</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  project.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'
                }`}>{project.status === 'active' ? 'Attivo' : project.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4"/> Creato</span>
                <span>{new Date(project.createdAt).toLocaleDateString('it-IT')}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
              Apri Gestionale
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
