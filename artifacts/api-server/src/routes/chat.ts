import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { conversations, chatMessages } from "@workspace/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { routeToAgent, classifyCreationIntent } from "../services/ai/agent-router.js";
import { runPmAgent } from "../services/ai/pm-agent.js";
import { generateGestionale } from "../services/ai/gestionale/orchestrator.js";
import { generateWorkflow } from "../services/ai/workflow/orchestrator.js";
import { generateLanding } from "../services/ai/landing/orchestrator.js";
import { MODELS } from "../services/ai/models.js";
import type { ChatMessage as AiChatMessage } from "../services/ai/model-adapter.js";
import { logger } from "../lib/logger.js";
import { requireAuth } from "../middlewares/auth.js";

const SendMessageBody = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().trim().min(1),
  // Set when the chat happens inside a CreationRoom — enables the Architect handoff.
  projectId: z.string().uuid().optional(),
  projectType: z.enum(["gestionale", "landing", "workflow", "video_ideas"]).optional(),
});

const router: IRouter = Router();

// POST /chat — SSE streaming chat with PM Agent
router.post("/chat", requireAuth, async (req: Request, res: Response) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { message, projectId, projectType } = parsed.data;
  let { conversationId } = parsed.data;

  try {
    // Create conversation if needed
    if (!conversationId) {
      const [conv] = await db
        .insert(conversations)
        .values({
          orgId: req.user!.orgId,
          userId: req.user!.id,
          title: message.slice(0, 100),
          ...(projectId ? { projectId } : {}),
        })
        .returning();
      conversationId = conv!.id;
    }

    // Save user message
    await db.insert(chatMessages).values({
      conversationId,
      role: "user",
      content: message,
    });

    // Load conversation history (last 20 messages)
    const history = await db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(20);

    const conversationHistory: AiChatMessage[] = history
      .slice(0, -1) // Exclude the message we just inserted
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Handle client disconnect
    const abortController = new AbortController();
    req.on("close", () => abortController.abort());

    const agentRole = routeToAgent(conversationHistory, message);

    let fullResponse = "";

    await runPmAgent(
      { conversationHistory, userMessage: message },
      {
        signal: abortController.signal,
        onToken(token) {
          fullResponse += token;
          res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
        },
        async onDone(_fullText, usage) {
          // Save assistant message to DB
          const [saved] = await db
            .insert(chatMessages)
            .values({
              conversationId: conversationId!,
              role: "assistant",
              content: fullResponse,
              agentRole,
              modelUsed: MODELS.pm,
              tokensIn: usage.tokensIn,
              tokensOut: usage.tokensOut,
            })
            .returning();

          res.write(
            `data: ${JSON.stringify({
              type: "done",
              conversationId,
              messageId: saved!.id,
            })}\n\n`,
          );

          // Architect handoff: only inside a CreationRoom, once the user
          // confirms. Generation streams on the same connection.
          if (projectId && (projectType === "gestionale" || projectType === "workflow" || projectType === "landing")) {
            try {
              const intent = await classifyCreationIntent(
                conversationHistory,
                message,
                projectType,
                abortController.signal,
              );
              if (intent.confirmed && intent.brief) {
                res.write(`data: ${JSON.stringify({ type: "generating" })}\n\n`);
                const sig = { signal: abortController.signal };
                if (projectType === "gestionale") {
                  const result = await generateGestionale(projectId, req.user!.orgId, intent.brief, sig);
                  res.write(
                    `data: ${JSON.stringify({
                      type: "gestionale_ready",
                      projectId,
                      schemaId: result.schemaId,
                      version: result.version,
                      def: result.def,
                    })}\n\n`,
                  );
                } else if (projectType === "workflow") {
                  const result = await generateWorkflow(projectId, req.user!.orgId, intent.brief, sig);
                  res.write(
                    `data: ${JSON.stringify({
                      type: "workflow_ready",
                      projectId,
                      workflowId: result.workflowId,
                      def: result.def,
                    })}\n\n`,
                  );
                } else {
                  const result = await generateLanding(projectId, req.user!.orgId, intent.brief, sig);
                  res.write(
                    `data: ${JSON.stringify({
                      type: "landing_ready",
                      projectId,
                      landingId: result.landingId,
                      html: result.html,
                      ideasCount: result.ideasCount,
                    })}\n\n`,
                  );
                }
              }
            } catch (genErr) {
              logger.error({ err: genErr, projectId, projectType }, "Architect handoff failed");
              res.write(
                `data: ${JSON.stringify({
                  type: "generation_error",
                  message: genErr instanceof Error ? genErr.message : "Generation failed",
                })}\n\n`,
              );
            }
          }

          res.end();
        },
        onError(error) {
          logger.error({ err: error }, "PM Agent streaming error");
          res.write(`data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`);
          res.end();
        },
      },
    );
  } catch (err) {
    logger.error({ err }, "Chat endpoint error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Internal server error" })}\n\n`);
      res.end();
    }
  }
});

// GET /chat/conversations — list conversations
router.get("/chat/conversations", requireAuth, async (req: Request, res: Response) => {
  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.orgId, req.user!.orgId))
    .orderBy(desc(conversations.createdAt))
    .limit(50);

  res.json(result);
});

// GET /chat/conversations/:id/messages — get messages for a conversation
router.get("/chat/conversations/:id/messages", requireAuth, async (req: Request, res: Response) => {
  const id = req.params["id"] ? String(req.params["id"]) : "";
  if (!id) {
    res.status(400).json({ error: "Missing conversation ID" });
    return;
  }

  const result = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, id))
    .orderBy(asc(chatMessages.createdAt));

  res.json(result);
});

export default router;
