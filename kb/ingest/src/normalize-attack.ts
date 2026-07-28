import type {
  Analytic,
  AttackPattern,
  CourseOfAction,
  DetectionStrategy,
  MitreTactic,
  Relationship,
  StixBundle,
} from "./stix-types.js";
import type { RawChunk } from "./types.js";

export interface NormalizeAttackOptions {
  framework: "enterprise" | "ics";
  killChainName: string;
}

function isType<T>(objects: unknown[], type: string): T[] {
  return objects.filter((o): o is T => (o as { type?: string }).type === type);
}

function techniqueIdOf(ap: AttackPattern): string | undefined {
  return ap.external_references.find((r) => r.source_name === "mitre-attack")?.external_id;
}

function isLive(o: { revoked?: boolean; x_mitre_deprecated?: boolean }): boolean {
  return !o.revoked && !o.x_mitre_deprecated;
}

export function normalizeAttackBundle(
  bundle: StixBundle,
  { framework, killChainName }: NormalizeAttackOptions,
): RawChunk[] {
  const objects = bundle.objects;

  const attackPatterns = isType<AttackPattern>(objects, "attack-pattern").filter(isLive);
  const coursesOfAction = isType<CourseOfAction>(objects, "course-of-action").filter(isLive);
  const tactics = isType<MitreTactic>(objects, "x-mitre-tactic");
  const detectionStrategies = isType<DetectionStrategy>(objects, "x-mitre-detection-strategy").filter(
    isLive,
  );
  const analytics = isType<Analytic>(objects, "x-mitre-analytic");
  const relationships = isType<Relationship>(objects, "relationship");

  const tacticNameByShortname = new Map(tactics.map((t) => [t.x_mitre_shortname, t.name]));
  const coaById = new Map(coursesOfAction.map((c) => [c.id, c]));
  const detectionStrategyById = new Map(detectionStrategies.map((d) => [d.id, d]));
  const analyticById = new Map(analytics.map((a) => [a.id, a]));

  const mitigatesByTarget = new Map<string, Relationship[]>();
  const detectsByTarget = new Map<string, Relationship[]>();
  const usesByTarget = new Map<string, Relationship[]>();
  for (const rel of relationships) {
    if (rel.relationship_type === "mitigates") {
      const list = mitigatesByTarget.get(rel.target_ref) ?? [];
      list.push(rel);
      mitigatesByTarget.set(rel.target_ref, list);
    } else if (rel.relationship_type === "detects") {
      const list = detectsByTarget.get(rel.target_ref) ?? [];
      list.push(rel);
      detectsByTarget.set(rel.target_ref, list);
    } else if (rel.relationship_type === "uses" && rel.description) {
      const list = usesByTarget.get(rel.target_ref) ?? [];
      list.push(rel);
      usesByTarget.set(rel.target_ref, list);
    }
  }

  const chunks: RawChunk[] = [];

  for (const ap of attackPatterns) {
    const techniqueId = techniqueIdOf(ap);
    if (!techniqueId) continue;

    const tacticNames = (ap.kill_chain_phases ?? [])
      .filter((p) => p.kill_chain_name === killChainName)
      .map((p) => tacticNameByShortname.get(p.phase_name) ?? p.phase_name);
    const primaryTactic = tacticNames[0] ?? "unknown";

    for (const tactic of tacticNames.length > 0 ? tacticNames : [primaryTactic]) {
      chunks.push({
        techniqueId,
        framework,
        name: ap.name,
        tactic,
        chunkType: "description",
        chunkText: ap.description,
      });
    }

    for (const rel of detectsByTarget.get(ap.id) ?? []) {
      const strategy = detectionStrategyById.get(rel.source_ref);
      if (!strategy) continue;
      const analyticTexts = strategy.x_mitre_analytic_refs
        .map((ref) => analyticById.get(ref)?.description)
        .filter((d): d is string => !!d);
      if (analyticTexts.length === 0) continue;
      chunks.push({
        techniqueId,
        framework,
        name: ap.name,
        tactic: primaryTactic,
        chunkType: "detection",
        chunkText: analyticTexts.join("\n\n"),
      });
    }

    for (const rel of mitigatesByTarget.get(ap.id) ?? []) {
      const coa = coaById.get(rel.source_ref);
      if (!coa) continue;
      chunks.push({
        techniqueId,
        framework,
        name: ap.name,
        tactic: primaryTactic,
        chunkType: "mitigation",
        chunkText: rel.description?.trim() || coa.description,
      });
    }

    for (const rel of usesByTarget.get(ap.id) ?? []) {
      chunks.push({
        techniqueId,
        framework,
        name: ap.name,
        tactic: primaryTactic,
        chunkType: "example",
        chunkText: rel.description!,
      });
    }
  }

  return chunks;
}
