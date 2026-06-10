import { motion } from "framer-motion";
import { Users, DollarSign, Target, Zap, FolderKanban, Database, MousePointerClick, Network, Bot, TrendingUp, TrendingDown } from "lucide-react";
import { CreationType } from "../App";

interface ControlRoomProps {
  onOpenCreation: (type: CreationType) => void;
}

export default function ControlRoom({ onOpenCreation }: ControlRoomProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      className="p-8 space-y-8"
    >
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Lead Generati Oggi", value: "142", trend: "+18%", positive: true, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Fatturato Tracciato (10%)", value: "24.800 €", trend: "+7%", positive: true, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Automazioni Attive", value: "12", trend: "+2", positive: true, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          { label: "Conversion Rate", value: "8.3%", trend: "-1.2%", positive: false, icon: Target, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
        ].map((metric, i) => (
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
              <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border ${
                metric.positive 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}>
                {metric.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {metric.trend}
              </div>
            </div>
            <div>
              <h3 className="text-muted-foreground text-sm font-medium">{metric.label}</h3>
              <p className="text-3xl font-mono font-bold text-foreground mt-1">{metric.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Progetti Attivi</h2>
            <p className="text-muted-foreground text-sm">I tuoi agenti stanno lavorando su 5 fronti.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "CRM Clienti VIP", desc: "Gestione clienti premium con storico", agents: 3, progress: 72, type: "gestionale" as CreationType, icon: Database },
            { title: "Funnel Lancio Giugno", desc: "Campagna acquisizione Q2", agents: 5, progress: 45, type: "landing" as CreationType, icon: MousePointerClick },
            { title: "Sincronizzazione Stripe-CRM", desc: "Aggiornamento pagamenti in tempo reale", agents: 2, progress: 89, type: "workflow" as CreationType, icon: Network },
            { title: "Dashboard KPI Vendite", desc: "Reportistica mensile", agents: 1, progress: 30, type: "gestionale" as CreationType, icon: Database },
            { title: "Landing Page Evento", desc: "Registrazione evento offline", agents: 4, progress: 61, type: "landing" as CreationType, icon: MousePointerClick },
          ].map((project, i) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + (i * 0.1) }}
              key={i}
              onClick={() => onOpenCreation(project.type)}
              data-testid={`project-card-${i}`}
              className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-300 group hover:-translate-y-1 bg-card border-border relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <project.icon className="w-24 h-24 text-primary" />
              </div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderKanban className="w-5 h-5 text-primary" />
                </div>
                <div className="flex -space-x-2">
                  {[...Array(project.agents)].map((_, j) => (
                    <div key={j} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {project.type}
                  </span>
                </div>
                <h3 className="font-bold text-foreground text-lg mb-1">{project.title}</h3>
                <p className="text-muted-foreground text-sm mb-6">{project.desc}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="text-primary font-mono font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden border border-border">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${project.progress}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]" 
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
