/**
 * pipelineBilancino — aggregazione bilancino -> voci CE canoniche (in memoria).
 *
 * Replica SUMIF: per ogni conto CE leaf, lookup ledger mapping, risoluzione
 * analitica -> categoryCode, somma con sign_multiplier (solo costi) e segno mapping.
 * Con rollup macro (bilancinoRollup) produce facts/layout CE completi per publish_facts.
 */

import type { BilancinoExtractResult } from './extractBilancino.ts';
import { extractBilancino } from './extractBilancino.ts';
import { detectProfile } from './detect.ts';
import { buildBilancinoRollup } from './bilancinoRollup.ts';
import { getCeProfile } from './ceProfiles/index.ts';
import { evaluateBilancinoPublishGate } from './bilancinoPublishGate.ts';
import { isIncompleteLedgerMapping } from './ledgerMappingStubs.ts';
import type { MappingResolver } from './types.ts';
import type { Fact, PipelineResult, Warning } from './types.ts';
import type { WorkbookData } from './workbook.ts';
const REVENUE_KEYS = ['totaleRicavi', 'ricaviCaratteristici'];
const RESULT_KEYS = ['risultatoEsercizio', 'risultato'];

/** Mapping conto bilancino -> analitica (subset usato dalla pipeline pura). */
export interface BilancinoLedgerMapping {
  accountCode: string;
  analiticaLabel: string;
  signMultiplier: number;
  famiglia?: string | null;
  sourceSheet?: string;
}

export interface BilancinoPipelineInput {
  workbook: WorkbookData;
  ledgerMappings: BilancinoLedgerMapping[];
  labelResolver: MappingResolver;
  extract?: BilancinoExtractResult;
  /** Nome file sorgente (richiesto per bilancino_stampa). */
  sourceFilename?: string;
  /** Progressivo mese precedente per amount_period (multi-bilancino). */
  previousProgressive?: Record<string, number>;
  /** Slug azienda per link operativi nel gate publish. */
  companySlug?: string | null;
}

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

function pickFirstKey(sums: Record<string, number>, keys: string[]): number | undefined {
  for (const k of keys) {
    if (sums[k] != null) return sums[k];
  }
  return undefined;
}

function deriveKpis(
  sums: Record<string, number>,
  totals: BilancinoExtractResult['totals'],
): Record<string, number> {
  const kpis: Record<string, number> = { ...sums };

  if (totals.totaleRicavi != null && kpis.totaleRicavi == null) {
    kpis.totaleRicavi = round2(totals.totaleRicavi);
  }
  if (totals.totaleCosti != null && kpis.totaleCosti == null) {
    kpis.totaleCosti = round2(totals.totaleCosti);
  }
  if (totals.risultato != null && kpis.risultatoEsercizio == null) {
    kpis.risultatoEsercizio = round2(totals.risultato);
  }

  const ricavi = pickFirstKey(kpis, REVENUE_KEYS);
  if (ricavi != null && kpis.totaleRicavi == null) kpis.totaleRicavi = round2(ricavi);

  const risultato = pickFirstKey(kpis, RESULT_KEYS);
  if (risultato != null && kpis.risultatoEsercizio == null) kpis.risultatoEsercizio = round2(risultato);

  return kpis;
}

export function runBilancinoPipeline(input: BilancinoPipelineInput): PipelineResult {
  const extracted = input.extract ?? extractBilancino(
    input.workbook,
    detectProfile(input.workbook).profile,
    input.sourceFilename,
  );

  const ceProfile = getCeProfile(input.companySlug);
  const mappingByCode = new Map(input.ledgerMappings.map((m) => [m.accountCode, m]));
  const warnings: Warning[] = [];
  const sums: Record<string, number> = {};
  const supplementalSums: Record<string, number> = {};

  let unmappedCount = 0;
  let incompleteStubCount = 0;

  for (const acc of extracted.accounts) {
    const ledger = mappingByCode.get(acc.accountCode);
    if (!ledger) {
      unmappedCount += 1;
      warnings.push({
        severity: 'error',
        message: `Conto bilancino non mappato in ledger: ${acc.accountCode} (${acc.description})`,
      });
      continue;
    }

    if (isIncompleteLedgerMapping(ledger)) {
      incompleteStubCount += 1;
      warnings.push({
        severity: 'error',
        message: `Mapping incompleto per conto ${acc.accountCode} (${acc.description}): completare famiglia e analitica CE.`,
      });
      continue;
    }

    const resolution = input.labelResolver(ledger.analiticaLabel);
    if (!resolution) {
      warnings.push({
        severity: 'warning',
        message: `Analitica non risolta: "${ledger.analiticaLabel}" (conto ${acc.accountCode})`,
      });
      continue;
    }

    // normalizeForCe gestisce convenzione bilancino→CE; sign_multiplier ledger non va ri-applicato
    // (evita flip errati su storni/crediti costi con sign_multiplier=-1 legacy).
    const amount = round2(acc.balanceNormalized * resolution.sign);
    sums[resolution.categoryCode] = round2((sums[resolution.categoryCode] ?? 0) + amount);

    const famigliaKey = ledger.famiglia?.trim();
    if (famigliaKey && ceProfile.famigliaRollup?.famigliaToKey[famigliaKey]) {
      const aggKey = ceProfile.famigliaRollup.famigliaToKey[famigliaKey];
      supplementalSums[aggKey] = round2((supplementalSums[aggKey] ?? 0) + amount);
    }

    if (resolution.viaFallback) {
      warnings.push({
        severity: 'info',
        message: `Conto ${acc.accountCode} mappato via fallback: "${ledger.analiticaLabel}"`,
      });
    }
  }

  const rollup = buildBilancinoRollup({
    leafSums: sums,
    year: extracted.year,
    month: extracted.month,
    previousProgressive: input.previousProgressive,
    ceProfileId: ceProfile.id,
    supplementalSums: Object.keys(supplementalSums).length > 0 ? supplementalSums : undefined,
  });

  const kpis = deriveKpis(rollup.kpis, extracted.totals);
  const facts = rollup.facts;
  const layout = rollup.layout;

  if (unmappedCount > 0) {
    warnings.push({
      severity: 'error',
      message: `${unmappedCount} conti CE non mappati in ledger_account_mappings. Creare stub da anteprima import o aggiungere mapping manualmente.`,
    });
  }

  if (incompleteStubCount > 0) {
    warnings.push({
      severity: 'error',
      message: `${incompleteStubCount} mapping stub da completare in Mapping conti (famiglia + analitica CE) prima di importare.`,
    });
  }

  const publishGate = evaluateBilancinoPublishGate({
    extracted,
    kpis,
    warnings,
    companySlug: input.companySlug,
  });

  return {
    profileId: extracted.profileId,
    currentYear: extracted.year,
    compareYear: null,
    referenceMonth: extracted.month,
    facts,
    warnings,
    layout,
    kpis,
    publishGate,
  };
}
