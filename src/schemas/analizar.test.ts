import { describe, expect, it } from "vitest";
import { ApiAnalizarInputSchema } from "./analizar.js";

describe("ApiAnalizarInputSchema", () => {
  it("rejects an input with no source at all", () => {
    const result = ApiAnalizarInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts input with only requirement_text", () => {
    const result = ApiAnalizarInputSchema.safeParse({
      requirement_text: "Como usuario quiero iniciar sesión.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a repository reference", () => {
    const result = ApiAnalizarInputSchema.safeParse({
      repository: { owner: "aiquaa-labs", name: "api" },
    });
    expect(result.success).toBe(true);
  });

  it("defaults response_format to markdown", () => {
    const result = ApiAnalizarInputSchema.parse({
      requirement_text: "Texto de requisito con más de 10 caracteres.",
    });
    expect(result.response_format).toBe("markdown");
  });
});
