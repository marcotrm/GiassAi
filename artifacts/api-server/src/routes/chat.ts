import { Router, type IRouter } from "express";
import { z } from "zod";
import OpenAI from "openai";

// ============================================================================
// SYSTEM PROMPT  ——  MODIFICA QUI / EDIT THIS
// ----------------------------------------------------------------------------
// Questo testo viene inviato al modello a ogni richiesta. Sostituiscilo con le
// tue istruzioni per GiassAi.
//
// IMPORTANTE (requisito JSON mode): poiché questo endpoint forza l'output in
// formato JSON (response_format: { type: "json_object" }), il System Prompt
// DEVE indicare esplicitamente al modello di rispondere in JSON, altrimenti
// l'API OpenAI rifiuta la richiesta. Mantieni la parola "JSON" qui sotto.
// ============================================================================
const SYSTEM_PROMPT = `Sei GiassAi, un assistente che aiuta gli utenti a creare gestionali, landing page e workflow di automazione.
Rispondi SEMPRE ed esclusivamente con un oggetto JSON valido che descriva la richiesta dell'utente.`;

const ChatRequest = z.object({
  message: z.string().trim().min(1, "Il campo 'message' è obbligatorio."),
});

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  const parsed = ChatRequest.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Richiesta non valida: 'message' deve essere una stringa non vuota.",
    });
  }

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    return res.status(500).json({
      error:
        "OPENAI_API_KEY non configurata. Aggiungila come Replit Secret per abilitare GiassAi.",
    });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: parsed.data.message },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(502).json({ error: "Risposta vuota da OpenAI." });
    }

    let data: unknown;
    try {
      data = JSON.parse(content);
    } catch {
      return res
        .status(502)
        .json({ error: "OpenAI non ha restituito un JSON valido.", raw: content });
    }

    return res.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Errore sconosciuto nella chiamata a OpenAI.";
    return res.status(502).json({ error: message });
  }
});

export default router;
