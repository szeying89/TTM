import { parse } from "yaml";
import type { AtlasDocument, AtlasTechnique } from "./atlas-types.js";
import type { RawChunk } from "./types.js";

function resolveTacticIds(technique: AtlasTechnique, byId: Map<string, AtlasTechnique>): string[] {
  if (technique.tactics && technique.tactics.length > 0) return technique.tactics;
  if (technique.specializes) {
    const parent = byId.get(technique.specializes);
    if (parent) return resolveTacticIds(parent, byId);
  }
  return [];
}

export function normalizeAtlasYaml(yamlText: string): RawChunk[] {
  const doc = parse(yamlText) as AtlasDocument;
  const chunks: RawChunk[] = [];

  for (const matrix of doc.matrices) {
    const tacticNameById = new Map(matrix.tactics.map((t) => [t.id, t.name]));
    const techniqueById = new Map(matrix.techniques.map((t) => [t.id, t]));

    for (const technique of matrix.techniques) {
      const tacticIds = resolveTacticIds(technique, techniqueById);
      const tacticNames = tacticIds.map((id) => tacticNameById.get(id) ?? id);

      for (const tactic of tacticNames.length > 0 ? tacticNames : ["unknown"]) {
        chunks.push({
          techniqueId: technique.id,
          framework: "atlas",
          name: technique.name,
          tactic,
          chunkType: "description",
          chunkText: technique.description,
        });
      }
    }
  }

  for (const caseStudy of doc["case-studies"] ?? []) {
    for (const step of caseStudy.procedure ?? []) {
      const matrix = doc.matrices[0];
      const tacticName = matrix?.tactics.find((t) => t.id === step.tactic)?.name ?? step.tactic;
      chunks.push({
        techniqueId: step.technique,
        framework: "atlas",
        name: caseStudy.name,
        tactic: tacticName,
        chunkType: "example",
        chunkText: `${caseStudy.name}: ${step.description}`,
      });
    }
  }

  return chunks;
}
