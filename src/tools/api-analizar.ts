import type { ApiAnalizarInput } from "../schemas/analizar.js";
import type {
  AnalysisSummary,
  ApiOperation,
  DetectedStack,
  PostmanCollectionSummary,
} from "../types/index.js";
import { analyzeRepository, type RepositorySourceFile } from "../analyzers/repository-analyzer.js";
import { parseOpenApiDocument } from "../analyzers/openapi-analyzer.js";
import { extractValidationRules } from "../analyzers/validator-analyzer.js";
import { parsePostmanCollection } from "../analyzers/postman-analyzer.js";
import { analyzeCiWorkflow } from "../analyzers/ci-analyzer.js";
import type { RepositoryFetcher } from "../github/repo-fetcher.js";
import { OctokitRepositoryFetcher } from "../github/repo-fetcher.js";

export interface AnalizarDeps {
  repositoryFetcher?: RepositoryFetcher;
}

export async function runApiAnalizar(
  input: ApiAnalizarInput,
  deps: AnalizarDeps = {},
): Promise<AnalysisSummary> {
  const risks: string[] = [];
  const missingInformation: string[] = [];
  const existingCollections: PostmanCollectionSummary[] = [];
  const existingWorkflows: string[] = [];

  let sourceFiles: RepositorySourceFile[] = (input.source_files ?? []).map((file) => ({
    path: file.path,
    content: file.content,
  }));

  if (input.repository) {
    const fetcher = deps.repositoryFetcher ?? new OctokitRepositoryFetcher();
    try {
      const fetched = await fetcher.fetchRelevantFiles(input.repository, input.repository.ref);
      sourceFiles = [...sourceFiles, ...fetched];
    } catch (error: unknown) {
      risks.push(
        `No se pudo leer el repositorio ${input.repository.owner}/${input.repository.name}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  for (const file of sourceFiles) {
    if (/\.postman_collection\.json$/.test(file.path)) {
      try {
        existingCollections.push(parsePostmanCollection(file.content));
      } catch {
        risks.push(`No se pudo parsear la colección Postman en ${file.path}.`);
      }
    }
    if (/\.github\/workflows\/.*\.ya?ml$|azure-pipelines.*\.ya?ml$/i.test(file.path)) {
      const analysis = analyzeCiWorkflow(file.content);
      existingWorkflows.push(
        `${file.path} (${analysis.platform}, newman: ${analysis.hasNewmanJob ? "sí" : "no"})`,
      );
    }
  }

  let stack: DetectedStack = {
    language: "unknown",
    framework: "unknown",
    confidence: 0,
    evidence: [],
  };
  let operations: ApiOperation[] = [];

  if (sourceFiles.length > 0) {
    const repoResult = analyzeRepository(sourceFiles);
    stack = repoResult.stack;
    operations = repoResult.operations;
    for (const file of sourceFiles) {
      if (/\.(validator|dto)\.(ts|js)$/.test(file.path) || /RuleFor\(|Field\(/.test(file.content)) {
        const rules = extractValidationRules(file);
        if (rules.length > 0 && operations.length > 0) {
          const first = operations[0];
          if (first) first.validationRules.push(...rules);
        }
      }
    }
  }

  if (input.openapi) {
    try {
      operations = [...operations, ...parseOpenApiDocument(input.openapi)];
    } catch (error: unknown) {
      risks.push(
        `No se pudo parsear el documento OpenAPI: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (input.curl_commands) {
    operations = [
      ...operations,
      ...(input.curl_commands.map(parseCurlToOperation).filter(Boolean) as ApiOperation[]),
    ];
  }

  if (operations.length === 0) {
    missingInformation.push(
      "No se identificaron endpoints. Proporcioná OpenAPI, curl, código fuente o un repositorio.",
    );
  }
  if (stack.framework === "unknown" && input.repository) {
    missingInformation.push(
      "No se pudo determinar stack/framework con confianza a partir del repositorio.",
    );
  }

  const confidence = computeConfidence(stack, operations, sourceFiles.length > 0);

  return {
    stack,
    operations: dedupe(operations),
    existingCollections,
    existingWorkflows,
    risks,
    missingInformation,
    confidence,
  };
}

function computeConfidence(
  stack: DetectedStack,
  operations: ApiOperation[],
  hasSource: boolean,
): number {
  let score = 0;
  if (hasSource) score += 0.3;
  score += stack.confidence * 0.4;
  score += Math.min(operations.length, 5) * 0.06;
  return Math.round(Math.min(1, score) * 100) / 100;
}

function dedupe(operations: ApiOperation[]): ApiOperation[] {
  const map = new Map<string, ApiOperation>();
  for (const operation of operations) {
    map.set(`${operation.method} ${operation.path}`, operation);
  }
  return [...map.values()];
}

function parseCurlToOperation(curl: string): ApiOperation | undefined {
  const methodMatch = /-X\s+([A-Za-z]+)/.exec(curl);
  const urlMatch = /curl\s+(?:-X\s+[A-Za-z]+\s+)?['"]?(https?:\/\/[^\s'"]+)['"]?/.exec(curl);
  if (!urlMatch?.[1]) return undefined;
  const method = (methodMatch?.[1]?.toUpperCase() ??
    (/-d\s|--data/.test(curl) ? "POST" : "GET")) as ApiOperation["method"];
  let path = "/";
  try {
    path = new URL(urlMatch[1]).pathname || "/";
  } catch {
    // keep default "/"
  }
  return {
    operationId: `${method.toLowerCase()}${path.replace(/[/{}:]/g, "_")}`,
    method,
    path,
    responseSchemas: {},
    validationRules: [],
    businessRules: [],
    sourceFiles: [{ path: "curl", provenance: "estimated" }],
  };
}
