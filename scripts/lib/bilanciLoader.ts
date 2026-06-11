/**
 * bilanciLoader — caricatore Node (via `pg`) per l'ETL bilanci.
 *
 * Riusa il CORE puro in `shared/etl` (extract/map/validate/pipeline) e si occupa
 * SOLO della parte specifica del runtime Node: connessione Postgres, seed
 * idempotente di master chart + account_mappings, e load transazionale del
 * piano prodotto dalla pipeline. La Edge Function (Deno) riusa lo stesso core
 * con un caricatore equivalente basato su supabase-js.
 */

import 'dotenv/config';
import pg from 'pg';
import {
  buildMasterChart,
  mappingsForCompany,
  type LoadPlan,
  type ExplicitMapping,
  type Fact,
  type LayoutRow,
  type Warning,
} from '../../shared/etl/index';

const { Pool } = pg;

export function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Variabile d'ambiente DATABASE_URL mancante (vedi .env.example).");
  }
  return new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 4 });
}

export interface Company {
  id: string;
  slug: string;
  name: string;
}

export async function loadCompanies(pool: pg.Pool): Promise<Company[]> {
  const { rows } = await pool.query('select id, slug, name from companies order by name');
  return rows as Company[];
}

/** Restituisce la mappa code canonico -> id di master_chart_of_accounts. */
export async function loadCodeMap(pool: pg.Pool): Promise<Map<string, string>> {
  const { rows } = await pool.query('select id, code from master_chart_of_accounts');
  const map = new Map<string, string>();
  for (const r of rows as Array<{ id: string; code: string }>) map.set(r.code, r.id);
  return map;
}

/** Carica i mapping espliciti di una company (label -> code canonico + segno). */
export async function loadCompanyMappings(pool: pg.Pool, companyId: string): Promise<ExplicitMapping[]> {
  const { rows } = await pool.query(
    `select am.original_label as label, mc.code as code, am.sign_multiplier as sign
       from account_mappings am
       join master_chart_of_accounts mc on mc.id = am.master_account_id
      where am.company_id = $1`,
    [companyId],
  );
  return (rows as Array<{ label: string; code: string; sign: string | null }>).map((r) => ({
    originalLabel: r.label,
    categoryCode: r.code,
    sign: r.sign ? Number(r.sign) : 1,
  }));
}

/**
 * Seed idempotente: inserisce/aggiorna i conti canonici e i mapping per ogni
 * company. ON CONFLICT garantisce la ri-esecuzione sicura. Non tocca le 4 righe
 * preesistenti di master_chart_of_accounts (code diversi).
 */
export async function ensureSeed(pool: pg.Pool, companies: Company[]): Promise<{ accounts: number; mappings: number }> {
  const chart = buildMasterChart();
  for (const a of chart) {
    await pool.query(
      `insert into master_chart_of_accounts (code, label, type)
         values ($1, $2, $3)
       on conflict (code) do update set label = excluded.label, type = excluded.type`,
      [a.code, a.label, a.type],
    );
  }
  const codeMap = await loadCodeMap(pool);

  let mappingCount = 0;
  for (const company of companies) {
    const mappings = mappingsForCompany(company.slug);
    for (const m of mappings) {
      const masterId = codeMap.get(m.categoryCode);
      if (!masterId) continue;
      await pool.query(
        `insert into account_mappings (company_id, original_label, master_account_id, sign_multiplier)
           values ($1, $2, $3, $4)
         on conflict (company_id, original_label)
           do update set master_account_id = excluded.master_account_id, sign_multiplier = excluded.sign_multiplier`,
        [company.id, m.originalLabel, masterId, String(m.sign)],
      );
      mappingCount += 1;
    }
  }
  return { accounts: chart.length, mappings: mappingCount };
}

export interface LoadCounts {
  importId: string;
  facts: number;
  factsAnnual: number;
  factsMonthly: number;
  warnings: number;
  layout: number;
}

/**
 * Carica un piano in una singola transazione (idempotente).
 * - imports: upsert su file_hash;
 * - fiscal_periods: upsert su chiave naturale;
 * - financial_facts: upsert su chiave naturale;
 * - report_layout / import_warnings: delete+insert per ricostruzione fedele.
 */
export async function loadPlanToDb(
  pool: pg.Pool,
  plan: LoadPlan,
  codeMap: Map<string, string>,
): Promise<LoadCounts> {
  const client = await pool.connect();
  try {
    await client.query('begin');

    const importRes = await client.query(
      `insert into imports (company_id, source_filename, file_hash, template_profile, status, updated_at)
         values ($1, $2, $3, $4, $5, now())
       on conflict (file_hash)
         do update set source_filename = excluded.source_filename,
                       template_profile = excluded.template_profile,
                       status = excluded.status,
                       updated_at = now()
       returning id`,
      [
        plan.importMeta.companyId,
        plan.importMeta.sourceFilename,
        plan.importMeta.fileHash,
        plan.importMeta.templateProfile,
        plan.importMeta.status,
      ],
    );
    const importId = importRes.rows[0].id as string;

    for (const p of plan.periods) {
      await client.query(
        `insert into fiscal_periods (company_id, year, month, label)
           values ($1, $2, $3, $4)
         on conflict (company_id, year, month) do update set label = excluded.label`,
        [p.companyId, p.year, p.month, p.label],
      );
    }

    let factsAnnual = 0;
    let factsMonthly = 0;
    for (const f of plan.facts) {
      const categoryId = codeMap.get(f.categoryCode);
      if (!categoryId) continue;
      await client.query(
        `insert into financial_facts
           (company_id, category_id, year, month, amount_progressive, amount_period, source_label, import_id, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, now())
         on conflict (company_id, category_id, year, month)
           do update set amount_progressive = excluded.amount_progressive,
                         amount_period = excluded.amount_period,
                         source_label = excluded.source_label,
                         import_id = excluded.import_id,
                         updated_at = now()`,
        [
          plan.importMeta.companyId,
          categoryId,
          f.year,
          f.month,
          f.amountProgressive,
          f.amountPeriod,
          f.sourceLabel,
          importId,
        ],
      );
      if (f.month == null) factsAnnual += 1;
      else factsMonthly += 1;
    }

    // report_layout: ricostruzione fedele per (company, report_type, year).
    const layoutKeys = new Set(plan.layout.map((l) => `${l.companyId}|${l.reportType}|${l.year}`));
    for (const key of layoutKeys) {
      const [companyId, reportType, year] = key.split('|');
      await client.query(
        'delete from report_layout where company_id = $1 and report_type = $2 and year = $3',
        [companyId, reportType, Number(year)],
      );
    }
    for (const l of plan.layout) {
      const masterId = l.canonicalKey ? codeMap.get(l.canonicalKey) ?? null : null;
      await client.query(
        `insert into report_layout
           (company_id, import_id, report_type, year, profile, row_index, original_label,
            indent_level, row_kind, master_account_id, is_mapped, amount_progressive)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          l.companyId,
          importId,
          l.reportType,
          l.year,
          plan.importMeta.templateProfile,
          l.rowIndex,
          l.originalLabel,
          l.indentLevel,
          l.rowKind,
          masterId,
          l.isMapped,
          l.amountProgressive,
        ],
      );
    }

    await client.query('delete from import_warnings where import_id = $1', [importId]);
    for (const w of plan.warnings) {
      await client.query(
        'insert into import_warnings (import_id, severity, message) values ($1, $2, $3)',
        [importId, w.severity, w.message],
      );
    }

    await client.query('commit');
    return {
      importId,
      facts: factsAnnual + factsMonthly,
      factsAnnual,
      factsMonthly,
      warnings: plan.warnings.length,
      layout: plan.layout.length,
    };
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

/** Mapping conto contabile bilancino -> voce analitica CE (sheet Source). */
export interface LedgerAccountMapping {
  id?: string;
  companyId: string;
  accountCode: string;
  accountDescription?: string | null;
  famiglia?: string | null;
  analiticaLabel: string;
  masterAccountId?: string | null;
  signMultiplier: number;
  sourceSheet?: string;
  sourceImportId?: string | null;
}

/** Saldo mensile per conto contabile (bilancino). */
export interface AccountBalanceRow {
  id?: string;
  companyId: string;
  importId?: string;
  accountCode: string;
  accountDescription?: string | null;
  section?: 'CE' | 'SP';
  accountSide?: 'costi' | 'ricavi' | null;
  year: number;
  month: number;
  balanceRaw: number;
  balanceNormalized: number;
}

function mapLedgerAccountMappingRow(row: Record<string, unknown>): LedgerAccountMapping {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    accountCode: row.account_code as string,
    accountDescription: (row.account_description as string | null) ?? null,
    famiglia: (row.famiglia as string | null) ?? null,
    analiticaLabel: row.analitica_label as string,
    masterAccountId: (row.master_account_id as string | null) ?? null,
    signMultiplier: Number(row.sign_multiplier),
    sourceSheet: (row.source_sheet as string) ?? 'Source',
    sourceImportId: (row.source_import_id as string | null) ?? null,
  };
}

function mapAccountBalanceRow(row: Record<string, unknown>): AccountBalanceRow {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    importId: row.import_id as string,
    accountCode: row.account_code as string,
    accountDescription: (row.account_description as string | null) ?? null,
    section: (row.section as 'CE' | 'SP') ?? 'CE',
    accountSide: (row.account_side as 'costi' | 'ricavi' | null) ?? null,
    year: Number(row.year),
    month: Number(row.month),
    balanceRaw: Number(row.balance_raw),
    balanceNormalized: Number(row.balance_normalized),
  };
}

/** Carica i mapping bilancino di una company (ordine per account_code). */
export async function loadLedgerMappings(pool: pg.Pool, companyId: string): Promise<LedgerAccountMapping[]> {
  const { rows } = await pool.query(
    `select id, company_id, account_code, account_description, famiglia,
            analitica_label, master_account_id, sign_multiplier, source_sheet, source_import_id
       from ledger_account_mappings
      where company_id = $1
      order by account_code`,
    [companyId],
  );
  return rows.map((row) => mapLedgerAccountMappingRow(row as Record<string, unknown>));
}

/**
 * Upsert idempotente dei mapping bilancino (chiave naturale company_id + account_code).
 * Restituisce il numero di righe processate.
 */
export async function upsertLedgerMappings(
  pool: pg.Pool,
  companyId: string,
  rows: LedgerAccountMapping[],
): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await pool.query(
      `insert into ledger_account_mappings
         (company_id, account_code, account_description, famiglia, analitica_label,
          master_account_id, sign_multiplier, source_sheet, source_import_id, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
       on conflict (company_id, account_code)
         do update set account_description = excluded.account_description,
                       famiglia = excluded.famiglia,
                       analitica_label = excluded.analitica_label,
                       master_account_id = excluded.master_account_id,
                       sign_multiplier = excluded.sign_multiplier,
                       source_sheet = excluded.source_sheet,
                       source_import_id = excluded.source_import_id,
                       updated_at = now()`,
      [
        companyId,
        r.accountCode,
        r.accountDescription ?? null,
        r.famiglia ?? null,
        r.analiticaLabel,
        r.masterAccountId ?? null,
        String(r.signMultiplier),
        r.sourceSheet ?? 'Source',
        r.sourceImportId ?? null,
      ],
    );
    count += 1;
  }
  return count;
}

/** Upsert stub discovery per conti CE non ancora mappati (non sovrascrive mapping completi). */
export async function upsertLedgerMappingStubs(
  pool: pg.Pool,
  companyId: string,
  stubs: Array<{
    accountCode: string;
    accountDescription: string | null;
    signMultiplier: number;
    famiglia?: string | null;
  }>,
): Promise<number> {
  if (stubs.length === 0) return 0;
  const { toStubUpsertRows, BILANCINO_DISCOVERY_SOURCE } = await import('../../shared/etl/ledgerMappingStubs.ts');
  const rows = toStubUpsertRows(companyId, stubs);
  for (const row of rows) {
    await pool.query(
      `insert into ledger_account_mappings
         (company_id, account_code, account_description, famiglia, analitica_label,
          master_account_id, sign_multiplier, source_sheet, source_import_id, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
       on conflict (company_id, account_code) do nothing`,
      [
        row.company_id,
        row.account_code,
        row.account_description,
        row.famiglia,
        row.analitica_label,
        row.master_account_id,
        row.sign_multiplier,
        BILANCINO_DISCOVERY_SOURCE,
        row.source_import_id,
      ],
    );
  }
  return stubs.length;
}

/** Carica i saldi bilancino di una company; filtro opzionale su year e month. */
export async function loadAccountBalances(
  pool: pg.Pool,
  companyId: string,
  year: number,
  month?: number,
): Promise<AccountBalanceRow[]> {
  const params: Array<string | number> = [companyId, year];
  let monthClause = '';
  if (month != null) {
    params.push(month);
    monthClause = ' and month = $3';
  }
  const { rows } = await pool.query(
    `select id, company_id, import_id, account_code, account_description,
            section, account_side, year, month, balance_raw, balance_normalized
       from account_balances
      where company_id = $1 and year = $2${monthClause}
      order by account_code, month`,
    params,
  );
  return rows.map((row) => mapAccountBalanceRow(row as Record<string, unknown>));
}

/**
 * Upsert idempotente dei saldi bilancino (chiave naturale company + account + year + month).
 * Restituisce il numero di righe processate.
 */
export async function upsertAccountBalances(
  pool: pg.Pool,
  importId: string,
  companyId: string,
  rows: AccountBalanceRow[],
): Promise<number> {
  let count = 0;
  for (const r of rows) {
    await pool.query(
      `insert into account_balances
         (company_id, import_id, account_code, account_description, section,
          account_side, year, month, balance_raw, balance_normalized)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (company_id, account_code, year, month)
         do update set import_id = excluded.import_id,
                       account_description = excluded.account_description,
                       section = excluded.section,
                       account_side = excluded.account_side,
                       balance_raw = excluded.balance_raw,
                       balance_normalized = excluded.balance_normalized`,
      [
        companyId,
        importId,
        r.accountCode,
        r.accountDescription ?? null,
        r.section ?? 'CE',
        r.accountSide ?? null,
        r.year,
        r.month,
        r.balanceRaw,
        r.balanceNormalized,
      ],
    );
    count += 1;
  }
  return count;
}

/** Record import bilancino (idempotente su file_hash). */
export async function upsertImportRecord(
  pool: pg.Pool,
  meta: {
    companyId: string;
    sourceFilename: string;
    fileHash: string;
    templateProfile: string;
    status?: string;
  },
): Promise<string> {
  const res = await pool.query(
    `insert into imports (company_id, source_filename, file_hash, template_profile, status, updated_at)
       values ($1, $2, $3, $4, $5, now())
     on conflict (file_hash)
       do update set source_filename = excluded.source_filename,
                     template_profile = excluded.template_profile,
                     status = excluded.status,
                     updated_at = now()
     returning id`,
    [
      meta.companyId,
      meta.sourceFilename,
      meta.fileHash,
      meta.templateProfile,
      meta.status ?? 'completed',
    ],
  );
  return res.rows[0].id as string;
}

export interface FinancialFactRow {
  categoryCode: string;
  year: number;
  month: number | null;
  amountProgressive: number;
}

/** Carica financial_facts annuali/mensili per company e anno (code canonico). */
export async function loadFinancialFacts(
  pool: pg.Pool,
  companyId: string,
  year: number,
  month?: number,
): Promise<FinancialFactRow[]> {
  const params: Array<string | number> = [companyId, year];
  let monthClause = '';
  if (month != null) {
    params.push(month);
    monthClause = ' and ff.month = $3';
  }
  const { rows } = await pool.query(
    `select mc.code as category_code, ff.year, ff.month, ff.amount_progressive
       from financial_facts ff
       join master_chart_of_accounts mc on mc.id = ff.category_id
      where ff.company_id = $1 and ff.year = $2${monthClause}
      order by mc.code, ff.month nulls first`,
    params,
  );
  return (rows as Array<{ category_code: string; year: number; month: number | null; amount_progressive: string }>).map(
    (r) => ({
      categoryCode: r.category_code,
      year: Number(r.year),
      month: r.month == null ? null : Number(r.month),
      amountProgressive: Number(r.amount_progressive),
    }),
  );
}

// ---------------------------------------------------------------------------
// Draft edits — helper CRUD minimo per script/test (Sprint 2).
// ---------------------------------------------------------------------------

export interface DraftEditRow {
  id: string;
  companyId: string;
  year: number;
  month: number | null;
  status: string;
  title: string | null;
}

/** Crea una bozza draft per periodo (fallisce se esiste già una draft attiva). */
export async function createDraftEdit(
  pool: pg.Pool,
  input: {
    companyId: string;
    year: number;
    month?: number | null;
    title?: string;
    baseImportId?: string;
    createdBy?: string;
  },
): Promise<string> {
  const res = await pool.query(
    `insert into draft_edits (company_id, year, month, title, base_import_id, created_by, status)
       values ($1, $2, $3, $4, $5, $6, 'draft')
     returning id`,
    [
      input.companyId,
      input.year,
      input.month ?? null,
      input.title ?? null,
      input.baseImportId ?? null,
      input.createdBy ?? null,
    ],
  );
  return res.rows[0].id as string;
}

/** Scrive riga audit_log (append-only). */
export async function insertAuditLog(
  pool: pg.Pool,
  entry: {
    companyId?: string;
    actorId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  await pool.query(
    `insert into audit_log (company_id, actor_id, action, entity_type, entity_id, payload)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
    [
      entry.companyId ?? null,
      entry.actorId ?? null,
      entry.action,
      entry.entityType ?? null,
      entry.entityId ?? null,
      JSON.stringify(entry.payload ?? {}),
    ],
  );
}

// ---------------------------------------------------------------------------
// Bilancino persist (mirrors supabase/functions/import-bilancio/supabaseLoader)
// ---------------------------------------------------------------------------

export interface BilancinoPersistCounts {
  importId: string;
  accountBalances: number;
  warnings: number;
}

/** Persiste import bilancino: imports + account_balances + import_warnings. */
export async function persistBilancinoPlan(
  pool: pg.Pool,
  input: {
    companyId: string;
    sourceFilename: string;
    fileHash: string;
    templateProfile: string;
    warnings: Warning[];
    balances: AccountBalanceRow[];
  },
): Promise<BilancinoPersistCounts> {
  const importId = await upsertImportRecord(pool, {
    companyId: input.companyId,
    sourceFilename: input.sourceFilename,
    fileHash: input.fileHash,
    templateProfile: input.templateProfile,
    status: 'completed',
  });

  if (input.balances.length > 0) {
    await upsertAccountBalances(pool, importId, input.companyId, input.balances);
  }

  await pool.query('delete from import_warnings where import_id = $1', [importId]);
  for (const w of input.warnings) {
    await pool.query(
      'insert into import_warnings (import_id, severity, message) values ($1, $2, $3)',
      [importId, w.severity, w.message],
    );
  }

  return { importId, accountBalances: input.balances.length, warnings: input.warnings.length };
}

/** True se esistono financial_facts per company/anno/mese (month=null = annuale). */
export async function hasExistingFacts(
  pool: pg.Pool,
  companyId: string,
  year: number,
  month: number | null,
): Promise<boolean> {
  const params: Array<string | number> = [companyId, year];
  let monthClause = ' and month is null';
  if (month != null) {
    params.push(month);
    monthClause = ' and month = $3';
  }
  const { rows } = await pool.query(
    `select 1 from financial_facts where company_id = $1 and year = $2${monthClause} limit 1`,
    params,
  );
  return rows.length > 0;
}

const MONTH_LABELS = [
  '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/** Scrive financial_facts + fiscal_periods + report_layout dal bilancino. */
export async function persistBilancinoFacts(
  pool: pg.Pool,
  opts: {
    companyId: string;
    importId: string;
    year: number;
    facts: Fact[];
    layout?: LayoutRow[];
    referenceMonth: number;
    codeMap: Map<string, string>;
    replaceExisting: boolean;
  },
): Promise<{ facts: number; layout: number }> {
  const { companyId, importId, year, facts, layout = [], referenceMonth, codeMap, replaceExisting } = opts;
  const monthsToCheck = [referenceMonth, null] as Array<number | null>;

  for (const m of monthsToCheck) {
    const exists = await hasExistingFacts(pool, companyId, year, m);
    if (exists && !replaceExisting) {
      const label = m == null ? 'annuali (YTD)' : `mese ${m}`;
      throw new Error(
        `Esistono già dati CE ${label} per questo periodo. Attiva replaceExisting per sovrascrivere.`,
      );
    }
  }

  if (facts.length === 0) return { facts: 0, layout: 0 };

  let factCount = 0;
  for (const f of facts) {
    const categoryId = codeMap.get(f.categoryCode);
    if (!categoryId) continue;

    await pool.query(
      `insert into financial_facts
         (company_id, category_id, year, month, amount_progressive, amount_period, source_label, import_id, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, now())
       on conflict (company_id, category_id, year, month)
         do update set amount_progressive = excluded.amount_progressive,
                       amount_period = excluded.amount_period,
                       source_label = excluded.source_label,
                       import_id = excluded.import_id,
                       updated_at = now()`,
      [companyId, categoryId, f.year, f.month, f.amountProgressive, f.amountPeriod, f.sourceLabel, importId],
    );
    factCount += 1;

    await pool.query(
      `insert into financial_facts
         (company_id, category_id, year, month, amount_progressive, amount_period, source_label, import_id, updated_at)
         values ($1, $2, $3, null, $4, null, $5, $6, now())
       on conflict (company_id, category_id, year, month)
         do update set amount_progressive = excluded.amount_progressive,
                       amount_period = excluded.amount_period,
                       source_label = excluded.source_label,
                       import_id = excluded.import_id,
                       updated_at = now()`,
      [companyId, categoryId, f.year, f.amountProgressive, f.sourceLabel, importId],
    );
    factCount += 1;
  }

  await pool.query(
    `insert into fiscal_periods (company_id, year, month, label)
       values ($1, $2, $3, $4)
     on conflict (company_id, year, month) do update set label = excluded.label`,
    [companyId, year, referenceMonth, `${MONTH_LABELS[referenceMonth] ?? referenceMonth} ${year}`],
  );
  await pool.query(
    `insert into fiscal_periods (company_id, year, month, label)
       values ($1, $2, null, $3)
     on conflict (company_id, year, month) do update set label = excluded.label`,
    [companyId, year, `Anno ${year}`],
  );

  let layoutCount = 0;
  if (layout.length > 0) {
    await pool.query(
      'delete from report_layout where company_id = $1 and report_type = $2 and year = $3',
      [companyId, 'ce_dettaglio', year],
    );
    for (const l of layout) {
      const masterId = l.canonicalKey ? codeMap.get(l.canonicalKey) ?? null : null;
      await pool.query(
        `insert into report_layout
           (company_id, import_id, report_type, year, profile, row_index, original_label,
            indent_level, row_kind, master_account_id, is_mapped, amount_progressive)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          companyId,
          importId,
          l.reportType,
          l.year,
          'bilancino_studio',
          l.rowIndex,
          l.originalLabel,
          l.indentLevel,
          l.rowKind,
          masterId,
          l.isMapped,
          l.amountProgressive,
        ],
      );
      layoutCount += 1;
    }
  }

  return { facts: factCount, layout: layoutCount };
}
