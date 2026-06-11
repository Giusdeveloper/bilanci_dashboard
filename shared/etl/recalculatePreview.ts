/**
 * recalculatePreview — ricalcolo KPI/facts da bozza in memoria (no write DB).
 *
 * Applica i delta sui saldi published (account_balances), poi esegue
 * runBilancinoPipeline come nel PoC bilancino.
 */

import type { BilancinoAccountRow, BilancinoExtractResult, BilancinoTotals } from './extractBilancino.ts';
import {
  applyManualFactOverrides,
  mergeMappingChanges,
  type DraftMappingChange,
  type ManualFactOverride,
} from './draftChanges.ts';
import { runBilancinoPipeline, type BilancinoLedgerMapping } from './pipelineBilancino.ts';
import type { Fact, MappingResolver, Warning, LayoutRow } from './types.ts';
import type { WorkbookData } from './workbook.ts';

/** Riga saldo base (subset di account_balances). */
export interface AccountBalanceRow {
  accountCode: string;
  accountDescription?: string | null;
  section?: 'CE' | 'SP';
  accountSide?: 'costi' | 'ricavi' | null;
  year: number;
  month: number;
  balanceRaw: number;
  balanceNormalized: number;
}

/** Delta saldo proposto in bozza. */
export interface DraftBalanceChange {
  accountCode: string;
  year: number;
  month: number;
  balanceNormalized: number;
}

export type LedgerMapping = BilancinoLedgerMapping;

const EMPTY_WORKBOOK: WorkbookData = { sheetNames: [], sheets: {} };

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

function balanceKey(accountCode: string, year: number, month: number): string {
  return `${accountCode}|${year}|${month}`;
}

/** Applica i delta sui saldi base del periodo richiesto. */
export function mergeBalanceChanges(
  baseBalances: AccountBalanceRow[],
  balanceChanges: DraftBalanceChange[],
  year: number,
  month: number,
): AccountBalanceRow[] {
  const periodBalances = baseBalances.filter((b) => b.year === year && b.month === month);
  const byKey = new Map(periodBalances.map((b) => [balanceKey(b.accountCode, b.year, b.month), { ...b }]));

  for (const change of balanceChanges) {
    if (change.year !== year || change.month !== month) continue;
    const key = balanceKey(change.accountCode, change.year, change.month);
    const existing = byKey.get(key);
    if (existing) {
      existing.balanceNormalized = change.balanceNormalized;
      existing.balanceRaw = change.balanceNormalized;
    } else {
      byKey.set(key, {
        accountCode: change.accountCode,
        accountDescription: null,
        section: 'CE',
        accountSide: 'costi',
        year: change.year,
        month: change.month,
        balanceRaw: change.balanceNormalized,
        balanceNormalized: change.balanceNormalized,
      });
    }
  }

  return Array.from(byKey.values());
}

function toBilancinoAccount(row: AccountBalanceRow): BilancinoAccountRow {
  const side = row.accountSide ?? 'costi';
  return {
    accountCode: row.accountCode,
    description: row.accountDescription ?? row.accountCode,
    balanceRaw: row.balanceRaw,
    balanceNormalized: row.balanceNormalized,
    section: row.section ?? 'CE',
    side,
    tipologia: 'CE',
  };
}

/** Deriva quadrature CE dai saldi leaf (solo sezione CE). */
function deriveTotals(accounts: BilancinoAccountRow[]): BilancinoTotals {
  let totaleRicavi = 0;
  let totaleCosti = 0;
  let hasRicavi = false;
  let hasCosti = false;

  for (const acc of accounts) {
    if (acc.section !== 'CE') continue;
    if (acc.side === 'ricavi') {
      totaleRicavi += acc.balanceNormalized;
      hasRicavi = true;
    } else {
      totaleCosti += acc.balanceNormalized;
      hasCosti = true;
    }
  }

  const ricavi = hasRicavi ? round2(totaleRicavi) : null;
  const costi = hasCosti ? round2(totaleCosti) : null;
  const risultato = ricavi != null && costi != null ? round2(ricavi - costi) : null;

  return { totaleRicavi: ricavi, totaleCosti: costi, risultato };
}

export interface RecalculateFromDraftInput {
  companyId: string;
  year: number;
  month: number;
  baseBalances: AccountBalanceRow[];
  balanceChanges: DraftBalanceChange[];
  mappingChanges?: DraftMappingChange[];
  manualFactOverrides?: ManualFactOverride[];
  ledgerMappings: LedgerMapping[];
  labelResolver: MappingResolver;
}

export interface RecalculateFromDraftResult {
  facts: Fact[];
  layout: LayoutRow[];
  kpis: Record<string, number>;
  warnings: Warning[];
}

/**
 * Ricalcola facts e KPI applicando i delta bozza sui saldi published.
 * Non persiste nulla: usato da Edge Function recalculate-preview e test unitari.
 */
export function recalculateFromDraft(opts: RecalculateFromDraftInput): RecalculateFromDraftResult {
  const merged = mergeBalanceChanges(opts.baseBalances, opts.balanceChanges, opts.year, opts.month);
  const ceAccounts = merged.filter((b) => (b.section ?? 'CE') === 'CE').map(toBilancinoAccount);
  const totals = deriveTotals(ceAccounts);
  const ledgerMappings = opts.mappingChanges?.length
    ? mergeMappingChanges(opts.ledgerMappings, opts.mappingChanges)
    : opts.ledgerMappings;

  const extract: BilancinoExtractResult = {
    profileId: 'bilancino_studio',
    companyName: opts.companyId,
    year: opts.year,
    month: opts.month,
    accounts: ceAccounts,
    totals,
  };

  const result = runBilancinoPipeline({
    workbook: EMPTY_WORKBOOK,
    ledgerMappings,
    labelResolver: opts.labelResolver,
    extract,
  });

  const facts = opts.manualFactOverrides?.length
    ? applyManualFactOverrides(result.facts, opts.manualFactOverrides)
    : result.facts;

  const warnings = [...result.warnings];
  if (opts.manualFactOverrides?.length) {
    for (const o of opts.manualFactOverrides) {
      warnings.push({
        severity: 'info',
        message: `Override CE manuale su ${o.categoryCode}: ${o.motivazione || 'senza motivazione'}`,
      });
    }
  }

  return {
    facts,
    layout: result.layout,
    kpis: result.kpis,
    warnings,
  };
}
