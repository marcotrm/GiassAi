import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, Play, Bot, UserCheck, ArrowDown, CheckCircle2, Loader2, AlertCircle, Power } from "lucide-react";
import { activateWorkflow } from "../lib/api";
import type { WorkflowDefView, WorkflowNodeView } from "../hooks/use-chat-stream";

interface Props {
  def: WorkflowDefView;
  workflowId: string;
  onActivated?: () => void;
}

const NODE_META: Record<WorkflowNodeView["type"], { icon: typeof Zap; color: string; label: string }> = {
  trigger: { icon: Zap, color: "text-amber-500 bg-amber-500/10 border-amber-500/20", label: "Trigger" },
  action: { icon: Play, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", label: "Azione" },
  ai_task: { icon: Bot, color: "text-purple-500 bg-purple-500/10 border-purple-500/20", label: "AI Task" },
  human_in_the_loop: { icon: UserCheck, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", label: "Approvazione" },
};

export default function WorkflowPreview({ def, workflowId, onActivated }: Props) {
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Order nodes by the linked list starting from the trigger.
  const byId = new Map(def.nodes.map((n) => [n.id, n]));
  const ordered: WorkflowNodeView[] = [];
  let cursor: string | null = def.nodes.find((n) => n.type === "trigger")?.id ?? def.nodes[0]?.id ?? null;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const n = byId.get(cursor);
    if (!n) break;
    ordered.push(n);
    cursor = n.nextNodeId;
  }

  const handleActivate = async () => {
    setActivating(true);
    setError(null);
    try {
      await activateWorkflow(workflowId);
      setActivated(true);
      onActivated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attivazione fallita");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-tight">{def.name}</h3>
            <p className="text-xs text-muted-foreground">{ordered.length} nodi</p>
          </div>
        </div>

        <div className="flex flex-col items-stretch">
          {ordered.map((n, i) => {
            const meta = NODE_META[n.type];
            const Icon = meta.icon;
            return (
              <div key={n.id} className="flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`w-full rounded-xl border p-3 flex items-center gap-3 ${meta.color}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider opacity-70">{meta.label}</div>
                    <div className="text-sm font-medium text-foreground truncate">{n.label}</div>
                  </div>
                </motion.div>
                {i < ordered.length - 1 && <ArrowDown className="w-4 h-4 text-muted-foreground my-1" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 border-t border-border bg-background/80 backdrop-blur-md">
        {error && (
          <div className="mb-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {activated ? (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            Workflow attivo!
          </div>
        ) : (
          <button
            onClick={handleActivate}
            disabled={activating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold transition-colors"
            data-testid="btn-activate-workflow"
          >
            {activating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Attivazione...
              </>
            ) : (
              <>
                <Power className="w-5 h-5" /> Attiva workflow
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
