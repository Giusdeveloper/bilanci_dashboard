/**
 * workbook — adapter PORTABILE verso la libreria `xlsx`.
 *
 * Il motore ETL non importa mai `xlsx` direttamente: cosi' lo stesso codice gira
 * sia in Node (import 'xlsx') sia in Deno/Edge Function (import 'npm:xlsx').
 * Il modulo `xlsx` viene INIETTATO dal chiamante. La rappresentazione interna e'
 * una semplice griglia di celle per foglio (`Cell[][]`), facilmente costruibile
 * anche nei test senza un file reale.
 */

export type Cell = string | number | boolean | null;

export interface WorkbookData {
  sheetNames: string[];
  sheets: Record<string, Cell[][]>;
}

/** Interfaccia minima del modulo xlsx usata qui (read + utils.sheet_to_json). */
export interface XlsxLike {
  read(data: unknown, opts: Record<string, unknown>): {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json(sheet: unknown, opts: Record<string, unknown>): unknown[];
  };
}

/**
 * Costruisce una {@link WorkbookData} a partire dai byte del file e dal modulo
 * xlsx iniettato. Ogni foglio diventa una matrice di celle (header:1).
 */
export function readWorkbookData(xlsx: XlsxLike, bytes: Uint8Array): WorkbookData {
  const wb = xlsx.read(bytes, { type: 'array' });
  const sheets: Record<string, Cell[][]> = {};
  for (const name of wb.SheetNames) {
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[name], {
      header: 1,
      defval: null,
      raw: true,
      blankrows: true,
    }) as Cell[][];
    sheets[name] = rows;
  }
  return { sheetNames: wb.SheetNames, sheets };
}

/** Restituisce le righe di un foglio per nome (o [] se assente). */
export function getSheet(wb: WorkbookData, name: string): Cell[][] {
  return wb.sheets[name] ?? [];
}

/** Trova il primo nome di foglio che soddisfa la regex (o null). */
export function findSheetName(wb: WorkbookData, regex: RegExp): string | null {
  return wb.sheetNames.find((s) => regex.test(s.trim())) ?? null;
}
