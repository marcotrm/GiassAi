import { z } from "zod";

// ============================================================================
// Landing master contracts. Analysis (BusinessProfile) → Architect (LandingDef
// structure + forms + theme) → Copywriter fills section content → deterministic
// renderer produces HTML. Plus 10 social VideoIdea.
// ============================================================================

export const BusinessProfile = z.object({
  businessName: z.string(),
  sector: z.string(),
  location: z.string().optional(),
  usp: z.array(z.string()).default([]),
  targetAudience: z.string().default(""),
  tone: z.string().default(""),
  competitors: z
    .array(z.object({ name: z.string(), strength: z.string(), gap: z.string() }))
    .default([]),
  visualDna: z.object({
    primaryColor: z.string().default("#2563eb"),
    secondaryColor: z.string().default("#1e293b"),
    accentColor: z.string().default("#f59e0b"),
    headingFont: z.string().default("Inter"),
    bodyFont: z.string().default("Inter"),
    mood: z.string().default(""),
  }),
});
export type BusinessProfile = z.infer<typeof BusinessProfile>;

export const LandingSectionType = z.enum([
  "hero", "features", "benefits", "testimonials", "pricing", "faq",
  "gallery", "about", "contact_form", "cta", "stats", "logos",
]);
export type LandingSectionType = z.infer<typeof LandingSectionType>;

export const LandingSection = z.object({
  id: z.string(),
  type: LandingSectionType,
  order: z.number().int(),
  content: z.record(z.unknown()).default({}), // filled by the copywriter (Sonnet)
});
export type LandingSection = z.infer<typeof LandingSection>;

export const LandingFormField = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["text", "email", "phone", "textarea", "select"]),
  required: z.boolean().default(false),
});

export const LandingFormDef = z.object({
  formId: z.string(),
  fields: z.array(LandingFormField).min(1),
  submitLabel: z.string().default("Invia"),
  destination: z
    .object({
      kind: z.enum(["workflow", "gestionale"]),
      targetProjectId: z.string().uuid(),
    })
    .optional(),
});
export type LandingFormDef = z.infer<typeof LandingFormDef>;

export const LandingTheme = z.object({
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  headingFont: z.string(),
  bodyFont: z.string(),
});
export type LandingTheme = z.infer<typeof LandingTheme>;

export const LandingDef = z.object({
  template: z.string().default("modern"),
  theme: LandingTheme,
  sections: z.array(LandingSection).min(1),
  forms: z.array(LandingFormDef).default([]),
});
export type LandingDef = z.infer<typeof LandingDef>;

export const VideoIdea = z.object({
  title: z.string(),
  hook: z.string(),
  script: z.string(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  caption: z.string().optional(),
  platform: z.string().default("instagram"),
  format: z.string().optional(),
  category: z.string().default("educational"),
});
export type VideoIdea = z.infer<typeof VideoIdea>;

/** Section ids/order/form references must be coherent. */
export function checkLandingInvariants(def: LandingDef): string[] {
  const errors: string[] = [];
  const ids = new Set(def.sections.map((s) => s.id));
  if (ids.size !== def.sections.length) errors.push("Duplicate section ids.");

  const hasForm = def.sections.some((s) => s.type === "contact_form");
  if (hasForm && def.forms.length === 0) {
    errors.push("A contact_form section exists but no form is defined.");
  }
  return errors;
}
