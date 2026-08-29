/**
 * Heurística de aproximación (no tokenización real): este servidor no integra
 * ningún SDK de LLM, así que no hay un tokenizer real disponible para medir
 * el tamaño de un payload. 4 caracteres ≈ 1 token es la misma aproximación
 * que usa la documentación pública de Anthropic para estimados rápidos.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
