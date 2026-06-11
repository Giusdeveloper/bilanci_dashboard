/**

 * extractBilancino — estrattore puro per file bilancino contabile (Awentia).

 *

 * Profili supportati:

 *   - bilancino_studio: 1 foglio con DataRif/Tipologia/Conto1/Conto2

 *   - bilancino_stampa: 4 fogli Table 1-4, CE su Table 2+3 (layout stampa)

 */



import { cleanNumber } from '../domain/periodMath.ts';

import type { Cell, WorkbookData } from './workbook.ts';

import { normalizeAccountCode } from './seed/extractSourceMapping.ts';

import type { TemplateProfile } from './profiles.ts';

import { getProfile } from './profiles.ts';



export type BilancinoSection = 'CE' | 'SP';

export type BilancinoSide = 'costi' | 'ricavi';



export interface BilancinoAccountRow {

  accountCode: string;

  description: string;

  balanceRaw: number;

  balanceNormalized: number;

  section: BilancinoSection;

  side: BilancinoSide;

  tipologia: string;

}



export interface BilancinoTotals {

  totaleRicavi: number | null;

  totaleCosti: number | null;

  /** Perdita negativa, utile positivo (convenzione CE riclassificato). */

  risultato: number | null;

  /** Totali grezzi dal footer bilancino (layout colonna) — solo diagnostica. */

  footer?: {

    totaleRicavi: number | null;

    totaleCosti: number | null;

    risultato: number | null;

  };

}



export interface BilancinoExtractResult {

  profileId: string;

  companyName: string;

  year: number;

  month: number;

  accounts: BilancinoAccountRow[];

  totals: BilancinoTotals;

}



/** Colonne fisse del bilancino studio Awentia. */

const COL_RAGIONE = 1;

const COL_DATARIF = 2;

const COL_TIPOLOGIA = 3;

const COL_CONTO1 = 4;

const COL_DESCR1 = 5;

const COL_SALDO1 = 6;

const COL_CONTO2 = 7;

const COL_DESCR2 = 8;

const COL_SALDO2 = 9;



/** Colonne layout stampa CE (Table 2/3): costi sx, ricavi dx. */

const STAMPA_CONTO_L = 0;

const STAMPA_DESCR_L = 2;

const STAMPA_SALDO_L = 3;

const STAMPA_CONTO_R = 5;

const STAMPA_DESCR_R = 7;

const STAMPA_SALDO_R = 8;



const CE_TIPOLOGIA = /COSTI,\s*SPESE\s*E\s*PERDITE-RICAVI\s*E\s*PROFITTI/i;

const SP_TIPOLOGIA = /ATTIVIT/i;

const STAMPA_CE_SHEETS = /^Table\s+[23]$/i;



function cellText(value: Cell): string {

  if (value == null) return '';

  return String(value).trim();

}



function isLeafAccount(raw: Cell): string | null {

  const code = normalizeAccountCode(raw);

  if (!code || code.endsWith('/000')) return null;

  if (code.includes('***')) return null;

  return code;

}



/**

 * Converte DataRif (stringa IT o serial Excel) in anno/mese.

 * Serial Excel: epoch 1899-12-30 (convenzione 1900 date system).

 */

export function parseDataRif(raw: Cell): { year: number; month: number } {

  if (typeof raw === 'number' && Number.isFinite(raw)) {

    const epochMs = Date.UTC(1899, 11, 30);

    const d = new Date(epochMs + raw * 86_400_000);

    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };

  }



  const s = cellText(raw);

  const m = s.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);

  if (m) {

    return { year: parseInt(m[3], 10), month: parseInt(m[2], 10) };

  }



  throw new Error(`DataRif non parseabile: ${String(raw)}`);

}



/**

 * Estrae mese/anno dal nome file (es. "AWENTIA 06 25.xlsx" → giugno 2025).

 */

export function parseFilenamePeriod(filename: string): { year: number; month: number } | null {

  const base = filename.replace(/^.*[/\\]/, '').replace(/\.[^.]+$/, '');

  const m = base.match(/(?:^|[\s_])(\d{1,2})\s+(\d{2})(?:\s|$|\.)/);

  if (!m) return null;

  const month = parseInt(m[1], 10);

  const year = 2000 + parseInt(m[2], 10);

  if (month < 1 || month > 12) return null;

  return { year, month };

}



function classifySection(tipologia: string): BilancinoSection | null {

  if (CE_TIPOLOGIA.test(tipologia)) return 'CE';

  if (SP_TIPOLOGIA.test(tipologia)) return 'SP';

  return null;

}



function captureTotal(descr: string, amount: number, totals: BilancinoTotals): void {

  const u = descr.toUpperCase();

  if (u.includes('TOTALE RICAVI')) {

    totals.totaleRicavi = amount;

    return;

  }

  if (u.includes('TOTALE COSTI')) {

    totals.totaleCosti = amount;

    return;

  }

  if (u.includes('PERDITA') && u.includes('ESERCIZIO')) {

    totals.risultato = -Math.abs(amount);

    return;

  }

  if (u.includes('UTILE') && u.includes('ESERCIZIO')) {

    totals.risultato = Math.abs(amount);

  }

}



function firstSheetRows(wb: WorkbookData): Cell[][] {

  const name = wb.sheetNames[0];

  if (!name) throw new Error('Workbook bilancino senza fogli');

  return wb.sheets[name] ?? [];

}



function resolveProfile(profile?: TemplateProfile): TemplateProfile {

  if (profile) return profile;

  const p = getProfile('bilancino_studio');

  if (!p) throw new Error('Profilo bilancino_studio non registrato');

  return p;

}



const OPERATING_COST_PREFIXES = new Set(['66', '68']);
const TAX_PREFIX = '84';
const FINANCIAL_PREFIX = '88';

const REVENUE_ACCOUNT_PREFIXES = new Set(['58', '64']);

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

/** Prefisso classe conto (es. "66/20/005" → "66"). */
export function accountPrefix(accountCode: string): string {
  return accountCode.split('/')[0] ?? '';
}

/** Natura economica CE dal codice conto (non dalla colonna layout bilancino). */
export function classifyAccountSide(accountCode: string): BilancinoSide {
  return REVENUE_ACCOUNT_PREFIXES.has(accountPrefix(accountCode)) ? 'ricavi' : 'costi';
}

/**
 * Risolve side e importo normalizzato: storni costo in colonna ricavi (layout stampa)
 * restano costi con segno negativo che riduce la spesa.
 */
export function resolveAccountCe(
  accountCode: string,
  layoutSide: BilancinoSide,
  balanceRaw: number,
): { side: BilancinoSide; balanceNormalized: number } {
  const economicSide = classifyAccountSide(accountCode);
  let adjusted = balanceRaw;

  if (layoutSide === 'ricavi' && economicSide === 'costi') {
    adjusted = -Math.abs(balanceRaw);
  } else if (layoutSide === 'costi' && economicSide === 'ricavi') {
    adjusted = Math.abs(balanceRaw);
  }

  return {
    side: economicSide,
    balanceNormalized: normalizeForCe(accountCode, economicSide, adjusted),
  };
}

/** Totali CE per natura economica (somma conti classificati, non footer layout). */
export function computeBilancinoTotalsFromAccounts(
  accounts: BilancinoAccountRow[],
): BilancinoTotals {
  let totaleRicavi = 0;
  let totaleCosti = 0;
  let hasRicavi = false;
  let hasCosti = false;

  for (const acc of accounts) {
    if (acc.section !== 'CE') continue;
    if (acc.side === 'ricavi') {
      totaleRicavi += acc.balanceNormalized;
      hasRicavi = true;
    } else {
      totaleCosti += acc.balanceNormalized;
      hasCosti = true;
    }
  }

  const ricavi = hasRicavi ? round2(totaleRicavi) : null;
  const costi = hasCosti ? round2(totaleCosti) : null;
  const risultato =
    ricavi != null && costi != null ? round2(ricavi - costi) : null;

  return { totaleRicavi: ricavi, totaleCosti: costi, risultato };
}

function finalizeBilancinoTotals(
  accounts: BilancinoAccountRow[],
  footerTotals: BilancinoTotals,
): BilancinoTotals {
  const computed = computeBilancinoTotalsFromAccounts(accounts);
  return {
    ...computed,
    risultato: footerTotals.risultato ?? computed.risultato,
    footer: {
      totaleRicavi: footerTotals.totaleRicavi,
      totaleCosti: footerTotals.totaleCosti,
      risultato: footerTotals.risultato,
    },
  };
}

/**
 * Normalizza il saldo grezzo del bilancino in contributo CE coerente col rollup.
 *
 * - Ricavi: sempre positivi (convenzione financial_facts).
 * - Costi 66/, 68/: segno preservato — storni/crediti negativi riducono la spesa.
 * - Imposte 84/: segno preservato — crediti d'imposta riducono imposteDirette.
 * - Finanziari 88/: segno preservato — proventi negativi riducono gestioneFinanziaria.
 * - Altri costi: segno preservato (no abs cieco).
 */
export function normalizeForCe(
  accountCode: string,
  side: BilancinoSide,
  balanceRaw: number,
): number {
  if (side === 'ricavi') {
    return Math.abs(balanceRaw);
  }

  const prefix = accountPrefix(accountCode);
  if (
    OPERATING_COST_PREFIXES.has(prefix)
    || prefix === TAX_PREFIX
    || prefix === FINANCIAL_PREFIX
  ) {
    return balanceRaw;
  }

  return balanceRaw;
}

/** @deprecated Use resolveAccountCe(accountCode, layoutSide, balanceRaw). */
function normalizeBalance(layoutSide: BilancinoSide, balanceRaw: number, accountCode: string): number {
  return resolveAccountCe(accountCode, layoutSide, balanceRaw).balanceNormalized;
}



function findStampaCeHeaderRow(rows: Cell[][]): number {

  for (let i = 0; i < Math.min(rows.length, 20); i++) {

    const row = rows[i] ?? [];

    if (cellText(row[STAMPA_CONTO_L]).toUpperCase() === 'CONTO' && /SALDO/i.test(cellText(row[STAMPA_SALDO_L]))) {

      return i;

    }

  }

  return 5;

}



function extractCompanyFromStampaSheet(rows: Cell[][]): string {

  for (const row of rows.slice(0, 6)) {

    if (/^Ditta$/i.test(cellText(row[0]))) {

      const name = cellText(row[1]);

      if (name) return name;

    }

  }

  return '';

}



function extractStampaCeAccounts(rows: Cell[][]): BilancinoAccountRow[] {

  const accounts: BilancinoAccountRow[] = [];

  const headerRow = findStampaCeHeaderRow(rows);

  const tipologia = 'COSTI, SPESE E PERDITE-RICAVI E PROFITTI';



  for (let i = headerRow + 1; i < rows.length; i++) {

    const row = rows[i];

    if (!row?.length) continue;



    const contoL = isLeafAccount(row[STAMPA_CONTO_L]);

    if (contoL) {

      const balanceRaw = cleanNumber(row[STAMPA_SALDO_L]);

      const { side, balanceNormalized } = resolveAccountCe(contoL, 'costi', balanceRaw);

      accounts.push({

        accountCode: contoL,

        description: cellText(row[STAMPA_DESCR_L]),

        balanceRaw,

        balanceNormalized,

        section: 'CE',

        side,

        tipologia,

      });

    }



    const contoR = isLeafAccount(row[STAMPA_CONTO_R]);

    if (contoR) {

      const balanceRaw = cleanNumber(row[STAMPA_SALDO_R]);

      const { side, balanceNormalized } = resolveAccountCe(contoR, 'ricavi', balanceRaw);

      accounts.push({

        accountCode: contoR,

        description: cellText(row[STAMPA_DESCR_R]),

        balanceRaw,

        balanceNormalized,

        section: 'CE',

        side,

        tipologia,

      });

    }

  }



  return accounts;

}



function captureStampaTotals(rows: Cell[][]): BilancinoTotals {

  const totals: BilancinoTotals = {

    totaleRicavi: null,

    totaleCosti: null,

    risultato: null,

  };



  for (const row of rows) {

    if (!row?.length) continue;

    const descrL = cellText(row[STAMPA_DESCR_L]);

    const descrR = cellText(row[STAMPA_DESCR_R]);

    if (descrL) captureTotal(descrL, cleanNumber(row[STAMPA_SALDO_L]), totals);

    if (descrR) captureTotal(descrR, cleanNumber(row[STAMPA_SALDO_R]), totals);

  }



  return totals;

}



function extractBilancinoStampa(

  wb: WorkbookData,

  prof: TemplateProfile,

  sourceFilename?: string,

): BilancinoExtractResult {

  if (!sourceFilename) {

    throw new Error('bilancino_stampa richiede sourceFilename per anno/mese');

  }



  const period = parseFilenamePeriod(sourceFilename);

  if (!period) {

    throw new Error(`Impossibile determinare anno/mese da filename: ${sourceFilename}`);

  }



  const ceSheetNames = wb.sheetNames.filter((s) => STAMPA_CE_SHEETS.test(s.trim()));

  if (ceSheetNames.length === 0) {

    throw new Error('bilancino_stampa: fogli Table 2/3 non trovati');

  }



  let companyName = '';

  const accounts: BilancinoAccountRow[] = [];

  const totals: BilancinoTotals = {

    totaleRicavi: null,

    totaleCosti: null,

    risultato: null,

  };



  for (const sheetName of ceSheetNames) {

    const rows = wb.sheets[sheetName] ?? [];

    if (!companyName) companyName = extractCompanyFromStampaSheet(rows);

    accounts.push(...extractStampaCeAccounts(rows));

    if (sheetName.match(/Table\s+3/i)) {

      const t3 = captureStampaTotals(rows);

      totals.totaleRicavi = t3.totaleRicavi;

      totals.totaleCosti = t3.totaleCosti;

      totals.risultato = t3.risultato;

    }

  }



  return {

    profileId: prof.id,

    companyName: companyName || 'Sconosciuta',

    year: period.year,

    month: period.month,

    accounts,

    totals: finalizeBilancinoTotals(accounts, totals),

  };

}



function extractBilancinoStudio(wb: WorkbookData, prof: TemplateProfile): BilancinoExtractResult {

  const rows = firstSheetRows(wb);

  if (rows.length < 2) throw new Error('Bilancino vuoto o senza dati');



  let companyName = '';

  let year = 0;

  let month = 0;

  const accounts: BilancinoAccountRow[] = [];

  const totals: BilancinoTotals = {

    totaleRicavi: null,

    totaleCosti: null,

    risultato: null,

  };



  for (let i = 1; i < rows.length; i++) {

    const row = rows[i];

    if (!row?.length) continue;



    const tipologia = cellText(row[COL_TIPOLOGIA]);

    if (!tipologia) continue;



    if (!companyName) companyName = cellText(row[COL_RAGIONE]);

    if (!year) {

      const parsed = parseDataRif(row[COL_DATARIF]);

      year = parsed.year;

      month = parsed.month;

    }



    const section = classifySection(tipologia);

    if (!section) continue;



    const descr1 = cellText(row[COL_DESCR1]);

    const descr2 = cellText(row[COL_DESCR2]);

    if (descr1) captureTotal(descr1, cleanNumber(row[COL_SALDO1]), totals);

    if (descr2) captureTotal(descr2, cleanNumber(row[COL_SALDO2]), totals);



    if (section !== 'CE') continue;



    const conto1 = isLeafAccount(row[COL_CONTO1]);

    if (conto1) {

      const balanceRaw = cleanNumber(row[COL_SALDO1]);

      const { side, balanceNormalized } = resolveAccountCe(conto1, 'costi', balanceRaw);

      accounts.push({

        accountCode: conto1,

        description: descr1,

        balanceRaw,

        balanceNormalized,

        section: 'CE',

        side,

        tipologia,

      });

    }



    const conto2 = isLeafAccount(row[COL_CONTO2]);

    if (conto2) {

      const balanceRaw = cleanNumber(row[COL_SALDO2]);

      const { side, balanceNormalized } = resolveAccountCe(conto2, 'ricavi', balanceRaw);

      accounts.push({

        accountCode: conto2,

        description: descr2,

        balanceRaw,

        balanceNormalized,

        section: 'CE',

        side,

        tipologia,

      });

    }

  }



  if (!year || !month) {

    throw new Error('Impossibile determinare anno/mese da DataRif');

  }



  return {

    profileId: prof.id,

    companyName: companyName || 'Sconosciuta',

    year,

    month,

    accounts,

    totals: finalizeBilancinoTotals(accounts, totals),

  };

}



/**

 * Estrae conti leaf e totali di quadratura dal bilancino.

 * `balanceNormalized` porta i ricavi in convenzione CE (positivi); i costi restano come in bilancino.

 */

export function extractBilancino(

  wb: WorkbookData,

  profile?: TemplateProfile,

  sourceFilename?: string,

): BilancinoExtractResult {

  const prof = resolveProfile(profile);

  if (prof.id === 'bilancino_stampa') {

    return extractBilancinoStampa(wb, prof, sourceFilename);

  }

  return extractBilancinoStudio(wb, prof);

}


