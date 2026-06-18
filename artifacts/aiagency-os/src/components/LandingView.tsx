import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, AlertCircle, Rocket, ExternalLink, MessageSquare, Trash2, CheckCircle2, MousePointerClick } from "lucide-react";
import { getLanding, publishLanding, deleteProject, type LandingResponse } from "../lib/api";

interface Props {
  projectId: string;
  projectName: string;
  onBack: () => void;
  onResumeChat: () => void;
  onDeleted: () => void;
}

export default function LandingView({ projectId, projectName, onBack, onResumeChat, onDeleted }: Props) {
  const [landing, setLanding] = useState<LandingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const l = await getLanding(projectId);
        setLanding(l);
        setPublished(l.isPublished);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore nel caricamento");
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  const fullUrl = landing ? `/api/landing/${landing.landingId}/html` : "#";

  const handlePublish = async () => {
    if (!landing) return;
    setPublishing(true);
    setError(null);
    try {
      await publishLanding(landing.landingId);
      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pubblicazione fallita");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Eliminare la landing "${projectName}"?`)) return;
    setDeleting(true);
    try {
      await deleteProject(projectId);
      onDeleted();
    } catch {
      setError("Eliminazione fallita");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100dvh-4rem)]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MousePointerClick className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-foreground leading-tight">{projectName}</h2>
            <p className="text-xs text-muted-foreground">Landing page {published ? "· pubblicata" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={fullUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:border-primary/50">
            <ExternalLink className="w-4 h-4" /> Apri a schermo intero
          </a>
          {published ? (
            <span className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Pubblicata
            </span>
          ) : (
            <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} Pubblica
            </button>
          )}
          <button onClick={onResumeChat} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:border-primary/50">
            <MessageSquare className="w-4 h-4" /> Continua chat
          </button>
          <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-500/20 text-rose-500 text-sm hover:bg-rose-500/10 disabled:opacity-50">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex-1 min-h-0 bg-white">
        <iframe title="Landing" srcDoc={landing?.html ?? ""} className="w-full h-full border-0" sandbox="allow-same-origin allow-scripts" />
      </div>
    </motion.div>
  );
}
