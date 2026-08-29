import { estimateCostUsd } from "./pricing.js";
import type { UsageEvent, UsagePhase, UsagePhaseStats, UsageReport, UsageToolStats } from "./types.js";

export const USAGE_DISCLAIMER =
  "Estimación basada en tamaño de payload (heurística ~4 caracteres/token), no facturación real de un proveedor LLM — este servidor no realiza llamadas a modelos de lenguaje.";

function emptyStats(): UsagePhaseStats {
  return { calls: 0, estimatedInputTokens: 0, estimatedOutputTokens: 0, estimatedTokens: 0, estimatedCostUsd: 0 };
}

function addEvent(stats: UsagePhaseStats, event: UsageEvent, model: string): UsagePhaseStats {
  const estimatedInputTokens = stats.estimatedInputTokens + event.estimatedInputTokens;
  const estimatedOutputTokens = stats.estimatedOutputTokens + event.estimatedOutputTokens;
  return {
    calls: stats.calls + 1,
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedTokens: estimatedInputTokens + estimatedOutputTokens,
    estimatedCostUsd: estimateCostUsd(estimatedInputTokens, estimatedOutputTokens, model),
  };
}

export function buildUsageReport(
  events: UsageEvent[],
  model: string,
  generatedAt: Date = new Date(),
): UsageReport {
  const byPhase: Record<UsagePhase, UsagePhaseStats> = {
    desarrollo: emptyStats(),
    ejecucion: emptyStats(),
  };
  const byToolMap = new Map<string, UsageToolStats>();
  let total = emptyStats();

  for (const event of events) {
    byPhase[event.phase] = addEvent(byPhase[event.phase], event, model);
    total = addEvent(total, event, model);

    const key = `${event.toolName}::${event.phase}`;
    const existing = byToolMap.get(key) ?? { ...emptyStats(), toolName: event.toolName, phase: event.phase };
    byToolMap.set(key, { ...addEvent(existing, event, model), toolName: event.toolName, phase: event.phase });
  }

  return {
    generatedAt: generatedAt.toISOString(),
    model,
    byPhase,
    byTool: [...byToolMap.values()].sort((a, b) => b.estimatedTokens - a.estimatedTokens),
    total,
    disclaimer: USAGE_DISCLAIMER,
  };
}
