import path from "node:path";
import type { LLMClient } from "@intel-threat-modeller/llm-client";
import type { Db } from "../../db/client.js";
import type { AgentDescriptor } from "../../orchestrator/types.js";
import { gatherReportData } from "./gather-report-data.js";
import { computeConfidenceSubScores } from "./confidence.js";
import { computeConfidenceScore } from "./scoring-config.js";
import { buildThreatModelMarkdown } from "./threat-model-md.js";
import { buildNavigatorLayer } from "./navigator-layer.js";
import { buildRiskRegisterCsv } from "./risk-register-csv.js";
import { getAudienceSystemPrompt, buildAudienceUserMessage } from "./audience-prompt.js";
import { AudienceSummary } from "./audience-schema.js";
import { renderAudienceMarkdown } from "./render-audience-markdown.js";
import { renderMarkdownToPdf } from "./pdf.js";
import { persistAudienceReports, persistReportArtifacts, type AudienceReport } from "./persist.js";

export interface ReportingAgentDeps {
  db: Db;
  llmClient: LLMClient;
  model?: string;
  reportsDir?: string;
}

export function createReportingAgentDescriptor(deps: ReportingAgentDeps): AgentDescriptor {
  const model = deps.model ?? process.env.LLM_DEFAULT_MODEL ?? "claude-opus-5";
  const reportsDir = deps.reportsDir ?? path.join(process.cwd(), "reports");

  return {
    name: "reporting",
    dependsOn: ["validation"],
    outputs: ["Report[]", "ConfidenceScore"],
    handler: async (ctx) => {
      const data = await gatherReportData(deps.db, ctx.runId);
      const subScores = computeConfidenceSubScores(data);
      const confidence = computeConfidenceScore(subScores);

      const threatModelMarkdown = buildThreatModelMarkdown(data, confidence, subScores);

      const scoreByTechniqueId = new Map<string, number>();
      const riskByAttackPathId = new Map(data.riskScores.map((r) => [r.attackPathId, r]));
      for (const path of data.attackPaths) {
        const risk = riskByAttackPathId.get(path.id);
        if (!risk) continue;
        for (const ref of path.groundingRefs) {
          scoreByTechniqueId.set(ref.techniqueId, Math.max(scoreByTechniqueId.get(ref.techniqueId) ?? 0, risk.score));
        }
      }
      const navigatorLayer = buildNavigatorLayer(data.project.name, data.run.framework, data.attackPaths, scoreByTechniqueId);
      const riskRegisterCsv = buildRiskRegisterCsv(data);

      const audienceReports: AudienceReport[] = [{ audience: "technical", markdown: threatModelMarkdown }];
      for (const audience of ["executive", "ciso"] as const) {
        const { data: llmSummary } = await deps.llmClient.completeStructured({
          model,
          system: getAudienceSystemPrompt(audience),
          messages: [{ role: "user", content: buildAudienceUserMessage(data, confidence, subScores) }],
          schema: AudienceSummary,
          schemaName: "AudienceSummary",
          maxTokens: 2048,
        });
        const title = audience === "executive" ? "Executive" : "CISO";
        audienceReports.push({ audience, markdown: renderAudienceMarkdown(data, confidence, title, llmSummary) });
      }

      let pdfPath: string | undefined;
      try {
        pdfPath = path.join(reportsDir, `${ctx.runId}.pdf`);
        await renderMarkdownToPdf(threatModelMarkdown, pdfPath);
      } catch {
        pdfPath = undefined; // PDF generation is best-effort; the rest of the report is unaffected.
      }

      const jsonDump = JSON.parse(JSON.stringify(data));
      const artifactId = await persistReportArtifacts(deps.db, ctx.runId, {
        threatModelMarkdown,
        jsonDump,
        navigatorLayer,
        riskRegisterCsv,
        pdfPath,
        confidence,
      });
      const reportIds = await persistAudienceReports(deps.db, ctx.runId, confidence, subScores, audienceReports);

      return {
        outputRefs: [`report_artifact:${artifactId}`, ...reportIds.map((id) => `report:${id}`)],
      };
    },
  };
}
