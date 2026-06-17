// Centralized Claude model IDs. The architecture docs originally referenced
// placeholder/old IDs (e.g. claude-opus-4-20250514) — these are the real ones.

export const MODELS = {
  /** Conversational interface, intent detection, summaries. High volume, low cost. */
  pm: "claude-haiku-4-5-20251001",
  /** Critical reasoning: schema/workflow/landing structure. Called once per creation. */
  architect: "claude-opus-4-8",
  /** Heavy creative volume: landing HTML + copy. */
  builder: "claude-sonnet-4-6",
  /** Background task execution, per-table fan-out, workflow ai_tasks. */
  executor: "claude-haiku-4-5-20251001",
} as const;

export type ModelRole = keyof typeof MODELS;

// USD pricing per 1M tokens (input / output). Current Anthropic list prices.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
};

/** Estimated cost in USD for a single model call. Returns a string for NUMERIC storage. */
export function computeCostUsd(model: string, tokensIn: number, tokensOut: number): string {
  const p = PRICING[model] ?? { in: 0, out: 0 };
  const cost = (tokensIn * p.in + tokensOut * p.out) / 1_000_000;
  return cost.toFixed(6);
}
