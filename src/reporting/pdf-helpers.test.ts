import { describe, expect, it, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writePdfReport } from "./pdf-helpers.js";

describe("writePdfReport", () => {
  let workdir: string;

  afterEach(async () => {
    if (workdir) await rm(workdir, { recursive: true, force: true });
  });

  it("creates missing directories and writes the buffer", async () => {
    workdir = await mkdtemp(join(tmpdir(), "aiquaa-pdf-helpers-"));
    const path = join(workdir, "nested", "report.pdf");
    const buffer = Buffer.from("%PDF-1.4\n");

    const returnedPath = await writePdfReport(path, buffer);

    expect(returnedPath).toBe(path);
    const written = await readFile(path);
    expect(written.equals(buffer)).toBe(true);
  });
});
