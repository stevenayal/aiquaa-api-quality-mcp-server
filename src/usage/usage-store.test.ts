import { describe, expect, it, afterEach } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordUsageEvent, readUsageEvents } from "./usage-store.js";
import type { UsageEvent } from "./types.js";

describe("usage-store", () => {
  let workdir: string;
  let logPath: string;

  afterEach(async () => {
    if (workdir) await rm(workdir, { recursive: true, force: true });
  });

  const event = (overrides: Partial<UsageEvent> = {}): UsageEvent => ({
    toolName: "api_generar",
    phase: "desarrollo",
    timestamp: "2026-08-29T00:00:00.000Z",
    durationMs: 5,
    estimatedInputTokens: 10,
    estimatedOutputTokens: 5,
    ...overrides,
  });

  it("appends events and reads them back", async () => {
    workdir = await mkdtemp(join(tmpdir(), "aiquaa-usage-store-"));
    logPath = join(workdir, "nested", "usage-log.jsonl");

    await recordUsageEvent(event({ toolName: "api_generar" }), logPath);
    await recordUsageEvent(event({ toolName: "api_ejecutar", phase: "ejecucion" }), logPath);

    const events = await readUsageEvents({}, logPath);
    expect(events).toHaveLength(2);
    expect(events[0]?.toolName).toBe("api_generar");
    expect(events[1]?.toolName).toBe("api_ejecutar");
  });

  it("filters by date range and phase", async () => {
    workdir = await mkdtemp(join(tmpdir(), "aiquaa-usage-store-"));
    logPath = join(workdir, "usage-log.jsonl");

    await recordUsageEvent(event({ timestamp: "2026-08-01T00:00:00.000Z" }), logPath);
    await recordUsageEvent(
      event({ timestamp: "2026-08-29T00:00:00.000Z", phase: "ejecucion", toolName: "api_ejecutar" }),
      logPath,
    );

    const filteredByDate = await readUsageEvents({ desde: "2026-08-15T00:00:00.000Z" }, logPath);
    expect(filteredByDate).toHaveLength(1);
    expect(filteredByDate[0]?.toolName).toBe("api_ejecutar");

    const filteredByPhase = await readUsageEvents({ fase: "desarrollo" }, logPath);
    expect(filteredByPhase).toHaveLength(1);
    expect(filteredByPhase[0]?.toolName).toBe("api_generar");
  });

  it("returns an empty array when the log file does not exist", async () => {
    workdir = await mkdtemp(join(tmpdir(), "aiquaa-usage-store-"));
    const missingPath = join(workdir, "missing.jsonl");
    expect(await readUsageEvents({}, missingPath)).toEqual([]);
  });

  it("ignores corrupted lines instead of throwing", async () => {
    workdir = await mkdtemp(join(tmpdir(), "aiquaa-usage-store-"));
    logPath = join(workdir, "usage-log.jsonl");
    await writeFile(logPath, `${JSON.stringify(event())}\nnot json\n`, "utf-8");

    const events = await readUsageEvents({}, logPath);
    expect(events).toHaveLength(1);
  });

  it("never throws even if the log path is unwritable", async () => {
    workdir = await mkdtemp(join(tmpdir(), "aiquaa-usage-store-"));
    // Create a directory where the log file would go, so appendFile fails (EISDIR).
    const unwritablePath = join(workdir, "usage-log.jsonl");
    await mkdir(unwritablePath);

    await expect(recordUsageEvent(event(), unwritablePath)).resolves.toBeUndefined();
  });
});
