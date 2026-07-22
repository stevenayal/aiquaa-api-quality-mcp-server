import { SECRET_LIKE_ENV_KEYS } from "../constants.js";

const SECRET_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "AWS access key", pattern: /AKIA[0-9A-Z]{16}/ },
  { name: "GitHub token", pattern: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  {
    name: "generic bearer JWT",
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  },
  { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: "generic API key assignment",
    pattern: /(api[_-]?key|apikey)\s*[:=]\s*["'`][A-Za-z0-9_-]{16,}["'`]/i,
  },
];

export function scanForSecrets(content: string): string[] {
  const findings: string[] = [];
  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(content)) findings.push(name);
  }
  return findings;
}

/**
 * Flags Postman variable-like key/value pairs whose key looks secret AND
 * whose value is non-empty/non-templated — i.e. an actual value was
 * hardcoded instead of left blank or referenced via {{var}}.
 */
export function findHardcodedSecretVariables(
  variables: Array<{ key: string; value: string }>,
): Array<{ key: string; reason: string }> {
  const findings: Array<{ key: string; reason: string }> = [];
  for (const variable of variables) {
    const keyLower = variable.key.toLowerCase();
    const looksSecret = SECRET_LIKE_ENV_KEYS.some((needle) => keyLower.includes(needle));
    const hasRealValue =
      variable.value.trim().length > 0 && !/^\{\{.*}}$/.test(variable.value.trim());
    if (looksSecret && hasRealValue) {
      findings.push({
        key: variable.key,
        reason: `La variable "${variable.key}" parece un secreto con valor hardcodeado.`,
      });
    }
  }
  return findings;
}
