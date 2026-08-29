import { mkdir, appendFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DEFAULT_PATHS } from "../constants.js";
import type { UsageEvent, UsageReportFilters } from "./types.js";

export async function recordUsageEvent(
  event: UsageEvent,
  path: string = DEFAULT_PATHS.usageLogJsonl,
): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(event)}\n`, "utf-8");
  } catch {
    // El logging de uso nunca debe romper la respuesta de un tool.
  }
}

export async function readUsageEvents(
  filters: UsageReportFilters = {},
  path: string = DEFAULT_PATHS.usageLogJsonl,
): Promise<UsageEvent[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return [];
  }

  const events: UsageEvent[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line) as UsageEvent);
    } catch {
      // Línea corrupta: se ignora en vez de romper el reporte completo.
    }
  }

  return events.filter((event) => {
    if (filters.desde && event.timestamp < filters.desde) return false;
    if (filters.hasta && event.timestamp > filters.hasta) return false;
    if (filters.fase && event.phase !== filters.fase) return false;
    return true;
  });
}
