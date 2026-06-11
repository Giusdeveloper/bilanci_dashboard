/**
 * Edge Function `publish-period` — pubblicazione completa periodo da bozza.
 *
 * POST JSON: { draft_id: uuid }
 *
 * Flusso: preview con gate quadratura → RPC publish_draft_edit → pipeline → financial_facts + layout.
 * Auth: staff operativo bilanci (admin | amministrazione).
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from '@supabase/supabase-js';
import { buildResolver } from '../../../shared/etl/mapping.ts';
import { parseDraftMappingChanges, parseDraftManualFactChanges, parseDraftLayoutChanges } from '../../../shared/etl/draftChanges.ts';
import { hashSnapshotFacts } from '../../../shared/etl/snapshotHash.ts';
import { evaluatePublishPeriodGate } from '../../../shared/etl/bilancinoPublishGate.ts';
import {
  recalculateFromDraft,
  mergeBalanceChanges,
  type DraftBalanceChange,
  type AccountBalanceRow,
} from '../../../shared/etl/recalculatePreview.ts';
import type { BilancinoExtractResult } from '../../../shared/etl/extractBilancino.ts';
import {
  loadAccountBalances,
  loadCodeMap,
  loadCompanyCeProfile,
  loadCompanyMappings,
  loadLedgerMappings,
  persistBilancinoFacts,
} from '../import-bilancio/supabaseLoader.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PublishPeriodRequestBody {
  draft_id: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function decodeJwtSub(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')));
    return typeof parsed.sub === 'string' && parsed.sub.length > 0 ? parsed.sub : null;
  } catch {
    return null;
  }
}

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

function buildExtractFromBalances(
  companyId: string,
  year: number,
  month: number,
  balances: AccountBalanceRow[],
): BilancinoExtractResult {
  const ce = balances.filter((b) => (b.section ?? 'CE') === 'CE');
  let totaleRicavi = 0;
  let totaleCosti = 0;
  let hasR = false;
  let hasC = false;
  for (const b of ce) {
    if (b.accountSide === 'ricavi') {
      totaleRicavi += b.balanceNormalized;
      hasR = true;
    } else {
      totaleCosti += b.balanceNormalized;
      hasC = true;
    }
  }
  const ricavi = hasR ? round2(totaleRicavi) : null;
  const costi = hasC ? round2(totaleCosti) : null;
  return {
    profileId: 'bilancino_studio',
    companyName: companyId,
    year,
    month,
    accounts: ce.map((b) => ({
      accountCode: b.accountCode,
      description: b.accountDescription ?? b.accountCode,
      balanceRaw: b.balanceRaw,
      balanceNormalized: b.balanceNormalized,
      section: b.section ?? 'CE',
      side: b.accountSide ?? 'costi',
      tipologia: 'CE' as const,
    })),
    totals: {
      totaleRicavi: ricavi,
      totaleCosti: costi,
      risultato: ricavi != null && costi != null ? round2(ricavi - costi) : null,
    },
  };
}

async function loadDraftBalanceChanges(
  supabase: any,
  draftEditId: string,
): Promise<DraftBalanceChange[]> {
  const { data, error } = await supabase
    .from('draft_edit_changes')
    .select('entity_key, new_value')
    .eq('draft_edit_id', draftEditId)
    .eq('change_type', 'balance_update');
  if (error) throw error;

  const changes: DraftBalanceChange[] = [];
  for (const row of data ?? []) {
    const key = row.entity_key as Record<string, unknown> | null;
    const val = row.new_value as Record<string, unknown> | null;
    if (!key?.account_code || key.year == null || key.month == null) continue;
    const balance = val?.balance_normalized ?? val?.balanceNormalized;
    if (balance == null) continue;
    changes.push({
      accountCode: String(key.account_code),
      year: Number(key.year),
      month: Number(key.month),
      balanceNormalized: Number(balance),
    });
  }
  return changes;
}

async function loadDraftMappingChanges(supabase: any, draftEditId: string) {
  const { data, error } = await supabase
    .from('draft_edit_changes')
    .select('entity_key, new_value')
    .eq('draft_edit_id', draftEditId)
    .eq('change_type', 'mapping_update');
  if (error) throw error;
  return parseDraftMappingChanges(
    (data ?? []).map((row: any) => ({
      entity_key: row.entity_key ?? {},
      new_value: row.new_value ?? {},
    })),
  );
}

async function loadDraftManualFactChanges(supabase: any, draftEditId: string) {
  const { data, error } = await supabase
    .from('draft_edit_changes')
    .select('entity_key, new_value, old_value')
    .eq('draft_edit_id', draftEditId)
    .eq('change_type', 'manual_fact');
  if (error) throw error;
  return parseDraftManualFactChanges(
    (data ?? []).map((row: any) => ({
      entity_key: row.entity_key ?? {},
      new_value: row.new_value ?? {},
      old_value: row.old_value,
    })),
  );
}

async function loadDraftLayoutChanges(supabase: any, draftEditId: string) {
  const { data, error } = await supabase
    .from('draft_edit_changes')
    .select('entity_key, new_value')
    .eq('draft_edit_id', draftEditId)
    .eq('change_type', 'layout_override');
  if (error) throw error;
  return parseDraftLayoutChanges(
    (data ?? []).map((row: any) => ({
      entity_key: row.entity_key ?? {},
      new_value: row.new_value ?? {},
    })),
  );
}

async function applyLayoutOverridesToDb(
  supabase: any,
  companyId: string,
  year: number,
  overrides: ReturnType<typeof parseDraftLayoutChanges>,
): Promise<number> {
  let applied = 0;
  for (const o of overrides) {
    const { error } = await supabase
      .from('report_layout')
      .update({
        display_label: o.displayLabel,
        is_hidden: o.isHidden ?? false,
      })
      .eq('company_id', companyId)
      .eq('report_type', o.reportType)
      .eq('year', year)
      .eq('row_index', o.rowIndex);
    if (error) throw error;
    applied += 1;
  }
  return applied;
}

async function capturePeriodSnapshot(
  supabase: any,
  companyId: string,
  year: number,
  month: number,
) {
  const { data: facts, error: factsErr } = await supabase
    .from('financial_facts')
    .select('category_id, year, month, amount_progressive, amount_period, source_label, import_id')
    .eq('company_id', companyId)
    .eq('year', year)
    .or(`month.eq.${month},month.is.null`);
  if (factsErr) throw factsErr;

  const { data: layout, error: layoutErr } = await supabase
    .from('report_layout')
    .select(
      'report_type, year, row_index, original_label, display_label, is_hidden, indent_level, row_kind, master_account_id, is_mapped, amount_progressive, profile, import_id',
    )
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('report_type', 'ce_dettaglio');
  if (layoutErr) throw layoutErr;

  const factRows = (facts ?? []).map((f: any) => ({
    category_id: String(f.category_id),
    year: Number(f.year),
    month: f.month == null ? null : Number(f.month),
    amount_progressive: f.amount_progressive == null ? null : Number(f.amount_progressive),
    amount_period: f.amount_period == null ? null : Number(f.amount_period),
    source_label: f.source_label == null ? null : String(f.source_label),
    import_id: f.import_id == null ? null : String(f.import_id),
  }));

  return {
    factsHash: hashSnapshotFacts(factRows),
    snapshotData: {
      facts: factRows,
      layout: layout ?? [],
    },
  };
}

async function insertPublishedSnapshot(
  supabase: any,
  opts: {
    companyId: string;
    year: number;
    month: number;
    userId: string;
    importId: string | null;
    draftEditId: string;
    factsHash: string;
    snapshotData: Record<string, unknown>;
  },
): Promise<number> {
  const { data: latest, error: latestErr } = await supabase
    .from('published_snapshots')
    .select('version')
    .eq('company_id', opts.companyId)
    .eq('period_year', opts.year)
    .eq('period_month', opts.month)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr) throw latestErr;

  const version = latest?.version != null ? Number(latest.version) + 1 : 1;
  const { error } = await supabase.from('published_snapshots').insert({
    company_id: opts.companyId,
    period_year: opts.year,
    period_month: opts.month,
    version,
    published_by: opts.userId,
    import_id: opts.importId,
    draft_edit_id: opts.draftEditId,
    facts_hash: opts.factsHash,
    snapshot_data: opts.snapshotData,
  });
  if (error) throw error;
  return version;
}

function isOperativoRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'amministrazione';
}

async function resolveImportId(
  supabase: any,
  draft: { company_id: string; year: number; month: number; base_import_id: string | null },
): Promise<string | null> {
  if (draft.base_import_id) return draft.base_import_id;
  const { data } = await supabase
    .from('account_balances')
    .select('import_id')
    .eq('company_id', draft.company_id)
    .eq('year', draft.year)
    .eq('month', draft.month)
    .limit(1)
    .maybeSingle();
  return data?.import_id ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json({ error: 'Autenticazione richiesta.' }, 401);

    const userId = decodeJwtSub(jwt);
    if (!userId) return json({ error: 'Token non valido o scaduto.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return json({ error: 'Configurazione server incompleta (SUPABASE_URL / keys).' }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceKey);
    const userSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const { data: profile, error: profErr } = await supabase
      .from('bilanci_users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) return json({ error: profErr.message }, 500);
    if (!profile || !isOperativoRole(profile.role)) {
      return json({ error: 'Permesso negato: ruolo operativo richiesto per pubblicare periodi.' }, 403);
    }

    const body = (await req.json()) as PublishPeriodRequestBody;
    const draftId = body.draft_id;
    if (!draftId) return json({ error: 'Parametro draft_id mancante.' }, 400);

    const { data: draft, error: draftErr } = await supabase
      .from('draft_edits')
      .select('*')
      .eq('id', draftId)
      .maybeSingle();
    if (draftErr) return json({ error: draftErr.message }, 500);
    if (!draft) return json({ error: 'Bozza non trovata.' }, 404);
    if (!['draft', 'pending_review'].includes(draft.status)) {
      return json({ error: `Bozza non pubblicabile (stato: ${draft.status}).` }, 400);
    }
    if (draft.month == null) {
      return json({ error: 'Bozza senza mese: pubblicazione periodo richiede un mese.' }, 400);
    }

    const companyId = String(draft.company_id);
    const year = Number(draft.year);
    const month = Number(draft.month);

    const [balanceChanges, mappingChanges, manualFactOverrides, layoutOverrides, baseBalances, ledgerMappings, explicitMappings, companySlug] =
      await Promise.all([
        loadDraftBalanceChanges(supabase, draftId),
        loadDraftMappingChanges(supabase, draftId),
        loadDraftManualFactChanges(supabase, draftId),
        loadDraftLayoutChanges(supabase, draftId),
        loadAccountBalances(supabase, companyId, year, month),
        loadLedgerMappings(supabase, companyId),
        loadCompanyMappings(supabase, companyId),
        loadCompanyCeProfile(supabase, companyId),
      ]);

    const validCodes = new Set<string>();
    for (const m of explicitMappings) {
      if (m.categoryCode) validCodes.add(m.categoryCode);
    }
    const labelResolver = buildResolver(explicitMappings, validCodes);

    const previewResult = recalculateFromDraft({
      companyId,
      year,
      month,
      baseBalances,
      balanceChanges,
      mappingChanges,
      manualFactOverrides,
      ledgerMappings,
      labelResolver,
    });

    const mergedBalances = mergeBalanceChanges(baseBalances, balanceChanges, year, month);
    const publishGate = evaluatePublishPeriodGate({
      extracted: buildExtractFromBalances(companyId, year, month, mergedBalances),
      kpis: previewResult.kpis,
      warnings: [...previewResult.warnings],
      companySlug,
    });

    if (publishGate.blocked) {
      return json({
        error: 'Pubblicazione bloccata: quadratura KPI non valida.',
        publishGate,
        kpis: previewResult.kpis,
        warnings: previewResult.warnings,
      }, 422);
    }

    const { data: rpcResult, error: rpcErr } = await userSupabase.rpc('publish_draft_edit', {
      p_draft_id: draftId,
    });
    if (rpcErr) return json({ error: rpcErr.message }, 500);

    const [postBalances, postMappings] = await Promise.all([
      loadAccountBalances(supabase, companyId, year, month),
      loadLedgerMappings(supabase, companyId),
    ]);

    const pipelineResult = recalculateFromDraft({
      companyId,
      year,
      month,
      baseBalances: postBalances,
      balanceChanges: [],
      manualFactOverrides,
      ledgerMappings: postMappings,
      labelResolver,
    });

    const importId = await resolveImportId(supabase, draft);
    if (!importId) {
      return json({ error: 'Import di riferimento mancante dopo publish.' }, 500);
    }

    const codeMap = await loadCodeMap(supabase);
    let factsPublished = { facts: 0, layout: 0 };
    if (pipelineResult.facts.length > 0) {
      factsPublished = await persistBilancinoFacts(supabase, {
        companyId,
        importId,
        year,
        facts: pipelineResult.facts,
        layout: pipelineResult.layout,
        referenceMonth: month,
        codeMap,
        replaceExisting: true,
      });
    }

    const layoutApplied = layoutOverrides.length > 0
      ? await applyLayoutOverridesToDb(supabase, companyId, year, layoutOverrides)
      : 0;

    const { factsHash, snapshotData } = await capturePeriodSnapshot(supabase, companyId, year, month);
    const snapshotVersion = await insertPublishedSnapshot(supabase, {
      companyId,
      year,
      month,
      userId,
      importId,
      draftEditId: draftId,
      factsHash,
      snapshotData,
    });

    await supabase.from('audit_log').insert({
      company_id: companyId,
      actor_id: userId,
      action: 'period_publish_facts',
      entity_type: 'draft_edit',
      entity_id: draftId,
      payload: {
        draft_id: draftId,
        year,
        month,
        facts_written: factsPublished.facts,
        layout_written: factsPublished.layout,
        layout_overrides_applied: layoutApplied,
        snapshot_version: snapshotVersion,
        facts_hash: factsHash,
        preview_kpis: previewResult.kpis,
        published_kpis: pipelineResult.kpis,
      },
    });

    return json({
      draft_id: draftId,
      status: 'published',
      balances_applied: (rpcResult as Record<string, number>)?.balances_applied ?? 0,
      mappings_applied: (rpcResult as Record<string, number>)?.mappings_applied ?? 0,
      facts_written: factsPublished.facts,
      layout_written: factsPublished.layout,
      layout_overrides_applied: layoutApplied,
      snapshot_version: snapshotVersion,
      facts_hash: factsHash,
      preview_kpis: previewResult.kpis,
      published_kpis: pipelineResult.kpis,
      publishGate,
      warnings: pipelineResult.warnings,
    });
  } catch (err) {
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
