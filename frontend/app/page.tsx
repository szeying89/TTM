import Link from "next/link";
import { api } from "../lib/api-client";
import { CreateProjectForm } from "../components/CreateProjectForm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let projects: Awaited<ReturnType<typeof api.listProjects>> = [];
  let loadError: string | null = null;
  try {
    projects = await api.listProjects();
  } catch {
    loadError = "Could not reach the API server.";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      <section>
        <h1 style={{ marginBottom: "0.25rem" }}>Intel-Threat-Modeller</h1>
        <p style={{ color: "#555" }}>AI threat-modelling platform — create a project to get started.</p>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>New project</h2>
        <CreateProjectForm />
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Existing projects</h2>
        {loadError && <p style={{ color: "#b00020" }}>{loadError}</p>}
        {!loadError && projects.length === 0 && <p style={{ color: "#555" }}>No projects yet.</p>}
        {!loadError && projects.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {projects.map((project) => (
              <li key={project.id} style={{ border: "1px solid #ddd", borderRadius: 6, padding: "0.75rem 1rem" }}>
                <Link href={`/projects/${project.id}`} style={{ fontWeight: 600, textDecoration: "none", color: "#1a1a1a" }}>
                  {project.name}
                </Link>
                {project.description && <p style={{ margin: "0.25rem 0 0", color: "#555" }}>{project.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
