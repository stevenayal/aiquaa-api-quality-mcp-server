import { describe, expect, it } from "vitest";
import { extractValidationRules } from "./validator-analyzer.js";

describe("extractValidationRules", () => {
  it("extracts class-validator decorators", () => {
    const file = {
      path: "create-user.dto.ts",
      content: `
export class CreateUserDto {
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(Role)
  role: Role;
}
`,
    };
    const rules = extractValidationRules(file);
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name", kind: "required" }),
        expect.objectContaining({ field: "name", kind: "max_length", detail: "@MaxLength(100)" }),
        expect.objectContaining({ field: "email", kind: "format", detail: "@IsEmail" }),
        expect.objectContaining({ field: "role", kind: "enum" }),
      ]),
    );
  });

  it("extracts Zod schema rules", () => {
    const file = {
      path: "schema.ts",
      content: `
const schema = z.object({
  email: z.string().email(),
  bio: z.string().max(500).optional(),
});
`,
    };
    const rules = extractValidationRules(file);
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email", kind: "required" }),
        expect.objectContaining({ field: "email", kind: "format", detail: ".email()" }),
        expect.objectContaining({ field: "bio", kind: "max_length", detail: ".max(500)" }),
      ]),
    );
  });

  it("extracts FluentValidation rules", () => {
    const file = {
      path: "OrderValidator.cs",
      content: `
public class OrderValidator : AbstractValidator<Order> {
  public OrderValidator() {
    RuleFor(x => x.CustomerEmail).NotEmpty().EmailAddress();
    RuleFor(x => x.Notes).MaximumLength(1000);
  }
}
`,
    };
    const rules = extractValidationRules(file);
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "CustomerEmail", kind: "required" }),
        expect.objectContaining({
          field: "CustomerEmail",
          kind: "format",
          detail: ".EmailAddress()",
        }),
        expect.objectContaining({
          field: "Notes",
          kind: "max_length",
          detail: ".MaximumLength(1000)",
        }),
      ]),
    );
  });

  it("extracts Pydantic Field rules", () => {
    const file = {
      path: "models.py",
      content: `
class Item(BaseModel):
    name: str = Field(..., max_length=50)
`,
    };
    const rules = extractValidationRules(file);
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "name", kind: "required" }),
        expect.objectContaining({ field: "name", kind: "max_length", detail: "max_length=50" }),
      ]),
    );
  });

  it("returns no rules for unrelated source", () => {
    const rules = extractValidationRules({ path: "readme.ts", content: "export const x = 1;" });
    expect(rules).toHaveLength(0);
  });
});
