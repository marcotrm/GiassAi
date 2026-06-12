import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

import { AccentKey, ThemeColors, ThemeMode, buildColors } from "@/constants/theme";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: AccentKey;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setAccent: (accent: AccentKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const MODE_KEY = "giassai-theme-mode";
const ACCENT_KEY = "giassai-theme-accent";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentKey>("purple");

  useEffect(() => {
    (async () => {
      try {
        const [m, a] = await Promise.all([
          AsyncStorage.getItem(MODE_KEY),
          AsyncStorage.getItem(ACCENT_KEY),
        ]);
        if (m === "light" || m === "dark") setModeState(m);
        if (a) setAccentState(a as AccentKey);
      } catch {
        // ignore persistence errors
      }
    })();
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  };

  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  const setAccent = (next: AccentKey) => {
    setAccentState(next);
    AsyncStorage.setItem(ACCENT_KEY, next).catch(() => {});
  };

  const colors = buildColors(mode, accent);

  return (
    <ThemeContext.Provider value={{ mode, accent, colors, setMode, toggleMode, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

export function useThemeColors(): ThemeColors {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx.colors;
  return buildColors("dark", "purple");
}
