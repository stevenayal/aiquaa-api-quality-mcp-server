import type {
  ApiOperation,
  DetectedFramework,
  DetectedLanguage,
  DetectedStack,
  HttpMethod,
  SourceReference,
} from "../types/index.js";
import { buildOperationId, joinPaths, normalizeExpressPath } from "./util.js";

export interface RepositorySourceFile {
  path: string;
  content: string;
}

export interface RepositoryAnalysisResult {
  stack: DetectedStack;
  operations: ApiOperation[];
}

interface FrameworkSignature {
  framework: DetectedFramework;
  language: DetectedLanguage;
  filePattern: RegExp;
  contentPattern: RegExp;
}

const FRAMEWORK_SIGNATURES: FrameworkSignature[] = [
  {
    framework: "nestjs",
    language: "typescript",
    filePattern: /\.controller\.ts$/,
    contentPattern: /@Controller\s*\(/,
  },
  {
    framework: "express",
    language: /* js/ts, refined later */ "typescript",
    filePattern: /\.(t|j)s$/,
    contentPattern: /\brequire\(["']express["']\)|from\s+["']express["']/,
  },
  {
    framework: "fastify",
    language: "typescript",
    filePattern: /\.(t|j)s$/,
    contentPattern: /from\s+["']fastify["']|require\(["']fastify["']\)/,
  },
  {
    framework: "spring-boot",
    language: "java",
    filePattern: /\.java$/,
    contentPattern: /@RestController|@RequestMapping|@GetMapping|@PostMapping/,
  },
  {
    framework: "quarkus",
    language: "java",
    filePattern: /\.java$/,
    contentPattern: /@Path\s*\(|jakarta\.ws\.rs|javax\.ws\.rs/,
  },
  {
    framework: "aspnet-core",
    language: "csharp",
    filePattern: /\.cs$/,
    contentPattern: /\[ApiController\]|\[Http(Get|Post|Put|Patch|Delete)\]|\[Route\(/,
  },
  {
    framework: "fastapi",
    language: "python",
    filePattern: /\.py$/,
    contentPattern: /from\s+fastapi\s+import|FastAPI\(\)/,
  },
  {
    framework: "django",
    language: "python",
    filePattern: /\.py$/,
    contentPattern: /from\s+django|django\.urls/,
  },
  {
    framework: "flask",
    language: "python",
    filePattern: /\.py$/,
    contentPattern: /from\s+flask\s+import|Flask\(__name__\)/,
  },
];

export function analyzeRepository(files: RepositorySourceFile[]): RepositoryAnalysisResult {
  const stack = detectStack(files);
  const operations: ApiOperation[] = [];

  for (const file of files) {
    switch (stack.framework) {
      case "nestjs":
        operations.push(...extractNestJsOperations(file));
        break;
      case "express":
      case "fastify":
        operations.push(...extractExpressLikeOperations(file));
        break;
      case "spring-boot":
        operations.push(...extractSpringOperations(file));
        break;
      case "quarkus":
        operations.push(...extractQuarkusOperations(file));
        break;
      case "aspnet-core":
        operations.push(...extractAspNetOperations(file));
        break;
      case "fastapi":
        operations.push(...extractFastApiOperations(file));
        break;
      default:
        break;
    }
  }

  return { stack, operations: dedupeOperations(operations) };
}

function detectStack(files: RepositorySourceFile[]): DetectedStack {
  const scores = new Map<
    DetectedFramework,
    { score: number; language: DetectedLanguage; evidence: string[] }
  >();

  for (const file of files) {
    for (const signature of FRAMEWORK_SIGNATURES) {
      if (signature.filePattern.test(file.path) && signature.contentPattern.test(file.content)) {
        const entry = scores.get(signature.framework) ?? {
          score: 0,
          language: signature.language,
          evidence: [],
        };
        entry.score += 1;
        if (entry.evidence.length < 5) entry.evidence.push(file.path);
        scores.set(signature.framework, entry);
      }
    }
  }

  if (scores.size === 0) {
    return { language: "unknown", framework: "unknown", confidence: 0, evidence: [] };
  }

  let best:
    | [DetectedFramework, { score: number; language: DetectedLanguage; evidence: string[] }]
    | undefined;
  for (const entry of scores.entries()) {
    if (!best || entry[1].score > best[1].score) best = entry;
  }
  const [framework, info] = best as [
    DetectedFramework,
    { score: number; language: DetectedLanguage; evidence: string[] },
  ];
  const totalSignals = [...scores.values()].reduce((sum, item) => sum + item.score, 0);
  const confidence = Math.min(1, info.score / Math.max(totalSignals, info.score));
  return { language: info.language, framework, confidence, evidence: info.evidence };
}

function ref(path: string): SourceReference {
  return { path, provenance: "controller" };
}

function newOperation(method: HttpMethod, routePath: string, file: string): ApiOperation {
  return {
    operationId: buildOperationId(method, routePath),
    method,
    path: routePath,
    responseSchemas: {},
    validationRules: [],
    businessRules: [],
    sourceFiles: [ref(file)],
  };
}

function extractNestJsOperations(file: RepositorySourceFile): ApiOperation[] {
  const operations: ApiOperation[] = [];
  const controllerMatch = /@Controller\s*\(\s*["'`]?([^"'`)]*)["'`]?\s*\)/.exec(file.content);
  const prefix = controllerMatch?.[1] ?? "";
  const methodRegex =
    /@(Get|Post|Put|Patch|Delete)\s*\(\s*["'`]?([^"'`)]*)["'`]?\s*\)\s*[\s\S]{0,200}?(?:async\s+)?([A-Za-z0-9_]+)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(file.content)) !== null) {
    const method = (match[1] ?? "GET").toUpperCase() as HttpMethod;
    const subPath = match[2] ?? "";
    const handler = match[3] ?? "";
    const fullPath = normalizeExpressPath(joinPaths(prefix, subPath));
    const operation = newOperation(method, fullPath, file.path);
    if (controllerMatch) operation.controller = file.path;
    operation.handler = handler;
    const guardsNearby = file.content.slice(Math.max(0, match.index - 200), match.index);
    if (
      /@UseGuards|@Auth|JwtAuthGuard/.test(guardsNearby) ||
      /@UseGuards|@Auth|JwtAuthGuard/.test(file.content.slice(0, 400))
    ) {
      operation.authentication = {
        type: "bearer",
        source: ref(file.path),
      };
    }
    operations.push(operation);
  }
  return operations;
}

function extractExpressLikeOperations(file: RepositorySourceFile): ApiOperation[] {
  const operations: ApiOperation[] = [];
  const methodRegex = /\b(?:app|router)\.(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(file.content)) !== null) {
    const method = (match[1] ?? "get").toUpperCase() as HttpMethod;
    const routePath = normalizeExpressPath(match[2] ?? "/");
    operations.push(newOperation(method, routePath, file.path));
  }
  return operations;
}

function extractSpringOperations(file: RepositorySourceFile): ApiOperation[] {
  const operations: ApiOperation[] = [];
  const classPrefixMatch = /@RequestMapping\s*\(\s*(?:value\s*=\s*)?["']([^"']*)["']/.exec(
    file.content,
  );
  const prefix = classPrefixMatch?.[1] ?? "";
  const mappingRegex =
    /@(Get|Post|Put|Patch|Delete)Mapping\s*(?:\(\s*(?:value\s*=\s*)?["']([^"']*)["']\)?)?/g;
  let match: RegExpExecArray | null;
  while ((match = mappingRegex.exec(file.content)) !== null) {
    const method = (match[1] ?? "Get").toUpperCase() as HttpMethod;
    const subPath = match[2] ?? "";
    const fullPath = joinPaths(prefix, subPath).replace(/\{([A-Za-z0-9_]+)\}/g, "{$1}");
    operations.push(newOperation(method, fullPath || "/", file.path));
  }
  return operations;
}

function extractQuarkusOperations(file: RepositorySourceFile): ApiOperation[] {
  const operations: ApiOperation[] = [];
  const classPathMatch = /@Path\s*\(\s*["']([^"']*)["']\s*\)/.exec(file.content);
  const prefix = classPathMatch?.[1] ?? "";
  const verbRegex =
    /@(GET|POST|PUT|PATCH|DELETE)\b[\s\S]{0,120}?(?:@Path\s*\(\s*["']([^"']*)["']\s*\))?/g;
  let match: RegExpExecArray | null;
  while ((match = verbRegex.exec(file.content)) !== null) {
    const method = (match[1] ?? "GET").toUpperCase() as HttpMethod;
    const subPath = match[2] ?? "";
    operations.push(newOperation(method, joinPaths(prefix, subPath) || "/", file.path));
  }
  return operations;
}

function extractAspNetOperations(file: RepositorySourceFile): ApiOperation[] {
  const operations: ApiOperation[] = [];
  const classRouteMatch = /\[Route\s*\(\s*"([^"]*)"\s*\)\]/.exec(file.content);
  const prefix = (classRouteMatch?.[1] ?? "").replace(/\[controller\]/i, "");
  const verbRegex = /\[Http(Get|Post|Put|Patch|Delete)(?:\(\s*"([^"]*)"\s*\))?\]/g;
  let match: RegExpExecArray | null;
  while ((match = verbRegex.exec(file.content)) !== null) {
    const method = (match[1] ?? "Get").toUpperCase() as HttpMethod;
    const subPath = match[2] ?? "";
    operations.push(newOperation(method, joinPaths(prefix, subPath) || "/", file.path));
  }
  return operations;
}

function extractFastApiOperations(file: RepositorySourceFile): ApiOperation[] {
  const operations: ApiOperation[] = [];
  const routerVarMatch = /(\w+)\s*=\s*(?:FastAPI|APIRouter)\s*\(/.exec(file.content);
  const varName = routerVarMatch?.[1] ?? "app";
  const decoratorRegex = new RegExp(
    `@${varName}\\.(get|post|put|patch|delete)\\s*\\(\\s*["']([^"']+)["']`,
    "g",
  );
  let match: RegExpExecArray | null;
  while ((match = decoratorRegex.exec(file.content)) !== null) {
    const method = (match[1] ?? "get").toUpperCase() as HttpMethod;
    const routePath = match[2] ?? "/";
    operations.push(newOperation(method, routePath, file.path));
  }
  return operations;
}

function dedupeOperations(operations: ApiOperation[]): ApiOperation[] {
  const seen = new Map<string, ApiOperation>();
  for (const operation of operations) {
    const key = `${operation.method} ${operation.path}`;
    if (!seen.has(key)) seen.set(key, operation);
  }
  return [...seen.values()];
}
