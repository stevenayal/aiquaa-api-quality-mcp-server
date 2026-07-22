import { describe, expect, it } from "vitest";
import { generateOrExtendEnvironment } from "./environment-generator.js";

describe("generateOrExtendEnvironment", () => {
  it("never writes a real value for secret variables", () => {
    const env = generateOrExtendEnvironment({
      environmentName: "My API Local",
      baseUrl: "http://localhost:5000",
      baseUrlVariable: "baseUrl",
      variables: [{ key: "accessToken", value: "should-not-appear", secret: true }],
    });
    const values = env["values"] as Array<{ key: string; value: string; type: string }>;
    const secretVar = values.find((v) => v.key === "accessToken")!;
    expect(secretVar.value).toBe("");
    expect(secretVar.type).toBe("secret");
  });

  it("merges with an existing environment instead of dropping variables", () => {
    const existing = {
      values: [{ key: "customVar", value: "keep-me", type: "default", enabled: true }],
    };
    const env = generateOrExtendEnvironment({
      environmentName: "My API",
      baseUrl: "http://localhost:5000",
      baseUrlVariable: "baseUrl",
      variables: [],
      existingEnvironment: existing,
    });
    const values = env["values"] as Array<{ key: string; value: string }>;
    expect(values.find((v) => v.key === "customVar")?.value).toBe("keep-me");
    expect(values.find((v) => v.key === "baseUrl")?.value).toBe("http://localhost:5000");
  });
});
