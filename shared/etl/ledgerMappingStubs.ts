/**
 * ledgerMappingStubs — auto-discovery conti bilancino senza mapping.
 *
 * Gli stub vengono creati in preview con analitica placeholder; l'import resta
 * bloccato finché l'admin completa famiglia + analitica in /ledger-mappings.
 */

import type { BilancinoAccountRow } from './extractBilancino.ts';

export const BILANCINO_DISCOVERY_SOURCE = 'bilancino_discovery';
export const STUB_ANALITICA_PLACEHOLDER = '__DA_COMPLETARE__';

export interface LedgerMappingStub {
  accountCode: string;
  accountDescription: string | null;
  signMultiplier: number;
  famiglia?: string | null;
}

export function isIncompleteStubAnalitica(analiticaLabel: string): boolean {
  const trimmed = analiticaLabel.trim();
  return trimmed === '' || trimmed === STUB_ANALITICA_PLACEHOLDER;
}

export function isIncompleteLedgerMapping(mapping: {
  analiticaLabel: string;
  sourceSheet?: string;
}): boolean {
  return isIncompleteStubAnalitica(mapping.analiticaLabel);
}

/** Estrae conti CE leaf dal bilancino non ancora presenti nei mapping esistenti. */
export function buildLedgerMappingStubs(
  accounts: BilancinoAccountRow[],
  existingCodes: Iterable<string>,
): LedgerMappingStub[] {
  const known = new Set(existingCodes);
  const seen = new Set<string>();
  const stubs: LedgerMappingStub[] = [];

  for (const acc of accounts) {
    if (acc.section !== 'CE') continue;
    if (known.has(acc.accountCode) || seen.has(acc.accountCode)) continue;
    seen.add(acc.accountCode);
    stubs.push({
      accountCode: acc.accountCode,
      accountDescription: acc.description || null,
      signMultiplier: acc.side === 'ricavi' ? -1 : 1,
      famiglia: null,
    });
  }

  return stubs.sort((a, b) => a.accountCode.localeCompare(b.accountCode, 'it'));
}

export function toStubUpsertRows(
  companyId: string,
  stubs: LedgerMappingStub[],
  importId?: string | null,
): Array<Record<string, unknown>> {
  const now = new Date().toISOString();
  return stubs.map((s) => ({
    company_id: companyId,
    account_code: s.accountCode,
    account_description: s.accountDescription,
    famiglia: s.famiglia ?? null,
    analitica_label: STUB_ANALITICA_PLACEHOLDER,
    master_account_id: null,
    sign_multiplier: s.signMultiplier,
    source_sheet: BILANCINO_DISCOVERY_SOURCE,
    source_import_id: importId ?? null,
    updated_at: now,
  }));
}
