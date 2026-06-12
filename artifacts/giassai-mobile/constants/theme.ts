export type ThemeMode = "light" | "dark";
export type AccentKey = "purple" | "cyan" | "emerald" | "amber" | "blue" | "rose";

type HSL = { h: number; s: number; l: number };

export const ACCENTS: Record<AccentKey, HSL & { label: string }> = {
  purple: { h: 270, s: 100, l: 60, label: "Viola" },
  cyan: { h: 190, s: 100, l: 50, label: "Ciano" },
  emerald: { h: 150, s: 100, l: 45, label: "Smeraldo" },
  amber: { h: 45, s: 100, l: 50, label: "Ambra" },
  blue: { h: 221, s: 83, l: 53, label: "Blu" },
  rose: { h: 346, s: 87, l: 60, label: "Rosa" },
};

export const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

const hslStr = ({ h, s, l }: HSL) => `hsl(${h}, ${s}%, ${l}%)`;
const hslaStr = ({ h, s, l }: HSL, a: number) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

const EMERALD: HSL = { h: 150, s: 80, l: 45 };
const ROSE: HSL = { h: 346, s: 85, l: 58 };
const AMBER: HSL = { h: 38, s: 95, l: 52 };
const BLUE: HSL = { h: 217, s: 91, l: 60 };
const CYAN: HSL = { h: 190, s: 90, l: 50 };

const DARK = {
  background: { h: 226, s: 50, l: 4 } as HSL,
  foreground: { h: 0, s: 0, l: 98 } as HSL,
  card: { h: 226, s: 45, l: 7 } as HSL,
  cardElevated: { h: 226, s: 40, l: 11 } as HSL,
  border: { h: 226, s: 30, l: 16 } as HSL,
  muted: { h: 226, s: 30, l: 13 } as HSL,
  mutedForeground: { h: 226, s: 18, l: 66 } as HSL,
  glassBg: "rgba(13, 18, 38, 0.55)",
};

const LIGHT = {
  background: { h: 210, s: 20, l: 98 } as HSL,
  foreground: { h: 226, s: 50, l: 10 } as HSL,
  card: { h: 0, s: 0, l: 100 } as HSL,
  cardElevated: { h: 210, s: 20, l: 96 } as HSL,
  border: { h: 210, s: 20, l: 89 } as HSL,
  muted: { h: 210, s: 20, l: 92 } as HSL,
  mutedForeground: { h: 226, s: 18, l: 40 } as HSL,
  glassBg: "rgba(255, 255, 255, 0.7)",
};

export type AlphaKey =
  | "primary"
  | "emerald"
  | "rose"
  | "amber"
  | "blue"
  | "cyan"
  | "foreground"
  | "mutedForeground";

export interface ThemeColors {
  mode: ThemeMode;
  accentKey: AccentKey;
  background: string;
  foreground: string;
  card: string;
  cardElevated: string;
  border: string;
  muted: string;
  mutedForeground: string;
  glassBg: string;
  glassTint: "dark" | "light";
  primary: string;
  primaryForeground: string;
  emerald: string;
  rose: string;
  amber: string;
  blue: string;
  cyan: string;
  radius: number;
  alpha: (key: AlphaKey, a: number) => string;
}

export function buildColors(mode: ThemeMode, accentKey: AccentKey): ThemeColors {
  const base = mode === "dark" ? DARK : LIGHT;
  const primaryHsl = ACCENTS[accentKey];
  const hueMap: Record<AlphaKey, HSL> = {
    primary: primaryHsl,
    emerald: EMERALD,
    rose: ROSE,
    amber: AMBER,
    blue: BLUE,
    cyan: CYAN,
    foreground: base.foreground,
    mutedForeground: base.mutedForeground,
  };
  return {
    mode,
    accentKey,
    background: hslStr(base.background),
    foreground: hslStr(base.foreground),
    card: hslStr(base.card),
    cardElevated: hslStr(base.cardElevated),
    border: hslStr(base.border),
    muted: hslStr(base.muted),
    mutedForeground: hslStr(base.mutedForeground),
    glassBg: base.glassBg,
    glassTint: mode === "dark" ? "dark" : "light",
    primary: hslStr(primaryHsl),
    primaryForeground: "#ffffff",
    emerald: hslStr(EMERALD),
    rose: hslStr(ROSE),
    amber: hslStr(AMBER),
    blue: hslStr(BLUE),
    cyan: hslStr(CYAN),
    radius: 20,
    alpha: (key, a) => hslaStr(hueMap[key], a),
  };
}
