import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import ControlRoom from "./pages/ControlRoom";
import CreationRoom from "./pages/CreationRoom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  const [currentView, setCurrentView] = useState<"control" | "creation">("control");

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-background text-foreground overflow-hidden selection:bg-primary/30">
        <AnimatePresence mode="wait">
          {currentView === "control" ? (
            <ControlRoom key="control" onNavigate={() => setCurrentView("creation")} />
          ) : (
            <CreationRoom key="creation" onNavigate={() => setCurrentView("control")} />
          )}
        </AnimatePresence>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
