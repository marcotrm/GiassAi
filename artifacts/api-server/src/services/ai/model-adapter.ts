import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { logger } from "../../lib/logger.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string, usage: { tokensIn: number; tokensOut: number }) => void;
  onError: (error: Error) => void;
}

interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export async function streamChat(
  model: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: StreamOptions,
): Promise<void> {
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 1024;

  try {
    if (model.startsWith("claude-")) {
      await streamAnthropic(model, messages, callbacks, temperature, maxTokens, options?.signal);
    } else if (model.startsWith("gpt-")) {
      await streamOpenAI(model, messages, callbacks, temperature, maxTokens, options?.signal);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

async function streamAnthropic(
  model: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  temperature: number,
  maxTokens: number,
  signal?: AbortSignal,
): Promise<void> {
  const client = getAnthropicClient();

  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let fullText = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemMsg?.content,
    messages: nonSystemMsgs,
  });

  if (signal) {
    signal.addEventListener("abort", () => stream.abort(), { once: true });
  }

  for await (const event of stream) {
    if (signal?.aborted) return;

    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
      callbacks.onToken(event.delta.text);
    } else if (event.type === "message_delta" && event.usage) {
      tokensOut = event.usage.output_tokens;
    } else if (event.type === "message_start" && event.message.usage) {
      tokensIn = event.message.usage.input_tokens;
    }
  }

  const finalMessage = await stream.finalMessage();
  tokensIn = finalMessage.usage.input_tokens;
  tokensOut = finalMessage.usage.output_tokens;

  callbacks.onDone(fullText, { tokensIn, tokensOut });
}

// ============================================================================
// Non-streaming structured output (tool-use). Used by Architect/subagents to
// return validated JSON instead of free text. Anthropic only.
// ============================================================================

export interface JsonTool {
  name: string;
  description: string;
  /** JSON Schema for the tool input. Guides the model; Zod is the real gate. */
  inputSchema: Record<string, unknown>;
}

export interface CompleteJsonOptions {
  model: string;
  system: string;
  messages: ChatMessage[];
  tool: JsonTool;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface CompleteJsonResult {
  data: unknown;
  usage: { tokensIn: number; tokensOut: number };
}

/**
 * Forces the model to call `tool` and returns its raw input object.
 * The caller is responsible for validating `data` with the authoritative Zod schema.
 */
// Opus 4.8 / 4.7 and Fable 5 removed sampling params — sending temperature 400s.
const NO_SAMPLING_PARAMS = new Set(["claude-opus-4-8", "claude-opus-4-7", "claude-fable-5"]);

export async function completeJson(opts: CompleteJsonOptions): Promise<CompleteJsonResult> {
  const client = getAnthropicClient();

  const nonSystemMsgs = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await client.messages.create(
    {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 8192,
      ...(NO_SAMPLING_PARAMS.has(opts.model) ? {} : { temperature: opts.temperature ?? 0.2 }),
      system: opts.system,
      messages: nonSystemMsgs,
      tools: [
        {
          name: opts.tool.name,
          description: opts.tool.description,
          input_schema: opts.tool.inputSchema as never,
        },
      ],
      tool_choice: { type: "tool", name: opts.tool.name },
    },
    opts.signal ? { signal: opts.signal } : undefined,
  );

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`Model did not return a tool_use block for "${opts.tool.name}"`);
  }

  return {
    data: toolUse.input,
    usage: {
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
    },
  };
}

// ============================================================================
// Non-streaming-API but streamed-collection text completion. Used to generate
// long HTML (landing pages) — streaming avoids HTTP timeouts on large outputs.
// ============================================================================

export interface CompleteTextOptions {
  model: string;
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export async function completeText(opts: CompleteTextOptions): Promise<{
  text: string;
  usage: { tokensIn: number; tokensOut: number };
}> {
  const client = getAnthropicClient();
  const nonSystemMsgs = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const stream = client.messages.stream({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 8192,
    ...(NO_SAMPLING_PARAMS.has(opts.model) ? {} : { temperature: opts.temperature ?? 0.5 }),
    system: opts.system,
    messages: nonSystemMsgs,
  });
  if (opts.signal) opts.signal.addEventListener("abort", () => stream.abort(), { once: true });

  const final = await stream.finalMessage();
  const text = final.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("");
  return { text, usage: { tokensIn: final.usage.input_tokens, tokensOut: final.usage.output_tokens } };
}

// Best-effort competitor research via Anthropic's server-side web_search tool.
// Returns a short insights string; on any failure returns "" (non-blocking).
export async function researchWithWebSearch(
  query: string,
  signal?: AbortSignal,
): Promise<{ insights: string; usage: { tokensIn: number; tokensOut: number } }> {
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create(
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: query }],
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 } as never],
      },
      signal ? { signal } : undefined,
    );
    const text = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return { insights: text, usage: { tokensIn: response.usage.input_tokens, tokensOut: response.usage.output_tokens } };
  } catch (err) {
    logger.warn({ err }, "web_search competitor research failed (non-blocking)");
    return { insights: "", usage: { tokensIn: 0, tokensOut: 0 } };
  }
}

async function streamOpenAI(
  model: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  temperature: number,
  maxTokens: number,
  signal?: AbortSignal,
): Promise<void> {
  const client = getOpenAIClient();

  let fullText = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const stream = await client.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  });

  for await (const chunk of stream) {
    if (signal?.aborted) return;

    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      callbacks.onToken(delta);
    }

    if (chunk.usage) {
      tokensIn = chunk.usage.prompt_tokens;
      tokensOut = chunk.usage.completion_tokens;
    }
  }

  callbacks.onDone(fullText, { tokensIn, tokensOut });
}
