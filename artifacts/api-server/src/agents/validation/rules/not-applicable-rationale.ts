import type { ValidationAttackPath, ValidationFindingCandidate } from "../types.js";

const MIN_RATIONALE_LENGTH = 20;

export function checkNotApplicableRationale(attackPaths: ValidationAttackPath[]): ValidationFindingCandidate[] {
  return attackPaths
    .filter((p) => p.applicability === "not-applicable")
    .map((path) => {
      const rationale = path.notApplicableRationale?.trim() ?? "";
      const passed = rationale.length >= MIN_RATIONALE_LENGTH;
      return {
        ruleId: "not-applicable-rationale",
        category: "not-applicable-rationale" as const,
        targetId: path.id,
        passed,
        message: passed
          ? "Not-applicable determination carries a substantive rationale."
          : rationale.length === 0
            ? "Marked not-applicable with no rationale."
            : `Rationale is only ${rationale.length} characters - below the ${MIN_RATIONALE_LENGTH}-character minimum-quality threshold.`,
      };
    });
}
