/**

 * importBilancio — client del nuovo import server-side.

 *

 * Invoca la Edge Function `import-bilancio` (ETL idempotente) al posto del vecchio

 * parser lato browser. Supporta Excel analisi CE e bilancino mensile (PoC).

 */



import { supabase } from '@/lib/supabase';



export type WarningSeverity = 'info' | 'warning' | 'error';

export type ImportKind = 'auto' | 'ce_analisi' | 'bilancino';

export type ResolvedImportKind = 'ce_analisi' | 'bilancino';



export interface ImportWarning {

  severity: WarningSeverity;

  message: string;

}



export interface ImportCounts {

  factsAnnual: number;

  factsMonthly: number;

  warnings: number;

  errors: number;

}



export interface BilancinoCounts {

  accounts: number;

  warnings: number;

  errors: number;

}



export interface BilancinoQuadrature {

  totaleRicavi: number | null;

  totaleCosti: number | null;

  risultato: number | null;

}



export interface BilancinoQuadratureCheck {

  key: string;

  label: string;

  extracted: number | null;

  rollup: number | null;

  delta: number | null;

  ok: boolean;

}



export interface BilancinoActionLink {

  label: string;

  href: string;

}



export interface CompareDiffEntry {

  key: string;

  bilancino: number | null;

  database: number | null;

  delta: number | null;

  ok: boolean;

}



export interface CeImportLoaded {

  importId: string;

  facts: number;

  warnings: number;

  layout: number;

}



export interface BilancinoImportLoaded {

  importId: string;

  accountBalances: number;

  warnings: number;

  facts?: number;

}



interface ImportPreviewBase {

  dryRun: boolean;

  filename: string;

  fileHash: string;

  profile: string;

  detectionScores: Record<string, number>;

  year: number;

  compareYear: number | null;

  referenceMonth: number | null;

  kpis: Record<string, number>;

  warnings: ImportWarning[];

}



export interface CeAnalisiPreview extends ImportPreviewBase {

  importKind: 'ce_analisi';

  counts: ImportCounts;

  import?: CeImportLoaded;

}



export interface BilancinoPreview extends ImportPreviewBase {

  importKind: 'bilancino';

  accountsCount: number;

  quadrature: BilancinoQuadrature;

  unmappedAccounts: number;

  incompleteStubs?: number;

  stubsCreated?: number;

  discoveredAccounts?: Array<{ accountCode: string; description: string }>;

  compareDiff: CompareDiffEntry[];

  publishFacts?: boolean;

  replaceExisting?: boolean;

  counts: BilancinoCounts;

  blocked?: boolean;

  errors?: string[];

  actionLinks?: BilancinoActionLink[];

  quadratureChecks?: BilancinoQuadratureCheck[];

  import?: BilancinoImportLoaded;

}



export type ImportPreview = CeAnalisiPreview | BilancinoPreview;



export function isBilancinoPreview(p: ImportPreview): p is BilancinoPreview {

  return p.importKind === 'bilancino';

}



async function extractError(error: unknown): Promise<string> {

  const anyErr = error as { message?: string; context?: Response };

  try {

    const res = anyErr?.context;

    if (res && typeof res.json === 'function') {

      const body = await res.clone().json();

      if (body?.errors?.length) return String(body.errors[0]);

      if (body?.error) return String(body.error);

    }

  } catch {

    // ignora

  }

  return anyErr?.message ?? 'Errore sconosciuto durante l\'import.';

}



export async function importBilancio(opts: {

  file: File;

  companyId: string;

  dryRun: boolean;

  importKind?: ImportKind;

  publishFacts?: boolean;

  replaceExisting?: boolean;

  createMappingStubs?: boolean;

}): Promise<ImportPreview> {

  const form = new FormData();

  form.append('file', opts.file);

  form.append('company_id', opts.companyId);

  form.append('dry_run', opts.dryRun ? 'true' : 'false');

  if (opts.importKind && opts.importKind !== 'auto') {

    form.append('import_kind', opts.importKind);

  }

  if (opts.publishFacts) form.append('publish_facts', 'true');

  if (opts.replaceExisting) form.append('replace_existing', 'true');

  if (opts.createMappingStubs) form.append('create_mapping_stubs', 'true');



  const { data, error } = await supabase.functions.invoke('import-bilancio', {

    body: form,

  });



  if (error) throw new Error(await extractError(error));

  if (data?.error) throw new Error(String(data.error));

  return data as ImportPreview;

}



/** KPI di testata mostrati in anteprima CE, in ordine di lettura. */

export const HEADLINE_KPIS: { label: string; key: string }[] = [

  { label: 'Ricavi', key: 'totaleRicavi' },

  { label: 'EBITDA', key: 'ebitda' },

  { label: 'EBIT', key: 'ebit' },

  { label: 'Risultato', key: 'risultatoEsercizio' },

];



/** KPI bilancino in anteprima (include costi e confronto). */

export const BILANCINO_KPIS: { label: string; key: string }[] = [

  { label: 'Ricavi', key: 'totaleRicavi' },

  { label: 'Costi', key: 'totaleCosti' },

  { label: 'Risultato', key: 'risultatoEsercizio' },

  { label: 'EBITDA', key: 'ebitda' },

];



export const IMPORT_KIND_LABELS: Record<ImportKind, string> = {

  auto: 'Rilevamento automatico',

  ce_analisi: 'Excel analisi CE',

  bilancino: 'Bilancino mensile',

};



export const RESOLVED_KIND_LABELS: Record<ResolvedImportKind, string> = {

  ce_analisi: 'Excel analisi CE',

  bilancino: 'Bilancino mensile',

};


