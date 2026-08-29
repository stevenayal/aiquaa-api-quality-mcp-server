import type {
  AnalysisSummary,
  ChangePlan,
  FailureAnalysis,
  GeneratedFile,
  NewmanRunSummary,
  RequirementModel,
} from "../types/index.js";
import type { CoverageMatrixResult } from "../coverage/coverage-matrix.js";
import type { ApiValidarResult } from "./api-validar.js";
import type { PrFlowResult } from "../github/pr-flow.js";
import type { UsageReport } from "../usage/types.js";

export function filesToMarkdown(files: GeneratedFile[]): string {
  return files
    .map((file) => {
      const header = `### ${file.path} (${file.operation})\n\n${file.reason}`;
      if (!file.content) return header;
      const language = file.path.endsWith(".yml") || file.path.endsWith(".yaml") ? "yaml" : "json";
      return `${header}\n\n\`\`\`${language}\n${file.content}\n\`\`\``;
    })
    .join("\n\n");
}

export function analysisToMarkdown(summary: AnalysisSummary): string {
  const lines = [
    "# Análisis de API",
    "",
    `**Stack:** ${summary.stack.language} / ${summary.stack.framework} (confianza ${Math.round(summary.stack.confidence * 100)}%)`,
    `**Confianza general:** ${Math.round(summary.confidence * 100)}%`,
    "",
    `## Endpoints detectados (${summary.operations.length})`,
    ...summary.operations.map((op) => `- ${op.method} ${op.path}${op.authentication ? " 🔒" : ""}`),
    "",
    `## Colecciones Postman existentes (${summary.existingCollections.length})`,
    ...summary.existingCollections.map((c) => `- ${c.name}: ${c.requests.length} requests`),
    "",
    `## Workflows CI existentes (${summary.existingWorkflows.length})`,
    ...summary.existingWorkflows.map((w) => `- ${w}`),
  ];
  if (summary.risks.length > 0)
    lines.push("", "## Riesgos", ...summary.risks.map((r) => `- ⚠️ ${r}`));
  if (summary.missingInformation.length > 0) {
    lines.push(
      "",
      "## Información faltante",
      ...summary.missingInformation.map((m) => `- ❓ ${m}`),
    );
  }
  return lines.join("\n");
}

export function requirementsToMarkdown(model: RequirementModel): string {
  const section = (title: string, items: RequirementModel["requirements"]): string[] =>
    items.length > 0
      ? [`## ${title}`, ...items.map((item) => `- **${item.id}**: ${item.text}`), ""]
      : [];
  return [
    "# Requisitos estructurados",
    "",
    ...section("Requisitos", model.requirements),
    ...section("Criterios de aceptación", model.acceptanceCriteria),
    ...section("Reglas de negocio", model.businessRules),
  ].join("\n");
}

export function coverageToMarkdown(result: CoverageMatrixResult): string {
  const rows = result.entries.map(
    (entry) =>
      `| ${entry.requirementId} | ${entry.operationId ?? "-"} | ${entry.requestName ?? "-"} | ${entry.assertionNames.length} | ${entry.status} |`,
  );
  return [
    "# Matriz de cobertura",
    "",
    `**Cobertura:** ${result.summary.coveragePercentage}% (${result.summary.covered}/${result.summary.totalRequirements})`,
    "",
    "| Requisito | Endpoint | Request | Assertions | Estado |",
    "|---|---|---|---|---|",
    ...rows,
    "",
    "## Razones",
    ...result.entries.map((entry) => `- **${entry.requirementId}**: ${entry.reason}`),
  ].join("\n");
}

export function validationToMarkdown(result: ApiValidarResult): string {
  const lines = [
    `# Validación de artefactos`,
    "",
    `**Resultado:** ${result.valid ? "✅ válido" : "❌ con errores"}`,
    "",
  ];
  for (const finding of result.findings) {
    lines.push(`- ${finding.severity === "error" ? "🔴" : "🟡"} ${finding.message}`);
  }
  return lines.join("\n");
}

export function newmanSummaryToMarkdown(summary: NewmanRunSummary): string {
  return [
    `# Resultado Newman — ${summary.collectionName}`,
    "",
    `Requests: ${summary.totalRequests} | Assertions: ${summary.totalAssertions} | Fallidas: ${summary.failedAssertions}`,
    `Duración: ${summary.durationMs}ms`,
    ...(summary.pdfReportPath ? [`📄 Reporte PDF: ${summary.pdfReportPath}`] : []),
    "",
    ...summary.results
      .filter((r) => !r.passed)
      .map(
        (r) =>
          `- ❌ ${r.requestName} → ${r.assertionName}${r.errorMessage ? `: ${r.errorMessage}` : ""}`,
      ),
  ].join("\n");
}

export function failuresToMarkdown(analyses: FailureAnalysis[]): string {
  if (analyses.length === 0) return "# Análisis de fallos\n\nSin fallos para analizar.";
  return [
    "# Análisis de fallos",
    "",
    ...analyses.map(
      (a) =>
        `## ${a.requestName} → ${a.assertionName}\n- Categoría: ${a.category}\n- Causa: ${a.cause}\n- Fix sugerido: ${a.suggestedFix}\n- Confianza: ${a.confidence}`,
    ),
  ].join("\n\n");
}

export function changePlanToMarkdown(plan: ChangePlan): string {
  return [
    "# Plan de cambios",
    "",
    `**Estrategia:** ${plan.strategy}`,
    `**Cobertura antes:** ${plan.coverageBefore}% → **estimada después:** ${plan.coverageAfterEstimated}%`,
    "",
    `## Archivos a crear`,
    ...plan.filesToCreate.map((f) => `- ${f}`),
    `## Archivos a modificar`,
    ...plan.filesToModify.map((f) => `- ${f}`),
    `## Archivos a mantener`,
    ...plan.filesToKeep.map((f) => `- ${f}`),
    `## Archivos a deprecar`,
    ...plan.filesToDeprecate.map((f) => `- ${f}`),
    ...(plan.risks.length > 0 ? ["", "## Riesgos", ...plan.risks.map((r) => `- ⚠️ ${r}`)] : []),
  ].join("\n");
}

export function usoTokensToMarkdown(report: UsageReport): string {
  const lines = [
    "# Reporte de uso de tokens",
    "",
    `> ⚠️ ${report.disclaimer}`,
    "",
    `**Modelo de referencia:** ${report.model}`,
    `**Generado:** ${report.generatedAt}`,
    "",
    "## Total",
    `Llamadas: ${report.total.calls} | Tokens estimados: ${report.total.estimatedTokens} | Costo estimado: $${report.total.estimatedCostUsd.toFixed(4)}`,
    "",
    "## Por fase",
    ...(["desarrollo", "ejecucion"] as const).map(
      (phase) =>
        `- **${phase}**: ${report.byPhase[phase].calls} llamadas, ${report.byPhase[phase].estimatedTokens} tokens, $${report.byPhase[phase].estimatedCostUsd.toFixed(4)}`,
    ),
    "",
    `## Por tool (${report.byTool.length})`,
    ...report.byTool.map(
      (tool) =>
        `- ${tool.toolName} [${tool.phase}]: ${tool.calls} llamadas, ${tool.estimatedTokens} tokens, $${tool.estimatedCostUsd.toFixed(4)}`,
    ),
  ];
  if (report.pdfReportPath) lines.push("", `📄 Reporte PDF: ${report.pdfReportPath}`);
  return lines.join("\n");
}

export function prResultToMarkdown(result: PrFlowResult): string {
  const lines = [
    `# ${result.dryRun ? "Plan de PR (dry run)" : "Pull request creado"}`,
    "",
    `**Branch:** ${result.branch} ← base: ${result.baseBranch}`,
    `**Título:** ${result.title}`,
  ];
  if (!result.dryRun) {
    lines.push(`**URL:** ${result.url ?? "-"}`, `**Commit:** ${result.commitSha ?? "-"}`);
  }
  lines.push("", "## Archivos", ...result.filesPlanned.map((f) => `- ${f.operation} ${f.path}`));
  if (result.warnings.length > 0)
    lines.push("", "## Advertencias", ...result.warnings.map((w) => `- ⚠️ ${w}`));
  lines.push("", "## Cuerpo del PR", "", result.body);
  return lines.join("\n");
}
