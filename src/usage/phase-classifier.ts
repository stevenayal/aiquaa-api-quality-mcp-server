import type { UsagePhase } from "./types.js";

const EXECUTION_TOOLS = new Set(["api_ejecutar", "api_fallos"]);

export function classifyPhase(toolName: string): UsagePhase {
  return EXECUTION_TOOLS.has(toolName) ? "ejecucion" : "desarrollo";
}
