/**
 * loadPlan — trasforma il risultato (puro) della pipeline in strutture pronte
 * per il caricamento idempotente. NON tocca il DB: i due caricatori concreti
 * (script Node via `pg`, Edge Function via supabase-js) consumano questo piano.
 */

import type { Fact, LayoutRow, PipelineResult, Warning } from './types.ts';

export interface ImportMeta {
  companyId: string;
  sourceFilename: string;
  fileHash: string;
  templateProfile: string;
  status: string;
}

export interface PeriodRow {
  companyId: string;
  year: number;
  month: number | null;
  label: string;
}

export interface LayoutRowWithCompany extends LayoutRow {
  companyId: string;
}

export interface LoadPlan {
  importMeta: ImportMeta;
  facts: Fact[];
  warnings: Warning[];
  layout: LayoutRowWithCompany[];
  periods: PeriodRow[];
}

const MONTH_LABELS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export function buildLoadPlan(
  companyId: string,
  sourceFilename: string,
  fileHash: string,
  result: PipelineResult,
): LoadPlan {
  const hasErrors = result.warnings.some((w) => w.severity === 'error');
  const importMeta: ImportMeta = {
    companyId,
    sourceFilename,
    fileHash,
    templateProfile: result.profileId,
    status: hasErrors ? 'failed' : 'completed',
  };

  const periods: PeriodRow[] = [
    { companyId, year: result.currentYear, month: null, label: String(result.currentYear) },
  ];
  const refMonth = result.referenceMonth ?? 0;
  for (let m = 1; m <= refMonth; m++) {
    periods.push({
      companyId,
      year: result.currentYear,
      month: m,
      label: `${MONTH_LABELS[m - 1]} ${result.currentYear}`,
    });
  }

  const layout: LayoutRowWithCompany[] = result.layout.map((l) => ({ ...l, companyId }));

  return { importMeta, facts: result.facts, warnings: result.warnings, layout, periods };
}
