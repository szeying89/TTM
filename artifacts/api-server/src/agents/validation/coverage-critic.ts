import { eq } from "drizzle-orm";
import type { MitreFramework } from "@intel-threat-modeller/contracts";
import type { Db } from "../../db/client.js";
import { techniqueChunks } from "../../db/schema/technique-chunks.js";
import type { ValidationAttackPath } from "./types.js";

export interface CoverageCriticResult {
  framework: MitreFramework;
  techniquesCovered: string[];
  techniquesUnaddressed: string[];
  coveragePercent: number;
}

export async function computeCoverageCritic(
  db: Db,
  framework: MitreFramework,
  attackPaths: ValidationAttackPath[],
): Promise<CoverageCriticResult> {
  const inScopeRows = await db
    .selectDistinct({ techniqueId: techniqueChunks.techniqueId })
    .from(techniqueChunks)
    .where(eq(techniqueChunks.framework, framework));
  const inScope = new Set(inScopeRows.map((r) => r.techniqueId));

  // "Addressed" means the pipeline formed an explicit judgment about the
  // technique - applicable or not-applicable both count; only techniques
  // never surfaced by any pass at all count as unaddressed.
  const addressed = new Set(attackPaths.flatMap((p) => p.groundingRefs.map((r) => r.techniqueId)));

  const techniquesCovered = Array.from(inScope).filter((t) => addressed.has(t));
  const techniquesUnaddressed = Array.from(inScope).filter((t) => !addressed.has(t));
  const coveragePercent = inScope.size === 0 ? 0 : Math.round((techniquesCovered.length / inScope.size) * 10000) / 100;

  return { framework, techniquesCovered, techniquesUnaddressed, coveragePercent };
}
