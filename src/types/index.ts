export type ResponseFormat = "json" | "markdown" | "files" | "patch";

export type Provenance =
  | "openapi"
  | "controller"
  | "validator"
  | "existing_test"
  | "requirement"
  | "estimated";

export type CoverageStatus =
  | "covered"
  | "partially_covered"
  | "uncovered"
  | "outdated"
  | "blocked"
  | "not_applicable";

export type ChangeDecision = "create" | "extend" | "modify" | "keep" | "deprecate" | "block";

export type DetectedFramework =
  | "express"
  | "nestjs"
  | "fastify"
  | "spring-boot"
  | "aspnet-core"
  | "fastapi"
  | "quarkus"
  | "django"
  | "flask"
  | "unknown";

export type DetectedLanguage =
  | "typescript"
  | "javascript"
  | "java"
  | "csharp"
  | "python"
  | "unknown";

export interface SourceReference {
  path: string;
  line?: number;
  provenance: Provenance;
}

export interface AuthenticationRequirement {
  type: "none" | "bearer" | "api_key" | "basic" | "oauth2" | "other";
  headerName?: string;
  scheme?: string;
  roles?: string[];
  source: SourceReference;
}

export type JsonSchemaType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"
  | "null";

export interface JsonSchema {
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  nullable?: boolean;
  description?: string;
  $ref?: string;
  additionalProperties?: boolean | JsonSchema;
}

export type ValidationRuleKind =
  | "required"
  | "type"
  | "format"
  | "min_length"
  | "max_length"
  | "min"
  | "max"
  | "pattern"
  | "enum"
  | "unique"
  | "custom";

export interface ValidationRule {
  field: string;
  kind: ValidationRuleKind;
  detail: string;
  source: SourceReference;
}

export interface BusinessRuleReference {
  id: string;
  title: string;
  description?: string;
  source: SourceReference;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface ApiOperation {
  operationId: string;
  method: HttpMethod;
  path: string;
  controller?: string;
  handler?: string;
  authentication?: AuthenticationRequirement;
  requestSchema?: JsonSchema;
  responseSchemas: Record<string, JsonSchema>;
  validationRules: ValidationRule[];
  businessRules: BusinessRuleReference[];
  sourceFiles: SourceReference[];
}

export interface DetectedStack {
  language: DetectedLanguage;
  framework: DetectedFramework;
  confidence: number;
  evidence: string[];
}

export type RequirementKind =
  | "requirement"
  | "user_story"
  | "acceptance_criterion"
  | "business_rule";

export interface RequirementItem {
  id: string;
  kind: RequirementKind;
  text: string;
  parentId?: string;
  source: SourceReference;
}

export interface RequirementModel {
  requirements: RequirementItem[];
  acceptanceCriteria: RequirementItem[];
  businessRules: RequirementItem[];
}

export interface PostmanVariable {
  key: string;
  value: string;
  type?: "default" | "secret";
}

export interface PostmanRequestSummary {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  folder?: string;
  assertionNames: string[];
  hasPreRequestScript: boolean;
  hasTestScript: boolean;
  hasDbVerification: boolean;
}

export interface PostmanCollectionSummary {
  name: string;
  requests: PostmanRequestSummary[];
  variables: PostmanVariable[];
}

export interface NewmanTestResult {
  requestName: string;
  assertionName: string;
  passed: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
}

export interface NewmanRunSummary {
  collectionName: string;
  totalRequests: number;
  totalAssertions: number;
  failedAssertions: number;
  durationMs: number;
  results: NewmanTestResult[];
}

export type FailureCategory =
  | "product_defect"
  | "contract_error"
  | "data_error"
  | "auth_error"
  | "outdated_test"
  | "wrong_assertion"
  | "broken_dependency"
  | "flaky"
  | "timeout"
  | "infrastructure";

export interface FailureAnalysis {
  requestName: string;
  assertionName: string;
  category: FailureCategory;
  cause: string;
  suggestedFix: string;
  confidence: "high" | "medium" | "low";
}

export interface CoverageMatrixEntry {
  requirementId: string;
  operationId?: string;
  requestName?: string;
  assertionNames: string[];
  status: CoverageStatus;
  reason: string;
}

export interface CoverageSummary {
  totalRequirements: number;
  covered: number;
  partiallyCovered: number;
  uncovered: number;
  outdated: number;
  blocked: number;
  notApplicable: number;
  coveragePercentage: number;
}

export interface TraceabilityEntry {
  requirementId: string;
  operationId?: string;
  assertionNames: string[];
  provenance: Provenance;
}

export interface GeneratedFile {
  path: string;
  operation: "create" | "update" | "delete" | "keep";
  content?: string;
  reason: string;
}

export interface FilePatch {
  path: string;
  diff: string;
}

export interface AnalysisSummary {
  stack: DetectedStack;
  operations: ApiOperation[];
  existingCollections: PostmanCollectionSummary[];
  existingWorkflows: string[];
  risks: string[];
  missingInformation: string[];
  confidence: number;
}

export interface GeneratedChangeSet {
  analysis: AnalysisSummary;
  decision: ChangeDecision;
  files: GeneratedFile[];
  patches: FilePatch[];
  coverage: CoverageSummary;
  traceability: TraceabilityEntry[];
  assumptions: string[];
  warnings: string[];
  commands: string[];
}

export interface ChangePlan {
  strategy: ChangeDecision;
  filesToCreate: string[];
  filesToModify: string[];
  filesToKeep: string[];
  filesToDeprecate: string[];
  coverageBefore: number;
  coverageAfterEstimated: number;
  risks: string[];
}
