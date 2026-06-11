/**
 * Edge Function `recalculate-preview` — ricalcolo KPI da bozza (no write DB).
 *
 * POST JSON:
 *   company_id, year, month, balance_changes[], optional draft_edit_id
 *
 * Se draft_edit_id è presente, carica anche i change balance_update da draft_edit_changes.
 * Auth: staff operativo bilanci (JWT + bilanci_users.role in admin|amministrazione).
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from '@supabase/supabase-js';
import { buildResolver } from '../../../shared/etl/mapping.ts';
import { parseDraftMappingChanges, parseDraftManualFactChanges } from '../../../shared/etl/draftChanges.ts';
import { evaluatePublishPeriodGate } from '../../../shared/etl/bilancinoPublishGate.ts';
import {
  recalculateFromDraft,
  mergeBalanceChanges,
  type DraftBalanceChange,
} from '../../../shared/etl/recalculatePreview.ts';
import {
  loadAccountBalances,
  loadCompanyMappings,
  loadLedgerMappings,
} from '../import-bilancio/supabaseLoader.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RecalculateRequestBody {
  company_id: string;
  year: number;
  month: number;
  balance_changes?: DraftBalanceChange[];
  mapping_changes?: Array<{
    account_code: string;
    analitica_label: string;
    sign_multiplier?: number;
    famiglia?: string | null;
    account_description?: string | null;
    master_account_id?: string | null;
    source_sheet?: string;
  }>;
  manual_fact_overrides?: Array<{
    category_code: string;
    year: number;
    month: number;
    amount_progressive: number;
    motivazione?: string;
  }>;
  draft_edit_id?: string;
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

function isOperativoRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'amministrazione';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Configurazione server incompleta (SUPABASE_URL / SERVICE_ROLE_KEY).' }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json({ error: 'Autenticazione richiesta.' }, 401);

    const userId = decodeJwtSub(jwt);
    if (!userId) return json({ error: 'Token non valido o scaduto.' }, 401);

    const { data: profile, error: profErr } = await supabase
      .from('bilanci_users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) return json({ error: profErr.message }, 500);
    if (!profile || !isOperativoRole(profile.role)) {
      return json({ error: 'Permesso negato: ruolo operativo richiesto per ricalcolare anteprime.' }, 403);
    }

    const body = (await req.json()) as RecalculateRequestBody;
    const companyId = body.company_id;
    const year = Number(body.year);
    const month = Number(body.month);

    if (!companyId || !Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return json({ error: 'Parametri mancanti o non validi: company_id, year, month.' }, 400);
    }

    let balanceChanges = body.balance_changes ?? [];
    let mappingChanges: ReturnType<typeof parseDraftMappingChanges> = [];
    let manualFactOverrides: ReturnType<typeof parseDraftManualFactChanges> = [];
    if (body.draft_edit_id) {
      const [fromDraftBalances, fromDraftMappings, fromDraftManualFacts] = await Promise.all([
        loadDraftBalanceChanges(supabase, body.draft_edit_id),
        loadDraftMappingChanges(supabase, body.draft_edit_id),
        loadDraftManualFactChanges(supabase, body.draft_edit_id),
      ]);
      balanceChanges = [...fromDraftBalances, ...balanceChanges];
      mappingChanges = fromDraftMappings;
      manualFactOverrides = fromDraftManualFacts;
    }

    if (body.mapping_changes?.length) {
      mappingChanges = [
        ...mappingChanges,
        ...parseDraftMappingChanges(
          body.mapping_changes.map((row) => ({
            entity_key: { account_code: row.account_code },
            new_value: {
              analitica_label: row.analitica_label,
              sign_multiplier: row.sign_multiplier ?? 1,
              famiglia: row.famiglia ?? null,
              account_description: row.account_description ?? null,
              master_account_id: row.master_account_id ?? null,
              source_sheet: row.source_sheet ?? 'Editor',
            },
          })),
        ),
      ];
    }

    if (body.manual_fact_overrides?.length) {
      manualFactOverrides = [
        ...manualFactOverrides,
        ...body.manual_fact_overrides.map((row) => ({
          categoryCode: row.category_code,
          year: Number(row.year),
          month: Number(row.month),
          amountProgressive: Number(row.amount_progressive),
          motivazione: row.motivazione ?? '',
        })),
      ];
    }

    const [baseBalances, ledgerMappings, explicitMappings] = await Promise.all([
      loadAccountBalances(supabase, companyId, year, month),
      loadLedgerMappings(supabase, companyId),
      loadCompanyMappings(supabase, companyId),
    ]);

    const validCodes = new Set<string>();
    for (const m of explicitMappings) {
      if (m.categoryCode) validCodes.add(m.categoryCode);
    }
    const labelResolver = buildResolver(explicitMappings, validCodes);

    const result = recalculateFromDraft({
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
      extracted: {
        profileId: 'bilancino_studio',
        companyName: companyId,
        year,
        month,
        accounts: mergedBalances
          .filter((b) => (b.section ?? 'CE') === 'CE')
          .map((b) => ({
            accountCode: b.accountCode,
            description: b.accountDescription ?? b.accountCode,
            balanceRaw: b.balanceRaw,
            balanceNormalized: b.balanceNormalized,
            section: b.section ?? 'CE',
            side: b.accountSide ?? 'costi',
            tipologia: 'CE' as const,
          })),
        totals: (() => {
          let totaleRicavi = 0;
          let totaleCosti = 0;
          let hasR = false;
          let hasC = false;
          for (const b of mergedBalances) {
            if ((b.section ?? 'CE') !== 'CE') continue;
            if (b.accountSide === 'ricavi') {
              totaleRicavi += b.balanceNormalized;
              hasR = true;
            } else {
              totaleCosti += b.balanceNormalized;
              hasC = true;
            }
          }
          const ricavi = hasR ? Number(totaleRicavi.toFixed(2)) : null;
          const costi = hasC ? Number(totaleCosti.toFixed(2)) : null;
          return {
            totaleRicavi: ricavi,
            totaleCosti: costi,
            risultato: ricavi != null && costi != null ? Number((ricavi - costi).toFixed(2)) : null,
          };
        })(),
      },
      kpis: result.kpis,
      warnings: [...result.warnings],
      companySlug: null,
    });

    const errorCount = result.warnings.filter((w) => w.severity === 'error').length;

    return json({
      companyId,
      year,
      month,
      draftEditId: body.draft_edit_id ?? null,
      balanceChangesApplied: balanceChanges.length,
      baseAccountsCount: baseBalances.length,
      kpis: result.kpis,
      facts: result.facts,
      warnings: result.warnings,
      counts: {
        facts: result.facts.length,
        warnings: result.warnings.length,
        errors: errorCount,
      },
      publishGate,
    });
  } catch (err) {
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
