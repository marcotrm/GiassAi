import { ReactNode, useState } from "react";
import { Mic, Send, Sun, Moon } from "lucide-react";
import Sidebar from "./Sidebar";
import { SidebarSection, CreationType } from "../App";
import { useTheme } from "./ThemeProvider";

interface DashboardShellProps {
  currentSection: SidebarSection;
  onNavigate: (section: SidebarSection) => void;
  onOpenCreation: (type: CreationType) => void;
  children: ReactNode;
}

export default function DashboardShell({ currentSection, onNavigate, onOpenCreation, children }: DashboardShellProps) {
  const [command, setCommand] = useState("");
  const { mode, setMode } = useTheme();

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    const text = command.toLowerCase();
    let type: CreationType = "gestionale";
    
    if (text.includes("landing") || text.includes("funnel") || text.includes("pagina")) {
      type = "landing";
    } else if (text.includes("workflow") || text.includes("automazione") || text.includes("collega") || text.includes("stripe")) {
      type = "workflow";
    }
    
    onOpenCreation(type);
    setCommand("");
  };

  const getSectionTitle = () => {
    switch (currentSection) {
      case "control": return { title: "Control Room", subtitle: "Sistemi operativi normali." };
      case "gestionali": return { title: "I Miei Gestionali", subtitle: "CRM, ERP e database operativi." };
      case "funnel": return { title: "Landing & Funnel", subtitle: "Acquisizione e conversione." };
      case "workflow": return { title: "Workflow", subtitle: "Automazioni e sincronizzazioni." };
      case "impostazioni": return { title: "Impostazioni", subtitle: "Preferenze account e sistema." };
      default: return { title: "Dashboard", subtitle: "" };
    }
  };

  const { title, subtitle } = getSectionTitle();

  return (
    <div className="flex h-screen w-full bg-background relative overflow-hidden">
      <Sidebar currentSection={currentSection} onNavigate={onNavigate} />
      
      <main className="flex-1 flex flex-col relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[150px] pointer-events-none" />

        <header className="px-8 py-6 flex items-center justify-between border-b border-border glass-panel sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {subtitle} Data di oggi: {new Date().toLocaleDateString('it-IT')}
            </p>
          </div>
          <button 
            onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto z-10 pb-32">
          {children}
        </div>

        <div className="fixed bottom-8 left-[calc(50%+8rem)] -translate-x-1/2 w-full max-w-2xl z-50">
          <form 
            onSubmit={handleCommandSubmit}
            className="glass-panel rounded-full p-2 flex items-center gap-2 glow-border shadow-2xl bg-card border-border"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted/50 border border-border text-primary cursor-pointer transition-colors relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75" />
              <Mic className="w-5 h-5 relative z-10" />
            </div>
            <input 
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Di' a GiassAi cosa vuoi creare o collegare oggi..."
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground px-4 font-medium text-lg"
              data-testid="command-input"
            />
            <button 
              type="submit"
              data-testid="command-submit"
              className="h-12 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 transition-colors shadow-lg"
            >
              Crea
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
