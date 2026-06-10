import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "light" | "dark";
type AccentColor = "purple" | "cyan" | "emerald" | "amber" | "blue" | "rose";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ACCENT_COLORS: Record<AccentColor, { primary: string; ring: string }> = {
  purple: { primary: "270 100% 60%", ring: "270 100% 60%" },
  cyan: { primary: "190 100% 50%", ring: "190 100% 50%" },
  emerald: { primary: "150 100% 45%", ring: "150 100% 45%" },
  amber: { primary: "45 100% 50%", ring: "45 100% 50%" },
  blue: { primary: "221 83% 53%", ring: "221 83% 53%" },
  rose: { primary: "346 87% 60%", ring: "346 87% 60%" },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem("theme-mode") as ThemeMode) || "dark";
  });
  
  const [accent, setAccent] = useState<AccentColor>(() => {
    return (localStorage.getItem("theme-accent") as AccentColor) || "purple";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme-mode", mode);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    const colors = ACCENT_COLORS[accent];
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--ring", colors.ring);
    localStorage.setItem("theme-accent", accent);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
