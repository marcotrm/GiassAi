import { db } from "@workspace/db";
import { crmContacts } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { getFirstStageId } from "./stages.js";
import { logger } from "../../lib/logger.js";

/** Pull the first matching field (case-insensitive) from a form payload. */
function pickField(payload: Record<string, unknown>, keys: string[]): string | null {
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) lower[k.toLowerCase()] = v;
  for (const key of keys) {
    const v = lower[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return null;
}

/**
 * Create a CRM contact in a project's first stage from a landing form submission.
 * Idempotent-ish: skips if a contact with the same email or phone already exists.
 * Returns the new contact id, or null if skipped.
 */
export async function createLandingContact(
  projectId: string,
  payload: Record<string, unknown>,
): Promise<string | null> {
  // No pipeline columns → this workflow isn't a CRM; don't create orphan contacts.
  const stageId = await getFirstStageId(projectId);
  if (!stageId) return null;

  const name = pickField(payload, ["name", "nome", "fullname", "full_name", "nominativo"]);
  const email = pickField(payload, ["email", "mail", "e-mail"]);
  const phone = pickField(payload, ["phone", "telefono", "tel", "cellulare", "cell", "numero"]);

  // De-dup within the project by email or phone.
  if (email) {
    const [dup] = await db
      .select({ id: crmContacts.id })
      .from(crmContacts)
      .where(and(eq(crmContacts.projectId, projectId), eq(crmContacts.email, email)))
      .limit(1);
    if (dup) return null;
  } else if (phone) {
    const [dup] = await db
      .select({ id: crmContacts.id })
      .from(crmContacts)
      .where(and(eq(crmContacts.projectId, projectId), eq(crmContacts.phone, phone)))
      .limit(1);
    if (dup) return null;
  }

  const [created] = await db
    .insert(crmContacts)
    .values({
      projectId,
      stageId,
      name,
      email,
      phone,
      source: "landing",
      fields: payload,
    })
    .returning({ id: crmContacts.id });

  logger.info({ projectId, contactId: created?.id }, "CRM contact created from landing form");
  return created?.id ?? null;
}
