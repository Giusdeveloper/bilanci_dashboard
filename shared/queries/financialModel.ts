/**
 * financialModel — modulo PURO (nessuna dipendenza da Supabase/React a runtime).
 *
 * Trasforma le righe grezze di `financial_facts` (typed come {@link FactRow}) e
 * di `report_layout` in modelli AGGREGATI per la UI: KPI, Conto Economico
 * sintetico e di dettaglio, trend mensile. Tutta la logica di periodo/varianza
 * riusa i moduli di dominio in `shared/domain`.
 *
 * I confronti pluriennali e gli YTD sono calcolati per ANNO REALE a partire dai
 * fatti: non esiste più alcuna chiave "con l'anno dentro" tipo `progressivo2025`.
 */

import {
  sumPeriod,
  sumFirstN,
  FIXED_WINDOW_PERIODS,
  type DashboardPeriod,
} from '../domain/periodMath';
import {
  calculateVariance,
  calculateEbitdaMargin,
  calculateMargin,
} from '../domain/kpiFormulas';
import { getMacroMetricsForProfile } from '../etl/ceProfiles/index.ts';
import type {
  FactRow,
  YearAggregates,
  KpiValues,
  MacroMetricRow,
  CESinteticoModel,
  DashboardModel,
  CEDettaglioModel,
  CEDettaglioRow,
} from './types';

/** Etichette brevi dei mesi (gen..dic), usate per i grafici di trend. */
export const MONTH_LABELS_SHORT = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic',
];

/** Chiavi canoniche candidate per i ricavi totali (prima trovata vince). */
export const REVENUE_KEYS = ['totaleRicavi', 'ricaviCaratteristici'];
/** Chiave canonica EBITDA. */
export const EBITDA_KEYS = ['ebitda'];
/** Chiavi canoniche per il risultato d'esercizio. */
export const RESULT_KEYS = ['risultatoEsercizio', 'risultato'];
/** Chiavi canoniche per il totale costi lordi (se pubblicato come fact). */
export const COST_KEYS = ['totaleCostiLordi', 'totaleCosti'];

const EMPTY_12 = (): number[] => new Array(12).fill(0);

/**
 * Aggrega le righe `financial_facts` di una azienda per un singolo anno.
 * Le righe con `month = null` alimentano i totali annuali (`annualByCode`),
 * le righe mensili alimentano le serie puntuali/progressive (12 elementi).
 */
export function aggregateYearFacts(facts: FactRow[], year: number): YearAggregates {
  const annualByCode: Record<string, number> = {};
  const periodByCode: Record<string, number[]> = {};
  const progressiveByCode: Record<string, number[]> = {};
  const monthsSeen = new Set<number>();

  for (const f of facts) {
    if (f.year !== year) continue;

    if (f.month === null || f.month === undefined) {
      // Riga annuale: il progressivo è il totale dell'anno.
      annualByCode[f.code] = (annualByCode[f.code] ?? 0) + (f.amountProgressive ?? 0);
      continue;
    }

    if (f.month < 1 || f.month > 12) continue;
    monthsSeen.add(f.month);

    if (!periodByCode[f.code]) periodByCode[f.code] = EMPTY_12();
    if (!progressiveByCode[f.code]) progressiveByCode[f.code] = EMPTY_12();

    periodByCode[f.code][f.month - 1] = f.amountPeriod ?? 0;
    progressiveByCode[f.code][f.month - 1] = f.amountProgressive ?? 0;
  }

  return {
    year,
    annualByCode,
    periodByCode,
    progressiveByCode,
    monthsAvailable: monthsSeen.size,
  };
}

/** Indica se un periodo+mese copre l'intero anno (Gen-Dic). */
function coversFullYear(period: DashboardPeriod, month: number): boolean {
  if (period === '12M') return true;
  const isCumulative = period === 'YTD' || !FIXED_WINDOW_PERIODS.includes(period);
  return isCumulative && month >= 12;
}

/**
 * Valore di un `code` per un dato periodo/mese a partire dagli aggregati annuali.
 *
 * Strategia (robusta ai dati reali, dove la serie mensile può non quadrare con
 * la riga annuale):
 *  - se non ci sono mesi → si usa sempre il totale annuale;
 *  - se il periodo copre l'intero anno ed esiste il totale annuale → si usa quello;
 *  - altrimenti → somma della serie puntuale sui mesi del periodo.
 */
export function valueForPeriod(
  agg: YearAggregates,
  code: string,
  period: DashboardPeriod,
  month: number,
): number {
  const annual = agg.annualByCode[code];

  if (agg.monthsAvailable === 0) {
    return annual ?? 0;
  }
  if (coversFullYear(period, month) && annual !== undefined) {
    return annual;
  }

  const isCumulative = period === 'YTD' || !FIXED_WINDOW_PERIODS.includes(period);
  if (isCumulative) {
    // "Progressivo fino al mese M": il progressivo del mese M è la fonte
    // autorevole quando la serie mensile è valorizzata correttamente.
    const progSeries = agg.progressiveByCode[code];
    const idx = Math.min(Math.max(month, 1), 12) - 1;
    const atMonth = progSeries ? progSeries[idx] : 0;
    if (atMonth !== 0) return atMonth;

    // Serie progressiva mensile assente/incoerente (es. file interinali dove il
    // mese di riferimento ha progressivo 0): prova a ricostruire dal puntuale.
    const summed = sumPeriod(agg.periodByCode[code], period, month);
    if (summed !== 0) return summed;

    // Nulla di valido nei mensili: ripiega sul progressivo annuale, che per i
    // file "alla data X" rappresenta il totale-attraverso-X.
    return annual ?? 0;
  }

  // Periodi a finestra mobile (M, 3M, 6M, 9M): somma puntuale del periodo.
  return sumPeriod(agg.periodByCode[code], period, month);
}

/** Valore del primo `code` presente tra i candidati (per macro-voce). */
function firstKeyValue(
  agg: YearAggregates,
  keys: string[],
  period: DashboardPeriod,
  month: number,
): number {
  for (const key of keys) {
    if (agg.annualByCode[key] !== undefined || agg.periodByCode[key] !== undefined) {
      return valueForPeriod(agg, key, period, month);
    }
  }
  // Nessun code presente: prova comunque il primo (restituirà 0).
  return keys.length > 0 ? valueForPeriod(agg, keys[0], period, month) : 0;
}

function hasAnyKey(agg: YearAggregates, keys: string[]): boolean {
  return keys.some(
    (key) => agg.annualByCode[key] !== undefined || agg.periodByCode[key] !== undefined,
  );
}

/**
 * Totale costi lordi coerente con gate CFO / natura economica bilancino:
 * ricavi − risultato (include ammortamenti, finanziari, imposte).
 * Se esiste un fact `totaleCostiLordi`/`totaleCosti`, quello ha priorità.
 */
export function computeTotaleCostiLordi(
  agg: YearAggregates,
  period: DashboardPeriod,
  month: number,
  ricavi: number,
  risultato: number,
): number {
  if (hasAnyKey(agg, COST_KEYS)) {
    return firstKeyValue(agg, COST_KEYS, period, month);
  }
  return ricavi - risultato;
}

/** Serie 12-mesi del primo `code` presente tra i candidati. */
function firstKeySeries(
  byCode: Record<string, number[]>,
  keys: string[],
): number[] {
  for (const key of keys) {
    if (byCode[key]) return byCode[key];
  }
  return EMPTY_12();
}

/** Calcola i KPI principali per un anno e un periodo. */
export function computeKpis(
  agg: YearAggregates,
  period: DashboardPeriod,
  month: number,
): KpiValues {
  const ricavi = firstKeyValue(agg, REVENUE_KEYS, period, month);
  const ebitda = firstKeyValue(agg, EBITDA_KEYS, period, month);
  const risultato = firstKeyValue(agg, RESULT_KEYS, period, month);
  const costi = computeTotaleCostiLordi(agg, period, month, ricavi, risultato);

  return {
    year: agg.year,
    ricavi,
    ebitda,
    risultato,
    costi,
    margineEbitda: calculateEbitdaMargin(ebitda, ricavi),
    ricaviMonthlyProgressive: firstKeySeries(agg.progressiveByCode, REVENUE_KEYS),
    ricaviMonthlyPeriod: firstKeySeries(agg.periodByCode, REVENUE_KEYS),
    ebitdaMonthlyProgressive: firstKeySeries(agg.progressiveByCode, EBITDA_KEYS),
    ebitdaMonthlyPeriod: firstKeySeries(agg.periodByCode, EBITDA_KEYS),
    monthsAvailable: agg.monthsAvailable,
  };
}

/**
 * Costruisce le righe macro del Conto Economico riclassificato (sintetico),
 * riusando l'ordine/gerarchia di `macroMetricsLabels`.
 *
 * @param aggByYear aggregati per anno (chiave = anno reale).
 * @param years anni a confronto ordinati [t0, t1, t2] (la varianza è t0 vs t1).
 */
export function buildMacroRows(
  aggByYear: Record<number, YearAggregates>,
  years: number[],
  period: DashboardPeriod,
  month: number,
  ceProfileId?: string | null,
): MacroMetricRow[] {
  const macroMetrics = getMacroMetricsForProfile(ceProfileId);

  // Pre-calcolo ricavi/risultato per anno (servono per costi lordi e incidenze).
  const ricaviByYear: Record<number, number> = {};
  const risultatoByYear: Record<number, number> = {};
  for (const y of years) {
    const agg = aggByYear[y];
    ricaviByYear[y] = agg ? firstKeyValue(agg, REVENUE_KEYS, period, month) : 0;
    risultatoByYear[y] = agg ? firstKeyValue(agg, RESULT_KEYS, period, month) : 0;
  }

  return macroMetrics.map((def) => {
    const valuesByYear: Record<number, number> = {};
    const percentOfRevenueByYear: Record<number, number> = {};

    for (const y of years) {
      const agg = aggByYear[y];
      let value: number;
      if (def.keys.includes('totaleCosti')) {
        value = agg
          ? computeTotaleCostiLordi(agg, period, month, ricaviByYear[y], risultatoByYear[y])
          : ricaviByYear[y] - risultatoByYear[y];
      } else {
        value = agg ? firstKeyValue(agg, def.keys, period, month) : 0;
      }
      valuesByYear[y] = value;
      percentOfRevenueByYear[y] = calculateMargin(value, ricaviByYear[y]);
    }

    const [t0, t1] = years;
    const variancePct =
      t0 !== undefined && t1 !== undefined
        ? calculateVariance(valuesByYear[t0], valuesByYear[t1])
        : null;

    return {
      label: def.label,
      type: def.type,
      keys: def.keys,
      valuesByYear,
      percentOfRevenueByYear,
      variancePct,
    };
  });
}

/** Costruisce il modello del Conto Economico sintetico (multi-anno). */
export function buildCESintetico(
  aggByYear: Record<number, YearAggregates>,
  years: number[],
  period: DashboardPeriod,
  month: number,
  ceProfileId?: string | null,
): CESinteticoModel {
  return {
    years,
    rows: buildMacroRows(aggByYear, years, period, month, ceProfileId),
    period,
    monthReference: month,
  };
}

/** Costruisce il modello dati completo della dashboard. */
export function buildDashboardModel(
  aggByYear: Record<number, YearAggregates>,
  years: number[],
  period: DashboardPeriod,
  month: number,
  ceProfileId?: string | null,
): DashboardModel {
  const kpisByYear: Record<number, KpiValues> = {};
  for (const y of years) {
    const agg = aggByYear[y];
    kpisByYear[y] = agg
      ? computeKpis(agg, period, month)
      : {
          year: y,
          ricavi: 0,
          ebitda: 0,
          risultato: 0,
          costi: 0,
          margineEbitda: 0,
          ricaviMonthlyProgressive: EMPTY_12(),
          ricaviMonthlyPeriod: EMPTY_12(),
          ebitdaMonthlyProgressive: EMPTY_12(),
          ebitdaMonthlyPeriod: EMPTY_12(),
          monthsAvailable: 0,
        };
  }

  return {
    years,
    kpisByYear,
    summary: buildMacroRows(aggByYear, years, period, month, ceProfileId),
    period,
    monthReference: month,
    trendMonths: MONTH_LABELS_SHORT,
  };
}

/** Riga grezza del layout letta da `report_layout` (con code risolto). */
export interface LayoutInputRow {
  rowIndex: number;
  originalLabel: string;
  indentLevel: number;
  rowKind: string | null;
  /** code canonico se mappata, altrimenti null. */
  code: string | null;
  isMapped: boolean;
  amountProgressive: number;
}

/**
 * Costruisce il Conto Economico di dettaglio fedele all'Excel a partire dalle
 * righe di `report_layout` (incluse le voci NON mappate), ordinandole per
 * `rowIndex`. Se forniti gli aggregati dell'anno, aggancia le serie mensili
 * alle righe mappate.
 */
export function buildCEDettaglio(
  layout: LayoutInputRow[],
  year: number,
  reportType: string,
  profile: string | null,
  agg?: YearAggregates,
): CEDettaglioModel {
  const rows: CEDettaglioRow[] = [...layout]
    .sort((a, b) => a.rowIndex - b.rowIndex)
    .map((l) => {
      const monthlyPeriod =
        l.code && agg?.periodByCode[l.code] ? agg.periodByCode[l.code] : null;
      const monthlyProgressive =
        l.code && agg?.progressiveByCode[l.code] ? agg.progressiveByCode[l.code] : null;
      return {
        rowIndex: l.rowIndex,
        label: l.originalLabel,
        indentLevel: l.indentLevel,
        rowKind: l.rowKind,
        code: l.code,
        isMapped: l.isMapped,
        amountProgressive: l.amountProgressive ?? 0,
        monthlyPeriod,
        monthlyProgressive,
      };
    });

  return { year, reportType, profile, rows };
}

/** Totale di una serie puntuale (helper esposto per la UI). */
export function totalOfSeries(series: number[] | null | undefined): number {
  return sumFirstN(series, 12);
}

/** Riga macro del CE con la sua serie mensile (12 elementi) per un anno. */
export interface MonthlyMacroRow {
  label: string;
  type: MacroMetricRow['type'];
  keys: string[];
  /** serie a 12 mesi (progressiva o puntuale a seconda della modalità). */
  series: number[];
}

/**
 * Costruisce le serie mensili (12 elementi) per ogni macro-voce del Conto
 * Economico riclassificato, riusando la gerarchia di `macroMetricsLabels`.
 *
 * @param agg aggregati di un singolo anno (da `aggregateYearFacts`).
 * @param mode 'progressive' (cumulato) oppure 'period' (puntuale mensile).
 */
export function buildMonthlyMacroSeries(
  agg: YearAggregates,
  mode: 'progressive' | 'period',
  ceProfileId?: string | null,
): MonthlyMacroRow[] {
  const macroMetrics = getMacroMetricsForProfile(ceProfileId);
  const byCode = mode === 'progressive' ? agg.progressiveByCode : agg.periodByCode;
  const ricavi = firstKeySeries(byCode, REVENUE_KEYS);
  const risultato = firstKeySeries(byCode, RESULT_KEYS);

  return macroMetrics.map((def) => {
    let series: number[];
    if (def.keys.includes('totaleCosti')) {
      if (hasAnyKey(agg, COST_KEYS)) {
        series = [...firstKeySeries(byCode, COST_KEYS)];
      } else {
        series = ricavi.map((r, i) => r - (risultato[i] ?? 0));
      }
    } else {
      series = [...firstKeySeries(byCode, def.keys)];
    }
    return { label: def.label, type: def.type, keys: def.keys, series };
  });
}
