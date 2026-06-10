# GiassAi

GiassAi is a premium, frontend-only React + Vite prototype: an AI ecosystem (Italian UI) that lets non-technical entrepreneurs generate Gestionali (CRM/ERP), Landing & Funnel pages, and Workflow automations from a single control room. It uses fake data — there is no backend behind the prototype UI.

## Run & Operate

- `pnpm --filter @workspace/aiagency-os run dev` — run the GiassAi web app (binds to `PORT`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (scaffold, not used by the prototype)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Per-artifact typecheck: `cd artifacts/aiagency-os && npx tsc --noEmit`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web app: React + Vite, Tailwind v4, framer-motion, lucide-react, recharts
- API: Express 5 (scaffold), PostgreSQL + Drizzle (scaffold) — not wired into the prototype

## Where things live

- GiassAi web app: `artifacts/aiagency-os/`
  - `src/App.tsx` — holds the active sidebar section + Creation Room state (client-side navigation, no router)
  - `src/components/ThemeProvider.tsx` — light/dark mode + customizable accent, persisted to localStorage (`theme-mode`, `theme-accent`)
  - `src/components/DashboardShell.tsx`, `Sidebar.tsx` — app chrome (presentational, controlled by App)
  - `src/pages/` — ControlRoom, Gestionali, Funnel, Workflow, Impostazioni, CreationRoom
  - `src/index.css` — theme tokens: `:root` = light palette, `.dark` = dark palette; accent overrides `--primary`/`--ring` as HSL channels
- API scaffold: `artifacts/api-server/`
- Canvas / mockup sandbox: `artifacts/mockup-sandbox/`

## Architecture decisions

- Theme: CSS variables split into `:root` (light) and `.dark` (dark). The accent color is applied by ThemeProvider as inline `--primary`/`--ring` HSL channels on `:root`, so it composes with both modes. Use `hsl(var(--primary)/<alpha>)` for tinted shadows.
- Navigation is client-side React state (no router) — App owns the active section and whether the Creation Room overlay is open.
- CreationRoom is type-aware: `gestionale` builds an animated table, `landing` builds page blocks, `workflow` builds nodes. It opens with a proactive "Recap Attivo" + visible "Sì, procedi" (`btn-conferma`) confirm button; `btn-collega` triggers the project-linking bridge animation.

## Product

- Control Room with 4 KPIs (Lead Generati Oggi, Fatturato Tracciato, Automazioni Attive, Conversion Rate), pillar-badged project cards, and a floating GiassAi Command Bar.
- Sections: Control Room, I Miei Gestionali, Landing & Funnel, Workflow, Impostazioni.
- Creation Room split-screen with chat (AI agent badges) + live type-aware preview build.
- Light/dark themes with a customizable accent color, switchable in Impostazioni and via a topbar quick toggle.

## User preferences

- UI language is Italian.
- Brand name is "GiassAi" (used literally as the user wrote it; may be a stylization of "GlassAi" given the glassmorphism theme — confirm before changing).
- This is a fake-data prototype: no real backend, database persistence (beyond localStorage theme), or real AI calls.

## Gotchas

- The web app reads `PORT` from the environment (Vite config) — do not hardcode a port.
- Tailwind v4: in arbitrary values, no spaces are allowed, so use `shadow-[0_4px_20px_hsl(var(--primary)/30%)]` (not spaced) for accent-tinted shadows.
- `src/index.css` font `@import` must remain the first line.
- Clear all `setTimeout`/`setInterval` on unmount (CreationRoom stores timer IDs in a ref and clears them).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `artifacts` skill for how artifacts/workflows are registered
