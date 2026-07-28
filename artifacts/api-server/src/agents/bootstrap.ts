import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { EmbeddingClient } from "@intel-threat-modeller/embeddings";
import type { Db } from "../db/client.js";
import { registerAgent } from "./registry.js";
import { createArchitectAgentDescriptor } from "./architect/index.js";
import { createThreatAgentDescriptor } from "./threat/index.js";
import { createRiskAgentDescriptor } from "./risk/index.js";
import { createMitigationAgentDescriptor } from "./mitigation/index.js";
import { createDesignEnrichAgentDescriptor } from "./design-enrich/index.js";
import { createValidationAgentDescriptor } from "./validation/index.js";

export interface AgentBootstrapDeps {
  db: Db;
  llmClient: LLMClient;
  embeddingClient: EmbeddingClient;
}

export function registerAllAgents(deps: AgentBootstrapDeps): void {
  registerAgent(createArchitectAgentDescriptor(deps));
  registerAgent(createThreatAgentDescriptor(deps));
  registerAgent(createRiskAgentDescriptor(deps));
  registerAgent(createMitigationAgentDescriptor(deps));
  registerAgent(createDesignEnrichAgentDescriptor(deps));
  registerAgent(createValidationAgentDescriptor(deps));
  // Reporting agent registers here as its phase lands.
}
