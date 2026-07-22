import type { SourceReference, ValidationRule, ValidationRuleKind } from "../types/index.js";

export interface ValidatorSourceFile {
  path: string;
  content: string;
}

/**
 * Extracts validation rules from common backend validator styles via regex
 * heuristics (class-validator, Zod, Joi, FluentValidation, Pydantic). Every
 * rule keeps its file source so callers can trace provenance and avoid
 * inventing constraints that aren't actually enforced in code.
 */
export function extractValidationRules(file: ValidatorSourceFile): ValidationRule[] {
  return [
    ...extractClassValidatorRules(file),
    ...extractZodRules(file),
    ...extractFluentValidationRules(file),
    ...extractPydanticRules(file),
  ];
}

function source(path: string): SourceReference {
  return { path, provenance: "validator" };
}

function push(
  rules: ValidationRule[],
  field: string,
  kind: ValidationRuleKind,
  detail: string,
  path: string,
): void {
  rules.push({ field, kind, detail, source: source(path) });
}

function extractClassValidatorRules(file: ValidatorSourceFile): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const fieldBlockRegex =
    /((?:@[A-Za-z]+\([^)]*\)\s*)+)\s*(?:public\s+|readonly\s+)?([A-Za-z0-9_]+)\s*[?!]?\s*:/g;
  let match: RegExpExecArray | null;
  while ((match = fieldBlockRegex.exec(file.content)) !== null) {
    const decorators = match[1] ?? "";
    const field = match[2] ?? "";
    if (/@IsNotEmpty/.test(decorators)) push(rules, field, "required", "@IsNotEmpty", file.path);
    if (/@IsOptional/.test(decorators)) continue;
    const maxLength = /@MaxLength\(\s*(\d+)/.exec(decorators);
    if (maxLength?.[1]) push(rules, field, "max_length", `@MaxLength(${maxLength[1]})`, file.path);
    const minLength = /@MinLength\(\s*(\d+)/.exec(decorators);
    if (minLength?.[1]) push(rules, field, "min_length", `@MinLength(${minLength[1]})`, file.path);
    if (/@IsEmail/.test(decorators)) push(rules, field, "format", "@IsEmail", file.path);
    if (/@IsUUID/.test(decorators)) push(rules, field, "format", "@IsUUID", file.path);
    const enumMatch = /@IsEnum\(\s*([A-Za-z0-9_]+)/.exec(decorators);
    if (enumMatch?.[1]) push(rules, field, "enum", `@IsEnum(${enumMatch[1]})`, file.path);
    const minMatch = /@Min\(\s*(-?\d+)/.exec(decorators);
    if (minMatch?.[1]) push(rules, field, "min", `@Min(${minMatch[1]})`, file.path);
    const maxMatch = /@Max\(\s*(-?\d+)/.exec(decorators);
    if (maxMatch?.[1]) push(rules, field, "max", `@Max(${maxMatch[1]})`, file.path);
  }
  return rules;
}

function extractZodRules(file: ValidatorSourceFile): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const fieldRegex = /([A-Za-z0-9_]+)\s*:\s*z\.([^,\n]+)(?:,|\n)/g;
  let match: RegExpExecArray | null;
  while ((match = fieldRegex.exec(file.content)) !== null) {
    const field = match[1] ?? "";
    const chain = match[2] ?? "";
    if (!/\.optional\(\)/.test(chain) && /^string|^number|^boolean|^object|^array/.test(chain)) {
      push(rules, field, "required", `z.${chain.split(".")[0]}(...)`, file.path);
    }
    const minMatch = /\.min\(\s*(\d+)/.exec(chain);
    if (minMatch?.[1]) push(rules, field, "min_length", `.min(${minMatch[1]})`, file.path);
    const maxMatch = /\.max\(\s*(\d+)/.exec(chain);
    if (maxMatch?.[1]) push(rules, field, "max_length", `.max(${maxMatch[1]})`, file.path);
    if (/\.email\(\)/.test(chain)) push(rules, field, "format", ".email()", file.path);
    const enumMatch = /\.enum\(\s*\[([^\]]+)]/.exec(chain);
    if (enumMatch?.[1]) push(rules, field, "enum", `.enum([${enumMatch[1]}])`, file.path);
  }
  return rules;
}

function extractFluentValidationRules(file: ValidatorSourceFile): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const ruleRegex = /RuleFor\s*\(\s*\w+\s*=>\s*\w+\.([A-Za-z0-9_]+)\s*\)((?:\s*\.\w+\([^)]*\))+)/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(file.content)) !== null) {
    const field = match[1] ?? "";
    const chain = match[2] ?? "";
    if (/\.NotEmpty\(\)/.test(chain)) push(rules, field, "required", ".NotEmpty()", file.path);
    const maxLength = /\.MaximumLength\(\s*(\d+)/.exec(chain);
    if (maxLength?.[1])
      push(rules, field, "max_length", `.MaximumLength(${maxLength[1]})`, file.path);
    const minLength = /\.MinimumLength\(\s*(\d+)/.exec(chain);
    if (minLength?.[1])
      push(rules, field, "min_length", `.MinimumLength(${minLength[1]})`, file.path);
    if (/\.EmailAddress\(\)/.test(chain))
      push(rules, field, "format", ".EmailAddress()", file.path);
  }
  return rules;
}

function extractPydanticRules(file: ValidatorSourceFile): ValidationRule[] {
  const rules: ValidationRule[] = [];
  const fieldRegex = /([A-Za-z0-9_]+)\s*:\s*[A-Za-z0-9_[\]]+\s*=\s*Field\(([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = fieldRegex.exec(file.content)) !== null) {
    const field = match[1] ?? "";
    const args = match[2] ?? "";
    if (/\.\.\.\s*,/.test(args) || /^\s*\.\.\.\s*$/.test(args)) {
      push(rules, field, "required", "Field(...)", file.path);
    }
    const maxLength = /max_length\s*=\s*(\d+)/.exec(args);
    if (maxLength?.[1]) push(rules, field, "max_length", `max_length=${maxLength[1]}`, file.path);
    const minLength = /min_length\s*=\s*(\d+)/.exec(args);
    if (minLength?.[1]) push(rules, field, "min_length", `min_length=${minLength[1]}`, file.path);
  }
  return rules;
}
