"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api-client";

export function CreateProjectForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const project = await api.createProject({ name, description });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 480 }}>
      <label>
        Project name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.4rem", marginTop: "0.25rem" }}
        />
      </label>
      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{ display: "block", width: "100%", padding: "0.4rem", marginTop: "0.25rem" }}
        />
      </label>
      {error && <p style={{ color: "#b00020" }}>{error}</p>}
      <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem", alignSelf: "flex-start" }}>
        {submitting ? "Creating…" : "Create project"}
      </button>
    </form>
  );
}
