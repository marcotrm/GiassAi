import type { BusinessProfile } from "@workspace/api-zod";
import { researchWithWebSearch } from "../model-adapter.js";

// Quick competitor scan via web_search. Best-effort: returns "" if unavailable.
export async function researchCompetitors(
  profile: BusinessProfile,
  signal?: AbortSignal,
): Promise<{ insights: string; usage: { tokensIn: number; tokensOut: number } }> {
  const where = profile.location ? `a ${profile.location}` : "in Italia";
  const query = `Fai una ricerca veloce sui principali competitor nel settore "${profile.sector}" ${where}. In 4-5 punti sintetici elenca: cosa offrono di solito, le leve/prezzi tipici, e 2 angoli di differenziazione concreti che "${profile.businessName}" potrebbe usare per distinguersi. Rispondi solo con i punti, in italiano.`;

  // Cap the research so a slow/hanging web_search never blocks the build.
  const empty = { insights: "", usage: { tokensIn: 0, tokensOut: 0 } };
  const timeout = new Promise<typeof empty>((resolve) => setTimeout(() => resolve(empty), 25000));
  return Promise.race([researchWithWebSearch(query, signal), timeout]);
}
