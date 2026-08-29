import type {
  HttpMethod,
  PostmanCollectionSummary,
  PostmanRequestSummary,
  PostmanVariable,
} from "../types/index.js";

interface PostmanItem {
  name?: string;
  item?: PostmanItem[];
  request?: {
    method?: string;
    url?: { raw?: string } | string;
  };
  event?: Array<{ listen?: string; script?: { exec?: string[] } }>;
}

interface PostmanCollectionJson {
  info?: { name?: string };
  item?: PostmanItem[];
  variable?: Array<{ key?: string; value?: string; type?: string }>;
}

export function parsePostmanCollection(
  source: string | Record<string, unknown>,
): PostmanCollectionSummary {
  const json = normalize(source);
  const requests: PostmanRequestSummary[] = [];
  walkItems(json.item ?? [], undefined, requests);

  const variables: PostmanVariable[] = (json.variable ?? [])
    .filter((entry): entry is { key: string; value?: string; type?: string } => Boolean(entry.key))
    .map((entry) => ({
      key: entry.key,
      value: entry.value ?? "",
      ...(entry.type === "secret" ? { type: "secret" as const } : { type: "default" as const }),
    }));

  return { name: json.info?.name ?? "Untitled collection", requests, variables };
}

function normalize(source: string | Record<string, unknown>): PostmanCollectionJson {
  if (typeof source === "string") return JSON.parse(source) as PostmanCollectionJson;
  return source;
}

function walkItems(
  items: PostmanItem[],
  folder: string | undefined,
  out: PostmanRequestSummary[],
): void {
  for (const item of items) {
    if (item.item && item.item.length > 0) {
      walkItems(item.item, item.name ?? folder, out);
      continue;
    }
    if (!item.request) continue;
    const url =
      typeof item.request.url === "string" ? item.request.url : (item.request.url?.raw ?? "");
    const testScript = extractScript(item.event, "test");
    const preRequestScript = extractScript(item.event, "prerequest");
    out.push({
      id: `${item.name ?? "unnamed"}::${url}`,
      name: item.name ?? "unnamed",
      method: (item.request.method ?? "GET").toUpperCase() as HttpMethod,
      url,
      ...(folder ? { folder } : {}),
      assertionNames: extractAssertionNames(testScript),
      hasPreRequestScript: preRequestScript.trim().length > 0,
      hasTestScript: testScript.trim().length > 0,
      hasDbVerification: testScript.includes("pm.sendRequest"),
    });
  }
}

function extractScript(events: PostmanItem["event"], listen: "test" | "prerequest"): string {
  const entry = (events ?? []).find((event) => event.listen === listen);
  return (entry?.script?.exec ?? []).join("\n");
}

function extractAssertionNames(testScript: string): string[] {
  const names: string[] = [];
  const regex = /pm\.test\(\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(testScript)) !== null) {
    if (match[1]) names.push(match[1]);
  }
  return names;
}

export function findRequestByOperation(
  collection: PostmanCollectionSummary,
  method: HttpMethod,
  routePath: string,
): PostmanRequestSummary | undefined {
  const normalizedPath = routePath.replace(/\{[A-Za-z0-9_]+\}/g, "");
  return collection.requests.find((request) => {
    if (request.method !== method) return false;
    const requestPath = request.url.replace(/\{\{[^}]+\}\}/g, "").replace(/:[A-Za-z0-9_]+/g, "");
    return requestPath.includes(
      normalizedPath.split("/").filter(Boolean).slice(-1)[0] ?? normalizedPath,
    );
  });
}
