import React, { createContext, useContext, useState } from "react";

import { CreationType } from "@/constants/data";

interface AppStateValue {
  creationType: CreationType;
  setCreationType: (type: CreationType) => void;
}

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [creationType, setCreationType] = useState<CreationType>("gestionale");

  return (
    <AppStateContext.Provider value={{ creationType, setCreationType }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within an AppStateProvider");
  return ctx;
}
