import { RunDetailClient } from "./RunDetailClient";

export default async function RunPage({ params }: { params: Promise<{ projectId: string; runId: string }> }) {
  const { projectId, runId } = await params;
  return <RunDetailClient projectId={projectId} runId={runId} />;
}
