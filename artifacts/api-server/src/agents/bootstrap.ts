import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { Db } from "../db/client.js";
import { registerAgent } from "./registry.js";
import { createArchitectAgentDescriptor } from "./architect/index.js";

export interface AgentBootstrapDeps {
  db: Db;
  llmClient: LLMClient;
}

export function registerAllAgents(deps: AgentBootstrapDeps): void {
  registerAgent(createArchitectAgentDescriptor(deps));
  // Threat, Risk, Mitigation, Design-Enrich, Validation, and Reporting agents
  // register here as their phases land.
}
