/**
 * Semantic design tokens used by the ErrorBoundary fallback hook (useColors).
 *
 * The live app theme (mode + accent) is driven by constants/theme.ts via the
 * ThemeProvider context. These static values mirror the GiassAi brand palette
 * so the error screen stays on-brand even before the provider mounts.
 */

const colors = {
  light: {
    text: "#0d1326",
    tint: "#9933ff",

    background: "#f7f9fb",
    foreground: "#0d1326",

    card: "#ffffff",
    cardForeground: "#0d1326",

    primary: "#9933ff",
    primaryForeground: "#ffffff",

    secondary: "#e6eaee",
    secondaryForeground: "#0d1326",

    muted: "#e6eaee",
    mutedForeground: "#525a73",

    accent: "#e6eaee",
    accentForeground: "#0d1326",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#dde2e8",
    input: "#dde2e8",
  },

  dark: {
    text: "#fafafa",
    tint: "#9933ff",

    background: "#05070f",
    foreground: "#fafafa",

    card: "#0a0d18",
    cardForeground: "#fafafa",

    primary: "#9933ff",
    primaryForeground: "#ffffff",

    secondary: "#161a28",
    secondaryForeground: "#fafafa",

    muted: "#161a28",
    mutedForeground: "#9aa1b8",

    accent: "#161a28",
    accentForeground: "#fafafa",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#1d2233",
    input: "#1d2233",
  },

  radius: 20,
};

export default colors;
