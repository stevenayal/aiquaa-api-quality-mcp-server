export interface PrBodyInput {
  context: string;
  requirementsEvaluated: string[];
  endpointsAffected: string[];
  coverageBefore: number;
  coverageAfterEstimated: number;
  filesCreated: string[];
  filesModified: string[];
  testsAdded: string[];
  assumptions: string[];
  risks: string[];
  requiredSecrets: string[];
  runInstructions: string;
}

export function buildPullRequestBody(input: PrBodyInput): string {
  const list = (items: string[], empty: string): string =>
    items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;

  return `## Contexto

${input.context || "Sin contexto adicional."}

## Requisitos evaluados

${list(input.requirementsEvaluated, "Ninguno")}

## Endpoints afectados

${list(input.endpointsAffected, "Ninguno")}

## Cobertura

- Antes: ${input.coverageBefore}%
- Estimada después: ${input.coverageAfterEstimated}%

## Archivos creados

${list(input.filesCreated, "Ninguno")}

## Archivos modificados

${list(input.filesModified, "Ninguno")}

## Pruebas agregadas

${list(input.testsAdded, "Ninguna")}

## Supuestos

${list(input.assumptions, "Ninguno")}

## Riesgos

${list(input.risks, "Ninguno")}

## Variables o secretos requeridos

${list(input.requiredSecrets, "Ninguno")}

## Instrucciones de ejecución

${input.runInstructions || "npm test"}

## Checklist de revisión

- [ ] Los endpoints cubiertos corresponden a los requisitos listados
- [ ] Las assertions son específicas (no genéricas)
- [ ] No hay secretos versionados en colección/environment
- [ ] El pipeline CI ejecuta Newman y publica el reporte
- [ ] La cobertura estimada es razonable respecto a los requisitos evaluados
`;
}
