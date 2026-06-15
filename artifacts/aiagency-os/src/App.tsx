import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Switch, Route, Redirect, useLocation } from "wouter";
import DashboardShell from "./components/DashboardShell";
import ControlRoom from "./pages/ControlRoom";
import Gestionali from "./pages/Gestionali";
import Funnel from "./pages/Funnel";
import Workflow from "./pages/Workflow";
import Impostazioni from "./pages/Impostazioni";
import CreationRoom from "./pages/CreationRoom";
import Auth from "./pages/Auth";
import NotFound from "./pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { Loader2 } from "lucide-react";

export type SidebarSection = "control" | "gestionali" | "funnel" | "workflow" | "impostazioni";
export type CreationType = "gestionale" | "landing" | "workflow" | "video_ideas";

function Dashboard() {
  const [currentSection, setCurrentSection] = useState<SidebarSection>("control");
  const [inCreation, setInCreation] = useState(false);
  const [creationType, setCreationType] = useState<CreationType>("gestionale");

  const openCreationRoom = (type: CreationType) => {
    setCreationType(type);
    setInCreation(true);
  };

  return (
    <AnimatePresence mode="wait">
      {!inCreation ? (
        <DashboardShell
          key="dashboard"
          currentSection={currentSection}
          onNavigate={(s) => setCurrentSection(s)}
          onOpenCreation={openCreationRoom}
        >
          <AnimatePresence mode="wait">
            {currentSection === "control" && (
              <ControlRoom key="control" onOpenCreation={openCreationRoom} />
            )}
            {currentSection === "gestionali" && (
              <Gestionali key="gestionali" onOpenCreation={openCreationRoom} />
            )}
            {currentSection === "funnel" && (
              <Funnel key="funnel" onOpenCreation={openCreationRoom} />
            )}
            {currentSection === "workflow" && (
              <Workflow key="workflow" onOpenCreation={openCreationRoom} />
            )}
            {currentSection === "impostazioni" && (
              <Impostazioni key="impostazioni" />
            )}
          </AnimatePresence>
        </DashboardShell>
      ) : (
        <CreationRoom
          key="creation"
          type={creationType}
          onNavigate={() => setInCreation(false)}
        />
      )}
    </AnimatePresence>
  );
}

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground overflow-hidden selection:bg-primary/30">
      <Dashboard />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={Auth} />
      <Route>{() => <ProtectedRoutes />}</Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Router />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
