import type { ChatMessage } from "./model-adapter.js";

export type AgentRole = "pm" | "architect" | "executor";

export function routeToAgent(
  _conversationHistory: ChatMessage[],
  _userMessage: string,
): AgentRole {
  // Phase 1: Always route to PM Agent.
  // Phase 2 will add intent classification to route to Architect
  // when the user confirms project creation.
  return "pm";
}
