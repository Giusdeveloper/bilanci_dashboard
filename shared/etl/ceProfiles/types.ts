/**
 * ceProfiles/types — profilo rollup CE per company (layout, SUM_CHILDREN, formule).
 */

import type { RowKind } from '../types.ts';

export interface CELayoutTemplateRow {
  label: string;
  code: string;
  rowKind: RowKind;
  indentLevel: number;
}

/** Regola prefix conto → famiglia suggerita (seed da bilancino). */
export interface CePrefixRule {
  pattern: RegExp;
  /** code in company_famiglie (es. struttura, costi_variabili). */
  famigliaCode: string;
  analiticaHint?: string;
}

/** Aggregazione parallela per famiglia (es. Costi variabili → totaleCostiVariabili). */
export interface FamigliaRollupConfig {
  /** Etichetta famiglia (ledger_account_mappings.famiglia) → chiave rollup. */
  famigliaToKey: Record<string, string>;
}

export interface CeProfile {
  id: string;
  layout: CELayoutTemplateRow[];
  sumChildren: Record<string, string[]>;
  rollupOrder: string[];
  formulaKeys: ReadonlySet<string>;
  applyFormula(key: string, values: Record<string, number>): number;
  prefixRules?: CePrefixRule[];
  famigliaRollup?: FamigliaRollupConfig;
}
