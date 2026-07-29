"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../../lib/api-client";
import { DfdBrowser } from "../../../../../components/DfdBrowser";
import { AttackPathsPanel } from "../../../../../components/AttackPathsPanel";
import { ReportsViewer } from "../../../../../components/ReportsViewer";
import type {
  AttackPathWithRisk,
  MitigationRecommendation,
  PipelineRun,
  PipelineStep,
  Report,
  ReportArtifacts,
  SystemModelResponse,
} from "../../../../../lib/types";

const STEP_STATUS_COLOR: Record<PipelineStep["status"], string> = {
  pending: "#f0f0f0",
  running: "#fff4d6",
  succeeded: "#e3f6e8",
  failed: "#fbe3e3",
  skipped: "#eee",
};

export function RunDetailClient({ projectId, runId }: { projectId: string; runId: string }) {
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [model, setModel] = useState<SystemModelResponse | null>(null);
  const [attackPaths, setAttackPaths] = useState<AttackPathWithRisk[]>([]);
  const [mitigations, setMitigations] = useState<MitigationRecommendation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [artifacts, setArtifacts] = useState<ReportArtifacts | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const loadResultData = async () => {
      const results = await Promise.allSettled([
        api.getSystemModel(runId),
        api.getAttackPaths(runId),
        api.getMitigations(runId),
        api.getReports(projectId),
        api.getReportArtifacts(runId),
      ]);
      if (cancelled) return;
      if (results[0].status === "fulfilled") setModel(results[0].value);
      if (results[1].status === "fulfilled") setAttackPaths(results[1].value);
      if (results[2].status === "fulfilled") setMitigations(results[2].value);
      if (results[3].status === "fulfilled") setReports(results[3].value.filter((r: Report) => r.runId === runId));
      if (results[4].status === "fulfilled") setArtifacts(results[4].value);
    };

    const poll = async () => {
      try {
        const [runResult, stepsResult] = await Promise.all([api.getPipelineRun(runId), api.getPipelineSteps(runId)]);
        if (cancelled) return;
        setRun(runResult);
        setSteps(stepsResult);
        if (runResult.status === "succeeded" || runResult.status === "failed") {
          if (interval) clearInterval(interval);
          await loadResultData();
        }
      } catch {
        if (!cancelled) setError("Failed to load pipeline run.");
      }
    };

    void poll();
    interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [projectId, runId]);

  if (error) return <p style={{ color: "#b00020" }}>{error}</p>;
  if (!run) return <p style={{ color: "#777" }}>Loading run…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <section>
        <h1 style={{ marginBottom: "0.25rem" }}>
          {run.framework} run <span style={{ fontWeight: 400, color: "#777" }}>({run.status})</span>
        </h1>
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.75rem" }}>
          {steps
            .sort((a, b) => a.wave - b.wave)
            .map((step) => (
              <li
                key={step.id}
                title={step.error ?? undefined}
                style={{
                  fontSize: "0.8rem",
                  padding: "0.25rem 0.6rem",
                  borderRadius: 999,
                  background: STEP_STATUS_COLOR[step.status],
                }}
              >
                wave {step.wave} · {step.agentName} · {step.status}
              </li>
            ))}
        </ul>
      </section>

      {run.status === "running" || run.status === "pending" ? (
        <p style={{ color: "#777" }}>Pipeline is still running — results will appear here once it finishes.</p>
      ) : (
        <>
          {model && (
            <section>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>System model (DFD)</h2>
              <DfdBrowser model={model} attackPaths={attackPaths} onSelectComponent={setSelectedComponentId} />
            </section>
          )}

          <section>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>
              Attack paths {selectedComponentId && <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "#777" }}>(filtered by selected component)</span>}
            </h2>
            <AttackPathsPanel attackPaths={attackPaths} selectedComponentId={selectedComponentId} />
          </section>

          <section>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Mitigations</h2>
            {mitigations.length === 0 ? (
              <p style={{ color: "#777" }}>No mitigations recommended yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {mitigations.map((m) => (
                  <li key={m.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.6rem 0.85rem" }}>
                    <strong>{m.title}</strong>{" "}
                    <span style={{ fontSize: "0.8rem", color: "#777" }}>
                      ({m.controlFamily}
                      {m.criFunction ? `, CRI: ${m.criFunction}` : ""}, priority: {m.priority})
                    </span>
                    <p style={{ fontSize: "0.9rem", color: "#444", margin: "0.25rem 0 0" }}>{m.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Report</h2>
            <ReportsViewer runId={runId} reports={reports} artifacts={artifacts} />
          </section>
        </>
      )}
    </div>
  );
}
