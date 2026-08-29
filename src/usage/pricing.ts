export interface ModelPricing {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

export const DEFAULT_USAGE_MODEL = "claude-sonnet-5";

/** Precios públicos de referencia (USD por millón de tokens), no facturación real. */
const PRICING_TABLE: Record<string, ModelPricing> = {
  "claude-opus-5": { inputPerMillionUsd: 5, outputPerMillionUsd: 25 },
  "claude-sonnet-5": { inputPerMillionUsd: 2, outputPerMillionUsd: 10 },
  "claude-sonnet-4-6": { inputPerMillionUsd: 3, outputPerMillionUsd: 15 },
  "claude-haiku-4-5": { inputPerMillionUsd: 1, outputPerMillionUsd: 5 },
};

export function resolvePricing(model: string): ModelPricing {
  return PRICING_TABLE[model] ?? PRICING_TABLE[DEFAULT_USAGE_MODEL]!;
}

export function estimateCostUsd(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = resolvePricing(model);
  return (
    (inputTokens / 1_000_000) * pricing.inputPerMillionUsd +
    (outputTokens / 1_000_000) * pricing.outputPerMillionUsd
  );
}
