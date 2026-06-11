/**
 * Tipi del layer di lettura typed (modulo PURO: nessuna dipendenza da
 * Supabase/React a runtime). Descrivono i dati AGGREGATI restituiti a partire
 * dai fatti normalizzati (`financial_facts`) e dal layout fedele all'Excel
 * (`report_layout`), per `(companyId, year, month|periodo)`.
 *
 * NOTA: niente più chiavi con l'anno "dentro" (addio `progressivo2025`).
 * L'anno è sempre un campo dato reale.
 */

import type { DashboardPeriod } from '../domain/periodMath';
import type { CEMetricType } from '../domain/kpiFormulas';

export type { DashboardPeriod, CEMetricType };

/**
 * Riga grezza normalizzata letta da `financial_facts` (già unita a
 * `master_chart_of_accounts` per avere `code`/`label`/`type` del conto).
 */
export interface FactRow {
  /** code del conto canonico (= master_chart_of_accounts.code). */
  code: string;
  /** label del conto canonico. */
  label: string;
  /** type del conto canonico (normal/total/key-metric/result/...). */
  type: string;
  year: number;
  /** null = dato annuale (progressivo di fine periodo). */
  month: number | null;
  /** valore progressivo (cumulato) del periodo. */
  amountProgressive: number;
  /** valore puntuale (mensile); null per le righe annuali. */
  amountPeriod: number | null;
}

/**
 * Aggregati per un singolo anno, indicizzati per `code` del conto canonico.
 * Le serie mensili hanno sempre lunghezza 12 (mesi assenti = 0).
 */
export interface YearAggregates {
  year: number;
  /** valore annuale (progressivo della riga month = null) per code. */
  annualByCode: Record<string, number>;
  /** serie puntuale (mensile) 12 elementi per code. */
  periodByCode: Record<string, number[]>;
  /** serie progressiva (cumulata) 12 elementi per code. */
  progressiveByCode: Record<string, number[]>;
  /** numero di mesi effettivamente presenti nei dati (0..12). */
  monthsAvailable: number;
}

/** KPI principali calcolati per un anno e un periodo. */
export interface KpiValues {
  year: number;
  ricavi: number;
  costi: number;
  ebitda: number;
  risultato: number;
  /** margine EBITDA % = ebitda/ricavi*100. */
  margineEbitda: number;
  /** serie ricavi cumulata (12) per il trend. */
  ricaviMonthlyProgressive: number[];
  /** serie ricavi puntuale (12). */
  ricaviMonthlyPeriod: number[];
  /** serie ebitda cumulata (12) per il trend. */
  ebitdaMonthlyProgressive: number[];
  /** serie ebitda puntuale (12). */
  ebitdaMonthlyPeriod: number[];
  monthsAvailable: number;
}

/** Riga del Conto Economico sintetico/riclassificato (per macro-voce). */
export interface MacroMetricRow {
  label: string;
  type: CEMetricType;
  /** chiavi canoniche candidate (per debug/UI). */
  keys: string[];
  /** valore per anno reale. */
  valuesByYear: Record<number, number>;
  /** incidenza % sui ricavi, per anno reale. */
  percentOfRevenueByYear: Record<number, number>;
  /** varianza % tra il primo e il secondo anno della lista `years`. */
  variancePct: number | null;
}

/** Modello del Conto Economico sintetico (più anni a confronto). */
export interface CESinteticoModel {
  /** anni a confronto, ordinati [t0, t1, t2] (solo quelli con dati). */
  years: number[];
  rows: MacroMetricRow[];
  period: DashboardPeriod;
  /** mese di riferimento usato per il calcolo del periodo (1..12). */
  monthReference: number;
}

/** Modello dati della dashboard generale. */
export interface DashboardModel {
  years: number[];
  /** KPI per anno reale. */
  kpisByYear: Record<number, KpiValues>;
  /** tabella "Dettaglio Economico" (macro-voci). */
  summary: MacroMetricRow[];
  period: DashboardPeriod;
  monthReference: number;
  /** etichette dei mesi per il grafico di trend. */
  trendMonths: string[];
}

/** Riga del Conto Economico di dettaglio, fedele all'Excel. */
export interface CEDettaglioRow {
  rowIndex: number;
  /** etichetta originale dell'Excel (anche se non mappata). */
  label: string;
  indentLevel: number;
  rowKind: string | null;
  /** code canonico, se la riga è mappata; altrimenti null. */
  code: string | null;
  isMapped: boolean;
  /** valore annuale progressivo dal layout. */
  amountProgressive: number;
  /** serie puntuale (12) se disponibile dai facts (solo righe mappate). */
  monthlyPeriod: number[] | null;
  /** serie progressiva (12) se disponibile dai facts (solo righe mappate). */
  monthlyProgressive: number[] | null;
}

/** Modello del Conto Economico di dettaglio fedele all'Excel. */
export interface CEDettaglioModel {
  year: number;
  reportType: string;
  profile: string | null;
  rows: CEDettaglioRow[];
}

/** Periodi disponibili per un'azienda. */
export interface CompanyPeriods {
  /** anni con dati, ordinati discendenti. */
  years: number[];
  /** per anno: mesi disponibili (asc) e se esiste la riga annuale. */
  byYear: Record<number, { months: number[]; hasAnnual: boolean }>;
}
