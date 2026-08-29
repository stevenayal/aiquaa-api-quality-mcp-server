export type UsagePhase = "desarrollo" | "ejecucion";

export interface UsageEvent {
  toolName: string;
  phase: UsagePhase;
  timestamp: string;
  durationMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

export interface UsagePhaseStats {
  calls: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
}

export interface UsageToolStats extends UsagePhaseStats {
  toolName: string;
  phase: UsagePhase;
}

export interface UsageReportFilters {
  desde?: string;
  hasta?: string;
  fase?: UsagePhase;
}

export interface UsageReport {
  generatedAt: string;
  model: string;
  byPhase: Record<UsagePhase, UsagePhaseStats>;
  byTool: UsageToolStats[];
  total: UsagePhaseStats;
  disclaimer: string;
  pdfReportPath?: string;
}
