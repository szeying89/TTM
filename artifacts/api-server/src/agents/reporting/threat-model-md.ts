import type { ReportData } from "./gather-report-data.js";
import type { ConfidenceSubScores } from "./scoring-config.js";

export function buildThreatModelMarkdown(data: ReportData, confidence: number, subScores: ConfidenceSubScores): string {
  const riskByAttackPathId = new Map(data.riskScores.map((r) => [r.attackPathId, r]));
  const sortedAttackPaths = [...data.attackPaths].sort(
    (a, b) => (riskByAttackPathId.get(a.id)?.rank ?? 999) - (riskByAttackPathId.get(b.id)?.rank ?? 999),
  );

  const lines: string[] = [];
  lines.push(`# Threat Model: ${data.project.name}`);
  lines.push("");
  lines.push(`**Confidence score:** ${confidence}/100`);
  lines.push(
    `(validation pass rate ${(subScores.validationPassRate * 100).toFixed(0)}%, coverage ${(subScores.coverageScore * 100).toFixed(0)}%, grounding ${(subScores.groundingScore * 100).toFixed(0)}%, pivot-node resolution ${(subScores.pivotNodeResolutionScore * 100).toFixed(0)}%)`,
  );
  lines.push("");

  lines.push("## Q1: What are we working on?");
  lines.push("");
  lines.push(`${data.systemModel.components.length} components, ${data.systemModel.dataflows.length} dataflows, ${data.systemModel.trustBoundaries.length} trust boundaries.`);
  lines.push("");
  for (const c of data.systemModel.components) {
    lines.push(`- **${c.name}** (${c.type}): ${c.description}`);
  }
  lines.push("");

  lines.push("## Q2: What can go wrong?");
  lines.push("");
  lines.push("| Rank | Attack Path | STRIDE | Score | Technique(s) | Applicability |");
  lines.push("|---|---|---|---|---|---|");
  for (const path of sortedAttackPaths) {
    const risk = riskByAttackPathId.get(path.id);
    const techniques = path.groundingRefs.map((r) => r.techniqueId).join(", ");
    lines.push(
      `| ${risk?.rank ?? "-"} | ${path.name} | ${path.strideCategories.join(", ")} | ${risk?.score ?? "-"} | ${techniques} | ${path.applicability} |`,
    );
  }
  lines.push("");

  const notApplicable = data.attackPaths.filter((p) => p.applicability === "not-applicable");
  if (notApplicable.length > 0) {
    lines.push("### Not-applicable determinations");
    lines.push("");
    for (const path of notApplicable) {
      lines.push(`- **${path.name}**: ${path.notApplicableRationale}`);
    }
    lines.push("");
  }

  lines.push("## Q3: What are we going to do about it?");
  lines.push("");
  for (const m of data.mitigations) {
    lines.push(`- **${m.title}** (${m.controlFamily}, priority: ${m.priority}): ${m.description}`);
  }
  lines.push("");

  if (data.assumptions.length > 0) {
    lines.push("### Assumptions");
    lines.push("");
    for (const a of data.assumptions) lines.push(`- ${a.statement} (${a.source})`);
    lines.push("");
  }

  if (data.designDeltas.length > 0) {
    lines.push("### Suggested design refinements");
    lines.push("");
    for (const d of data.designDeltas) lines.push(`- [${d.kind}] ${d.description}`);
    lines.push("");
  }

  lines.push("## Q4: Did we do a good job?");
  lines.push("");
  const passedFindings = data.validationFindings.filter((f) => f.passed).length;
  lines.push(`Validation: ${passedFindings}/${data.validationFindings.length} invariant checks passed.`);
  if (data.coverage) {
    lines.push(`Coverage: ${data.coverage.coveragePercent}% of the ${data.coverage.framework} corpus addressed.`);
  }
  if (data.pivotNodes.length > 0) {
    lines.push("");
    lines.push("### Pivot nodes");
    lines.push("");
    for (const p of data.pivotNodes) {
      lines.push(
        `- Component ${p.componentId}: appears in ${p.attackPathCount} attack paths, ${p.trustBoundaryCrossingCount} boundary crossings, ${p.linkedMitigationIds.length} linked mitigation(s).`,
      );
    }
  }

  return lines.join("\n");
}
