/**
 * financialShaping — modulo PURO (nessuna dipendenza da React/Supabase a runtime).
 *
 * Trasforma i modelli typed del layer di lettura (`@shared/queries`:
 * `MacroMetricRow`, `CEDettaglioModel`, ...) nelle righe pronte per il
 * componente `DataTable` (mappe `{ key -> stringa formattata }` + `className`).
 *
 * La formattazione di valuta/percentuale è iniettata come dipendenza, così il
 * modulo resta puro e testabile senza importare il blob legacy `financialData`.
 */

import type { MacroMetricRow, CEDettaglioModel, CEDettaglioRow, MonthlyMacroRow } from '@shared/queries';
import { MONTH_LABELS_SHORT } from '@shared/queries';

/** Slug URL italiani per i mesi (gennaio..dicembre). */
export const MONTH_SLUGS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
] as const;

/** Nomi completi dei mesi in italiano. */
export const MONTH_NAMES_FULL = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
] as const;

/** Slug URL per un mese 1..12. */
export function monthSlug(month: number): string {
  return MONTH_SLUGS[month - 1] ?? MONTH_SLUGS[0];
}

/** Numero mese 1..12 da slug URL, o undefined se invalido. */
export function monthFromSlug(slug: string): number | undefined {
  const idx = MONTH_SLUGS.indexOf(slug.toLowerCase() as (typeof MONTH_SLUGS)[number]);
  return idx >= 0 ? idx + 1 : undefined;
}

/** Percorso drill-down per il dettaglio puntuale di un mese. */
export function monthDetailHref(month: number, year: number): string {
  return `/ce-dettaglio-mensile/${monthSlug(month)}?anno=${year}`;
}

/** Riga pronta per `DataTable`: chiavi dinamiche + `className` di stile. */
export type TableRow = Record<string, string>;

/** Formatter di valuta (es. `formatCurrency`). */
export type CurrencyFormatter = (v: number | null | undefined) => string;
/** Formatter di percentuale (es. `formatPercentage`). */
export type PercentFormatter = (v: number | null | undefined, decimals?: number) => string;

/** Chiave colonna per il valore di un anno (es. `val2025`). */
export function yearColumnKey(year: number): string {
  return `val${year}`;
}

/** Mappa il `type` di una macro-voce CE nella classe di stile di `DataTable`. */
export function cssClassForMetricType(type: string): string {
  switch (type) {
    case 'result':
      return 'result';
    case 'key-metric':
      return 'key-metric';
    case 'total':
    case 'subtotal':
      return 'total-dark';
    default:
      return '';
  }
}

/** Mappa il `rowKind` (report_layout) nella classe di stile di `DataTable`. */
export function cssClassForRowKind(rowKind: string | null): string {
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

/** Formatta la varianza % con segno, o `n/a` se non calcolabile. */
export function formatVariance(
  variancePct: number | null,
  fmtPct: PercentFormatter,
): string {
  if (variancePct === null || variancePct === undefined) return 'n/a';
  const sign = variancePct >= 0 ? '+' : '';
  return `${sign}${fmtPct(variancePct, 1)}`;
}

/**
 * Costruisce le righe della tabella "macro" (dashboard / CE sintetico) a partire
 * dalle `MacroMetricRow` calcolate dal modello, formattando i valori per ognuno
 * degli anni a confronto. La varianza è quella già calcolata (t0 vs t1).
 *
 * @param rows righe macro dal modello.
 * @param years anni a confronto [t0, t1, t2] (ordine discendente).
 */
export function buildMacroTableRows(
  rows: MacroMetricRow[],
  years: number[],
  fmtCur: CurrencyFormatter,
  fmtPct: PercentFormatter,
): TableRow[] {
  const t0 = years[0];
  return rows.map((row) => {
    const out: TableRow = { voce: row.label };
    for (const y of years) {
      out[yearColumnKey(y)] = fmtCur(row.valuesByYear[y] ?? 0);
    }
    out.percentage = fmtPct(
      t0 !== undefined ? row.percentOfRevenueByYear[t0] ?? 0 : 0,
      1,
    );
    out.variance = formatVariance(row.variancePct, fmtPct);
    out.className = cssClassForMetricType(row.type);
    return out;
  });
}

/**
 * Trova il valore dei ricavi totali nel CE di dettaglio fedele (per il calcolo
 * dell'incidenza %). Cerca prima `totaleRicavi`, poi `ricaviCaratteristici`;
 * ritorna 0 se assenti.
 */
export function findRevenueReference(model: CEDettaglioModel): number {
  const byCode = (code: string) =>
    model.rows.find((r) => r.code === code)?.amountProgressive;
  return byCode('totaleRicavi') ?? byCode('ricaviCaratteristici') ?? 0;
}

/** Ricavi totali puntuale per un mese (base incidenza %). */
export function findRevenueForMonth(model: CEDettaglioModel, month: number): number {
  const byCode = (code: string) => {
    const row = model.rows.find((r) => r.code === code);
    return row?.monthlyPeriod?.[month - 1] ?? null;
  };
  return byCode('totaleRicavi') ?? byCode('ricaviCaratteristici') ?? 0;
}

function matchDettaglioRow(prevRows: CEDettaglioRow[], row: CEDettaglioRow): CEDettaglioRow | undefined {
  if (row.code) return prevRows.find((r) => r.code === row.code);
  return prevRows.find((r) => r.rowIndex === row.rowIndex);
}

/**
 * Costruisce le righe della tabella del CE di DETTAGLIO fedele all'Excel
 * (incluse le voci NON mappate), per l'anno del modello. Mostra il valore
 * annuale e l'incidenza % sui ricavi. Le righe sono già ordinate per `rowIndex`
 * nel modello.
 *
 * L'indentazione gerarchica (per le voci di dettaglio) è resa con spazi
 * unificatori in testa all'etichetta, così da non alterare il componente.
 */
export function buildCEDettaglioTableRows(
  model: CEDettaglioModel,
  fmtCur: CurrencyFormatter,
  fmtPct: PercentFormatter,
): TableRow[] {
  const ricavi = findRevenueReference(model);
  const base = ricavi !== 0 ? ricavi : 1;
  const yearKey = yearColumnKey(model.year);

  return model.rows.map((row) => {
    const indent =
      row.rowKind === 'voce' && row.indentLevel > 0
        ? '\u00A0\u00A0'.repeat(row.indentLevel)
        : '';
    return {
      voce: `${indent}${row.label}`,
      [yearKey]: fmtCur(row.amountProgressive),
      percentage: fmtPct((row.amountProgressive / base) * 100, 1),
      className: cssClassForRowKind(row.rowKind),
    };
  });
}

/** Riga pronta per le tabelle mensili (sticky) con celle pre-formattate. */
export interface MonthlyTableRow {
  voce: string;
  values: string[];
  className: string;
}

/** Etichette brevi dei mesi a partire dai numeri mese (1..12). */
export function monthLabels(months: number[]): string[] {
  return months.map((m) => MONTH_LABELS_SHORT[m - 1] ?? String(m));
}

/**
 * Costruisce le righe della tabella mensile del CE di DETTAGLIO fedele all'Excel.
 * Per ogni riga prende la serie (progressiva o puntuale) ai mesi disponibili;
 * le righe senza serie mensile (non mappate / solo annuali) mostrano `—`.
 */
export function buildMonthlyDetailRows(
  model: CEDettaglioModel,
  mode: 'progressive' | 'period',
  months: number[],
  fmtCur: CurrencyFormatter,
): MonthlyTableRow[] {
  return model.rows.map((row) => {
    const series = mode === 'progressive' ? row.monthlyProgressive : row.monthlyPeriod;
    const indent =
      row.rowKind === 'voce' && row.indentLevel > 0
        ? '\u00A0\u00A0'.repeat(row.indentLevel)
        : '';
    const values = months.map((m) => (series ? fmtCur(series[m - 1] ?? 0) : '—'));
    return { voce: `${indent}${row.label}`, values, className: cssClassForRowKind(row.rowKind) };
  });
}

/**
 * Costruisce le righe della tabella mensile del CE SINTETICO (macro-voci) a
 * partire dalle serie mensili calcolate dal modello condiviso.
 */
export function buildMonthlySinteticoRows(
  rows: MonthlyMacroRow[],
  months: number[],
  fmtCur: CurrencyFormatter,
): MonthlyTableRow[] {
  return rows.map((row) => ({
    voce: row.label,
    values: months.map((m) => fmtCur(row.series[m - 1] ?? 0)),
    className: cssClassForMetricType(row.type),
  }));
}

/**
 * Costruisce le righe del CE di dettaglio per un singolo mese puntuale,
 * con incidenza % sui ricavi e confronto opzionale con lo stesso mese dell'anno precedente.
 */
export function buildSingleMonthDetailRows(
  model: CEDettaglioModel,
  month: number,
  fmtCur: CurrencyFormatter,
  fmtPct: PercentFormatter,
  prevModel?: CEDettaglioModel | null,
): TableRow[] {
  const ricavi = findRevenueForMonth(model, month);
  const base = ricavi !== 0 ? ricavi : 1;
  const hasPrev = !!prevModel && prevModel.rows.length > 0;

  return model.rows.map((row) => {
    const series = row.monthlyPeriod;
    const val = series ? (series[month - 1] ?? 0) : null;
    const indent =
      row.rowKind === 'voce' && row.indentLevel > 0
        ? '\u00A0\u00A0'.repeat(row.indentLevel)
        : '';

    const out: TableRow = {
      voce: `${indent}${row.label}`,
      valueCurrent: series ? fmtCur(val ?? 0) : '—',
      percentage: series ? fmtPct(((val ?? 0) / base) * 100, 1) : '—',
      className: cssClassForRowKind(row.rowKind),
    };

    if (hasPrev && prevModel) {
      const prevRow = matchDettaglioRow(prevModel.rows, row);
      const prevSeries = prevRow?.monthlyPeriod;
      const prevVal = prevSeries ? (prevSeries[month - 1] ?? 0) : 0;
      const currentVal = val ?? 0;
      const varEuro = currentVal - prevVal;
      const varPct =
        prevVal === 0 && currentVal === 0
          ? null
          : prevVal === 0
            ? null
            : ((currentVal - prevVal) / Math.abs(prevVal)) * 100;

      out.valuePrevious = prevSeries ? fmtCur(prevVal) : '—';
      out.varianceEuro =
        !prevSeries || (currentVal === 0 && prevVal === 0) ? 'n/a' : fmtCur(varEuro);
      out.variance =
        !prevSeries || (currentVal === 0 && prevVal === 0)
          ? 'n/a'
          : formatVariance(varPct, fmtPct);
    }

    return out;
  });
}
