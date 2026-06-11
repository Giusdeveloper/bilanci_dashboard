/**
 * Risoluzione analitica Source -> master_account_id (condiviso seed + Edge Function).
 */

import { getCanonicalKey } from '../../domain/labelMapping.ts';
import { isRicaviAccount, type SourceMappingRow } from './extractSourceMapping.ts';

export interface ResolvedLedgerMapping {
  row: SourceMappingRow;
  masterAccountId: string | null;
  signMultiplier: number;
  resolution: 'account_mappings' | 'canonical_fallback' | 'unmapped';
}

export function resolveSignMultiplier(row: SourceMappingRow): number {
  return isRicaviAccount(row) ? -1 : 1;
}

export function resolveMasterAccountId(
  row: SourceMappingRow,
  labelMap: Map<string, string>,
  codeMap: Map<string, string>,
): ResolvedLedgerMapping {
  const signMultiplier = resolveSignMultiplier(row);
  const direct = labelMap.get(row.analiticaLabel.trim());
  if (direct) {
    return { row, masterAccountId: direct, signMultiplier, resolution: 'account_mappings' };
  }

  const canonical = getCanonicalKey(row.analiticaLabel);
  if (canonical) {
    const masterId = codeMap.get(canonical) ?? null;
    if (masterId) {
      return { row, masterAccountId: masterId, signMultiplier, resolution: 'canonical_fallback' };
    }
  }

  return { row, masterAccountId: null, signMultiplier, resolution: 'unmapped' };
}
