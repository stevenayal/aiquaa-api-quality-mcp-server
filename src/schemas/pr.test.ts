import { describe, expect, it } from "vitest";
import { ApiPrInputSchema } from "./pr.js";

describe("ApiPrInputSchema", () => {
  it("defaults dry_run and draft to true", () => {
    const result = ApiPrInputSchema.parse({
      repository: { owner: "aiquaa-labs", name: "api" },
      files: [{ path: "a.json", content: "{}" }],
    });
    expect(result.dry_run).toBe(true);
    expect(result.draft).toBe(true);
  });

  it("requires at least one file", () => {
    const result = ApiPrInputSchema.safeParse({
      repository: { owner: "aiquaa-labs", name: "api" },
      files: [],
    });
    expect(result.success).toBe(false);
  });
});
