"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api-client";
import type { Report, ReportArtifacts, ReportAudience } from "../lib/types";

const AUDIENCES: ReportAudience[] = ["executive", "ciso", "technical"];

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsViewer({
  runId,
  reports,
  artifacts,
}: {
  runId: string;
  reports: Report[];
  artifacts: ReportArtifacts | null;
}) {
  const available = AUDIENCES.filter((a) => reports.some((r) => r.audience === a));
  const [tab, setTab] = useState<ReportAudience | null>(available[0] ?? null);

  if (reports.length === 0 && !artifacts) {
    return <p style={{ color: "#777" }}>No report generated for this run yet.</p>;
  }

  const active = reports.find((r) => r.audience === tab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {available.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #ddd" }}>
          {available.map((audience) => (
            <button
              key={audience}
              type="button"
              onClick={() => setTab(audience)}
              style={{
                padding: "0.4rem 0.9rem",
                border: "none",
                borderBottom: tab === audience ? "2px solid #0645ad" : "2px solid transparent",
                background: "none",
                cursor: "pointer",
                fontWeight: tab === audience ? 700 : 400,
                textTransform: "capitalize",
              }}
            >
              {audience}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div>
          <div style={{ fontSize: "0.85rem", color: "#555", marginBottom: "0.75rem" }}>
            Confidence: <strong>{active.confidence}%</strong>{" "}
            <span
              title={`validationPassRate=${active.confidenceSubScores.validationPassRate.toFixed(2)}, coverageScore=${active.confidenceSubScores.coverageScore.toFixed(2)}, groundingScore=${active.confidenceSubScores.groundingScore.toFixed(2)}, pivotNodeResolutionScore=${active.confidenceSubScores.pivotNodeResolutionScore.toFixed(2)}`}
              style={{ cursor: "help", borderBottom: "1px dotted #999" }}
            >
              (details)
            </span>
          </div>
          <div style={{ lineHeight: 1.6 }}>
            <ReactMarkdown>{active.markdown}</ReactMarkdown>
          </div>
        </div>
      )}

      {artifacts && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", borderTop: "1px solid #ddd", paddingTop: "1rem" }}>
          {artifacts.hasPdf && (
            <a href={api.reportPdfUrl(runId)} target="_blank" rel="noreferrer" style={{ padding: "0.4rem 0.9rem", border: "1px solid #ccc", borderRadius: 4, textDecoration: "none", color: "#1a1a1a" }}>
              Download PDF
            </a>
          )}
          <button
            type="button"
            onClick={() => download(`risk-register-${runId}.csv`, artifacts.riskRegisterCsv, "text/csv")}
            style={{ padding: "0.4rem 0.9rem" }}
          >
            Risk register CSV
          </button>
          <button
            type="button"
            onClick={() => download(`navigator-layer-${runId}.json`, JSON.stringify(artifacts.navigatorLayer, null, 2), "application/json")}
            style={{ padding: "0.4rem 0.9rem" }}
          >
            ATT&CK Navigator layer
          </button>
          <button
            type="button"
            onClick={() => download(`report-dump-${runId}.json`, JSON.stringify(artifacts.jsonDump, null, 2), "application/json")}
            style={{ padding: "0.4rem 0.9rem" }}
          >
            Full JSON dump
          </button>
        </div>
      )}
    </div>
  );
}
