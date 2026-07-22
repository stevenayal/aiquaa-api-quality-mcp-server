import type { ApiEjecutarInput } from "../schemas/ejecutar.js";
import type { NewmanRunSummary } from "../types/index.js";
import { runNewman } from "../execution/newman-runner.js";

export async function runApiEjecutar(input: ApiEjecutarInput): Promise<NewmanRunSummary> {
  const collection: Record<string, unknown> =
    typeof input.collection === "string"
      ? (JSON.parse(input.collection) as Record<string, unknown>)
      : input.collection;
  const environment: Record<string, unknown> | undefined = input.environment
    ? typeof input.environment === "string"
      ? (JSON.parse(input.environment) as Record<string, unknown>)
      : input.environment
    : undefined;
  const dataFile: Record<string, unknown>[] | undefined = input.data_file
    ? ((typeof input.data_file === "string"
        ? JSON.parse(input.data_file)
        : input.data_file) as Record<string, unknown>[])
    : undefined;

  return runNewman({
    collection,
    ...(environment ? { environment } : {}),
    ...(dataFile ? { dataFile } : {}),
    ...(input.folder ? { folder: input.folder } : {}),
    iterations: input.iterations,
    timeoutMs: input.timeout_ms,
    reporters: input.reporters,
    insecure: input.insecure,
    bail: input.bail,
    delayRequestMs: input.delay_request_ms,
    globalVariables: input.global_variables,
    confirmedProductionRun: input.confirmed_production_run,
  });
}
