import { motion } from "framer-motion";
import { 
  LayoutDashboard, FolderKanban, Bot, LineChart, Settings, 
  TrendingUp, TrendingDown, Users, DollarSign, Target, Zap, Mic, Send
} from "lucide-react";
import { useState } from "react";

interface ControlRoomProps {
  onNavigate: () => void;
}

export default function ControlRoom({ onNavigate }: ControlRoomProps) {
  const [command, setCommand] = useState("");

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      onNavigate();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
      className="flex h-screen w-full"
    >
      {/* Sidebar */}
      <aside className="w-64 border-r border-border glass-panel flex flex-col justify-between p-4 z-10 relative">
        <div>
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">AIAgency <span className="text-primary font-light">OS</span></span>
          </div>
          
          <nav className="space-y-2">
            {[
              { icon: LayoutDashboard, label: "Control Room", active: true },
              { icon: FolderKanban, label: "Progetti", active: false },
              { icon: Bot, label: "Agenti AI", active: false },
              { icon: LineChart, label: "Analytics", active: false },
              { icon: Settings, label: "Impostazioni", active: false },
            ].map((item, i) => (
              <button 
                key={i}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  item.active 
                    ? "bg-primary/10 text-primary border border-primary/20 glow-border" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-colors" data-testid="user-profile">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Avatar" className="w-10 h-10 rounded-full bg-black/50" />
          <div className="flex flex-col text-left">
            <span className="text-sm font-semibold text-white">Admin</span>
            <span className="text-xs text-primary">Chief of Staff</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto relative">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[150px] pointer-events-none" />

        <header className="px-8 py-6 flex items-center justify-between border-b border-white/5 glass-panel sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Control Room</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sistemi operativi normali. Data di oggi: {new Date().toLocaleDateString('it-IT')}
            </p>
          </div>
        </header>

        <div className="p-8 space-y-8 pb-32 z-10">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: "Lead Generati Oggi", value: "142", trend: "+18%", positive: true, icon: Users, color: "text-blue-400" },
              { label: "Vendite Chiuse", value: "24.800 €", trend: "+7%", positive: true, icon: DollarSign, color: "text-emerald-400" },
              { label: "Conversion Rate", value: "8.3%", trend: "-1.2%", positive: false, icon: Target, color: "text-rose-400" },
              { label: "ROI Campagne", value: "340%", trend: "+22%", positive: true, icon: Zap, color: "text-amber-400" },
            ].map((metric, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={i}
                className="glass-panel p-6 rounded-2xl glow-border flex flex-col gap-4"
              >
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${metric.color}`}>
                    <metric.icon className="w-6 h-6" />
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${metric.positive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {metric.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {metric.trend}
                  </div>
                </div>
                <div>
                  <h3 className="text-muted-foreground text-sm font-medium">{metric.label}</h3>
                  <p className="text-3xl font-mono font-bold text-white mt-1">{metric.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Projects */}
          <div>
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Progetti Attivi</h2>
                <p className="text-muted-foreground text-sm">I tuoi agenti stanno lavorando su 5 fronti.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {[
                { title: "CRM Clienti VIP", desc: "CRM clienti premium", agents: 3, progress: 72 },
                { title: "Lancio Prodotto X", desc: "Campagna lancio Q3", agents: 5, progress: 45 },
                { title: "Automazione Email", desc: "Sequenze nurturing", agents: 2, progress: 89 },
                { title: "Report Analytics", desc: "Dashboard settimanale", agents: 1, progress: 30 },
                { title: "AI Content Studio", desc: "Generazione contenuti social", agents: 4, progress: 61 },
              ].map((project, i) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  key={i}
                  onClick={onNavigate}
                  data-testid={`project-card-${i}`}
                  className="glass-panel p-6 rounded-2xl cursor-pointer hover:border-primary/50 transition-all duration-300 group hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FolderKanban className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex -space-x-2">
                      {[...Array(project.agents)].map((_, j) => (
                        <div key={j} className="w-8 h-8 rounded-full bg-background border border-white/20 flex items-center justify-center shadow-lg">
                          <Bot className="w-4 h-4 text-cyan-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">{project.title}</h3>
                  <p className="text-muted-foreground text-sm mb-6">{project.desc}</p>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="text-primary font-mono">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_10px_rgba(270,100%,60%,0.5)]" 
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Command Bar */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
          <form 
            onSubmit={handleCommandSubmit}
            className="glass-panel rounded-full p-2 flex items-center gap-2 glow-border shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-muted-foreground hover:text-white cursor-pointer transition-colors">
              <Mic className="w-5 h-5" />
            </div>
            <input 
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Di' all'AI Master cosa vuoi creare oggi..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-muted-foreground px-4 font-medium text-lg"
              data-testid="command-input"
            />
            <button 
              type="submit"
              data-testid="command-submit"
              className="h-12 px-6 rounded-full bg-primary hover:bg-primary/90 text-white font-semibold flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            >
              Crea
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </motion.div>
  );
}
