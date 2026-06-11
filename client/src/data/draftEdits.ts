/**

 * draftEdits — data layer bozze editing + ricalcolo preview + publish (Sprint 3).

 */



import { buildBalanceUpdateChanges, buildMappingUpdateChanges } from '@shared/etl/draftChanges';
import {
  buildManualFactChange,
  buildLayoutOverrideChanges,
  parseDraftManualFactChanges,
  type ManualFactOverride,
  type LayoutOverrideInput,
  type PublishedLayoutRow,
} from '@shared/etl/draftChanges';

import { supabase } from '@/lib/supabase';



export type DraftEditStatus = 'draft' | 'pending_review' | 'published' | 'rejected';

export type DraftChangeType = 'balance_update' | 'mapping_update' | 'manual_fact' | 'layout_override';

export type { ManualFactOverride, LayoutOverrideInput, PublishedLayoutRow };
export { buildManualFactChange, parseDraftManualFactChanges, buildLayoutOverrideChanges };



export interface DraftEdit {

  id: string;

  companyId: string;

  year: number;

  month: number | null;

  status: DraftEditStatus;

  title: string | null;

  notes: string | null;

  previewSnapshot: Record<string, unknown> | null;

  createdBy: string | null;

  publishedAt: string | null;

  baseImportId: string | null;

  createdAt: string;

  updatedAt: string;

}



export interface DraftEditChange {

  id: string;

  draftEditId: string;

  changeType: DraftChangeType;

  entityTable: string;

  entityKey: Record<string, unknown>;

  fieldName: string;

  oldValue: unknown;

  newValue: unknown;

  createdAt: string;

}



export type DraftChangeInput = Omit<DraftEditChange, 'id' | 'draftEditId' | 'createdAt'>;



export interface DraftBalanceChange {

  accountCode: string;

  year: number;

  month: number;

  balanceNormalized: number;

}



export interface RecalculatePreviewFact {

  categoryCode: string;

  year: number;

  month: number | null;

  amountProgressive: number;

  amountPeriod: number | null;

  sourceLabel: string;

}



export interface RecalculatePreviewWarning {

  severity: 'info' | 'warning' | 'error';

  message: string;

}



export interface PublishGateSnapshot {

  blocked: boolean;

  errors: string[];

}



export interface RecalculatePreviewResult {

  companyId: string;

  year: number;

  month: number;

  draftEditId: string | null;

  balanceChangesApplied: number;

  baseAccountsCount: number;

  kpis: Record<string, number>;

  facts: RecalculatePreviewFact[];

  warnings: RecalculatePreviewWarning[];

  counts: {

    facts: number;

    warnings: number;

    errors: number;

  };

  publishGate?: PublishGateSnapshot;

}



export interface PublishDraftResult {

  draft_id: string;

  status: string;

  balances_applied: number;

  mappings_applied: number;

}



export interface PublishPeriodResult extends PublishDraftResult {

  facts_written: number;

  layout_written: number;

  preview_kpis: Record<string, number>;

  published_kpis: Record<string, number>;

}



async function extractError(error: unknown): Promise<string> {

  const anyErr = error as { message?: string; context?: Response };

  try {

    const res = anyErr?.context;

    if (res && typeof res.json === 'function') {

      const body = await res.clone().json();

      if (body?.error) return String(body.error);

    }

  } catch {

    // ignora

  }

  return anyErr?.message ?? 'Errore sconosciuto.';

}



/** Mappa riga DB draft_edits → tipo client. */

export function mapDraftEditRow(row: Record<string, unknown>): DraftEdit {

  return {

    id: String(row.id),

    companyId: String(row.company_id),

    year: Number(row.year),

    month: row.month == null ? null : Number(row.month),

    status: row.status as DraftEditStatus,

    title: row.title == null ? null : String(row.title),

    notes: row.notes == null ? null : String(row.notes),

    previewSnapshot: (row.preview_snapshot as Record<string, unknown>) ?? null,

    createdBy: row.created_by == null ? null : String(row.created_by),

    publishedAt: row.published_at == null ? null : String(row.published_at),

    baseImportId: row.base_import_id == null ? null : String(row.base_import_id),

    createdAt: String(row.created_at),

    updatedAt: String(row.updated_at),

  };

}



function mapDraftEditChangeRow(row: Record<string, unknown>): DraftEditChange {

  return {

    id: String(row.id),

    draftEditId: String(row.draft_edit_id),

    changeType: row.change_type as DraftChangeType,

    entityTable: String(row.entity_table),

    entityKey: (row.entity_key as Record<string, unknown>) ?? {},

    fieldName: String(row.field_name),

    oldValue: row.old_value,

    newValue: row.new_value,

    createdAt: String(row.created_at),

  };

}



/** Elenco bozze per azienda (opzionale filtro stato). */

export async function fetchDrafts(companyId: string, status?: DraftEditStatus): Promise<DraftEdit[]> {

  let query = supabase

    .from('draft_edits')

    .select('*')

    .eq('company_id', companyId)

    .order('updated_at', { ascending: false })

    .limit(50);



  if (status) query = query.eq('status', status);



  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row) => mapDraftEditRow(row as Record<string, unknown>));

}



/** Bozza attiva (status=draft) per periodo, se presente. */

export async function fetchOpenDraftForPeriod(

  companyId: string,

  year: number,

  month: number,

): Promise<DraftEdit | null> {

  const { data, error } = await supabase

    .from('draft_edits')

    .select('*')

    .eq('company_id', companyId)

    .eq('year', year)

    .eq('month', month)

    .eq('status', 'draft')

    .maybeSingle();



  if (error) throw error;

  return data ? mapDraftEditRow(data as Record<string, unknown>) : null;

}



/** Crea nuova bozza per periodo. */

export async function createDraft(

  companyId: string,

  year: number,

  month: number,

  title?: string,

): Promise<DraftEdit> {

  const { data: authData } = await supabase.auth.getUser();



  const { data, error } = await supabase

    .from('draft_edits')

    .insert({

      company_id: companyId,

      year,

      month,

      title: title ?? `Bozza ${month}/${year}`,

      status: 'draft',

      created_by: authData.user?.id ?? null,

    })

    .select()

    .single();



  if (error) throw error;

  return mapDraftEditRow(data as Record<string, unknown>);

}



/** Carica i change atomici di una bozza. */

export async function fetchDraftChanges(draftId: string): Promise<DraftEditChange[]> {

  const { data, error } = await supabase

    .from('draft_edit_changes')

    .select('*')

    .eq('draft_edit_id', draftId)

    .order('created_at');



  if (error) throw error;

  return (data ?? []).map((row) => mapDraftEditChangeRow(row as Record<string, unknown>));

}



/** Sostituisce i change della bozza e opzionalmente salva lo snapshot preview. */

export async function saveDraftChanges(

  draftId: string,

  changes: DraftChangeInput[],

  previewSnapshot?: Record<string, unknown>,

): Promise<void> {

  const { error: delErr } = await supabase

    .from('draft_edit_changes')

    .delete()

    .eq('draft_edit_id', draftId);

  if (delErr) throw delErr;



  if (changes.length > 0) {

    const rows = changes.map((c) => ({

      draft_edit_id: draftId,

      change_type: c.changeType,

      entity_table: c.entityTable,

      entity_key: c.entityKey,

      field_name: c.fieldName,

      old_value: c.oldValue,

      new_value: c.newValue,

    }));

    const { error: insErr } = await supabase.from('draft_edit_changes').insert(rows);

    if (insErr) throw insErr;

  }



  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (previewSnapshot) patch.preview_snapshot = previewSnapshot;



  const { error: updErr } = await supabase.from('draft_edits').update(patch).eq('id', draftId);

  if (updErr) throw updErr;

}



/** Aggiorna lo stato workflow della bozza. */

export async function updateDraftStatus(draftId: string, status: DraftEditStatus): Promise<void> {

  const patch: Record<string, unknown> = {

    status,

    updated_at: new Date().toISOString(),

  };

  if (status === 'published') patch.published_at = new Date().toISOString();



  const { error } = await supabase.from('draft_edits').update(patch).eq('id', draftId);

  if (error) throw error;

}



/** Pubblica bozza via RPC atomica (solo saldi/mapping, legacy). */

export async function publishDraft(draftId: string): Promise<PublishDraftResult> {

  const { data, error } = await supabase.rpc('publish_draft_edit', { p_draft_id: draftId });

  if (error) throw error;

  return data as PublishDraftResult;

}



/** Pubblicazione completa periodo: saldi + mapping + financial_facts (Edge Function). */

export async function publishPeriod(draftId: string): Promise<PublishPeriodResult> {

  const { data, error } = await supabase.functions.invoke('publish-period', {

    body: { draft_id: draftId },

  });



  if (error) throw new Error(await extractError(error));

  if (data?.error) throw new Error(String(data.error));

  return data as PublishPeriodResult;

}



/** Costruisce change balance_update da griglia editata vs published. */

export function buildBalanceChangesFromGrid(

  published: Array<{ accountCode: string; balanceNormalized: number }>,

  edited: Map<string, number>,

  year: number,

  month: number,

): DraftChangeInput[] {

  return buildBalanceUpdateChanges(

    published.map((p) => ({ ...p, year, month })),

    edited,

    year,

    month,

  );

}



export const DRAFT_STATUS_LABELS: Record<DraftEditStatus, string> = {

  draft: 'Bozza',

  pending_review: 'In revisione',

  published: 'Pubblicata',

  rejected: 'Rifiutata',

};



export interface PeriodLockWarning {

  severity: 'warning' | 'error';

  code: 'pending_import' | 'pending_review_draft';

  message: string;

}



/** Avvisi lock periodo: import in coda o bozza in revisione sullo stesso periodo. */

export async function fetchPeriodLockWarnings(

  companyId: string,

  year: number,

  month: number,

  activeDraftId?: string | null,

): Promise<PeriodLockWarning[]> {

  const warnings: PeriodLockWarning[] = [];



  const { count: pendingImports, error: impErr } = await supabase

    .from('imports')

    .select('id', { count: 'exact', head: true })

    .eq('company_id', companyId)

    .in('status', ['pending', 'processing']);

  if (impErr) throw impErr;

  if ((pendingImports ?? 0) > 0) {

    warnings.push({

      severity: 'warning',

      code: 'pending_import',

      message: `${pendingImports} import in coda per questa azienda. Attendi il completamento prima di pubblicare.`,

    });

  }



  let reviewQuery = supabase

    .from('draft_edits')

    .select('id, title')

    .eq('company_id', companyId)

    .eq('year', year)

    .eq('month', month)

    .eq('status', 'pending_review');

  if (activeDraftId) reviewQuery = reviewQuery.neq('id', activeDraftId);

  const { data: reviewDrafts, error: revErr } = await reviewQuery;

  if (revErr) throw revErr;

  for (const d of reviewDrafts ?? []) {

    warnings.push({

      severity: 'warning',

      code: 'pending_review_draft',

      message: `Esiste una bozza in revisione per questo periodo${d.title ? ` (${d.title})` : ''}.`,

    });

  }



  return warnings;

}



export interface EditedMappingRow {

  accountCode: string;

  accountDescription: string | null;

  famiglia: string | null;

  analiticaLabel: string;

  masterAccountId: string | null;

  signMultiplier: number;

  sourceSheet: string;

}



/** Costruisce change mapping_update da griglia editata vs published. */

export function buildMappingChangesFromGrid(

  published: EditedMappingRow[],

  edited: Map<string, EditedMappingRow>,

): DraftChangeInput[] {

  return buildMappingUpdateChanges(published, edited);

}



export interface DraftMappingChangeInput {

  accountCode: string;

  analiticaLabel: string;

  signMultiplier: number;

  famiglia?: string | null;

  accountDescription?: string | null;

  masterAccountId?: string | null;

  sourceSheet?: string;

}



/** Costruisce change manual_fact da override CE editor. */
export function buildManualFactChangesFromOverrides(
  overrides: ManualFactOverride[],
  publishedAmounts: Map<string, number | null>,
): DraftChangeInput[] {
  return overrides.map((o) =>
    buildManualFactChange(
      o.categoryCode,
      o.year,
      o.month,
      publishedAmounts.get(o.categoryCode) ?? null,
      o.amountProgressive,
      o.motivazione,
    ),
  );
}

/** Costruisce change layout_override da griglia editata vs published. */
export function buildLayoutChangesFromGrid(
  published: PublishedLayoutRow[],
  edited: Map<string, LayoutOverrideInput>,
): DraftChangeInput[] {
  return buildLayoutOverrideChanges(published, edited);
}

/** Invoca Edge Function recalculate-preview (staff operativo, no write DB). */

export async function recalculatePreview(opts: {

  companyId: string;

  year: number;

  month: number;

  balanceChanges?: DraftBalanceChange[];

  mappingChanges?: DraftMappingChangeInput[];

  manualFactOverrides?: ManualFactOverride[];

  draftEditId?: string;

}): Promise<RecalculatePreviewResult> {

  const { data, error } = await supabase.functions.invoke('recalculate-preview', {

    body: {

      company_id: opts.companyId,

      year: opts.year,

      month: opts.month,

      balance_changes: opts.balanceChanges ?? [],

      mapping_changes: opts.mappingChanges ?? [],

      manual_fact_overrides: opts.manualFactOverrides ?? [],

      draft_edit_id: opts.draftEditId,

    },

  });



  if (error) throw new Error(await extractError(error));

  if (data?.error) throw new Error(String(data.error));

  return data as RecalculatePreviewResult;

}



/** KPI headline per anteprima bozza (allineati a import bilancino). */

export const DRAFT_PREVIEW_KPIS: { label: string; key: string }[] = [

  { label: 'Ricavi', key: 'totaleRicavi' },

  { label: 'Costi', key: 'totaleCosti' },

  { label: 'Risultato', key: 'risultatoEsercizio' },

  { label: 'EBITDA', key: 'ebitda' },

];


