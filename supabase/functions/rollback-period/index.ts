/**
 * Edge Function `rollback-period` — ripristina financial_facts + report_layout da snapshot.
 *
 * POST JSON: { snapshot_id: uuid }
 *
 * Rollback strategy: restore denormalized snapshot_data (no pipeline re-run).
 * Auth: staff operativo bilanci (admin | amministrazione).
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from '@supabase/supabase-js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RollbackRequestBody {
  snapshot_id: string;
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

function isOperativoRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'amministrazione';
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
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Configurazione server incompleta.' }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: profErr } = await supabase
      .from('bilanci_users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (profErr) return json({ error: profErr.message }, 500);
    if (!profile || !isOperativoRole(profile.role)) {
      return json({ error: 'Permesso negato: ruolo operativo richiesto.' }, 403);
    }

    const body = (await req.json()) as RollbackRequestBody;
    const snapshotId = body.snapshot_id;
    if (!snapshotId) return json({ error: 'Parametro snapshot_id mancante.' }, 400);

    const { data: snapshot, error: snapErr } = await supabase
      .from('published_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .maybeSingle();
    if (snapErr) return json({ error: snapErr.message }, 500);
    if (!snapshot) return json({ error: 'Snapshot non trovato.' }, 404);

    const companyId = String(snapshot.company_id);
    const year = Number(snapshot.period_year);
    const month = Number(snapshot.period_month);
    const snapshotData = (snapshot.snapshot_data ?? {}) as {
      facts?: Array<Record<string, unknown>>;
      layout?: Array<Record<string, unknown>>;
    };

    const factRows = snapshotData.facts ?? [];
    const layoutRows = snapshotData.layout ?? [];

    const { error: delFactsErr } = await supabase
      .from('financial_facts')
      .delete()
      .eq('company_id', companyId)
      .eq('year', year)
      .or(`month.eq.${month},month.is.null`);
    if (delFactsErr) return json({ error: delFactsErr.message }, 500);

    let factsRestored = 0;
    if (factRows.length > 0) {
      const rows = factRows.map((f) => ({
        company_id: companyId,
        category_id: f.category_id,
        year: f.year,
        month: f.month ?? null,
        amount_progressive: f.amount_progressive,
        amount_period: f.amount_period,
        source_label: f.source_label,
        import_id: f.import_id ?? snapshot.import_id ?? null,
        updated_at: new Date().toISOString(),
      }));
      const { error: insFactsErr } = await supabase
        .from('financial_facts')
        .upsert(rows, { onConflict: 'company_id,category_id,year,month' });
      if (insFactsErr) return json({ error: insFactsErr.message }, 500);
      factsRestored = rows.length;
    }

    const { error: delLayoutErr } = await supabase
      .from('report_layout')
      .delete()
      .eq('company_id', companyId)
      .eq('report_type', 'ce_dettaglio')
      .eq('year', year);
    if (delLayoutErr) return json({ error: delLayoutErr.message }, 500);

    let layoutRestored = 0;
    if (layoutRows.length > 0) {
      const rows = layoutRows.map((l) => ({
        company_id: companyId,
        import_id: l.import_id ?? snapshot.import_id ?? null,
        report_type: l.report_type ?? 'ce_dettaglio',
        year: l.year ?? year,
        profile: l.profile ?? 'bilancino_studio',
        row_index: l.row_index,
        original_label: l.original_label,
        display_label: l.display_label ?? null,
        is_hidden: l.is_hidden === true,
        indent_level: l.indent_level ?? 0,
        row_kind: l.row_kind ?? null,
        master_account_id: l.master_account_id ?? null,
        is_mapped: l.is_mapped === true,
        amount_progressive: l.amount_progressive ?? null,
      }));
      const { error: insLayoutErr } = await supabase.from('report_layout').insert(rows);
      if (insLayoutErr) return json({ error: insLayoutErr.message }, 500);
      layoutRestored = rows.length;
    }

    await supabase.from('audit_log').insert({
      company_id: companyId,
      actor_id: userId,
      action: 'period_rollback',
      entity_type: 'published_snapshot',
      entity_id: snapshotId,
      payload: {
        snapshot_id: snapshotId,
        version: snapshot.version,
        period_year: year,
        period_month: month,
        facts_restored: factsRestored,
        layout_restored: layoutRestored,
        facts_hash: snapshot.facts_hash,
      },
    });

    return json({
      snapshot_id: snapshotId,
      version: snapshot.version,
      facts_restored: factsRestored,
      layout_restored: layoutRestored,
    });
  } catch (err) {
    return json({ error: (err as Error).message ?? String(err) }, 500);
  }
});
