/**
 * extract — motore generico di estrazione del Conto Economico.
 *
 * Risolve in modo DICHIARATIVO (per ancore, non per indici hardcoded):
 *  - il foglio CE dettaglio dal profilo (regex sul nome);
 *  - la colonna dell'anno corrente come colonna sotto l'ancora "PROGRESSIVO";
 *  - l'anno corrente e l'anno di confronto leggendoli dalla riga anni;
 *  - il mese di riferimento dall'etichetta mese nell'header (DICEMBRE/FEBBRAIO/...);
 *  - la griglia mensile individuando la riga dei nomi-mese (offset variabile).
 *
 * Non conosce aziende o anni specifici: tutto deriva dal profilo + dal contenuto.
 */

import { cleanNumber } from '../domain/periodMath.ts';
import type { WorkbookData, Cell } from './workbook.ts';
import { findSheetName } from './workbook.ts';
import type { TemplateProfile } from './profiles.ts';
import type { ExtractedRow, ExtractResult, MappingResolver, RowKind } from './types.ts';

const MONTHS: Record<string, number> = {
  GENNAIO: 1, FEBBRAIO: 2, MARZO: 3, APRILE: 4, MAGGIO: 5, GIUGNO: 6,
  LUGLIO: 7, AGOSTO: 8, SETTEMBRE: 9, OTTOBRE: 10, NOVEMBRE: 11, DICEMBRE: 12,
};

const NOISE_LABELS = new Set([
  'CONTOECONOMICO', '%RICAVI', 'VARIAZIONE', 'PROGRESSIVO', 'TOTALEPROGRESSIVO',
  '---', '--', '-',
]);

const norm = (s: unknown): string => String(s ?? '').trim();
const upperNoSpace = (s: unknown): string => norm(s).toUpperCase().replace(/\s+/g, '');

function parseYear(cell: Cell): number | null {
  const m = String(cell ?? '').match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

function monthFromCell(cell: Cell): number | null {
  const u = String(cell ?? '').trim().toUpperCase();
  if (MONTHS[u]) return MONTHS[u];
  return null;
}

/** Classifica la tipologia di una riga del CE. */
export function classifyRow(label: string, canonicalKey: string | null): RowKind {
  const u = label.toUpperCase();
  const uns = upperNoSpace(label);
  const isStampatello = label.length > 3 && label === label.toUpperCase() && !/[a-z]/.test(label);

  if ((uns.includes('RISULTATO') && (uns.includes('ESERCIZIO') || uns.includes('UTILE') || uns.includes('PERDITA')))
    || canonicalKey === 'risultatoEsercizio') {
    return 'risultato';
  }
  if (canonicalKey === 'grossProfit' || canonicalKey === 'ebitda' || canonicalKey === 'ebit' || canonicalKey === 'ebt'
    || uns.includes('PRIMOMARGINE') || uns === 'EBITDA' || uns === 'EBIT' || uns === 'EBT' || uns === 'GROSSPROFIT' || uns === 'MARGINE') {
    return 'margine';
  }
  if (u.includes('TOTALE') || u.includes('COMPLESSIVI') || (canonicalKey && canonicalKey.startsWith('totale'))) {
    return 'totale';
  }
  if (isStampatello) return 'subtotale';
  return 'voce';
}

/** Una riga e' "autoritativa" (gia' aggregata nel file) -> non sommare i dettagli. */
export function isAuthoritative(kind: RowKind): boolean {
  return kind === 'totale' || kind === 'subtotale' || kind === 'margine' || kind === 'risultato';
}

interface AnchorInfo {
  anchorRow: number;
  colCurrent: number;
  colCompare: number | null;
  currentYear: number;
  compareYear: number | null;
  referenceMonth: number | null;
}

function resolveAnchors(rows: Cell[][], headerAnchor: string): AnchorInfo | null {
  const anchorUpper = headerAnchor.toUpperCase();
  let anchorRow = -1;
  let colCurrent = -1;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const row = rows[i] ?? [];
    for (let j = 0; j < row.length; j++) {
      if (norm(row[j]).toUpperCase() === anchorUpper) {
        anchorRow = i;
        colCurrent = j;
        break;
      }
    }
    if (anchorRow !== -1) break;
  }
  if (anchorRow === -1) return null;

  const yearRow = rows[anchorRow + 1] ?? [];
  const currentYear = parseYear(yearRow[colCurrent] ?? null);
  if (currentYear == null) return null;

  let colCompare: number | null = null;
  let compareYear: number | null = null;
  for (let j = colCurrent + 1; j < yearRow.length; j++) {
    const y = parseYear(yearRow[j] ?? null);
    if (y != null && y !== currentYear) {
      colCompare = j;
      compareYear = y;
      break;
    }
  }

  let referenceMonth: number | null = null;
  const anchorRowCells = rows[anchorRow] ?? [];
  for (const cell of anchorRowCells) {
    const m = monthFromCell(cell);
    if (m != null) { referenceMonth = m; break; }
  }

  return { anchorRow, colCurrent, colCompare, currentYear, compareYear, referenceMonth };
}

function isNoiseLabel(label: string): boolean {
  const uns = upperNoSpace(label);
  if (!uns || uns.length < 2) return true;
  if (NOISE_LABELS.has(uns)) return true;
  if (/^\d{2,4}$/.test(uns)) return true; // anno isolato
  if (MONTHS[norm(label).toUpperCase()]) return true; // nome mese isolato
  return false;
}

/** Trova la riga dei nomi-mese in una griglia mensile e mappa mese->colonna. */
function detectMonthColumns(rows: Cell[][]): { headerRow: number; cols: Record<number, number> } | null {
  let best: { headerRow: number; cols: Record<number, number> } | null = null;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const row = rows[i] ?? [];
    const cols: Record<number, number> = {};
    // La colonna 0 contiene l'etichetta del mese di riferimento (es. "Febbraio"):
    // NON è una colonna-dato. La griglia dei mesi vive sempre nelle colonne >= 1.
    // Mapparla qui ruberebbe il mese di riferimento alla sua vera colonna dati.
    for (let j = 1; j < row.length; j++) {
      const m = monthFromCell(row[j]);
      if (m != null && cols[m] === undefined) cols[m] = j;
    }
    const count = Object.keys(cols).length;
    if (count >= 6 && (!best || count > Object.keys(best.cols).length)) {
      best = { headerRow: i, cols };
    }
  }
  return best;
}

/**
 * Estrae il CE dettaglio (annuale progressivo) + la griglia mensile, mappando
 * ogni label tramite il `resolver`. Ritorna righe grezze + serie mensili per
 * categoria canonica.
 */
export function extractCE(
  wb: WorkbookData,
  profile: TemplateProfile,
  resolver: MappingResolver,
): ExtractResult {
  const ceName = findSheetName(wb, profile.sheets.ceDettaglio);
  if (!ceName) {
    throw new Error(`Foglio CE dettaglio non trovato per il profilo ${profile.id}`);
  }
  const rows = wb.sheets[ceName] ?? [];
  const anchors = resolveAnchors(rows, profile.headerAnchor);
  if (!anchors) {
    throw new Error(`Impossibile risolvere le ancore di colonna nel foglio ${ceName}`);
  }

  const extracted: ExtractedRow[] = [];
  for (let i = anchors.anchorRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const label = norm(row[0]);
    if (isNoiseLabel(label)) continue;

    const valueCurrent = cleanNumber(row[anchors.colCurrent]);
    const valueCompare = anchors.colCompare != null ? cleanNumber(row[anchors.colCompare]) : null;
    const resolution = resolver(label);
    const canonicalKey = resolution ? resolution.categoryCode : null;
    const sign = resolution ? resolution.sign : 1;
    const rowKind = classifyRow(label, canonicalKey);

    extracted.push({
      rowIndex: i,
      label,
      valueCurrent: round2(valueCurrent * sign),
      valueCompare: valueCompare == null ? null : round2(valueCompare * sign),
      canonicalKey,
      sign,
      viaFallback: resolution ? resolution.viaFallback : false,
      rowKind,
    });

    if (rowKind === 'risultato') break;
  }

  const { monthlyByCategory, monthsCount } = extractMonthly(wb, profile, resolver, anchors.referenceMonth);

  return {
    profileId: profile.id,
    currentYear: anchors.currentYear,
    compareYear: anchors.compareYear,
    referenceMonth: anchors.referenceMonth,
    rows: extracted,
    monthlyByCategory,
    monthsCount,
  };
}

function extractMonthly(
  wb: WorkbookData,
  profile: TemplateProfile,
  resolver: MappingResolver,
  referenceMonth: number | null,
): { monthlyByCategory: Record<string, number[]>; monthsCount: number } {
  if (!profile.sheets.ceMensile) return { monthlyByCategory: {}, monthsCount: 0 };
  const name = findSheetName(wb, profile.sheets.ceMensile);
  if (!name) return { monthlyByCategory: {}, monthsCount: 0 };
  const rows = wb.sheets[name] ?? [];
  const detected = detectMonthColumns(rows);
  if (!detected) return { monthlyByCategory: {}, monthsCount: 0 };

  const detectedMax = Math.max(...Object.keys(detected.cols).map(Number));
  const limit = referenceMonth != null ? Math.min(referenceMonth, detectedMax) : detectedMax;

  // Accumula per categoria: somma dettagli e ultimo valore autoritativo, per mese.
  const voceSum: Record<string, number[]> = {};
  const authValues: Record<string, number[]> = {};
  const hasAuth: Record<string, boolean> = {};

  for (let i = detected.headerRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const label = norm(row[0]);
    if (isNoiseLabel(label)) continue;
    const resolution = resolver(label);
    if (!resolution) continue;
    const code = resolution.categoryCode;
    const sign = resolution.sign;
    const kind = classifyRow(label, code);

    const series = new Array(limit).fill(0);
    for (let m = 1; m <= limit; m++) {
      const col = detected.cols[m];
      if (col === undefined) continue;
      series[m - 1] = round2(cleanNumber(row[col]) * sign);
    }

    if (isAuthoritative(kind)) {
      authValues[code] = series; // l'ultima autoritativa vince
      hasAuth[code] = true;
    } else {
      if (!voceSum[code]) voceSum[code] = new Array(limit).fill(0);
      for (let m = 0; m < limit; m++) voceSum[code][m] = round2(voceSum[code][m] + series[m]);
    }
  }

  const monthlyByCategory: Record<string, number[]> = {};
  const codes = Array.from(new Set<string>([...Object.keys(voceSum), ...Object.keys(authValues)]));
  for (const code of codes) {
    monthlyByCategory[code] = hasAuth[code] ? authValues[code] : voceSum[code];
  }
  return { monthlyByCategory, monthsCount: limit };
}

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}
