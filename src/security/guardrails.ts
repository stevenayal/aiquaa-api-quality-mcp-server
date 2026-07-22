export class GuardrailViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuardrailViolationError";
  }
}

export function assertProductionRunAuthorized(hostIsProduction: boolean, confirmed: boolean): void {
  if (hostIsProduction && !confirmed) {
    throw new GuardrailViolationError(
      "El host de destino parece de producción. Ejecutá de nuevo con confirmed_production_run=true si estás seguro.",
    );
  }
}

export function assertDryRunDefault(dryRun: unknown): asserts dryRun is boolean {
  if (typeof dryRun !== "boolean") {
    throw new GuardrailViolationError("dryRun debe ser explícito (true por defecto).");
  }
}
