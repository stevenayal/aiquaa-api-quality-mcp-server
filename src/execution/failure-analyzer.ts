import type { FailureAnalysis, FailureCategory, NewmanTestResult } from "../types/index.js";

interface ClassificationRule {
  category: FailureCategory;
  pattern: RegExp;
  cause: string;
  suggestedFix: string;
  confidence: "high" | "medium" | "low";
}

const RULES: ClassificationRule[] = [
  {
    category: "infrastructure",
    pattern: /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|socket hang up/i,
    cause: "El servicio no respondió a nivel de red (no está levantado o el host es incorrecto).",
    suggestedFix: "Verificar que el servicio esté corriendo y que baseUrl apunte al host correcto.",
    confidence: "high",
  },
  {
    category: "timeout",
    pattern: /timeout of \d+ms exceeded|ETIMEDOUT/i,
    cause: "La request superó el timeout configurado.",
    suggestedFix: "Revisar performance del endpoint o aumentar el timeout si es esperado.",
    confidence: "medium",
  },
  {
    category: "auth_error",
    pattern: /expected 401|expected 403|jwt expired|invalid token|unauthorized/i,
    cause: "Falla de autenticación o autorización.",
    suggestedFix: "Renovar el token de test o revisar el flujo de login en el pre-request script.",
    confidence: "high",
  },
  {
    category: "broken_dependency",
    pattern: /\{\{\w+}}|undefined.*(?:id|token|resourceId)/i,
    cause: "Una variable encadenada desde otro request no se resolvió (dependencia rota).",
    suggestedFix: "Revisar que el request previo capture y setee la variable correctamente.",
    confidence: "medium",
  },
  {
    category: "product_defect",
    pattern: /expected 5\d{2}/i,
    cause: "La API devolvió un error de servidor (5xx) para una request válida.",
    suggestedFix: "Reportar como bug de producto; no ajustar la assertion para ocultar el error.",
    confidence: "high",
  },
  {
    category: "contract_error",
    pattern: /expected \d{3} to equal \d{3}|expected \d{3} to be (?:above|below|oneOf)/i,
    cause: "El status code devuelto no coincide con el contrato esperado.",
    suggestedFix: "Confirmar si cambió el contrato de la API o si el test quedó desactualizado.",
    confidence: "medium",
  },
];

export function analyzeFailure(result: NewmanTestResult): FailureAnalysis {
  const message = result.errorMessage ?? "";
  for (const rule of RULES) {
    if (rule.pattern.test(message)) {
      return {
        requestName: result.requestName,
        assertionName: result.assertionName,
        category: rule.category,
        cause: rule.cause,
        suggestedFix: rule.suggestedFix,
        confidence: rule.confidence,
      };
    }
  }
  return {
    requestName: result.requestName,
    assertionName: result.assertionName,
    category: "wrong_assertion",
    cause: message || "No se pudo determinar la causa exacta a partir del mensaje de error.",
    suggestedFix: "Revisar manualmente el request y la assertion antes de modificarla.",
    confidence: "low",
  };
}

export function analyzeFailures(results: NewmanTestResult[]): FailureAnalysis[] {
  return results.filter((result) => !result.passed).map(analyzeFailure);
}

export function classifyErrorMessage(message: string): FailureAnalysis {
  return analyzeFailure({
    requestName: "unknown",
    assertionName: "unknown",
    passed: false,
    errorMessage: message,
  });
}
