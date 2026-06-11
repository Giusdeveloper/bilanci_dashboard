/**
 * pipeline — orchestrazione PURA dell'ETL (nessun accesso al DB).
 *
 * extract -> aggregazione canonica (anti doppio-conteggio) -> facts annuali +
 * mensili -> warning (voci non mappate / fallback / quadrature) -> layout fedele.
 * Lo stesso risultato viene poi caricato sia dall'Edge Function sia dallo script
 * orchestratore (vedi loadPlan).
 */

import type { WorkbookData } from './workbook.ts';
import type { TemplateProfile } from './profiles.ts';
import type {
  ExtractResult,
  ExtractedRow,
  Fact,
  LayoutRow,
  MappingResolver,
  PipelineResult,
  Warning,
} from './types.ts';
import { extractCE, isAuthoritative } from './extract.ts';
import { validateFacts, buildQuadratureWarnings } from './validate.ts';

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

/**
 * Aggrega le righe per code canonico evitando il doppio conteggio:
 *  - se il gruppo contiene una riga "autoritativa" (totale/subtotale/margine/
 *    risultato), si usa il valore dell'ultima riga autoritativa;
 *  - altrimenti si sommano le sole righe di dettaglio (voce).
 */
function aggregateAnnual(rows: ExtractedRow[]): Map<string, { value: number; label: string }> {
  const groups = new Map<string, ExtractedRow[]>();
  for (const r of rows) {
    if (!r.canonicalKey) continue;
    const arr = groups.get(r.canonicalKey) ?? [];
    arr.push(r);
    groups.set(r.canonicalKey, arr);
  }

  const result = new Map<string, { value: number; label: string }>();
  for (const [code, group] of Array.from(groups.entries())) {
    const authoritative = group.filter((r) => isAuthoritative(r.rowKind));
    if (authoritative.length > 0) {
      const last = authoritative[authoritative.length - 1];
      result.set(code, { value: round2(last.valueCurrent), label: last.label });
    } else {
      const sum = group.reduce((acc, r) => acc + r.valueCurrent, 0);
      result.set(code, { value: round2(sum), label: group[0].label });
    }
  }
  return result;
}

export interface PipelineInput {
  workbook: WorkbookData;
  profile: TemplateProfile;
  resolver: MappingResolver;
  /** true se il profilo e' stato scelto per fallback (genera un warning). */
  detectionFallback?: boolean;
}

export function runPipeline(input: PipelineInput): PipelineResult {
  const { workbook, profile, resolver, detectionFallback } = input;
  const extracted: ExtractResult = extractCE(workbook, profile, resolver);
  const warnings: Warning[] = [];

  if (detectionFallback) {
    warnings.push({
      severity: 'warning',
      message: `Profilo template non riconosciuto con certezza: usato fallback "${profile.id}".`,
    });
  }

  // --- Facts annuali (month = null) ---
  const annual = aggregateAnnual(extracted.rows);
  const facts: Fact[] = [];
  const annualValues: Record<string, number> = {};
  for (const [code, { value, label }] of Array.from(annual.entries())) {
    annualValues[code] = value;
    facts.push({
      categoryCode: code,
      year: extracted.currentYear,
      month: null,
      amountProgressive: value,
      amountPeriod: null,
      sourceLabel: label,
    });
  }

  // --- Facts mensili (month = 1..monthsCount) ---
  for (const [code, series] of Object.entries(extracted.monthlyByCategory)) {
    for (let m = 1; m <= extracted.monthsCount; m++) {
      const prog = series[m - 1] ?? 0;
      const period = m === 1 ? prog : round2(prog - (series[m - 2] ?? 0));
      facts.push({
        categoryCode: code,
        year: extracted.currentYear,
        month: m,
        amountProgressive: round2(prog),
        amountPeriod: period,
        sourceLabel: code,
      });
    }
  }

  // --- Warning: voci non mappate / mappate via fallback ---
  for (const r of extracted.rows) {
    if (!r.canonicalKey) {
      warnings.push({ severity: 'warning', message: `Voce non mappata: "${r.label}"` });
    } else if (r.viaFallback) {
      warnings.push({ severity: 'info', message: `Voce mappata via dizionario di fallback: "${r.label}"` });
    }
  }

  // --- Layout fedele all'Excel ---
  const layout: LayoutRow[] = extracted.rows.map((r, idx) => ({
    reportType: 'ce_dettaglio',
    year: extracted.currentYear,
    rowIndex: idx,
    originalLabel: r.label,
    indentLevel: r.rowKind === 'voce' ? 1 : 0,
    rowKind: r.rowKind,
    canonicalKey: r.canonicalKey,
    isMapped: r.canonicalKey != null,
    amountProgressive: r.valueCurrent,
  }));

  // --- Validazioni ---
  warnings.push(...validateFacts(facts));
  warnings.push(
    ...buildQuadratureWarnings({
      annual: annualValues,
      monthlyByCategory: extracted.monthlyByCategory,
      monthsCount: extracted.monthsCount,
    }),
  );

  const kpis: Record<string, number> = { ...annualValues };

  return {
    profileId: extracted.profileId,
    currentYear: extracted.currentYear,
    compareYear: extracted.compareYear,
    referenceMonth: extracted.referenceMonth,
    facts,
    warnings,
    layout,
    kpis,
  };
}
