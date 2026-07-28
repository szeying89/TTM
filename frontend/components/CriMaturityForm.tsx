"use client";

import { useState } from "react";
import { api, ApiError } from "../lib/api-client";
import type { CriFunction, CriMaturityTier, Project } from "../lib/types";

const CRI_FUNCTIONS: CriFunction[] = ["govern", "identify", "protect", "detect", "respond", "recover"];
const MATURITY_TIERS: CriMaturityTier[] = ["not-assessed", "baseline", "evolving", "intermediate", "advanced", "innovative"];

export function CriMaturityForm({ project }: { project: Project }) {
  const [maturity, setMaturity] = useState<Partial<Record<CriFunction, CriMaturityTier>>>(project.criMaturity ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateProject(project.id, { criMaturity: maturity });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save CRI maturity.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" }}>
        {CRI_FUNCTIONS.map((fn) => (
          <label key={fn} style={{ display: "flex", flexDirection: "column", gap: "0.25rem", textTransform: "capitalize" }}>
            {fn}
            <select
              value={maturity[fn] ?? "not-assessed"}
              onChange={(e) => setMaturity((prev) => ({ ...prev, [fn]: e.target.value as CriMaturityTier }))}
              style={{ padding: "0.35rem" }}
            >
              {MATURITY_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {saved && <p style={{ color: "#0a7d2c" }}>Saved.</p>}
      <button type="button" onClick={handleSave} disabled={saving} style={{ padding: "0.5rem 1rem", alignSelf: "flex-start" }}>
        {saving ? "Saving…" : "Save CRI maturity"}
      </button>
    </div>
  );
}
