"use client";

import { useState } from "react";
import { api, ApiError } from "../lib/api-client";

export function DesignDocForm({ projectId }: { projectId: string }) {
  const [prose, setProse] = useState("");
  const [mermaidText, setMermaidText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      await api.addDesignDoc(projectId, { prose, mermaidText });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save design doc.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <label>
        System description (prose)
        <textarea
          required
          value={prose}
          onChange={(e) => setProse(e.target.value)}
          rows={6}
          placeholder="Describe the system's components, data flows, and trust boundaries..."
          style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem", fontFamily: "inherit" }}
        />
      </label>
      <label>
        Mermaid diagram (flowchart)
        <textarea
          value={mermaidText}
          onChange={(e) => setMermaidText(e.target.value)}
          rows={8}
          placeholder={"flowchart LR\n  User-->WebApp\n  WebApp-->DB[(Database)]"}
          style={{
            display: "block",
            width: "100%",
            padding: "0.5rem",
            marginTop: "0.25rem",
            fontFamily: "monospace",
            fontSize: "0.9rem",
          }}
        />
      </label>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      {saved && <p style={{ color: "#0a7d2c" }}>Design doc saved.</p>}
      <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem", alignSelf: "flex-start" }}>
        {submitting ? "Saving…" : "Save design doc"}
      </button>
    </form>
  );
}
