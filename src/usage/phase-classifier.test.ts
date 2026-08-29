import { describe, expect, it } from "vitest";
import { classifyPhase } from "./phase-classifier.js";

describe("classifyPhase", () => {
  it("classifies api_ejecutar and api_fallos as ejecucion", () => {
    expect(classifyPhase("api_ejecutar")).toBe("ejecucion");
    expect(classifyPhase("api_fallos")).toBe("ejecucion");
  });

  it("classifies everything else as desarrollo", () => {
    expect(classifyPhase("api_generar")).toBe("desarrollo");
    expect(classifyPhase("api_analizar")).toBe("desarrollo");
    expect(classifyPhase("api_uso_tokens")).toBe("desarrollo");
  });
});
