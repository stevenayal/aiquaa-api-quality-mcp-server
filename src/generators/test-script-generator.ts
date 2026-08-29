export interface AssertionSpec {
  name: string;
  traceabilityIds: string[];
  body: string;
}

export interface DbSandboxRef {
  baseUrlVariable: string;
  apiKeyVariable: string;
}

export interface DbPreCondition {
  query: string;
  expect?: unknown;
  /** Collection variable to store the query result (or extractPath of it) into, before the request fires. */
  captureAs?: string | undefined;
  /** Dot/bracket path into the sandbox response, e.g. "data[0].id". Omit to capture the whole response. */
  extractPath?: string | undefined;
}

export interface DbPostCheck {
  query: string;
  expect?: unknown;
  description: string;
  /** Collection variable to store the query result (or extractPath of it) into, after the response. */
  captureAs?: string | undefined;
  /** Dot/bracket path into the sandbox response, e.g. "data[0].id". Omit to capture the whole response. */
  extractPath?: string | undefined;
}

export interface TestScriptOptions {
  expectedStatus: number;
  requiredFields: string[];
  requirementIds: string[];
  maxResponseTimeMs?: number;
  expectedContentType?: string;
  dbPostCheck?: DbPostCheck;
  sqlSandbox?: DbSandboxRef;
}

/**
 * Builds pm.test assertions with explicit traceability (REQ-/AC-/BR- ids) in
 * the test name, per the "no generic assertions" rule: every assertion here
 * checks a concrete status, field, or type — never just "response exists".
 */
export function buildAssertions(options: TestScriptOptions): AssertionSpec[] {
  const tag = options.requirementIds.length > 0 ? `${options.requirementIds.join(" | ")} | ` : "";
  const assertions: AssertionSpec[] = [];

  assertions.push({
    name: `${tag}status is ${options.expectedStatus}`,
    traceabilityIds: options.requirementIds,
    body: `pm.test(${JSON.stringify(`${tag}status is ${options.expectedStatus}`)}, () => {\n  pm.response.to.have.status(${options.expectedStatus});\n});`,
  });

  if (options.expectedContentType) {
    const name = `${tag}Content-Type is ${options.expectedContentType}`;
    assertions.push({
      name,
      traceabilityIds: options.requirementIds,
      body: `pm.test(${JSON.stringify(name)}, () => {\n  pm.response.to.have.header("Content-Type");\n  pm.expect(pm.response.headers.get("Content-Type")).to.include(${JSON.stringify(options.expectedContentType)});\n});`,
    });
  }

  for (const field of options.requiredFields) {
    const name = `${tag}response contains ${field}`;
    assertions.push({
      name,
      traceabilityIds: options.requirementIds,
      body: `pm.test(${JSON.stringify(name)}, () => {\n  const body = pm.response.json();\n  pm.expect(body).to.have.property(${JSON.stringify(field)});\n  pm.expect(body.${field}).to.not.be.undefined;\n});`,
    });
  }

  if (options.maxResponseTimeMs) {
    const name = `${tag}response time is below ${options.maxResponseTimeMs}ms`;
    assertions.push({
      name,
      traceabilityIds: options.requirementIds,
      body: `pm.test(${JSON.stringify(name)}, () => {\n  pm.expect(pm.response.responseTime).to.be.below(${options.maxResponseTimeMs});\n});`,
    });
  }

  if (options.dbPostCheck && options.sqlSandbox) {
    assertions.push(
      buildDbPostCheckAssertion(options.dbPostCheck, options.sqlSandbox, options.requirementIds),
    );
  }

  return assertions;
}

export function joinAssertions(assertions: AssertionSpec[]): string {
  return assertions.map((assertion) => assertion.body).join("\n\n");
}

export function buildCaptureIdScript(variableName: string, jsonField = "id"): string {
  return [
    "const body = pm.response.json();",
    `if (!body.${jsonField}) {`,
    `  throw new Error("Expected ${jsonField} was not returned");`,
    "}",
    `pm.collectionVariables.set(${JSON.stringify(variableName)}, body.${jsonField});`,
  ].join("\n");
}

export function buildSqlSandboxHelperScript(
  baseUrlVariable: string,
  apiKeyVariable: string,
): string {
  return [
    `const sqlSandboxBaseUrl = pm.collectionVariables.get(${JSON.stringify(baseUrlVariable)});`,
    "if (!sqlSandboxBaseUrl) {",
    `  throw new Error("Configurá la variable de colección \\"${baseUrlVariable}\\" con la URL del sandbox SQL antes de correr esta colección.");`,
    "}",
    `const sqlSandboxApiKey = pm.collectionVariables.get(${JSON.stringify(apiKeyVariable)}) || pm.environment.get(${JSON.stringify(apiKeyVariable)});`,
    "if (!sqlSandboxApiKey) {",
    `  throw new Error("Configurá la variable \\"${apiKeyVariable}\\" (environment) con la API key del sandbox SQL antes de correr esta colección.");`,
    "}",
    // Path getter compartido por los pre/post-request de captura de datos
    // dinámicos (dbValidation.*.captureAs). Declarado como global implícito
    // (sin var/let/const), igual que `sqlSandboxBaseUrl`/`sqlSandboxApiKey`
    // arriba, para que esté disponible en el script del request sin volver a
    // declararlo por cada item.
    'if (typeof aiquaaGetPath === "undefined") {',
    "  aiquaaGetPath = function (obj, path) {",
    "    return path",
    '      .replace(/\\[(\\d+)\\]/g, ".$1")',
    '      .split(".")',
    "      .filter(Boolean)",
    "      .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);",
    "  };",
    "}",
  ].join("\n");
}

function buildCaptureLines(
  captureAs: string,
  extractPath: string | undefined,
  query: string,
): string[] {
  const valueExpr = extractPath
    ? `aiquaaGetPath(result, ${JSON.stringify(extractPath)})`
    : "result";
  return [
    `  const capturedValue = ${valueExpr};`,
    "  if (capturedValue === undefined) {",
    `    throw new Error(\`No se pudo obtener ${extractPath ? `"${extractPath.replace(/`/g, "'")}"` : "el resultado"} de la consulta SQL "${query.replace(/`/g, "'").replace(/"/g, '\\"')}" para capturar "${captureAs}".\`);`,
    "  }",
    `  pm.collectionVariables.set(${JSON.stringify(captureAs)}, capturedValue);`,
  ];
}

export function buildTemplateClonePrerequestScript(
  templateVariable: string,
  bodyVariable: string,
  mutations: Record<string, unknown>,
): string {
  const lines = [
    `const body = JSON.parse(pm.collectionVariables.get(${JSON.stringify(templateVariable)}));`,
  ];
  for (const [field, value] of Object.entries(mutations)) {
    lines.push(`body[${JSON.stringify(field)}] = ${JSON.stringify(value)};`);
  }
  lines.push(`pm.collectionVariables.set(${JSON.stringify(bodyVariable)}, JSON.stringify(body));`);
  return lines.join("\n");
}

function buildSqlSandboxRequestObject(sandbox: DbSandboxRef, query: string): string {
  return [
    "{",
    `  url: \`\${pm.collectionVariables.get(${JSON.stringify(sandbox.baseUrlVariable)})}/query\`,`,
    '  method: "POST",',
    "  header: {",
    '    "Content-Type": "application/json",',
    `    Authorization: \`Bearer \${pm.collectionVariables.get(${JSON.stringify(sandbox.apiKeyVariable)})}\`,`,
    "  },",
    "  body: {",
    '    mode: "raw",',
    `    raw: JSON.stringify({ query: ${JSON.stringify(query)} }),`,
    "  },",
    "}",
  ].join("\n");
}

export function buildDbPreconditionScript(
  preCondition: DbPreCondition,
  sandbox: DbSandboxRef,
): string {
  const lines = [
    `pm.sendRequest(${buildSqlSandboxRequestObject(sandbox, preCondition.query)}, (error, response) => {`,
    "  if (error) {",
    "    throw new Error(`Precondición SQL falló: ${error.message}`);",
    "  }",
    "  const result = response.json();",
  ];

  if (preCondition.expect !== undefined) {
    lines.push(
      `  if (JSON.stringify(result) !== JSON.stringify(${JSON.stringify(preCondition.expect)})) {`,
      `    throw new Error(\`Precondición SQL no cumplida para "${preCondition.query.replace(/`/g, "'")}"\`);`,
      "  }",
    );
  }

  if (preCondition.captureAs) {
    lines.push(
      ...buildCaptureLines(preCondition.captureAs, preCondition.extractPath, preCondition.query),
    );
  }

  lines.push("});");
  return lines.join("\n");
}

export function buildDbPostCheckAssertion(
  postCheck: DbPostCheck,
  sandbox: DbSandboxRef,
  requirementIds: string[],
): AssertionSpec {
  const tag = requirementIds.length > 0 ? `${requirementIds.join(" | ")} | ` : "";
  const name = `${tag}${postCheck.description}`;
  const assertionLines =
    postCheck.expect !== undefined
      ? [`    pm.expect(result).to.eql(${JSON.stringify(postCheck.expect)});`]
      : [];
  const captureLines = postCheck.captureAs
    ? buildCaptureLines(postCheck.captureAs, postCheck.extractPath, postCheck.query).map(
        (line) => `  ${line}`,
      )
    : [];
  const body = [
    `pm.test(${JSON.stringify(name)}, () => {`,
    `  pm.sendRequest(${buildSqlSandboxRequestObject(sandbox, postCheck.query)}, (error, response) => {`,
    "    pm.expect(error).to.be.null;",
    "    const result = response.json();",
    ...assertionLines,
    ...captureLines,
    "  });",
    "});",
  ].join("\n");

  return { name, traceabilityIds: requirementIds, body };
}

export function buildBearerAuthPreRequestScript(tokenVariable = "accessToken"): string {
  return [
    "pm.request.headers.upsert({",
    '  key: "Authorization",',
    `  value: \`Bearer \${pm.collectionVariables.get(${JSON.stringify(tokenVariable)})}\`,`,
    "});",
  ].join("\n");
}
