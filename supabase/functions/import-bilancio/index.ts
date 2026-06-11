/**

 * Edge Function `import-bilancio` (Deno) — ETL bilanci server-side e idempotente.

 *

 * Supporta due flussi (auto-detect o override `import_kind`):

 *   - ce_analisi: Excel analisi CE -> financial_facts + layout

 *   - bilancino: export contabile mensile -> account_balances (PoC, no financial_facts)

 *

 * Richiesta (multipart/form-data):

 *   - file, company_id | company_slug, dry_run

 *   - import_kind (opz.): auto | ce_analisi | bilancino

 */



// deno-lint-ignore-file no-explicit-any

import * as XLSX from 'xlsx';

import { createClient } from '@supabase/supabase-js';

import {

  readWorkbookData,

  detectProfile,

  buildResolver,

  runPipeline,

  buildLoadPlan,

  sha256Hex,

  extractBilancino,

  runBilancinoPipeline,

  evaluateBilancinoPublishGate,

  TEMPLATE_PROFILES,

  type WorkbookData,

  type DetectionResult,

} from '../../../shared/etl/index.ts';

import {

  loadCodeMap,

  loadCompanyMappings,

  loadLedgerMappings,

  loadFinancialFacts,

  resolveCompanyId,

  persistPlan,

  persistBilancinoPlan,

  persistBilancinoFacts,

  upsertLedgerMappingsFromWorkbook,

  upsertLedgerMappingStubs,

  buildLedgerMappingStubs,

  type BilancinoBalanceRow,

  type FinancialFactRow,

} from './supabaseLoader.ts';



const CORS = {

  'Access-Control-Allow-Origin': '*',

  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods': 'POST, OPTIONS',

};



const COMPARE_KEYS = ['totaleRicavi', 'risultatoEsercizio', 'ebitda', 'totaleCosti'];

const TOLERANCE = 0.01;



type ImportKindParam = 'auto' | 'ce_analisi' | 'bilancino';



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



function resolveImportKindParam(raw: string | null): ImportKindParam {

  if (raw === 'ce_analisi' || raw === 'bilancino') return raw;

  return 'auto';

}



/** Detection CE-only (esclude profili bilancino). */

function detectCeProfile(wb: WorkbookData): DetectionResult {

  const ceProfiles = TEMPLATE_PROFILES.filter((p) => p.kind !== 'bilancino');

  const scores: Record<string, number> = {};

  for (const p of TEMPLATE_PROFILES) scores[p.id] = 0;



  let best = ceProfiles[0];

  let bestScore = -1;

  for (const profile of ceProfiles) {

    const detection = detectProfile(wb, profile.id);

    const s = detection.score;

    scores[profile.id] = s;

    if (s > bestScore) {

      bestScore = s;

      best = profile;

    }

  }

  const full = detectProfile(wb, best.id);

  return { ...full, scores };

}



function resolveDetection(wb: WorkbookData, kindParam: ImportKindParam): DetectionResult {

  if (kindParam === 'bilancino') return detectProfile(wb, 'bilancino_studio');

  if (kindParam === 'ce_analisi') return detectCeProfile(wb);

  return detectProfile(wb);

}



function buildFactsMap(facts: FinancialFactRow[]): Map<string, number> {

  const map = new Map<string, number>();

  for (const f of facts) {

    if (f.month != null) map.set(f.categoryCode, f.amountProgressive);

  }

  for (const f of facts) {

    if (f.month == null && !map.has(f.categoryCode)) {

      map.set(f.categoryCode, f.amountProgressive);

    }

  }

  return map;

}



function buildCompareDiff(

  kpis: Record<string, number>,

  dbFacts: FinancialFactRow[],

): Array<{ key: string; bilancino: number | null; database: number | null; delta: number | null; ok: boolean }> {

  const dbMap = buildFactsMap(dbFacts);

  return COMPARE_KEYS.map((key) => {

    const bil = kpis[key] ?? null;

    const db = dbMap.get(key) ?? null;

    const delta = bil != null && db != null ? bil - db : null;

    const ok = delta != null && Math.abs(delta) <= TOLERANCE;

    return { key, bilancino: bil, database: db, delta, ok };

  }).filter((e) => e.bilancino != null || e.database != null);

}



function toBalanceRows(extracted: ReturnType<typeof extractBilancino>): BilancinoBalanceRow[] {

  return extracted.accounts.map((a) => ({

    accountCode: a.accountCode,

    accountDescription: a.description,

    section: a.section,

    accountSide: a.side,

    year: extracted.year,

    month: extracted.month,

    balanceRaw: a.balanceRaw,

    balanceNormalized: a.balanceNormalized,

  }));

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

    if (!profile || (profile.role !== 'admin' && profile.role !== 'amministrazione')) {

      return json({ error: 'Permesso negato: ruolo operativo richiesto per importare bilanci.' }, 403);

    }



    const form = await req.formData();

    const file = form.get('file');

    if (!(file instanceof File)) return json({ error: 'Campo "file" mancante o non valido.' }, 400);

    const dryRun = String(form.get('dry_run') ?? '').toLowerCase() === 'true';

    const createMappingStubs = String(form.get('create_mapping_stubs') ?? '').toLowerCase() === 'true';

    const kindParam = resolveImportKindParam(form.get('import_kind') as string | null);

    const publishFacts = String(form.get('publish_facts') ?? '').toLowerCase() === 'true';

    const replaceExisting = String(form.get('replace_existing') ?? '').toLowerCase() === 'true';



    const companySlugParam = (form.get('company_slug') as string) || undefined;
    const companyIdParam = (form.get('company_id') as string) || undefined;

    let companyId = companyIdParam ?? null;
    let companySlug = companySlugParam ?? null;

    if (companyId) {
      const { data: companyRow, error: companyErr } = await supabase
        .from('companies')
        .select('id, slug')
        .eq('id', companyId)
        .maybeSingle();
      if (companyErr) return json({ error: companyErr.message }, 500);
      if (!companyRow) return json({ error: 'company_id non risolvibile.' }, 400);
      companySlug = companyRow.slug ?? companySlug;
    } else {
      companyId = await resolveCompanyId(supabase, { slug: companySlugParam });
      if (!companyId) return json({ error: 'company_id / company_slug non risolvibile.' }, 400);
    }

    if (!companyId) return json({ error: 'company_id / company_slug non risolvibile.' }, 400);



    const bytes = new Uint8Array(await file.arrayBuffer());

    const fileHash = await sha256Hex(bytes);

    const wb = readWorkbookData(XLSX as any, bytes);

    const detection = resolveDetection(wb, kindParam);

    const isBilancino = detection.profile.kind === 'bilancino'

      || (kindParam === 'bilancino');



    const explicit = await loadCompanyMappings(supabase, companyId);

    const codeMap = await loadCodeMap(supabase);

    const validCodes = new Set(codeMap.keys());

    const resolver = buildResolver(explicit, validCodes);



    if (isBilancino) {

      const extracted = extractBilancino(wb, detection.profile, file.name);

      let ledgerMappings = await loadLedgerMappings(supabase, companyId);

      let stubsCreated = 0;
      if (createMappingStubs) {
        const existingCodes = new Set(ledgerMappings.map((m) => m.accountCode));
        const stubs = buildLedgerMappingStubs(extracted.accounts, existingCodes);
        if (stubs.length > 0) {
          stubsCreated = await upsertLedgerMappingStubs(supabase, companyId, stubs);
          ledgerMappings = await loadLedgerMappings(supabase, companyId);
        }
      }

      let previousProgressive: Record<string, number> | undefined;
      if (extracted.month > 1) {
        const prevFacts = await loadFinancialFacts(supabase, companyId, extracted.year, extracted.month - 1);
        if (prevFacts.length > 0) {
          previousProgressive = Object.fromEntries(prevFacts.map((f) => [f.categoryCode, f.amountProgressive]));
        }
      }

      const result = runBilancinoPipeline({

        workbook: wb,

        ledgerMappings,

        labelResolver: resolver,

        extract: extracted,

        sourceFilename: file.name,

        previousProgressive,

        companySlug,

      });



      const publishGate = result.publishGate ?? evaluateBilancinoPublishGate({

        extracted,

        kpis: result.kpis,

        warnings: result.warnings,

        companySlug,

      });



      const unmappedAccounts = result.warnings.filter((w) =>

        w.message.startsWith('Conto bilancino non mappato')

      ).length;

      const incompleteStubs = result.warnings.filter((w) =>

        w.message.startsWith('Mapping incompleto per conto')

      ).length;

      const discoveredAccounts = extracted.accounts
        .filter((a) => a.section === 'CE')
        .map((a) => ({ accountCode: a.accountCode, description: a.description }));

      const errorCount = result.warnings.filter((w) => w.severity === 'error').length;



      const dbMonthly = await loadFinancialFacts(supabase, companyId, extracted.year, extracted.month);

      const dbAnnual = await loadFinancialFacts(supabase, companyId, extracted.year);

      const compareDiff = buildCompareDiff(result.kpis, [...dbAnnual, ...dbMonthly]);



      const preview = {

        filename: file.name,

        fileHash,

        importKind: 'bilancino' as const,

        profile: result.profileId,

        detectionScores: detection.scores,

        year: result.currentYear,

        compareYear: null,

        referenceMonth: result.referenceMonth,

        kpis: result.kpis,

        accountsCount: extracted.accounts.length,

        quadrature: extracted.totals,

        unmappedAccounts,

        incompleteStubs,

        stubsCreated,

        discoveredAccounts,

        compareDiff,

        publishFacts,

        replaceExisting,

        counts: {

          accounts: extracted.accounts.length,

          warnings: result.warnings.length,

          errors: errorCount,

        },

        warnings: result.warnings,

        blocked: publishGate.blocked,

        errors: publishGate.errors,

        actionLinks: publishGate.actionLinks,

        quadratureChecks: publishGate.quadratureChecks,

      };



      if (dryRun) return json({ dryRun: true, ...preview });

      if (publishGate.blocked) {

        return json({

          error: 'Import bloccato: correggere mapping o quadratura prima di procedere.',

          ...preview,

        }, 422);

      }



      const loaded = await persistBilancinoPlan(supabase, {

        companyId,

        sourceFilename: file.name,

        fileHash,

        templateProfile: result.profileId,

        warnings: result.warnings,

        balances: toBalanceRows(extracted),

      });



      if (publishFacts && result.facts.length > 0) {

        const published = await persistBilancinoFacts(supabase, {

          companyId,

          importId: loaded.importId,

          year: extracted.year,

          facts: result.facts,

          layout: result.layout,

          referenceMonth: extracted.month,

          codeMap,

          replaceExisting,

        });

        loaded.facts = published.facts;

        loaded.layout = published.layout;

      }



      return json({ dryRun: false, ...preview, import: loaded });

    }



    const result = runPipeline({

      workbook: wb,

      profile: detection.profile,

      resolver,

      detectionFallback: detection.usedFallback,

    });



    const preview = {

      filename: file.name,

      fileHash,

      importKind: 'ce_analisi' as const,

      profile: result.profileId,

      detectionScores: detection.scores,

      year: result.currentYear,

      compareYear: result.compareYear,

      referenceMonth: result.referenceMonth,

      kpis: result.kpis,

      counts: {

        factsAnnual: result.facts.filter((f) => f.month == null).length,

        factsMonthly: result.facts.filter((f) => f.month != null).length,

        warnings: result.warnings.length,

        errors: result.warnings.filter((w) => w.severity === 'error').length,

      },

      warnings: result.warnings,

    };



    if (dryRun) return json({ dryRun: true, ...preview });



    const plan = buildLoadPlan(companyId, file.name, fileHash, result);

    const loaded = await persistPlan(supabase, plan, codeMap);



    try {

      const ledgerCount = await upsertLedgerMappingsFromWorkbook(supabase, companyId, wb, loaded.importId);

      if (ledgerCount > 0) {

        (loaded as Record<string, unknown>).ledgerMappings = ledgerCount;

      }

    } catch {

      // opzionale: non blocca import CE se seed ledger fallisce

    }



    return json({ dryRun: false, ...preview, import: loaded });

  } catch (err) {

    return json({ error: (err as Error).message ?? String(err) }, 500);

  }

});


