export interface EnvironmentVariableInput {
  key: string;
  value: string;
  secret: boolean;
}

export interface EnvironmentGeneratorOptions {
  environmentName: string;
  baseUrl: string;
  baseUrlVariable: string;
  variables: EnvironmentVariableInput[];
  existingEnvironment?: string | Record<string, unknown>;
}

interface PostmanEnvironmentValue {
  key: string;
  value: string;
  type: "default" | "secret";
  enabled: boolean;
}

export function generateOrExtendEnvironment(
  options: EnvironmentGeneratorOptions,
): Record<string, unknown> {
  const existing = options.existingEnvironment ? normalize(options.existingEnvironment) : undefined;
  const existingValues = (existing?.["values"] as PostmanEnvironmentValue[] | undefined) ?? [];
  const merged = new Map<string, PostmanEnvironmentValue>();

  for (const value of existingValues) {
    merged.set(value.key, value);
  }

  merged.set(options.baseUrlVariable, {
    key: options.baseUrlVariable,
    value: options.baseUrl,
    type: "default",
    enabled: true,
  });

  for (const variable of options.variables) {
    merged.set(variable.key, {
      key: variable.key,
      // Secret values are never written — placeholder keeps the file safe to version.
      value: variable.secret ? "" : variable.value,
      type: variable.secret ? "secret" : "default",
      enabled: true,
    });
  }

  return {
    name: options.environmentName,
    values: [...merged.values()],
    _postman_variable_scope: "environment",
  };
}

function normalize(source: string | Record<string, unknown>): Record<string, unknown> {
  return typeof source === "string" ? (JSON.parse(source) as Record<string, unknown>) : source;
}
