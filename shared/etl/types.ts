/**
 * Tipi condivisi del motore ETL bilanci (modulo PURO: nessuna dipendenza da
 * Node/Deno/Supabase a runtime). Gira identico lato server (Edge Function Deno)
 * e negli script Node, perché opera solo su strutture dati gia' estratte.
 */

import type { BilancinoPublishGateResult } from './bilancinoPublishGate.ts';

/** Classificazione di una riga del Conto Economico riclassificato. */
export type RowKind = 'voce' | 'subtotale' | 'totale' | 'margine' | 'risultato';

/** Severita' di un warning di import. */
export type WarningSeverity = 'info' | 'warning' | 'error';

/** Esito della risoluzione di una label verso un conto canonico. */
export interface MappingResolution {
  /** code di master_chart_of_accounts (coincide con la chiave canonica). */
  categoryCode: string;
  /** Moltiplicatore di segno (+1 / -1). */
  sign: number;
  /** true se risolta tramite il dizionario di fallback, non un mapping esplicito. */
  viaFallback: boolean;
}

/**
 * Risolve una label Excel verso un conto canonico.
 * Ritorna null quando la label non e' mappabile (-> warning, mai scarto silenzioso).
 */
export type MappingResolver = (label: string) => MappingResolution | null;

/** Riga grezza estratta dal CE dettaglio (vista "fedele all'Excel"). */
export interface ExtractedRow {
  rowIndex: number;
  label: string;
  /** Valore progressivo dell'anno corrente. */
  valueCurrent: number;
  /** Valore progressivo dell'anno di confronto (se presente). */
  valueCompare: number | null;
  canonicalKey: string | null;
  sign: number;
  viaFallback: boolean;
  rowKind: RowKind;
}

/** Fatto normalizzato pronto per il load (period x conto canonico). */
export interface Fact {
  categoryCode: string;
  year: number;
  /** null = dato annuale. */
  month: number | null;
  amountProgressive: number;
  amountPeriod: number | null;
  sourceLabel: string;
}

/** Warning esplicito di import. */
export interface Warning {
  severity: WarningSeverity;
  message: string;
}

/** Riga di layout fedele all'Excel (per ricostruire il prospetto). */
export interface LayoutRow {
  reportType: string;
  year: number;
  rowIndex: number;
  originalLabel: string;
  indentLevel: number;
  rowKind: RowKind;
  canonicalKey: string | null;
  isMapped: boolean;
  amountProgressive: number;
}

/** Risultato dell'estrazione (annuale + mensile) di un singolo file. */
export interface ExtractResult {
  profileId: string;
  currentYear: number;
  compareYear: number | null;
  referenceMonth: number | null;
  rows: ExtractedRow[];
  /** Serie progressive mensili per categoria canonica (chiave = categoryCode). */
  monthlyByCategory: Record<string, number[]>;
  /** Numero di mesi effettivamente presenti (1..referenceMonth). */
  monthsCount: number;
}

/** Risultato completo della pipeline (puro, senza DB). */
export interface PipelineResult {
  profileId: string;
  currentYear: number;
  compareYear: number | null;
  referenceMonth: number | null;
  facts: Fact[];
  warnings: Warning[];
  layout: LayoutRow[];
  /** KPI principali estratti (per golden test / anteprima). */
  kpis: Record<string, number>;
  /** Esito gate publish bilancino (quadratura + mapping). */
  publishGate?: BilancinoPublishGateResult;
}
