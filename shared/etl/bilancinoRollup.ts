/**

 * bilancinoRollup — rollup leaf → macro CE (stessa struttura Excel analisi).

 *

 * Dopo runBilancinoPipeline (SUMIF conto→voce), calcola subtotali, margini e

 * risultato con le stesse formule del foglio CE dettaglio. Produce facts,

 * layout e KPI completi per publish_facts.

 */



import { macroMetricsLabels } from '../domain/kpiFormulas.ts';

import {

  getCeProfile,

  type CELayoutTemplateRow,

  type CeProfile,

} from './ceProfiles/index.ts';

import type { Fact, LayoutRow, RowKind } from './types.ts';



// Re-export retrocompat

export {

  CE_DETTAGLIO_LAYOUT,

  SUM_CHILDREN,

  type CELayoutTemplateRow,

} from './ceProfiles/index.ts';



function round2(n: number): number {

  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));

}



function sumKeys(values: Record<string, number>, keys: string[]): number {

  return round2(keys.reduce((acc, k) => acc + (values[k] ?? 0), 0));

}



function resolveSubtotal(

  key: string,

  profile: CeProfile,

  leafSums: Record<string, number>,

  rolled: Record<string, number>,

): number {

  if (key in leafSums) return round2(leafSums[key]);

  const children = profile.sumChildren[key];

  if (children && children.length > 0) {

    return sumKeys({ ...leafSums, ...rolled }, children);

  }

  return rolled[key] ?? 0;

}



/**

 * Calcola tutte le voci CE (leaf + subtotali + margini) a partire dai soli

 * aggregati leaf prodotti da runBilancinoPipeline.

 */

export function rollupLeafSums(

  leafSums: Record<string, number>,

  ceProfileId?: string | null,

): Record<string, number> {

  const profile = getCeProfile(ceProfileId);

  const rolled: Record<string, number> = { ...leafSums };



  for (const key of profile.rollupOrder) {

    if (profile.formulaKeys.has(key)) {

      rolled[key] = profile.applyFormula(key, rolled);

    } else {

      rolled[key] = resolveSubtotal(key, profile, leafSums, rolled);

    }

  }



  return rolled;

}



export interface BilancinoRollupInput {

  leafSums: Record<string, number>;

  year: number;

  month: number;

  /** Progressivo del mese precedente per calcolo puntuale (opzionale). */

  previousProgressive?: Record<string, number>;

  /** Slug azienda o companies.ce_profile per layout/formule. */

  ceProfileId?: string | null;

  /** Aggregati paralleli (es. totaleCostiVariabili da famiglia Sherpa). */

  supplementalSums?: Record<string, number>;

}



export interface BilancinoRollupResult {

  values: Record<string, number>;

  facts: Fact[];

  layout: LayoutRow[];

  kpis: Record<string, number>;

}



function periodFromProgressive(

  code: string,

  progressive: number,

  month: number,

  previous?: Record<string, number>,

): number {

  if (month <= 1) return progressive;

  const prev = previous?.[code] ?? 0;

  return round2(progressive - prev);

}



/** Costruisce facts, layout e KPI completi dal rollup. */

export function buildBilancinoRollup(input: BilancinoRollupInput): BilancinoRollupResult {

  const profile = getCeProfile(input.ceProfileId);

  const mergedLeaf = { ...input.leafSums, ...input.supplementalSums };

  const values = rollupLeafSums(mergedLeaf, profile.id);

  const { year, month, previousProgressive } = input;



  const codesInLayout = new Set(profile.layout.map((r) => r.code));

  const extraLeafCodes = Object.keys(mergedLeaf).filter((c) => !codesInLayout.has(c));



  const facts: Fact[] = [];

  const allCodes = [

    ...profile.layout.map((r) => r.code),

    ...extraLeafCodes,

  ];



  const seen = new Set<string>();

  for (const code of allCodes) {

    if (seen.has(code)) continue;

    seen.add(code);

    const progressive = values[code] ?? mergedLeaf[code] ?? 0;

    const period = periodFromProgressive(code, progressive, month, previousProgressive);

    const label = profile.layout.find((r) => r.code === code)?.label ?? code;

    facts.push({

      categoryCode: code,

      year,

      month,

      amountProgressive: progressive,

      amountPeriod: period,

      sourceLabel: label,

    });

  }



  const layout: LayoutRow[] = profile.layout.map((row, idx) => ({

    reportType: 'ce_dettaglio',

    year,

    rowIndex: idx,

    originalLabel: row.label,

    indentLevel: row.indentLevel,

    rowKind: row.rowKind as RowKind,

    canonicalKey: row.code,

    isMapped: true,

    amountProgressive: values[row.code] ?? 0,

  }));



  for (const code of extraLeafCodes) {

    layout.push({

      reportType: 'ce_dettaglio',

      year,

      rowIndex: layout.length,

      originalLabel: code,

      indentLevel: 1,

      rowKind: 'voce',

      canonicalKey: code,

      isMapped: true,

      amountProgressive: values[code] ?? mergedLeaf[code] ?? 0,

    });

  }



  const kpis: Record<string, number> = { ...values };

  for (const macro of macroMetricsLabels) {

    const primary = macro.keys[0];

    if (kpis[primary] == null) {

      for (const k of macro.keys) {

        if (values[k] != null) {

          kpis[primary] = values[k];

          break;

        }

      }

    }

  }



  return { values, facts, layout, kpis };

}


