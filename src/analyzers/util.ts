import type { HttpMethod } from "../types/index.js";

export function buildOperationId(method: HttpMethod, routePath: string): string {
  const cleaned = routePath
    .replace(/[{:]([A-Za-z0-9_]+)[}]?/g, "By$1")
    .split(/[/_-]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
  return `${method.toLowerCase()}${cleaned || "Root"}`;
}

export function joinPaths(prefix: string, routePath: string): string {
  const left = prefix.replace(/\/+$/, "");
  const right = routePath.replace(/^\/+/, "");
  const joined = [left, right].filter(Boolean).join("/");
  return joined.startsWith("/") ? joined : `/${joined}`;
}

export function normalizeExpressPath(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
}
