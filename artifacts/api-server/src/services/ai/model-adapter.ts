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
