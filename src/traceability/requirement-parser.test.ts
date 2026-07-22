import { describe, expect, it } from "vitest";
import { parseRequirementsFromText } from "./requirement-parser.js";

describe("parseRequirementsFromText", () => {
  it("classifies requirements, acceptance criteria and business rules", () => {
    const text = `
Como cliente quiero recuperar mi contraseña para volver a acceder a mi cuenta.
Given el usuario tiene una cuenta activa
When solicita recuperación de contraseña
Then recibe un email con el link de reseteo
El sistema no debe permitir más de 3 intentos por hora.
`;
    const model = parseRequirementsFromText(text);
    expect(model.requirements).toHaveLength(1);
    expect(model.requirements[0]!.id).toBe("REQ-001");
    expect(model.requirements[0]!.kind).toBe("user_story");
    expect(model.acceptanceCriteria).toHaveLength(3);
    expect(model.acceptanceCriteria[0]!.id).toBe("AC-001");
    expect(model.acceptanceCriteria[0]!.parentId).toBe("REQ-001");
    expect(model.businessRules).toHaveLength(1);
    expect(model.businessRules[0]!.id).toBe("BR-001");
  });

  it("respects id offsets to continue existing numbering", () => {
    const model = parseRequirementsFromText("El campo debe ser único.", { offsets: { BR: 5 } });
    expect(model.businessRules[0]!.id).toBe("BR-005");
  });

  it("returns empty arrays for blank input", () => {
    const model = parseRequirementsFromText("   \n  ");
    expect(model.requirements).toHaveLength(0);
    expect(model.acceptanceCriteria).toHaveLength(0);
    expect(model.businessRules).toHaveLength(0);
  });
});
