import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { AttackPath, MitreFramework } from "@intel-threat-modeller/contracts";
import type { Db } from "../../db/client.js";
import { techniqueChunks } from "../../db/schema/technique-chunks.js";
import type { LoadedSystemModel } from "./read-system-model.js";
import { computeGroupKey } from "./group-key.js";

const ENCRYPTED_PROTOCOL_RE = /https|tls|ssl|ssh|wss|ipsec|mtls/i;

async function groundingRefsForTechnique(db: Db, framework: MitreFramework, techniqueId: string) {
  const rows = await db
    .select({ id: techniqueChunks.id })
    .from(techniqueChunks)
    .where(eq(techniqueChunks.techniqueId, techniqueId));
  return rows.map((r) => ({ techniqueId, framework, chunkId: r.id, retrievalScore: 1 }));
}

interface RuleContext {
  db: Db;
  framework: MitreFramework;
  systemModel: LoadedSystemModel;
}

type Rule = (ctx: RuleContext) => Promise<AttackPath[]>;

// Rule 1: a dataflow crossing a trust boundary without an encrypted protocol
// is exposed to interception/modification in transit.
const unencryptedBoundaryCrossing: Rule = async ({ db, framework, systemModel }) => {
  const techniqueId = framework === "ics" ? "T0830" : "T1557";
  const groundingRefs = await groundingRefsForTechnique(db, framework, techniqueId);
  if (groundingRefs.length === 0) return [];

  const results: AttackPath[] = [];
  for (const df of systemModel.dataflows) {
    if (df.crossesTrustBoundaryIds.length === 0) continue;
    if (df.protocol && ENCRYPTED_PROTOCOL_RE.test(df.protocol)) continue;

    const entities = [
      { componentId: df.sourceComponentId, role: "source" },
      { componentId: df.targetComponentId, role: "target" },
    ];
    results.push({
      id: randomUUID(),
      name: `Unencrypted trust-boundary crossing: ${df.name}`,
      sourcePass: "rule-pack",
      strideCategories: ["tampering", "information-disclosure"],
      entities,
      killChainStages: [],
      groupKey: computeGroupKey(entities.map((e) => e.componentId), techniqueId),
      groundingRefs,
      applicability: "applicable",
    });
  }
  return results;
};

// Rule 2: a datastore reachable directly from an actor/external_entity with
// no intermediary process implies no access-control choke point.
const directExternalToDatastore: Rule = async ({ db, framework, systemModel }) => {
  const techniqueId = "T1078";
  const groundingRefs = await groundingRefsForTechnique(db, framework, techniqueId);
  if (groundingRefs.length === 0) return [];

  const componentById = new Map(systemModel.components.map((c) => [c.id, c]));
  const results: AttackPath[] = [];
  for (const df of systemModel.dataflows) {
    const source = componentById.get(df.sourceComponentId);
    const target = componentById.get(df.targetComponentId);
    if (!source || !target) continue;
    if ((source.type !== "actor" && source.type !== "external_entity") || target.type !== "datastore") continue;

    const entities = [
      { componentId: source.id, role: "source" },
      { componentId: target.id, role: "target" },
    ];
    results.push({
      id: randomUUID(),
      name: `Direct external access to datastore: ${target.name}`,
      sourcePass: "rule-pack",
      strideCategories: ["spoofing", "information-disclosure"],
      entities,
      killChainStages: [],
      groupKey: computeGroupKey(entities.map((e) => e.componentId), techniqueId),
      groundingRefs,
      applicability: "applicable",
    });
  }
  return results;
};

// Rule 3: an actor/external_entity reaching a process directly implies an
// unauthenticated ingress path unless the design says otherwise.
const unauthenticatedExternalIngress: Rule = async ({ db, framework, systemModel }) => {
  const techniqueId = framework === "ics" ? "T0883" : "T1190";
  const groundingRefs = await groundingRefsForTechnique(db, framework, techniqueId);
  if (groundingRefs.length === 0) return [];

  const componentById = new Map(systemModel.components.map((c) => [c.id, c]));
  const results: AttackPath[] = [];
  for (const df of systemModel.dataflows) {
    const source = componentById.get(df.sourceComponentId);
    const target = componentById.get(df.targetComponentId);
    if (!source || !target) continue;
    if ((source.type !== "actor" && source.type !== "external_entity") || target.type !== "process") continue;

    const entities = [
      { componentId: source.id, role: "source" },
      { componentId: target.id, role: "target" },
    ];
    results.push({
      id: randomUUID(),
      name: `Unauthenticated external ingress: ${target.name}`,
      sourcePass: "rule-pack",
      strideCategories: ["spoofing", "elevation-of-privilege"],
      entities,
      killChainStages: [],
      groupKey: computeGroupKey(entities.map((e) => e.componentId), techniqueId),
      groundingRefs,
      applicability: "applicable",
    });
  }
  return results;
};

const RULES: Rule[] = [unencryptedBoundaryCrossing, directExternalToDatastore, unauthenticatedExternalIngress];

export async function runRulePack(ctx: RuleContext): Promise<AttackPath[]> {
  const results = await Promise.all(RULES.map((rule) => rule(ctx)));
  return results.flat();
}
