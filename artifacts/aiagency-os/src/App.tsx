import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import DashboardShell from "./components/DashboardShell";
import ControlRoom from "./pages/ControlRoom";
import Gestionali from "./pages/Gestionali";
import Funnel from "./pages/Funnel";
import Workflow from "./pages/Workflow";
import Impostazioni from "./pages/Impostazioni";
import CreationRoom from "./pages/CreationRoom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./components/ThemeProvider";

export type SidebarSection = "control" | "gestionali" | "funnel" | "workflow" | "impostazioni";
export type CreationType = "gestionale" | "landing" | "workflow";

function App() {
  const [currentSection, setCurrentSection] = useState<SidebarSection>("control");
  const [inCreation, setInCreation] = useState(false);
  const [creationType, setCreationType] = useState<CreationType>("gestionale");

  const openCreationRoom = (type: CreationType) => {
    setCreationType(type);
    setInCreation(true);
  };

  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="min-h-[100dvh] w-full bg-background text-foreground overflow-hidden selection:bg-primary/30">
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
        </div>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
