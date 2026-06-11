/**
 * extractSourceMapping — estrazione pura del mapping contabile dalla sheet Source.
 *
 * Colonne attese (A:D):
 *   A = Conto Co.Ge. (es. 66/20/005)
 *   B = Descrizione
 *   C = Famiglia (Struttura, Commerciali, Diretti, ...)
 *   D = Analitica (voce CE, es. "Spese generali")
 *
 * Header tipico righe 2-4; i dati partono dalla riga 5 (indice 4).
 */

import type { Cell } from '../workbook.ts';

export interface SourceMappingRow {
  accountCode: string;
  accountDescription: string;
  famiglia: string;
  analiticaLabel: string;
}

const LEAF_ACCOUNT_PATTERN = /^\d{2}\/\d{2}\/\d{3}$/;
const HEADER_MARKERS = ['conto co.ge.', 'conto coge', 'conto'];

function cellText(value: Cell): string {
  if (value == null) return '';
  return String(value).trim();
}

/** Normalizza un codice conto: trim e verifica pattern leaf XX/XX/XXX. */
export function normalizeAccountCode(raw: Cell): string | null {
  const text = cellText(raw);
  if (!text) return null;
  const normalized = text.replace(/\s+/g, '');
  return LEAF_ACCOUNT_PATTERN.test(normalized) ? normalized : null;
}

function isHeaderRow(row: Cell[]): boolean {
  const colA = cellText(row[0]).toLowerCase();
  return HEADER_MARKERS.some((m) => colA.includes(m));
}

function findDataStartIndex(rows: Cell[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (isHeaderRow(rows[i])) return i + 2;
  }
  return 4;
}

/**
 * Estrae le righe di mapping dalla griglia Source!A:D.
 * Importa tutti i codici leaf con analitica valorizzata; salta header e righe vuote.
 */
export function extractSourceMapping(rows: Cell[][]): SourceMappingRow[] {
  const start = findDataStartIndex(rows);
  const out: SourceMappingRow[] = [];
  const seen = new Set<string>();

  for (let i = start; i < rows.length; i++) {
    const row = rows[i];
    if (!row?.length) continue;

    const accountCode = normalizeAccountCode(row[0]);
    if (!accountCode) continue;

    const analiticaLabel = cellText(row[3]);
    if (!analiticaLabel) continue;

    if (seen.has(accountCode)) continue;
    seen.add(accountCode);

    out.push({
      accountCode,
      accountDescription: cellText(row[1]),
      famiglia: cellText(row[2]),
      analiticaLabel,
    });
  }

  return out;
}

/** True se il conto appartiene ai ricavi (per sign_multiplier bilancino). */
export function isRicaviAccount(row: Pick<SourceMappingRow, 'accountCode' | 'famiglia'>): boolean {
  const famiglia = row.famiglia.toLowerCase();
  if (famiglia.includes('ricavi') || famiglia.includes('valore della produzione')) return true;
  return row.accountCode.startsWith('58/');
}
