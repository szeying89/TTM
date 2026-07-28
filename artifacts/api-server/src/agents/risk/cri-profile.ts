import type { CriAdjustment, CriFunction, CriMaturityTier, StrideCategory } from "@intel-threat-modeller/contracts";

// Which CRI Profile function most directly mitigates each STRIDE category.
// An attack path can carry several STRIDE categories; the first one (its
// primary classification) drives which function's maturity is consulted.
export const STRIDE_TO_CRI_FUNCTION: Record<StrideCategory, CriFunction> = {
  spoofing: "protect",
  tampering: "protect",
  repudiation: "detect",
  "information-disclosure": "protect",
  "denial-of-service": "respond",
  "elevation-of-privilege": "protect",
};

// Lower organizational maturity in the relevant function means a real
// attacker is less likely to be prevented/caught, so it raises effective
// risk (positive modifier); higher maturity lowers it.
export const CRI_MATURITY_MODIFIER: Record<CriMaturityTier, number> = {
  "not-assessed": 0.15,
  baseline: 0.2,
  evolving: 0.1,
  intermediate: 0,
  advanced: -0.1,
  innovative: -0.15,
};

export function computeCriAdjustment(
  strideCategories: StrideCategory[],
  criMaturity: Partial<Record<CriFunction, CriMaturityTier>>,
): CriAdjustment {
  const primaryCategory = strideCategories[0] ?? "elevation-of-privilege";
  const criFunction = STRIDE_TO_CRI_FUNCTION[primaryCategory];
  const maturityTier = criMaturity[criFunction] ?? "not-assessed";
  const modifier = CRI_MATURITY_MODIFIER[maturityTier];

  const rationale =
    maturityTier === "not-assessed"
      ? `No CRI Profile maturity has been declared for the "${criFunction}" function, so a moderate uncertainty modifier is applied.`
      : `The organization's "${criFunction}" function is assessed at "${maturityTier}" maturity, which ${
          modifier > 0 ? "increases" : modifier < 0 ? "decreases" : "does not change"
        } effective risk for this ${primaryCategory} finding.`;

  return { function: criFunction, maturityTier, modifier, rationale };
}
