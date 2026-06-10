import { motion } from "framer-motion";
import { Database, Clock, Users, ArrowRight } from "lucide-react";
import { CreationType } from "../App";

interface GestionaliProps {
  onOpenCreation: (type: CreationType) => void;
}

export default function Gestionali({ onOpenCreation }: GestionaliProps) {
  const apps = [
    { title: "CRM Clienti VIP", records: "1,245", updated: "2 ore fa", agents: 3 },
    { title: "Gestione Inventario", records: "8,930", updated: "1 giorno fa", agents: 2 },
    { title: "Fatturazione & Spese", records: "452", updated: "3 ore fa", agents: 4 },
    { title: "Directory Fornitori", records: "89", updated: "5 giorni fa", agents: 1 },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app, i) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            onClick={() => onOpenCreation('gestionale')}
            className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-300 group bg-card border-border flex flex-col"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-xl mb-4">{app.title}</h3>
            
            <div className="mt-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Database className="w-4 h-4"/> Records</span>
                <span className="font-mono font-medium">{app.records}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4"/> Aggiornato</span>
                <span>{app.updated}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4"/> Agenti</span>
                <span>{app.agents} attivi</span>
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
