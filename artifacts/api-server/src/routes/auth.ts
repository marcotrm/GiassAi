import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const supabaseUrl = process.env["SUPABASE_URL"]!;
const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"]!;

const RegisterBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().optional(),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const router: IRouter = Router();

// POST /auth/register
router.post("/auth/register", async (req: Request, res: Response) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  // Use a per-request client with anon key (user-facing operations)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    logger.warn({ err: error }, "Registration failed");
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json({
    user: { id: data.user?.id, email: data.user?.email },
    session: data.session,
  });
});

// POST /auth/login
router.post("/auth/login", async (req: Request, res: Response) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logger.warn({ err: error }, "Login failed");
    res.status(401).json({ error: error.message });
    return;
  }

  res.json({
    user: { id: data.user.id, email: data.user.email },
    session: data.session,
  });
});

// GET /auth/me — requires authentication
router.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
