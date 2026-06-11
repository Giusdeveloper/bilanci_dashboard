/**
 * Edge Function `email-ingest` — webhook n8n per ingest email → import-bilancio.
 *
 * Auth: header `X-Ingest-Secret` (= INGEST_WEBHOOK_SECRET).
 *
 * POST multipart/form-data:
 *   - file (required) — allegato .xlsx/.xls/.csv
 *   - email_from, email_subject, email_to, email_message_id (optional)
 *   - company_slug (optional override — skip rule matching)
 *   - dry_run (default true for PoC)
 */

// deno-lint-ignore-file no-explicit-any
import { createClient } from '@supabase/supabase-js';
import { sha256Hex } from '../../../shared/etl/hash.ts';
import {
  resolveEmailIngestRule,
  type EmailIngestRule,
} from '../../../shared/domain/emailIngestRules.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-ingest-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const XLS_EXT = /\.(xlsx|xls|csv)$/i;

interface IngestRule extends EmailIngestRule {
  companies?: { slug: string; name: string } | { slug: string; name: string }[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function companySlugFromRule(rule: IngestRule): string | null {
  const c = rule.companies;
  if (!c) return null;
  if (Array.isArray(c)) return c[0]?.slug ?? null;
  return c.slug ?? null;
}

async function resolveCompanyFromRules(
  supabase: any,
  ctx: { from: string; subject: string; to: string },
): Promise<IngestRule | null> {
  const { data: rules, error } = await supabase
    .from('email_ingest_rules')
    .select('id, company_id, match_type, match_value, file_type, auto_publish, priority, companies(slug, name)')
    .eq('active', true)
    .order('priority', { ascending: true });
  if (error) throw error;
  const matched = resolveEmailIngestRule((rules ?? []) as EmailIngestRule[], ctx);
  if (!matched) return null;
  return (rules ?? []).find((r: IngestRule) => r.id === matched.id) ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const ingestSecret = req.headers.get('X-Ingest-Secret') ?? '';
    const expected = Deno.env.get('INGEST_WEBHOOK_SECRET') ?? '';
    if (!expected || ingestSecret !== expected) {
      return json({ error: 'Secret ingest non valido.' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Configurazione server incompleta.' }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return json({ error: 'Campo "file" mancante (allegato email).' }, 400);
    }
    if (!XLS_EXT.test(file.name)) {
      return json({ error: 'Formato non supportato: servono .xlsx, .xls o .csv.' }, 400);
    }

    const emailFrom = String(form.get('email_from') ?? '');
    const emailSubject = String(form.get('email_subject') ?? '');
    const emailTo = String(form.get('email_to') ?? '');
    const emailMessageId = String(form.get('email_message_id') ?? '') || null;
    const companySlugOverride = String(form.get('company_slug') ?? '').trim() || null;
    const dryRunParam = String(form.get('dry_run') ?? 'true').toLowerCase();
    const dryRun = dryRunParam !== 'false';

    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileHash = await sha256Hex(bytes);

    let matchedRule: IngestRule | null = null;
    let companySlug = companySlugOverride;
    let companyId: string | null = null;
    let importKind = 'auto';

    if (companySlug) {
      const { data: row } = await supabase
        .from('companies')
        .select('id, slug')
        .eq('slug', companySlug)
        .maybeSingle();
      if (!row) return json({ error: `Azienda non trovata: ${companySlug}` }, 400);
      companyId = row.id;
      companySlug = row.slug;
    } else {
      matchedRule = await resolveCompanyFromRules(supabase, {
        from: emailFrom,
        subject: emailSubject,
        to: emailTo,
      });
      if (!matchedRule) {
        return json({
          error: 'Azienda non riconosciuta: nessuna regola email_ingest_rules corrisponde.',
          email_from: emailFrom,
          email_subject: emailSubject,
          email_to: emailTo,
        }, 422);
      }
      companyId = matchedRule.company_id;
      companySlug = companySlugFromRule(matchedRule);
      importKind = matchedRule.file_type === 'auto' ? 'auto' : matchedRule.file_type;
    }

    const autoPublish = matchedRule?.auto_publish ?? false;
    const effectiveDryRun = dryRun;

    const { data: inbound, error: inboundErr } = await supabase
      .from('inbound_files')
      .insert({
        company_id: companyId,
        file_hash: fileHash,
        source: 'n8n',
        email_from: emailFrom || null,
        email_subject: emailSubject || null,
        email_message_id: emailMessageId,
        status: 'processing',
      })
      .select('id')
      .single();
    if (inboundErr) return json({ error: inboundErr.message }, 500);
    const inboundId = inbound.id as string;

    const storagePath = `${companyId}/${inboundId}_${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from('inbound-bilanci')
      .upload(storagePath, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
    if (uploadErr) {
      await supabase.from('inbound_files').update({
        status: 'failed',
        error_message: uploadErr.message,
        processed_at: new Date().toISOString(),
      }).eq('id', inboundId);
      return json({ error: `Upload storage fallito: ${uploadErr.message}` }, 500);
    }

    await supabase.from('inbound_files').update({ storage_path: storagePath }).eq('id', inboundId);

    const importForm = new FormData();
    importForm.append('file', new File([bytes], file.name, { type: file.type }));
    importForm.append('company_slug', companySlug ?? '');
    importForm.append('dry_run', effectiveDryRun ? 'true' : 'false');
    importForm.append('import_kind', importKind);
    importForm.append('create_mapping_stubs', 'true');
    importForm.append('import_source', 'email');
    if (!effectiveDryRun && autoPublish) {
      importForm.append('publish_facts', 'true');
    }

    const importRes = await fetch(`${supabaseUrl}/functions/v1/import-bilancio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'X-Ingest-Secret': ingestSecret,
      },
      body: importForm,
    });

    const importBody = await importRes.json().catch(() => ({}));
    const importOk = importRes.ok;

    const finalStatus = !importOk
      ? 'failed'
      : effectiveDryRun
        ? 'pending_review'
        : 'completed';

    await supabase.from('inbound_files').update({
      status: finalStatus,
      preview_json: importBody,
      error_message: importOk ? null : (importBody.error ?? `HTTP ${importRes.status}`),
      import_id: importBody.importId ?? null,
      processed_at: new Date().toISOString(),
    }).eq('id', inboundId);

    await supabase.from('audit_log').insert({
      company_id: companyId,
      actor_id: null,
      action: 'email_ingest',
      entity_type: 'inbound_file',
      entity_id: inboundId,
      payload: {
        inbound_id: inboundId,
        storage_path: storagePath,
        file_hash: fileHash,
        email_from: emailFrom,
        email_subject: emailSubject,
        matched_rule_id: matchedRule?.id ?? null,
        company_slug: companySlug,
        dry_run: effectiveDryRun,
        import_ok: importOk,
      },
    });

    if (!importOk) {
      return json({
        error: importBody.error ?? 'Import fallito',
        inbound_id: inboundId,
        preview: importBody,
      }, importRes.status >= 400 ? importRes.status : 422);
    }

    return json({
      ok: true,
      inbound_id: inboundId,
      storage_path: storagePath,
      company_slug: companySlug,
      dry_run: effectiveDryRun,
      matched_rule_id: matchedRule?.id ?? null,
      preview: importBody,
      message: effectiveDryRun
        ? 'Anteprima generata — revisione admin richiesta prima del commit.'
        : 'Import completato.',
    });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
