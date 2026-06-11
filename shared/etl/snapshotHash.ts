/**
 * snapshotHash — hash deterministico per idempotenza snapshot publish.
 */

export interface SnapshotFactRow {
  category_id: string;
  year: number;
  month: number | null;
  amount_progressive: number | null;
  amount_period: number | null;
  source_label: string | null;
}

function stableSortFacts(facts: SnapshotFactRow[]): SnapshotFactRow[] {
  return [...facts].sort((a, b) => {
    const cat = a.category_id.localeCompare(b.category_id);
    if (cat !== 0) return cat;
    if (a.year !== b.year) return a.year - b.year;
    const am = a.month ?? -1;
    const bm = b.month ?? -1;
    return am - bm;
  });
}

/** FNV-1a 32-bit hash hex (no crypto dependency in Deno/Node tests). */
export function hashSnapshotFacts(facts: SnapshotFactRow[]): string {
  const payload = JSON.stringify(stableSortFacts(facts));
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i += 1) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
