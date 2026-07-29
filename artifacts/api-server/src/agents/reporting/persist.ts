import type { Db } from "../../db/client.js";
import { reportArtifacts } from "../../db/schema/report-artifacts.js";
import { reports } from "../../db/schema/reports.js";
import type { NavigatorLayer } from "./navigator-layer.js";
import type { ConfidenceSubScores } from "./scoring-config.js";

export interface AudienceReport {
  audience: "executive" | "ciso" | "technical";
  markdown: string;
}

export async function persistReportArtifacts(
  db: Db,
  runId: string,
  data: {
    threatModelMarkdown: string;
    jsonDump: unknown;
    navigatorLayer: NavigatorLayer;
    riskRegisterCsv: string;
    pdfPath: string | undefined;
    confidence: number;
  },
): Promise<string> {
  const [row] = await db
    .insert(reportArtifacts)
    .values({
      runId,
      threatModelMarkdown: data.threatModelMarkdown,
      jsonDump: data.jsonDump,
      navigatorLayer: data.navigatorLayer,
      riskRegisterCsv: data.riskRegisterCsv,
      pdfPath: data.pdfPath,
      confidence: data.confidence,
    })
    .returning({ id: reportArtifacts.id });
  if (!row) throw new Error("Failed to insert report_artifacts row");
  return row.id;
}

export async function persistAudienceReports(
  db: Db,
  runId: string,
  confidence: number,
  subScores: ConfidenceSubScores,
  audienceReports: AudienceReport[],
): Promise<string[]> {
  const rows = await db
    .insert(reports)
    .values(
      audienceReports.map((r) => ({
        runId,
        audience: r.audience,
        confidence,
        confidenceSubScores: subScores,
        markdown: r.markdown,
      })),
    )
    .returning({ id: reports.id });
  return rows.map((r) => r.id);
}
