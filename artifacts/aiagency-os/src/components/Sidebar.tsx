import { LayoutDashboard, Database, MousePointerClick, Network, Settings, Zap, LogOut } from "lucide-react";
import { SidebarSection } from "../App";
import { useAuthContext } from "../contexts/AuthContext";

interface SidebarProps {
  currentSection: SidebarSection;
  onNavigate: (section: SidebarSection) => void;
}

export default function Sidebar({ currentSection, onNavigate }: SidebarProps) {
  const { user, signOut } = useAuthContext();

  const navItems = [
    { id: "control", icon: LayoutDashboard, label: "Control Room" },
    { id: "gestionali", icon: Database, label: "I Miei Gestionali" },
    { id: "funnel", icon: MousePointerClick, label: "Landing & Funnel" },
    { id: "workflow", icon: Network, label: "Workflow" },
    { id: "impostazioni", icon: Settings, label: "Impostazioni" },
  ] as const;

  // Derive display name and avatar initial from the user's email or metadata
  const displayName = user?.user_metadata?.full_name
    || user?.email?.split("@")[0]
    || "Utente";
  const avatarInitial = displayName.charAt(0).toUpperCase();

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

      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border transition-colors" data-testid="user-profile">
        <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {avatarInitial}
        </div>
        <div className="flex flex-col text-left min-w-0 flex-1">
          <span className="text-sm font-semibold truncate">{displayName}</span>
          <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          title="Esci"
          data-testid="sign-out-button"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
