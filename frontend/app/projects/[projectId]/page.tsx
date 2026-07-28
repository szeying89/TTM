import { notFound } from "next/navigation";
import { api, ApiError } from "../../../lib/api-client";
import { CriMaturityForm } from "../../../components/CriMaturityForm";
import { DesignDocForm } from "../../../components/DesignDocForm";
import { IntelFeedsPanel } from "../../../components/IntelFeedsPanel";
import { PipelineRunsPanel } from "../../../components/PipelineRunsPanel";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  let project;
  try {
    project = await api.getProject(projectId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
      <section>
        <h1 style={{ marginBottom: "0.25rem" }}>{project.name}</h1>
        {project.description && <p style={{ color: "#555" }}>{project.description}</p>}
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Design document</h2>
        <DesignDocForm projectId={project.id} />
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>CRI Profile maturity</h2>
        <CriMaturityForm project={project} />
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Threat intel feeds</h2>
        <IntelFeedsPanel projectId={project.id} />
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Pipeline runs</h2>
        <PipelineRunsPanel projectId={project.id} />
      </section>
    </div>
  );
}
