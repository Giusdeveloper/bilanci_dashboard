/**
 * fix_sherpa_mappings — completa ledger_account_mappings Sherpa42 da dizionario interno.
 *
 * Fonti (NON file analisi Excel):
 * - account_mappings / SHERPA42_SPECIFIC_MAPPINGS (via resolveMasterAccountId)
 * - prefix rules ceProfiles/sherpa42.ts
 * - famiglie company_famiglie
 * - sinonimi analitica + override per codice conto
 *
 * Uso:
 *   npx tsx scripts/fix_sherpa_mappings.ts
 *   npx tsx scripts/fix_sherpa_mappings.ts --dry-run
 */
import 'dotenv/config';
import { createPool, loadCompanies, loadCodeMap } from './lib/bilanciLoader.ts';
import { resolveMasterAccountId } from '../shared/etl/seed/ledgerMappingResolve.ts';
import { getCeProfile, suggestFamigliaFromAccountCode } from '../shared/etl/ceProfiles/index.ts';
import { STUB_ANALITICA_PLACEHOLDER } from '../shared/etl/ledgerMappingStubs.ts';
import { mappingsForCompany } from '../shared/etl/seed/accountMappings.ts';

/** Normalizza etichette analitica custom verso label seed account_mappings. */
const ANALITICA_SYNONYMS: Record<string, string> = {
  'Costi del Personale per sviluppo progetti interni': 'Costi del Personale per sviluppo ip',
  'Costi del Personale per sviluppo R&D': 'Costi del Personale per sviluppo ip',
  'Costi connessi alla delivery commesse': 'Costi connessi alla delivery corsi/eventi',
  'Costi collaboratori a partita iva(S.O.D.) per lavorazioni esterne su commessa':
    'Costi collaboratori a partita iva',
  /** Awentia Source → voce Sherpa42 (altriRicavi in rollup). */
  'Altri proventi': 'Ricavi non caratteristici',
};

/** Categorie CE fuori layout sherpa42 — richiedono remap analitica. */
const NON_SHERPA_CATEGORIES = new Set(['altriProventi', 'merci', 'grossProfit']);

/**
 * Categorie CE foglia nel ramo costi fissi Sherpa42.
 * Se famiglia = "Costi variabili" con queste categorie si ha doppio conteggio
 * (supplemental totaleCostiVariabili + rollup costi fissi).
 */
const FIXED_COST_CATEGORIES = new Set([
  'personale',
  'costiServizi',
  'serviziInformatici',
  'speseCommerciali',
  'speseStruttura',
  'compensiAmministratore',
  'altriServizi',
  'ammortamentiImmateriali',
  'ammortamentiMateriali',
  'svalutazioni',
  'speseCommissioniBancarie',
  'interessiPassiviMutui',
  'altriInteressi',
  'imposteDirette',
]);

/** Override per codice conto (bilancini Sherpa42). */
const ACCOUNT_OVERRIDES: Record<
  string,
  { famigliaCode: string; analitica: string }
> = {
  '72/30/010': { famigliaCode: 'costi_fissi', analitica: 'Costi del Personale per delivery' },
  '72/30/503': { famigliaCode: 'costi_fissi', analitica: 'Costi del Personale per sviluppo ip' },
  '72/30/504': { famigliaCode: 'costi_fissi', analitica: 'Costi del Personale per sviluppo ip' },
  '68/05/724': { famigliaCode: 'costi_fissi', analitica: 'Costi collaboratori a partita iva' },
  '68/05/341': { famigliaCode: 'costi_fissi', analitica: 'Costi connessi alla delivery corsi/eventi' },
  '68/05/405': { famigliaCode: 'costi_fissi', analitica: 'Costi connessi alla delivery corsi/eventi' },
  '64/05/100': { famigliaCode: 'ricavi', analitica: 'Ricavi non caratteristici' },
};

const PERSONNEL_68_05 = /^68\/05\/(170|200|220|231|265)$/;

function normalizeAnalitica(label: string): string {
  const trimmed = label.trim();
  return ANALITICA_SYNONYMS[trimmed] ?? trimmed;
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

  if (PERSONNEL_68_05.test(accountCode)) {
    return {
      famiglia: famigliaLabelByCode.get('costi_fissi') ?? 'Costi fissi',
      analitica: 'Costi del Personale per sviluppo ip',
    };
  }

  const ceProfile = getCeProfile('sherpa42');
  const prefixSuggestion = suggestFamigliaFromAccountCode(
    accountCode,
    ceProfile,
    famigliaLabelByCode,
  );

  const analitica =
    normalizeAnalitica(currentAnalitica) ||
    prefixSuggestion.analiticaHint ||
    currentAnalitica;

  const famiglia =
    currentFamiglia && currentFamiglia !== STUB_ANALITICA_PLACEHOLDER
      ? currentFamiglia
      : prefixSuggestion.famiglia ?? currentFamiglia ?? 'Costi fissi';

  // Prefix 66/(05|10|15) → costi variabili (collaboratori / delivery)
  if (/^66\/(05|10|15)/.test(accountCode)) {
    return {
      famiglia: famigliaLabelByCode.get('costi_variabili') ?? 'Costi variabili',
      analitica: normalizeAnalitica(analitica) || 'Costi collaboratori a partita iva',
    };
  }

  if (/^58\//.test(accountCode)) {
    return {
      famiglia: famigliaLabelByCode.get('ricavi') ?? 'Ricavi',
      analitica: analitica || 'Ricavi da attività di consulenza',
    };
  }

  return { famiglia: famiglia ?? 'Costi fissi', analitica };
}

const dryRun = process.argv.includes('--dry-run');

const pool = createPool();
try {
  const companies = await loadCompanies(pool);
  const company = companies.find((c) => c.slug === 'sherpa42');
  if (!company) throw new Error('sherpa42 non trovata');

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

  const seedLabels = new Set(mappingsForCompany('sherpa42').map((m) => m.originalLabel.trim()));
  console.log(`Seed account_mappings: ${seedLabels.size} label`);

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
  const incomplete = allRows.filter(
    (m) =>
      !m.master_account_id
      || m.analitica_label === STUB_ANALITICA_PLACEHOLDER
      || m.analitica_label.trim() === '',
  );

  function categoryForMasterId(masterId: string): string | undefined {
    return [...codeMap.entries()].find(([, id]) => id === masterId)?.[0];
  }

  /** Corregge famiglia Costi variabili su categorie foglia costi fissi (doppio conteggio). */
  const famigliaFixes = allRows.filter((m) => {
    if (m.famiglia !== 'Costi variabili' || !m.master_account_id) return false;
    const categoryCode = categoryForMasterId(m.master_account_id);
    return categoryCode != null && FIXED_COST_CATEGORIES.has(categoryCode);
  });

  const profileFixes = allRows.filter((m) => {
    if (!m.master_account_id) return false;
    const categoryCode = categoryForMasterId(m.master_account_id);
    return categoryCode != null && NON_SHERPA_CATEGORIES.has(categoryCode);
  });

  const toFixIds = new Set([...incomplete, ...famigliaFixes, ...profileFixes].map((m) => m.id));
  const toFix = allRows.filter((m) => toFixIds.has(m.id));

  console.log(`Mapping incompleti: ${incomplete.length}`);
  console.log(`Correzioni famiglia (anti doppio conteggio): ${famigliaFixes.length}`);
  console.log(`Correzioni profilo CE (categorie non sherpa42): ${profileFixes.length}`);
  console.log(`Totale da aggiornare: ${toFix.length}/${allRows.length}`);
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

    const categoryCode = categoryForMasterId(master.masterAccountId);
    let famiglia = resolved.famiglia;
    if (
      famiglia === 'Costi variabili'
      && categoryCode
      && FIXED_COST_CATEGORIES.has(categoryCode)
    ) {
      famiglia = famigliaLabelByCode.get('costi_fissi') ?? 'Costi fissi';
    }

    console.log(
      `  [OK] ${row.account_code} → ${resolved.analitica} | ${famiglia} (${master.resolution})`,
    );

    if (!dryRun) {
      await pool.query(
        `update ledger_account_mappings
            set famiglia = $1, analitica_label = $2, master_account_id = $3,
                sign_multiplier = $4, updated_at = now()
          where id = $5`,
        [famiglia, resolved.analitica, master.masterAccountId, master.signMultiplier, row.id],
      );
    }
    fixed += 1;
  }

  console.log(`\nCompletati: ${fixed}/${toFix.length} (skipped: ${skipped})${dryRun ? ' [dry-run]' : ''}`);
} finally {
  await pool.end();
}
