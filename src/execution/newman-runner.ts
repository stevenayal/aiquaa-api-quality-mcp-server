import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NewmanRunSummary, NewmanTestResult } from "../types/index.js";
import { isLikelyProductionHost } from "../generators/newman-generator.js";
import { assertProductionRunAuthorized } from "../security/guardrails.js";
import { runCommand, type CommandRunner } from "./command-runner.js";

export interface NewmanRunOptions {
  collection: Record<string, unknown>;
  environment?: Record<string, unknown>;
  dataFile?: Record<string, unknown>[];
  folder?: string;
  iterations: number;
  timeoutMs: number;
  reporters: Array<"cli" | "json" | "junit" | "htmlextra">;
  insecure: boolean;
  bail: boolean;
  delayRequestMs: number;
  globalVariables: Record<string, string>;
  confirmedProductionRun: boolean;
}

export async function runNewman(
  options: NewmanRunOptions,
  runner: CommandRunner = runCommand,
): Promise<NewmanRunSummary> {
  const baseUrlVariable = findEnvironmentValue(options.environment, "baseUrl") ?? "";
  assertProductionRunAuthorized(
    isLikelyProductionHost(baseUrlVariable),
    options.confirmedProductionRun,
  );

  const workdir = await mkdtemp(join(tmpdir(), "aiquaa-newman-"));
  try {
    const collectionPath = join(workdir, "collection.json");
    const resultsPath = join(workdir, "results.json");
    await writeFile(collectionPath, JSON.stringify(options.collection), "utf-8");

    const args = ["run", collectionPath, "-r", "json", "--reporter-json-export", resultsPath];

    if (options.environment) {
      const environmentPath = join(workdir, "environment.json");
      await writeFile(environmentPath, JSON.stringify(options.environment), "utf-8");
      args.push("-e", environmentPath);
    }
    if (options.dataFile) {
      const dataPath = join(workdir, "data.json");
      await writeFile(dataPath, JSON.stringify(options.dataFile), "utf-8");
      args.push("-d", dataPath);
    }
    if (options.folder) args.push("--folder", options.folder);
    if (options.iterations > 1) args.push("-n", String(options.iterations));
    if (options.bail) args.push("--bail");
    if (options.insecure) args.push("--insecure");
    if (options.delayRequestMs > 0) args.push("--delay-request", String(options.delayRequestMs));
    for (const [key, value] of Object.entries(options.globalVariables)) {
      args.push("--global-var", `${key}=${value}`);
    }

    try {
      await runner({ command: "newman", args, timeoutMs: options.timeoutMs });
    } catch {
      // Newman exits non-zero on assertion failures; the JSON report still has the data we need.
    }

    const raw = await readFile(resultsPath, "utf-8");
    return parseNewmanJson(JSON.parse(raw) as Record<string, unknown>);
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

function findEnvironmentValue(
  environment: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const values = environment?.["values"];
  if (!Array.isArray(values)) return undefined;
  const entry = values.find(
    (value): value is { key: string; value: string } =>
      typeof value === "object" && value !== null && (value as { key?: unknown }).key === key,
  );
  return entry?.value;
}

interface NewmanJsonAssertion {
  assertion: string;
  error?: { message?: string };
}

interface NewmanJsonExecution {
  item?: { name?: string };
  assertions?: NewmanJsonAssertion[];
  response?: { responseTime?: number };
}

export function parseNewmanJson(raw: Record<string, unknown>): NewmanRunSummary {
  const run = (raw["run"] as Record<string, unknown> | undefined) ?? {};
  const executions = (run["executions"] as NewmanJsonExecution[] | undefined) ?? [];
  const stats =
    (run["stats"] as Record<string, { total?: number; failed?: number }> | undefined) ?? {};
  const timings =
    (run["timings"] as
      | { responseAverage?: number; completed?: number; started?: number }
      | undefined) ?? {};

  const results: NewmanTestResult[] = [];
  for (const execution of executions) {
    const requestName = execution.item?.name ?? "unknown";
    for (const assertion of execution.assertions ?? []) {
      results.push({
        requestName,
        assertionName: assertion.assertion,
        passed: !assertion.error,
        ...(assertion.error?.message ? { errorMessage: assertion.error.message } : {}),
        ...(execution.response?.responseTime !== undefined
          ? { responseTimeMs: execution.response.responseTime }
          : {}),
      });
    }
  }

  const durationMs =
    timings.completed !== undefined && timings.started !== undefined
      ? timings.completed - timings.started
      : 0;

  return {
    collectionName:
      typeof raw["collection"] === "object" && raw["collection"] !== null
        ? ((raw["collection"] as { info?: { name?: string } }).info?.name ?? "collection")
        : "collection",
    totalRequests: stats["requests"]?.total ?? executions.length,
    totalAssertions: stats["assertions"]?.total ?? results.length,
    failedAssertions: stats["assertions"]?.failed ?? results.filter((r) => !r.passed).length,
    durationMs,
    results,
  };
}
