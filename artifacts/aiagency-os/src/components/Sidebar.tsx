import { LayoutDashboard, Database, MousePointerClick, Network, Settings, Zap } from "lucide-react";
import { SidebarSection } from "../App";

interface SidebarProps {
  currentSection: SidebarSection;
  onNavigate: (section: SidebarSection) => void;
}

export default function Sidebar({ currentSection, onNavigate }: SidebarProps) {
  const navItems = [
    { id: "control", icon: LayoutDashboard, label: "Control Room" },
    { id: "gestionali", icon: Database, label: "I Miei Gestionali" },
    { id: "funnel", icon: MousePointerClick, label: "Landing & Funnel" },
    { id: "workflow", icon: Network, label: "Workflow" },
    { id: "impostazioni", icon: Settings, label: "Impostazioni" },
  ] as const;

  return (
    <aside className="w-64 border-r border-border glass-panel flex flex-col justify-between p-4 z-10 relative bg-sidebar text-sidebar-foreground">
      <div>
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-lg tracking-tight">Giass<span className="text-primary font-light">Ai</span></span>
        </div>
        
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => onNavigate(item.id)}
              data-testid={`nav-${item.id}`}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                currentSection === item.id 
                  ? "bg-primary/10 text-primary border border-primary/20 glow-border" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:bg-muted cursor-pointer transition-colors" data-testid="user-profile">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border overflow-hidden">
          <img src="https://api.dicebear.com/7.x/initials/svg?seed=Admin&backgroundColor=transparent" alt="Avatar" className="w-full h-full" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold">Admin</span>
          <span className="text-xs text-primary">Chief of Staff</span>
        </div>
      </div>
    </aside>
  );
}
