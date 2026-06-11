/**
 * editorPreviewShaping — confronto published vs anteprima bozza (puro, testabile).
 */

import type { CEDettaglioModel, CEDettaglioRow } from '@shared/queries';
import type { RecalculatePreviewFact } from '@/data/draftEdits';

export interface PreviewAmountMaps {
  progressiveByCode: Map<string, number>;
  periodByCode: Map<string, number>;
}

/** Indicizza i facts di anteprima per categoryCode al mese editor. */
export function buildPreviewAmountMaps(
  facts: RecalculatePreviewFact[],
  year: number,
  month: number,
): PreviewAmountMaps {
  const progressiveByCode = new Map<string, number>();
  const periodByCode = new Map<string, number>();

  for (const fact of facts) {
    if (fact.year !== year) continue;
    if (fact.month != null && fact.month !== month) continue;
    progressiveByCode.set(fact.categoryCode, fact.amountProgressive);
    if (fact.amountPeriod != null) {
      periodByCode.set(fact.categoryCode, fact.amountPeriod);
    }
  }

  return { progressiveByCode, periodByCode };
}

export interface EditorCEDiffRow {
  voce: string;
  code: string | null;
  published: number | null;
  preview: number | null;
  delta: number | null;
  className: string;
  hasDiff: boolean;
}

function publishedProgressiveValue(row: CEDettaglioRow, month: number): number | null {
  if (row.monthlyProgressive) return row.monthlyProgressive[month - 1] ?? 0;
  if (row.isMapped && row.code) return row.amountProgressive;
  return null;
}

function publishedPeriodValue(row: CEDettaglioRow, month: number): number | null {
  if (row.monthlyPeriod) return row.monthlyPeriod[month - 1] ?? 0;
  return null;
}

function indentLabel(row: CEDettaglioRow): string {
  const indent =
    row.rowKind === 'voce' && row.indentLevel > 0
      ? '\u00A0\u00A0'.repeat(row.indentLevel)
      : '';
  return `${indent}${row.label}`;
}

function rowClassName(rowKind: string | null): string {
  switch (rowKind) {
    case 'risultato':
      return 'result';
    case 'margine':
      return 'key-metric';
    case 'totale':
      return 'total-dark';
    case 'subtotale':
      return 'highlight';
    default:
      return '';
  }
}

/** Righe CE dettaglio con diff published vs anteprima (progressivo YTD al mese). */
export function buildEditorCEDiffRows(
  model: CEDettaglioModel,
  previewMaps: PreviewAmountMaps,
  month: number,
): EditorCEDiffRow[] {
  return model.rows.map((row) => {
    const published =
      row.code != null ? publishedProgressiveValue(row, month) : row.amountProgressive;
    const preview = row.code != null ? (previewMaps.progressiveByCode.get(row.code) ?? null) : null;
    const delta =
      published != null && preview != null ? Number((preview - published).toFixed(2)) : null;
    const hasDiff = delta != null && Math.abs(delta) >= 0.01;

    return {
      voce: indentLabel(row),
      code: row.code,
      published,
      preview,
      delta,
      className: rowClassName(row.rowKind),
      hasDiff,
    };
  });
}

export interface EditorMonthlyDiffRow {
  voce: string;
  publishedValues: Array<number | null>;
  previewValues: Array<number | null>;
  className: string;
  hasDiff: boolean;
}

/** Serie mensile con diff puntuale/progressivo per mese disponibile. */
export function buildEditorMonthlyDiffRows(
  model: CEDettaglioModel,
  previewFacts: RecalculatePreviewFact[],
  months: number[],
  mode: 'progressive' | 'period',
): EditorMonthlyDiffRow[] {
  const previewByMonth = new Map<number, PreviewAmountMaps>();
  for (const m of months) {
    previewByMonth.set(m, buildPreviewAmountMaps(previewFacts, model.year, m));
  }

  return model.rows.map((row) => {
    const publishedValues = months.map((m) =>
      mode === 'progressive'
        ? publishedProgressiveValue(row, m)
        : publishedPeriodValue(row, m),
    );
    const previewValues = months.map((m) => {
      if (!row.code) return null;
      const maps = previewByMonth.get(m);
      if (!maps) return null;
      return mode === 'progressive'
        ? (maps.progressiveByCode.get(row.code) ?? null)
        : (maps.periodByCode.get(row.code) ?? null);
    });

    const hasDiff = publishedValues.some((pub, i) => {
      const prev = previewValues[i];
      if (pub == null || prev == null) return false;
      return Math.abs(prev - pub) >= 0.01;
    });

    return {
      voce: indentLabel(row),
      publishedValues,
      previewValues,
      className: rowClassName(row.rowKind),
      hasDiff,
    };
  });
}
