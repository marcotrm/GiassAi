import type { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { db } from "@workspace/db";
import { organizations, orgMembers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  orgId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Find or create organization for this user
    let [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerId, user.id))
      .limit(1);

    if (!org) {
      [org] = await db
        .insert(organizations)
        .values({
          name: user.email?.split("@")[0] || "My Organization",
          ownerId: user.id,
        })
        .returning();
    }

    // Ensure an org_members row exists — generated gestionale RLS policies
    // depend on it. Idempotent via the (org_id, user_id) unique constraint.
    await db
      .insert(orgMembers)
      .values({ orgId: org!.id, userId: user.id, role: "owner" })
      .onConflictDoNothing();

    req.user = {
      id: user.id,
      email: user.email || "",
      orgId: org!.id,
    };

    next();
  } catch (err) {
    logger.error({ err }, "Auth middleware error");
    res.status(500).json({ error: "Authentication failed" });
  }
}
