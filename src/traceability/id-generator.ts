export type IdKind = "REQ" | "AC" | "BR";

export class SequentialIdGenerator {
  private counters: Record<IdKind, number>;

  constructor(offsets: Partial<Record<IdKind, number>> = {}) {
    this.counters = {
      REQ: offsets.REQ ?? 1,
      AC: offsets.AC ?? 1,
      BR: offsets.BR ?? 1,
    };
  }

  next(kind: IdKind): string {
    const value = this.counters[kind];
    this.counters[kind] += 1;
    return `${kind}-${String(value).padStart(3, "0")}`;
  }
}
