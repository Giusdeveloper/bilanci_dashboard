/**
 * fix_maia_mappings — completa ledger_account_mappings Maia Management (profilo awentia).
 *
 * Fonti (NON file analisi Excel):
 * - account_mappings / GENERIC_MAPPINGS (via resolveMasterAccountId)
 * - prefix rules ceProfiles/awentia.ts
 * - famiglie company_famiglie
 *
 * Uso:
 *   npx tsx scripts/fix_maia_mappings.ts
 *   npx tsx scripts/fix_maia_mappings.ts --dry-run
 */
import 'dotenv/config';
import {
  createPool,
  loadCompanies,
  loadCodeMap,
  loadLedgerMappings,
  upsertLedgerMappingStubs,
} from './lib/bilanciLoader.ts';
import { resolveMasterAccountId } from '../shared/etl/seed/ledgerMappingResolve.ts';
import { getCeProfile, suggestFamigliaFromAccountCode } from '../shared/etl/ceProfiles/index.ts';
import { STUB_ANALITICA_PLACEHOLDER } from '../shared/etl/ledgerMappingStubs.ts';

const COMPANY_SLUG = 'maia-management';

/** Override per codice conto (bilancini Maia Management). */
const ACCOUNT_OVERRIDES: Record<string, { famigliaCode: string; analitica: string }> = {
  '58/10/501': { famigliaCode: 'ricavi', analitica: 'Ricavi caratteristici' },
  '64/05/501': { famigliaCode: 'ricavi', analitica: 'Altri ricavi' },
  '66/20/005': { famigliaCode: 'struttura', analitica: 'Materiale vario e di consumo' },
  '66/30/042': { famigliaCode: 'commerciali', analitica: 'Carburante' },
  '66/30/060': { famigliaCode: 'struttura', analitica: 'Beni indeducibili' },
  '66/30/491': { famigliaCode: 'struttura', analitica: 'Servizi indeducibili' },
  '66/30/492': { famigliaCode: 'struttura', analitica: 'Servizi indeducibili' },
  '72/05/090': { famigliaCode: 'struttura', analitica: 'Personale' },
  '72/15/025': { famigliaCode: 'struttura', analitica: 'Personale' },
  '64/05/100': { famigliaCode: 'ricavi', analitica: 'Altri ricavi' },
  '64/05/115': { famigliaCode: 'ricavi', analitica: 'Altri ricavi' },
  '64/10/501': { famigliaCode: 'ricavi', analitica: 'Altri ricavi' },
  '68/05/127': { famigliaCode: 'struttura', analitica: 'Personale' },
  '68/05/150': { famigliaCode: 'struttura', analitica: 'Compensi amministratore' },
  '68/05/184': { famigliaCode: 'struttura', analitica: 'Personale' },
  '68/05/199': { famigliaCode: 'struttura', analitica: 'Personale' },
  '68/05/222': { famigliaCode: 'struttura', analitica: 'Rimborsi amministratore' },
  '68/05/310': { famigliaCode: 'struttura', analitica: 'Consulenze legali' },
  '68/05/405': { famigliaCode: 'diretti', analitica: 'Altri servizi e prestazioni' },
  '68/05/233': { famigliaCode: 'struttura', analitica: 'Rimborsi amministratore' },
  '68/05/261': { famigliaCode: 'struttura', analitica: 'Consulenze tecniche' },
  '68/05/290': { famigliaCode: 'commerciali', analitica: 'Pubblicità' },
  '68/05/325': { famigliaCode: 'struttura', analitica: 'Utenze telefoniche e cellulari' },
  '68/05/341': { famigliaCode: 'commerciali', analitica: 'Spese di rappresentanza' },
  '68/05/345': { famigliaCode: 'commerciali', analitica: 'Spese di rappresentanza' },
  '68/05/350': { famigliaCode: 'struttura', analitica: 'Personale' },
  '68/05/355': { famigliaCode: 'struttura', analitica: 'Personale' },
  '68/05/385': { famigliaCode: 'struttura', analitica: 'Servizi amministrativi contabilità' },
  '68/05/490': { famigliaCode: 'diretti', analitica: 'Servizi informatici web' },
  '68/05/491': { famigliaCode: 'struttura', analitica: 'Servizi indeducibili' },
  '68/05/507': { famigliaCode: 'commerciali', analitica: 'Servizi commerciali' },
  '68/05/703': { famigliaCode: 'commerciali', analitica: 'Pubblicità' },
  '68/05/706': { famigliaCode: 'struttura', analitica: 'Consulenze tecniche' },
  '68/05/707': { famigliaCode: 'struttura', analitica: 'Altri oneri' },
  '68/05/763': { famigliaCode: 'commerciali', analitica: 'Spese di rappresentanza' },
  '70/25/010': { famigliaCode: 'struttura', analitica: 'Licenze d\'uso' },
  '74/05/005': { famigliaCode: 'ammortamenti', analitica: 'Ammortamenti immateriali' },
  '75/20/010': { famigliaCode: 'ammortamenti', analitica: 'Ammortamenti materiali' },
  '84/05/005': { famigliaCode: 'struttura', analitica: 'Tasse e valori bollati' },
  '84/05/100': { famigliaCode: 'imposte', analitica: 'Imposte dirette' },
  '84/05/035': { famigliaCode: 'imposte', analitica: 'Imposte dirette' },
  '84/05/501': { famigliaCode: 'imposte', analitica: 'Imposte dirette' },
  '84/05/502': { famigliaCode: 'imposte', analitica: 'Imposte dirette' },
  '84/10/015': { famigliaCode: 'struttura', analitica: 'Spese generali' },
  '84/10/035': { famigliaCode: 'struttura', analitica: 'Sanzioni e multe' },
  '84/10/190': { famigliaCode: 'commerciali', analitica: 'Pubblicità' },
  '84/10/090': { famigliaCode: 'struttura', analitica: 'Abbuoni e arrotondamenti' },
  '84/10/191': { famigliaCode: 'struttura', analitica: 'Altri oneri' },
  '84/10/709': { famigliaCode: 'commerciali', analitica: 'Pubblicità' },
  '87/20/060': { famigliaCode: 'struttura', analitica: 'Utili e perdite su cambi' },
  '88/20/046': { famigliaCode: 'gestione_finanziaria', analitica: 'Interessi passivi su mutui' },
  '88/20/095': { famigliaCode: 'gestione_finanziaria', analitica: 'Altri interessi' },
  '88/20/190': { famigliaCode: 'gestione_finanziaria', analitica: 'Altri interessi' },
  '88/20/551': { famigliaCode: 'gestione_finanziaria', analitica: 'Spese e commissioni bancarie' },
};

const MISCLASSIFIED_CATEGORIES: Record<string, Set<string>> = {
  '68/05/': new Set(['ammortamentiImmateriali', 'ammortamentiMateriali', 'svalutazioni']),
  '84/10/': new Set(['imposteDirette']),
  '88/20/': new Set(['speseCommissioniBancarie']),
};

function normalizeAnalitica(label: string): string {
  return label.trim();
}

function resolveMapping(
  accountCode: string,
  accountDescription: string,
  currentAnalitica: string,
  currentFamiglia: string | null,
  famigliaLabelByCode: Map<string, string>,
): { famiglia: string; analitica: string } {
  const override = ACCOUNT_OVERRIDES[accountCode];
  if (override) {
    return {
      famiglia: famigliaLabelByCode.get(override.famigliaCode) ?? override.famigliaCode,
      analitica: override.analitica,
    };
  }

  const ceProfile = getCeProfile(COMPANY_SLUG);
  const prefixSuggestion = suggestFamigliaFromAccountCode(
    accountCode,
    ceProfile,
    famigliaLabelByCode,
  );

  const stubOrEmpty =
    !currentAnalitica
    || currentAnalitica === STUB_ANALITICA_PLACEHOLDER
    || currentAnalitica.trim() === '';
  const analitica =
    (!stubOrEmpty ? normalizeAnalitica(currentAnalitica) : '') ||
    prefixSuggestion.analiticaHint ||
    accountDescription.trim() ||
    'Spese generali';

  const famiglia =
    currentFamiglia && currentFamiglia !== STUB_ANALITICA_PLACEHOLDER
      ? currentFamiglia
      : prefixSuggestion.famiglia ?? currentFamiglia ?? 'Spese generali';

  if (/^58\//.test(accountCode)) {
    return {
      famiglia: famigliaLabelByCode.get('ricavi') ?? 'Ricavi',
      analitica: analitica || 'Ricavi caratteristici',
    };
  }

  return { famiglia: famiglia ?? 'Spese generali', analitica };
}

const dryRun = process.argv.includes('--dry-run');

const pool = createPool();
try {
  const companies = await loadCompanies(pool);
  const company = companies.find((c) => c.slug === COMPANY_SLUG);
  if (!company) throw new Error(`${COMPANY_SLUG} non trovata`);

  const { rows: famRows } = await pool.query(
    `select code, label from company_famiglie where company_id = $1 order by sort_order`,
    [company.id],
  );
  const famigliaLabelByCode = new Map(
    (famRows as Array<{ code: string; label: string }>).map((r) => [r.code, r.label]),
  );

  const { rows: labelRows } = await pool.query(
    `select am.original_label as label, am.master_account_id as master_id
       from account_mappings am where am.company_id = $1`,
    [company.id],
  );
  const labelMap = new Map(
    labelRows.map((r: { label: string; master_id: string }) => [r.label.trim(), r.master_id]),
  );
  const codeMap = await loadCodeMap(pool);

  const existingMappings = await loadLedgerMappings(pool, company.id);
  const existingCodes = new Set(existingMappings.map((m) => m.accountCode));
  const missingOverrideStubs = Object.entries(ACCOUNT_OVERRIDES)
    .filter(([code]) => !existingCodes.has(code))
    .map(([code, override]) => ({
      accountCode: code,
      accountDescription: null,
      famiglia: famigliaLabelByCode.get(override.famigliaCode) ?? override.famigliaCode,
      signMultiplier: code.startsWith('58/') || code.startsWith('64/') ? -1 : 1,
    }));
  if (missingOverrideStubs.length > 0 && !dryRun) {
    const n = await upsertLedgerMappingStubs(pool, company.id, missingOverrideStubs);
    console.log(`Stub creati da override: ${n}`);
  }

  const { rows: mappings } = await pool.query(
    `select id, account_code, account_description, famiglia, analitica_label, master_account_id
       from ledger_account_mappings
      where company_id = $1
      order by account_code`,
    [company.id],
  );

  type MappingRow = {
    id: string;
    account_code: string;
    account_description: string | null;
    famiglia: string | null;
    analitica_label: string;
    master_account_id: string | null;
  };

  const allRows = mappings as MappingRow[];
  function categoryForMasterId(masterId: string): string | undefined {
    return [...codeMap.entries()].find(([, id]) => id === masterId)?.[0];
  }

  const incomplete = allRows.filter(
    (m) =>
      !m.master_account_id
      || m.analitica_label === STUB_ANALITICA_PLACEHOLDER
      || m.analitica_label.trim() === '',
  );

  /** Conti 64/* sono ricavi in natura economica — remap se finiti in costi. */
  const ricaviNatureFixes = allRows.filter((m) => {
    if (!m.account_code.startsWith('64/') || !m.master_account_id) return false;
    const categoryCode = categoryForMasterId(m.master_account_id);
    return categoryCode != null && !['ricaviCaratteristici', 'altriRicavi', 'altriProventi', 'merci'].includes(categoryCode);
  });

  /** Prefix rule 68/*→ammortamenti errato per costi operativi Maia. */
  const misclassifiedFixes = allRows.filter((m) => {
    if (!m.master_account_id) return false;
    const categoryCode = categoryForMasterId(m.master_account_id);
    if (!categoryCode) return false;
    for (const [prefix, badCategories] of Object.entries(MISCLASSIFIED_CATEGORIES)) {
      if (m.account_code.startsWith(prefix) && badCategories.has(categoryCode)) return true;
    }
    if (m.account_code.startsWith('68/05/') && categoryCode === 'ammortamentiImmateriali') return true;
    return ACCOUNT_OVERRIDES[m.account_code] != null;
  });

  const toFixIds = new Set([...incomplete, ...ricaviNatureFixes, ...misclassifiedFixes].map((m) => m.id));
  const toFix = allRows.filter((m) => toFixIds.has(m.id));

  console.log(`Mapping totali: ${allRows.length}`);
  console.log(`Mapping incompleti: ${incomplete.length}`);
  console.log(`Correzioni natura 64/* → ricavi: ${ricaviNatureFixes.length}`);
  console.log(`Correzioni categoria errata (68/84/88): ${misclassifiedFixes.length}`);
  console.log(`Totale da aggiornare: ${toFix.length}`);

  if (toFix.length === 0) {
    console.log('Nessun mapping da aggiornare.');
    process.exit(0);
  }

  let fixed = 0;
  let skipped = 0;

  for (const row of toFix) {
    const resolved = resolveMapping(
      row.account_code,
      row.account_description ?? '',
      row.analitica_label,
      row.famiglia,
      famigliaLabelByCode,
    );

    const master = resolveMasterAccountId(
      {
        accountCode: row.account_code,
        accountDescription: row.account_description ?? '',
        famiglia: resolved.famiglia,
        analiticaLabel: resolved.analitica,
      },
      labelMap,
      codeMap,
    );

    if (!master.masterAccountId) {
      console.warn(
        `  [SKIP] ${row.account_code} → "${resolved.analitica}" (${master.resolution})`,
      );
      skipped += 1;
      continue;
    }

    console.log(
      `  [OK] ${row.account_code} → ${resolved.analitica} | ${resolved.famiglia} (${master.resolution})`,
    );

    if (!dryRun) {
      await pool.query(
        `update ledger_account_mappings
            set famiglia = $1, analitica_label = $2, master_account_id = $3,
                sign_multiplier = $4, updated_at = now()
          where id = $5`,
        [
          resolved.famiglia,
          resolved.analitica,
          master.masterAccountId,
          master.signMultiplier,
          row.id,
        ],
      );
    }
    fixed += 1;
  }

  console.log(`\nCompletati: ${fixed}/${toFix.length} (skipped: ${skipped})${dryRun ? ' [dry-run]' : ''}`);
} finally {
  await pool.end();
}
