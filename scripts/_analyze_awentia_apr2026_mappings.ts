/**
 * Analisi mapping Awentia aprile 2026 — gap quadratura publish gate.
 * Solo lettura: estrae bilancino, confronta ledger_account_mappings, spiega Δ ricavi/costi.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  extractBilancino,
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
  runBilancinoPipeline,
} from '../shared/etl/index';
import { SUM_CHILDREN } from '../shared/etl/bilancinoRollup.ts';
import { isIncompleteLedgerMapping } from '../shared/etl/ledgerMappingStubs.ts';
import {
  createPool,
  loadCompanies,
  loadLedgerMappings,
  type LedgerAccountMapping,
} from './lib/bilanciLoader';

const COMPANY_SLUG = 'awentia';
const BILANCINO_CANDIDATES = [
  path.join('import_data', '2026', 'Bilancini 2026', 'AWENTIA SRL 30 04 provvisorio.xlsx'),
  path.join('import_data', 'Bilancini', 'Awentia', 'Bilancini 2026', 'AWENTIA SRL 30 04 provvisorio.xlsx'),
  path.join('import_data', 'Bilancini', 'AWENTIA SRL 30 04 provvisorio.xlsx'),
];

type IssueKind =
  | 'unmapped'
  | 'incomplete_stub'
  | 'unresolved_analitica'
  | 'outside_totale_ricavi'
  | 'outside_totale_costi'
  | 'outside_risultato'
  | 'ok';

/** Voci foglia che confluiscono in totaleRicavi (gate KPI). */
const TOTALE_RICAVI_LEAVES = new Set(SUM_CHILDREN.totaleRicavi ?? []);

/** Voci che confluiscono in totaleCosti (= totaleRicavi − ebitda), esclusi amm/fin/imposte. */
const TOTALE_COSTI_LEAVES = new Set([
  ...(SUM_CHILDREN.costiDiretti ?? []),
  ...(SUM_CHILDREN.costiIndiretti ?? []),
  ...(SUM_CHILDREN.speseCommerciali ?? []),
  ...(SUM_CHILDREN.speseStruttura ?? []),
  ...(SUM_CHILDREN.ricaviNonTipici ?? []),
  'totaleRicavi',
  'ricaviCaratteristici',
  'altriRicavi',
  'merci',
]);

/** Voci dopo EBITDA — impattano risultato ma non totaleCosti gate. */
const POST_EBITDA_LEAVES = new Set([
  ...(SUM_CHILDREN.totaleAmmortamenti ?? []),
  ...(SUM_CHILDREN.gestioneFinanziaria ?? []),
  'gestioneStraordinaria',
  'imposteDirette',
]);

interface AccountIssue {
  accountCode: string;
  description: string;
  side: 'ricavi' | 'costi';
  balanceRaw: number;
  balanceNormalized: number;
  kind: IssueKind;
  categoryCode: string | null;
  rollupAmount: number;
  currentFamiglia: string | null;
  currentAnalitica: string | null;
  impactRicavi: number;
  impactCosti: number;
  impactRisultato: number;
  suggestedFamiglia: string | null;
  suggestedAnalitica: string | null;
  suggestionSource: string;
}

function resolveExistingFile(candidates: string[]): string {
  for (const p of candidates) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* next */
    }
  }
  throw new Error(`Bilancino non trovato. Candidati: ${candidates.join(', ')}`);
}

function fmt(n: number): string {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function accountPrefix(code: string): string {
  const parts = code.split('/');
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : code;
}

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(normalizeText(a).split(/\W+/).filter((t) => t.length > 3));
  const tb = new Set(normalizeText(b).split(/\W+/).filter((t) => t.length > 3));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / Math.max(ta.size, tb.size);
}

function buildSuggestionIndex(mappings: LedgerAccountMapping[]) {
  const complete = mappings.filter((m) => !isIncompleteLedgerMapping(m) && m.analiticaLabel.trim());
  const byPrefix = new Map<string, LedgerAccountMapping[]>();
  for (const m of complete) {
    const p = accountPrefix(m.accountCode);
    const list = byPrefix.get(p) ?? [];
    list.push(m);
    byPrefix.set(p, list);
  }
  return { complete, byPrefix };
}

function suggestMapping(
  accountCode: string,
  description: string,
  side: 'ricavi' | 'costi',
  index: ReturnType<typeof buildSuggestionIndex>,
  accountMappingsLabels: Map<string, { famiglia: string | null; analitica: string }>,
  kind: IssueKind,
  categoryCode: string | null,
): Pick<AccountIssue, 'suggestedFamiglia' | 'suggestedAnalitica' | 'suggestionSource'> {
  if (kind === 'outside_totale_ricavi' && side === 'ricavi') {
    const analiticaBySide: Record<string, string> = {
      autofatture: 'Ricavi caratteristici',
      rimborsiSpese: 'Ricavi caratteristici',
      altriProventi: 'Altri ricavi',
    };
    const fix = categoryCode ? analiticaBySide[categoryCode] : null;
    if (fix) {
      return {
        suggestedFamiglia: 'Ricavi',
        suggestedAnalitica: fix,
        suggestionSource: `correggere da ${categoryCode} → voce totaleRicavi`,
      };
    }
    return {
      suggestedFamiglia: 'Ricavi',
      suggestedAnalitica: 'Ricavi caratteristici',
      suggestionSource: 'ricavo fuori rollup totaleRicavi — usare Ricavi caratteristici o Altri ricavi',
    };
  }

  if (kind === 'outside_totale_costi' || kind === 'outside_risultato') {
    const postEbitdaFix: Record<string, { famiglia: string; analitica: string }> = {
      ammortamentiImmateriali: { famiglia: 'Ammortamenti', analitica: 'Ammortamenti immateriali' },
      ammortamentiMateriali: { famiglia: 'Ammortamenti', analitica: 'Ammortamenti materiali' },
      svalutazioni: { famiglia: 'Ammortamenti', analitica: 'Svalutazioni e accantonamenti' },
      speseCommissioniBancarie: { famiglia: 'Gestione finanziaria', analitica: 'Spese e commissioni bancarie' },
      interessiPassiviMutui: { famiglia: 'Gestione finanziaria', analitica: 'Interessi passivi su mutui' },
      altriInteressi: { famiglia: 'Gestione finanziaria', analitica: 'Altri interessi' },
      imposteDirette: { famiglia: 'Imposte', analitica: 'Imposte dirette' },
    };
    if (categoryCode && postEbitdaFix[categoryCode]) {
      return {
        ...postEbitdaFix[categoryCode],
        suggestionSource: `mapping corretto ma fuori gate totaleCosti (${categoryCode})`,
      };
    }
  }

  const prefix = accountPrefix(accountCode);
  const prefixMatches = index.byPrefix.get(prefix) ?? [];

  if (prefixMatches.length === 1) {
    const m = prefixMatches[0]!;
    return {
      suggestedFamiglia: m.famiglia ?? null,
      suggestedAnalitica: m.analiticaLabel,
      suggestionSource: `stesso prefisso ${prefix} (${m.accountCode})`,
    };
  }

  if (prefixMatches.length > 1) {
    const ranked = prefixMatches
      .map((m) => ({
        m,
        score: tokenOverlap(description, m.accountDescription ?? m.analiticaLabel),
      }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0]!;
    if (best.score > 0.2) {
      return {
        suggestedFamiglia: best.m.famiglia ?? null,
        suggestedAnalitica: best.m.analiticaLabel,
        suggestionSource: `prefisso ${prefix} + descrizione simile (${best.m.accountCode})`,
      };
    }
    const sameSide = prefixMatches.filter((m) =>
      side === 'ricavi' ? m.signMultiplier === -1 : m.signMultiplier === 1,
    );
    const pick = sameSide[0] ?? prefixMatches[0]!;
    return {
      suggestedFamiglia: pick.famiglia ?? null,
      suggestedAnalitica: pick.analiticaLabel,
      suggestionSource: `prefisso ${prefix} (${pick.accountCode}, side ${side})`,
    };
  }

  const descMatches = index.complete
    .map((m) => ({
      m,
      score: tokenOverlap(description, m.accountDescription ?? m.analiticaLabel),
    }))
    .filter((x) => x.score > 0.35)
    .sort((a, b) => b.score - a.score);

  if (descMatches.length > 0) {
    const m = descMatches[0]!.m;
    return {
      suggestedFamiglia: m.famiglia ?? null,
      suggestedAnalitica: m.analiticaLabel,
      suggestionSource: `descrizione simile (${m.accountCode})`,
    };
  }

  for (const [label, meta] of accountMappingsLabels) {
    if (tokenOverlap(description, label) > 0.4) {
      return {
        suggestedFamiglia: meta.famiglia,
        suggestedAnalitica: meta.analitica,
        suggestionSource: `account_mappings label "${label}"`,
      };
    }
  }

  const sideDefaults: Record<'ricavi' | 'costi', { famiglia: string; analitica: string }> = {
    ricavi: { famiglia: 'Ricavi', analitica: 'Ricavi caratteristici' },
    costi: { famiglia: 'Costi', analitica: 'Altri costi operativi' },
  };
  const d = sideDefaults[side];
  return {
    suggestedFamiglia: d.famiglia,
    suggestedAnalitica: d.analitica,
    suggestionSource: 'fallback generico (verificare manualmente)',
  };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL mancante');

  const bilancinoPath = resolveExistingFile(BILANCINO_CANDIDATES);
  const bilBytes = readFileSync(bilancinoPath);
  const bilWb = readWorkbookData(XLSX as never, new Uint8Array(bilBytes));
  const extracted = extractBilancino(
    bilWb,
    detectProfile(bilWb).profile,
    path.basename(bilancinoPath),
  );

  const pool = createPool();
  try {
    const companies = await loadCompanies(pool);
    const company = companies.find((c) => c.slug === COMPANY_SLUG);
    if (!company) throw new Error('Company awentia non trovata');

    const ledgerMappings = await loadLedgerMappings(pool, company.id);
    const mappingByCode = new Map(ledgerMappings.map((m) => [m.accountCode, m]));

    const { rows: amRows } = await pool.query(
      `select am.original_label as label, am.sign_multiplier as sign,
              mc.code as category_code, mc.label as category_label
         from account_mappings am
         join master_chart_of_accounts mc on mc.id = am.master_account_id
        where am.company_id = $1`,
      [company.id],
    );
    const accountMappingsLabels = new Map<string, { famiglia: string | null; analitica: string }>();
    for (const r of amRows as Array<{ label: string; category_label: string }>) {
      accountMappingsLabels.set(r.label.trim(), {
        famiglia: null,
        analitica: r.label.trim(),
      });
    }

    const suggestionIndex = buildSuggestionIndex(ledgerMappings);
    const validCodes = new Set(buildMasterChart().map((a) => a.code));
    const labelResolver = buildResolver(mappingsForCompany(COMPANY_SLUG), validCodes);

    const issues: AccountIssue[] = [];
    const allAccounts: AccountIssue[] = [];

    for (const acc of extracted.accounts) {
      const ledger = mappingByCode.get(acc.accountCode);
      let kind: IssueKind = 'ok';
      let currentFamiglia: string | null = null;
      let currentAnalitica: string | null = null;
      let categoryCode: string | null = null;
      let rollupAmount = 0;

      const impactRicavi = acc.side === 'ricavi' ? acc.balanceNormalized : 0;
      const impactCosti = acc.side === 'costi' ? acc.balanceNormalized : 0;
      let impactRisultato = 0;

      if (!ledger) {
        kind = 'unmapped';
      } else {
        currentFamiglia = ledger.famiglia ?? null;
        currentAnalitica = ledger.analiticaLabel;
        if (isIncompleteLedgerMapping(ledger)) {
          kind = 'incomplete_stub';
        } else {
          const resolution = labelResolver(ledger.analiticaLabel);
          if (!resolution) {
            kind = 'unresolved_analitica';
          } else {
            categoryCode = resolution.categoryCode;
            rollupAmount = Math.round((acc.balanceNormalized * resolution.sign + Number.EPSILON) * 100) / 100;

            const missesRicaviGate =
              acc.side === 'ricavi' && !TOTALE_RICAVI_LEAVES.has(categoryCode);
            const missesCostiGate =
              acc.side === 'costi'
              && !TOTALE_COSTI_LEAVES.has(categoryCode)
              && !POST_EBITDA_LEAVES.has(categoryCode);
            const postEbitda = POST_EBITDA_LEAVES.has(categoryCode);

            if (missesRicaviGate) {
              kind = 'outside_totale_ricavi';
            } else if (missesCostiGate) {
              kind = 'outside_totale_costi';
            } else if (postEbitda) {
              kind = 'outside_risultato';
              impactRisultato = rollupAmount;
            }
          }
        }
      }

      const suggestion =
        kind === 'ok'
          ? {
              suggestedFamiglia: null,
              suggestedAnalitica: null,
              suggestionSource: '—',
            }
          : suggestMapping(
              acc.accountCode,
              acc.description,
              acc.side,
              suggestionIndex,
              accountMappingsLabels,
              kind,
              categoryCode,
            );

      const row: AccountIssue = {
        accountCode: acc.accountCode,
        description: acc.description,
        side: acc.side,
        balanceRaw: acc.balanceRaw,
        balanceNormalized: acc.balanceNormalized,
        kind,
        categoryCode,
        rollupAmount,
        currentFamiglia,
        currentAnalitica,
        impactRicavi:
          kind === 'outside_totale_ricavi' || kind === 'unmapped' || kind === 'incomplete_stub'
            ? impactRicavi
            : 0,
        impactCosti:
          kind === 'outside_totale_costi'
          || kind === 'outside_risultato'
          || kind === 'unmapped'
          || kind === 'incomplete_stub'
          || kind === 'unresolved_analitica'
            ? impactCosti
            : 0,
        impactRisultato: kind === 'outside_risultato' ? rollupAmount : 0,
        ...suggestion,
      };

      allAccounts.push(row);
      if (kind !== 'ok') issues.push(row);
    }

    const pipelineResult = runBilancinoPipeline({
      workbook: bilWb,
      ledgerMappings: ledgerMappings.map((m) => ({
        accountCode: m.accountCode,
        analiticaLabel: m.analiticaLabel,
        signMultiplier: m.signMultiplier,
        sourceSheet: m.sourceSheet,
      })),
      labelResolver,
      extract: extracted,
      companySlug: COMPANY_SLUG,
    });

    const gate = pipelineResult.publishGate;
    const qRicavi = gate.quadratureChecks.find((c) => c.key === 'totaleRicavi');
    const qCosti = gate.quadratureChecks.find((c) => c.key === 'totaleCosti');
    const qRisultato = gate.quadratureChecks.find((c) => c.key === 'risultatoEsercizio');

    const missingRicavi = issues.reduce((s, i) => s + i.impactRicavi, 0);
    const missingCosti = issues.reduce((s, i) => s + i.impactCosti, 0);
    const missingRisultato = issues.reduce((s, i) => s + i.impactRisultato, 0);

    issues.sort(
      (a, b) =>
        Math.max(b.impactRicavi, b.impactCosti, Math.abs(b.impactRisultato))
        - Math.max(a.impactRicavi, a.impactCosti, Math.abs(a.impactRisultato)),
    );

    console.log('=== Awentia apr 2026 — Analisi mapping / quadratura ===\n');
    console.log(`Bilancino: ${bilancinoPath}`);
    console.log(`Periodo: ${extracted.year}/${String(extracted.month).padStart(2, '0')}`);
    console.log(`Conti CE leaf: ${extracted.accounts.length}`);
    console.log(`Mapping ledger in DB: ${ledgerMappings.length}\n`);

    console.log('--- Gate quadratura ---');
    console.log(
      `Ricavi  bilancino=${fmt(qRicavi?.extracted ?? 0)} rollup=${fmt(qRicavi?.rollup ?? 0)} Δ=${fmt(qRicavi?.delta ?? 0)}`,
    );
    console.log(
      `Costi   bilancino=${fmt(qCosti?.extracted ?? 0)} rollup=${fmt(qCosti?.rollup ?? 0)} Δ=${fmt(qCosti?.delta ?? 0)}`,
    );
    console.log(
      `Risult. bilancino=${fmt(qRisultato?.extracted ?? 0)} rollup=${fmt(qRisultato?.rollup ?? 0)} Δ=${fmt(qRisultato?.delta ?? 0)}`,
    );
    console.log(`Publish blocked: ${gate.blocked}\n`);

    const byKind = {
      unmapped: issues.filter((i) => i.kind === 'unmapped'),
      incomplete_stub: issues.filter((i) => i.kind === 'incomplete_stub'),
      unresolved_analitica: issues.filter((i) => i.kind === 'unresolved_analitica'),
      outside_totale_ricavi: issues.filter((i) => i.kind === 'outside_totale_ricavi'),
      outside_totale_costi: issues.filter((i) => i.kind === 'outside_totale_costi'),
      outside_risultato: issues.filter((i) => i.kind === 'outside_risultato'),
    };

    console.log('--- Riepilogo issue ---');
    console.log(`  Non mappati:              ${byKind.unmapped.length} conti`);
    console.log(`  Stub incompleti:          ${byKind.incomplete_stub.length} conti`);
    console.log(`  Analitica non risolta:    ${byKind.unresolved_analitica.length} conti`);
    console.log(`  Ricavi fuori totaleRicavi: ${byKind.outside_totale_ricavi.length} conti`);
    console.log(`  Costi fuori totaleCosti:  ${byKind.outside_totale_costi.length} conti`);
    console.log(`  Post-EBITDA (risultato):  ${byKind.outside_risultato.length} conti`);
    console.log(`  OK (in gate):             ${extracted.accounts.length - issues.length} conti\n`);

    console.log('--- Spiegazione delta gate ---');
    console.log(`  Δ ricavi spiegato:    ${fmt(missingRicavi)} / gate ${fmt(qRicavi?.delta ?? 0)}`);
    console.log(`  Δ costi spiegato:     ${fmt(missingCosti)} / gate ${fmt(qCosti?.delta ?? 0)}`);
    console.log(`  Δ risultato post-EBITDA: ${fmt(missingRisultato)} (non spiega da solo Δ risultato ${fmt(qRisultato?.delta ?? 0)})`);
    console.log(
      `  Copertura Δ ricavi: ${qRicavi?.delta != null && Math.abs(qRicavi.delta - missingRicavi) < 0.02 ? '100%' : `parziale (residuo ${fmt((qRicavi?.delta ?? 0) - missingRicavi)})`}`,
    );
    console.log(
      `  Copertura Δ costi:  ${qCosti?.delta != null && Math.abs(qCosti.delta - missingCosti) < 0.02 ? '100%' : `parziale (residuo ${fmt((qCosti?.delta ?? 0) - missingCosti)})`}`,
    );
    console.log('');

    console.log('--- Tutti i conti CE (estratto bilancino) ---');
    for (const row of allAccounts) {
      console.log(
        `  ${row.accountCode} | ${row.side.padEnd(6)} | ${fmt(row.balanceNormalized).padStart(12)} | ${(row.categoryCode ?? '—').padEnd(24)} | ${row.currentAnalitica ?? '—'}`,
      );
    }
    console.log('');

    const kindLabel: Record<IssueKind, string> = {
      unmapped: 'NON MAPPATO',
      incomplete_stub: 'STUB',
      unresolved_analitica: 'ANALITICA?',
      outside_totale_ricavi: 'RICAVI≠GATE',
      outside_totale_costi: 'COSTI≠GATE',
      outside_risultato: 'POST-EBITDA',
      ok: 'OK',
    };

    console.log('--- Tabella actionable /ledger-mappings (priorità impatto €) ---');
    console.log(
      [
        'Priorità',
        'Codice',
        'Descrizione',
        'Side',
        'Saldo',
        'Cat.attuale',
        'Imp.Ricavi',
        'Imp.Costi',
        'Issue',
        'Analitica attuale',
        'Famiglia suggerita',
        'Analitica suggerita',
        'Fonte',
      ].join('\t'),
    );

    issues.forEach((row, idx) => {
      console.log(
        [
          idx + 1,
          row.accountCode,
          row.description.slice(0, 45),
          row.side,
          fmt(row.balanceNormalized),
          row.categoryCode ?? '—',
          fmt(row.impactRicavi),
          fmt(row.impactCosti),
          kindLabel[row.kind],
          row.currentAnalitica ?? '—',
          row.suggestedFamiglia ?? '—',
          row.suggestedAnalitica ?? '—',
          row.suggestionSource,
        ].join('\t'),
      );
    });

    if (issues.length === 0) {
      console.log('(nessun conto problematico — verificare segno storni o mapping errati su conti OK)');
    }

    console.log('\n--- Comando ---');
    console.log('  npx tsx scripts/_analyze_awentia_apr2026_mappings.ts');
    console.log('  UI: /ledger-mappings?company=awentia&filter=incomplete');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
