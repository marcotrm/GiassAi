import { motion } from "framer-motion";
import { Network, Activity, Zap, Play, ArrowRight } from "lucide-react";
import { CreationType } from "../App";

interface WorkflowProps {
  onOpenCreation: (type: CreationType) => void;
}

export default function Workflow({ onOpenCreation }: WorkflowProps) {
  const workflows = [
    { title: "Sincronizzazione Stripe-CRM", nodes: 5, runs: "1,245", active: true },
    { title: "Nurturing Email Nuovi Lead", nodes: 12, runs: "8,930", active: true },
    { title: "Alert Slack Vendite High-Ticket", nodes: 3, runs: "42", active: true },
    { title: "Onboarding Nuovo Cliente", nodes: 8, runs: "15", active: false },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workflows.map((wf, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            onClick={() => onOpenCreation('workflow')}
            className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-300 group bg-card border-border flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Network className="w-6 h-6 text-primary" />
              </div>
              <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                wf.active 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {wf.active ? 'Attivo' : 'In Pausa'}
              </div>
            </div>
            
            <h3 className="font-bold text-foreground text-xl mb-4">{wf.title}</h3>
            
            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Activity className="w-4 h-4"/> Nodi</span>
                <span className="font-mono font-medium">{wf.nodes}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Play className="w-4 h-4"/> Esecuzioni (30gg)</span>
                <span className="font-mono font-medium">{wf.runs}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
              Apri Editor
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
