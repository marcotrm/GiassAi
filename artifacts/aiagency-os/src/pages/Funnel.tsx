import { motion } from "framer-motion";
import { MousePointerClick, Eye, Users, Target, ArrowRight } from "lucide-react";
import { CreationType } from "../App";

interface FunnelProps {
  onOpenCreation: (type: CreationType) => void;
}

export default function Funnel({ onOpenCreation }: FunnelProps) {
  const funnels = [
    { title: "Funnel Lancio Giugno", visite: "12.5k", lead: "1,240", conv: "9.8%" },
    { title: "Webinar Masterclass", visite: "5.2k", lead: "850", conv: "16.3%" },
    { title: "Landing Page E-book", visite: "8.9k", lead: "2,100", conv: "23.5%" },
    { title: "Consulenza Gratuita", visite: "3.4k", lead: "120", conv: "3.5%" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funnels.map((funnel, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            onClick={() => onOpenCreation('landing')}
            className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-300 group bg-card border-border flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <MousePointerClick className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-xl mb-4">{funnel.title}</h3>
            
            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Eye className="w-4 h-4"/> Visite</span>
                <span className="font-mono font-medium">{funnel.visite}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4"/> Lead Generati</span>
                <span className="font-mono font-medium">{funnel.lead}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Target className="w-4 h-4"/> Conversion Rate</span>
                <span className="text-emerald-500 font-medium">{funnel.conv}</span>
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
