"use client";

import type { AttackPathWithRisk } from "../lib/types";

const RISK_COLOR = (score: number) => {
  if (score >= 75) return "#c0392b";
  if (score >= 50) return "#e67e22";
  if (score >= 25) return "#f1c40f";
  return "#27ae60";
};

export function AttackPathsPanel({
  attackPaths,
  selectedComponentId,
}: {
  attackPaths: AttackPathWithRisk[];
  selectedComponentId: string | null;
}) {
  const filtered = selectedComponentId
    ? attackPaths.filter((path) => path.entities.some((e) => e.componentId === selectedComponentId))
    : attackPaths;

  const sorted = [...filtered].sort((a, b) => (a.risk?.rank ?? 999) - (b.risk?.rank ?? 999));

  if (sorted.length === 0) {
    return <p style={{ color: "#777" }}>{selectedComponentId ? "No attack paths involve this component." : "No attack paths yet."}</p>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {sorted.map((path) => {
        const risk = path.risk;
        const rationaleParts = [
          risk?.criAdjustment && `CRI (${risk.criAdjustment.function}, ${risk.criAdjustment.maturityTier}): ${risk.criAdjustment.rationale}`,
          risk?.intelAdjustment && `Intel: ${risk.intelAdjustment.rationale}`,
        ].filter(Boolean);

        return (
          <li key={path.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.6rem 0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
              <div>
                <strong>{path.name}</strong>
                <div style={{ fontSize: "0.8rem", color: "#555" }}>
                  {path.strideCategories.join(", ")} · {path.sourcePass}
                  {path.applicability === "not-applicable" && " · not applicable"}
                </div>
              </div>
              {risk && (
                <span
                  title={rationaleParts.join(" | ") || risk.rationale}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "#fff",
                    background: RISK_COLOR(risk.score),
                    borderRadius: 999,
                    padding: "0.15rem 0.6rem",
                    cursor: "help",
                    whiteSpace: "nowrap",
                  }}
                >
                  {risk.score} (#{risk.rank})
                </span>
              )}
            </div>
            {path.applicability === "not-applicable" && path.notApplicableRationale && (
              <p style={{ fontSize: "0.8rem", color: "#777", marginTop: "0.35rem" }}>{path.notApplicableRationale}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
