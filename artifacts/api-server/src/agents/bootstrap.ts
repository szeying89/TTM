import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { Db } from "../db/client.js";
import { registerAgent } from "./registry.js";
import { createArchitectAgentDescriptor } from "./architect/index.js";
import { createThreatAgentDescriptor } from "./threat/index.js";
import { createRiskAgentDescriptor } from "./risk/index.js";

export interface AgentBootstrapDeps {
  db: Db;
  llmClient: LLMClient;
  embeddingClient: EmbeddingClient;
}

export function registerAllAgents(deps: AgentBootstrapDeps): void {
  registerAgent(createArchitectAgentDescriptor(deps));
  registerAgent(createThreatAgentDescriptor(deps));
  registerAgent(createRiskAgentDescriptor(deps));
  // Mitigation, Design-Enrich, Validation, and Reporting agents register
  // here as their phases land.
}
