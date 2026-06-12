import { Feather } from "@expo/vector-icons";

export type FeatherName = keyof typeof Feather.glyphMap;
export type CreationType = "gestionale" | "landing" | "workflow";
export type Tone = "blue" | "emerald" | "amber" | "rose";

export interface Kpi {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
  icon: FeatherName;
  tone: Tone;
}

export const KPIS: Kpi[] = [
  { label: "Lead Generati Oggi", value: "142", trend: "+18%", positive: true, icon: "users", tone: "blue" },
  { label: "Fatturato Tracciato", value: "24.800 €", trend: "+7%", positive: true, icon: "dollar-sign", tone: "emerald" },
  { label: "Automazioni Attive", value: "12", trend: "+2", positive: true, icon: "zap", tone: "amber" },
  { label: "Conversion Rate", value: "8.3%", trend: "-1.2%", positive: false, icon: "target", tone: "rose" },
];

export interface Project {
  title: string;
  desc: string;
  agents: number;
  progress: number;
  type: CreationType;
}

export const PROJECTS: Project[] = [
  { title: "CRM Clienti VIP", desc: "Gestione clienti premium con storico", agents: 3, progress: 72, type: "gestionale" },
  { title: "Funnel Lancio Giugno", desc: "Campagna acquisizione Q2", agents: 5, progress: 45, type: "landing" },
  { title: "Sincronizzazione Stripe-CRM", desc: "Aggiornamento pagamenti in tempo reale", agents: 2, progress: 89, type: "workflow" },
  { title: "Dashboard KPI Vendite", desc: "Reportistica mensile", agents: 1, progress: 30, type: "gestionale" },
  { title: "Landing Page Evento", desc: "Registrazione evento offline", agents: 4, progress: 61, type: "landing" },
];

export interface Gestionale {
  title: string;
  records: string;
  updated: string;
  agents: number;
}

export const GESTIONALI: Gestionale[] = [
  { title: "CRM Clienti VIP", records: "1.245", updated: "2 ore fa", agents: 3 },
  { title: "Gestione Inventario", records: "8.930", updated: "1 giorno fa", agents: 2 },
  { title: "Fatturazione & Spese", records: "452", updated: "3 ore fa", agents: 4 },
  { title: "Directory Fornitori", records: "89", updated: "5 giorni fa", agents: 1 },
];

export interface FunnelItem {
  title: string;
  visite: string;
  lead: string;
  conv: string;
}

export const FUNNELS: FunnelItem[] = [
  { title: "Funnel Lancio Giugno", visite: "12.5k", lead: "1.240", conv: "9.8%" },
  { title: "Webinar Masterclass", visite: "5.2k", lead: "850", conv: "16.3%" },
  { title: "Landing Page E-book", visite: "8.9k", lead: "2.100", conv: "23.5%" },
  { title: "Consulenza Gratuita", visite: "3.4k", lead: "120", conv: "3.5%" },
];

export interface WorkflowItem {
  title: string;
  nodes: number;
  runs: string;
  active: boolean;
}

export const WORKFLOWS: WorkflowItem[] = [
  { title: "Sincronizzazione Stripe-CRM", nodes: 5, runs: "1.245", active: true },
  { title: "Nurturing Email Nuovi Lead", nodes: 12, runs: "8.930", active: true },
  { title: "Alert Slack Vendite High-Ticket", nodes: 3, runs: "42", active: true },
  { title: "Onboarding Nuovo Cliente", nodes: 8, runs: "15", active: false },
];

export const TYPE_LABEL: Record<CreationType, string> = {
  gestionale: "Gestionale",
  landing: "Landing & Funnel",
  workflow: "Workflow",
};

export const RECAP_TEXT: Record<CreationType, string> = {
  gestionale: "Quindi, ricapitolando: vorresti aggiungere una colonna per le scadenze dei pagamenti e inviare un WhatsApp in automatico. È corretto?",
  landing: "Quindi, ricapitolando: vorresti creare una Hero section accattivante e un form di contatto per la raccolta lead. Procedo?",
  workflow: "Quindi, ricapitolando: vorresti collegare un trigger Stripe a una condizione di pagamento e inviare una mail. Confermi?",
};

export const CREATION_TYPES: { key: CreationType; label: string; desc: string; icon: FeatherName }[] = [
  { key: "gestionale", label: "Gestionale", desc: "CRM, ERP e database", icon: "database" },
  { key: "landing", label: "Landing & Funnel", desc: "Pagine e acquisizione", icon: "mouse-pointer" },
  { key: "workflow", label: "Workflow", desc: "Automazioni e sync", icon: "git-merge" },
];

export const TYPE_ICON: Record<CreationType, FeatherName> = {
  gestionale: "database",
  landing: "mouse-pointer",
  workflow: "git-merge",
};

export const CREATION_ROWS = [
  { name: "Marco Rossi", stato: "Pagato" },
  { name: "Giulia Bianchi", stato: "In attesa" },
  { name: "Alessandro Verdi", stato: "Pagato" },
  { name: "Laura Neri", stato: "Scaduto" },
];
