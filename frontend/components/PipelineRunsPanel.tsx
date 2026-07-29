"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "../lib/api-client";
import type { MitreFramework, PipelineRun } from "../lib/types";

const FRAMEWORKS: MitreFramework[] = ["enterprise", "ics", "atlas"];

const STATUS_COLOR: Record<PipelineRun["status"], string> = {
  pending: "#f0f0f0",
  running: "#fff4d6",
  succeeded: "#e3f6e8",
  failed: "#fbe3e3",
};

export function PipelineRunsPanel({ projectId }: { projectId: string }) {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [framework, setFramework] = useState<MitreFramework>("enterprise");
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    api
      .listPipelineRuns(projectId)
      .then(setRuns)
      .catch(() => setError("Failed to load pipeline runs."))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, [projectId]);

  useEffect(() => {
    const hasActive = runs.some((r) => r.status === "pending" || r.status === "running");
    if (!hasActive) return;
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [runs]);

  const handleTrigger = async () => {
    setTriggering(true);
    setError(null);
    try {
      await api.createPipelineRun(projectId, framework);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to trigger pipeline run.");
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <label>
          Framework{" "}
          <select value={framework} onChange={(e) => setFramework(e.target.value as MitreFramework)} style={{ padding: "0.35rem" }}>
            {FRAMEWORKS.map((fw) => (
              <option key={fw} value={fw}>
                {fw}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={handleTrigger} disabled={triggering} style={{ padding: "0.4rem 1rem" }}>
          {triggering ? "Starting…" : "Run threat model"}
        </button>
      </div>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}

      {loading && <p style={{ color: "#777" }}>Loading runs…</p>}
      {!loading && runs.length === 0 && <p style={{ color: "#777" }}>No pipeline runs yet.</p>}
      {!loading && runs.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {runs.map((run) => (
            <li
              key={run.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "0.5rem 0.85rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Link href={`/projects/${projectId}/runs/${run.id}`} style={{ color: "#1a1a1a", textDecoration: "none" }}>
                <strong>{run.framework}</strong> run — {new Date(run.createdAt).toLocaleString()}
              </Link>
              <span style={{ fontSize: "0.8rem", padding: "0.1rem 0.5rem", borderRadius: 999, background: STATUS_COLOR[run.status] }}>
                {run.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
