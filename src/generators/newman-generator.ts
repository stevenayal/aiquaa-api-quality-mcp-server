import { DEFAULT_PATHS } from "../constants.js";

export interface NewmanCommandOptions {
  collectionPath: string;
  environmentPath?: string;
  dataFilePath?: string;
  folder?: string;
  iterations?: number;
  bail?: boolean;
  reporters?: Array<"cli" | "json" | "junit" | "htmlextra">;
  insecure?: boolean;
  delayRequestMs?: number;
}

export function buildNewmanCommand(options: NewmanCommandOptions): string {
  const reporters = options.reporters?.length ? options.reporters : ["cli", "json"];
  const parts = [`newman run ${options.collectionPath}`];
  if (options.environmentPath) parts.push(`-e ${options.environmentPath}`);
  if (options.dataFilePath) parts.push(`-d ${options.dataFilePath}`);
  if (options.folder) parts.push(`--folder "${options.folder}"`);
  if (options.iterations && options.iterations > 1) parts.push(`-n ${options.iterations}`);
  parts.push(`-r ${reporters.join(",")}`);
  if (reporters.includes("json"))
    parts.push(`--reporter-json-export ${DEFAULT_PATHS.newmanResultsJson}`);
  if (reporters.includes("junit"))
    parts.push(`--reporter-junit-export ${DEFAULT_PATHS.newmanJunitXml}`);
  if (reporters.includes("htmlextra"))
    parts.push(`--reporter-htmlextra-export ${DEFAULT_PATHS.newmanReportHtml}`);
  if (options.bail) parts.push("--bail");
  if (options.insecure) parts.push("--insecure");
  if (options.delayRequestMs) parts.push(`--delay-request ${options.delayRequestMs}`);
  return parts.join(" \\\n  ");
}

export function buildDataFile(rows: Array<Record<string, unknown>>): string {
  return JSON.stringify(rows, null, 2);
}

export function isLikelyProductionHost(url: string): boolean {
  const lowered = url.toLowerCase();
  const hasProdSignal = /(^|[./-])prod([./-]|$)|production/.test(lowered);
  const hasSafeSignal = /(staging|stage|dev|local|test|sandbox|qa)/.test(lowered);
  return hasProdSignal && !hasSafeSignal;
}
