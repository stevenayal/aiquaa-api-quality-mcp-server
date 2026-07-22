export interface AssertionSpec {
  name: string;
  traceabilityIds: string[];
  body: string;
}

export interface TestScriptOptions {
  expectedStatus: number;
  requiredFields: string[];
  requirementIds: string[];
  maxResponseTimeMs?: number;
  expectedContentType?: string;
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

export function buildBearerAuthPreRequestScript(tokenVariable = "accessToken"): string {
  return [
    "pm.request.headers.upsert({",
    '  key: "Authorization",',
    `  value: \`Bearer \${pm.collectionVariables.get(${JSON.stringify(tokenVariable)})}\`,`,
    "});",
  ].join("\n");
}
