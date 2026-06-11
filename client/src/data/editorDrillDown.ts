/**
 * editorDrillDown — collegamenti CE leaf → conti bilancino (mapping/saldi).
 */

import type { MasterAccountOption } from '@/data/ledgerMappings';
import type { EditedMappingRow } from '@/data/draftEdits';

/** Indicizza categoryCode (master) → codici conto bilancino. */
export function buildCategoryAccountIndex(
  mappings: Iterable<EditedMappingRow>,
  masterAccounts: MasterAccountOption[],
): Map<string, string[]> {
  const masterCodeById = new Map(masterAccounts.map((m) => [m.id, m.code]));
  const byCategory = new Map<string, string[]>();

  for (const mapping of Array.from(mappings)) {
    if (!mapping.masterAccountId) continue;
    const categoryCode = masterCodeById.get(mapping.masterAccountId);
    if (!categoryCode) continue;
    const list = byCategory.get(categoryCode) ?? [];
    if (!list.includes(mapping.accountCode)) {
      list.push(mapping.accountCode);
    }
    byCategory.set(categoryCode, list);
  }

  return byCategory;
}

/** Primo conto utile per drill-down su una voce CE mappata. */
export function primaryAccountForCategory(
  categoryCode: string | null,
  index: Map<string, string[]>,
): string | null {
  if (!categoryCode) return null;
  const accounts = index.get(categoryCode);
  return accounts?.[0] ?? null;
}
