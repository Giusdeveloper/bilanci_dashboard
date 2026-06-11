/**
 * bilancinoPublishGate — validazione bloccante prima del publish bilancino.
 *
 * Controlli:
 * - mapping stub incompleti / conti non mappati (warnings severity error)
 * - quadratura totali estratti bilancino vs KPI rollup (ricavi, costi, risultato)
 */

import type { BilancinoExtractResult, BilancinoTotals } from './extractBilancino.ts';
import type { Warning } from './types.ts';

/** Tolleranza quadratura KPI (€). */
export const BILANCINO_QUADRATURE_TOLERANCE = 0.01;

export interface BilancinoQuadratureCheck {
  key: 'totaleRicavi' | 'totaleCosti' | 'risultatoEsercizio';
  label: string;
  extracted: number | null;
  rollup: number | null;
  delta: number | null;
  ok: boolean;
}

export interface BilancinoActionLink {
  label: string;
  href: string;
}

export interface BilancinoPublishGateResult {
  blocked: boolean;
  errors: string[];
  quadratureChecks: BilancinoQuadratureCheck[];
  actionLinks: BilancinoActionLink[];
}

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

function pickKpi(kpis: Record<string, number>, keys: string[]): number | null {
  for (const k of keys) {
    if (kpis[k] != null) return round2(kpis[k]);
  }
  return null;
}

/** Totale costi lordi rollup = ricavi − risultato (include ammortamenti, finanziari, imposte). */
export function pickTotaleCostiLordiRollup(kpis: Record<string, number>): number | null {
  const ricavi = pickKpi(kpis, ['totaleRicavi', 'ricaviCaratteristici']);
  const risultato = pickKpi(kpis, ['risultatoEsercizio', 'risultato']);
  if (ricavi != null && risultato != null) return round2(ricavi - risultato);
  return pickKpi(kpis, ['totaleCostiLordi', 'totaleCosti']);
}

/** Confronta un totale estratto dal bilancino con il KPI rollup corrispondente. */
export function compareQuadraturePair(
  extracted: number | null,
  rollup: number | null,
  tolerance = BILANCINO_QUADRATURE_TOLERANCE,
): { delta: number | null; ok: boolean } {
  if (extracted == null || rollup == null) {
    return { delta: null, ok: extracted == null && rollup == null };
  }
  const delta = round2(extracted - rollup);
  return { delta, ok: Math.abs(delta) <= tolerance };
}

/** Costruisce i check di quadratura bilancino vs rollup. */
export function buildQuadratureChecks(
  totals: BilancinoTotals,
  kpis: Record<string, number>,
): BilancinoQuadratureCheck[] {
  const pairs: Array<{
    key: BilancinoQuadratureCheck['key'];
    label: string;
    extracted: number | null;
    rollup: number | null;
  }> = [
    {
      key: 'totaleRicavi',
      label: 'Totale ricavi (natura economica)',
      extracted: totals.totaleRicavi != null ? round2(totals.totaleRicavi) : null,
      rollup: pickKpi(kpis, ['totaleRicavi', 'ricaviCaratteristici']),
    },
    {
      key: 'totaleCosti',
      label: 'Totale costi lordi (natura economica)',
      extracted: totals.totaleCosti != null ? round2(totals.totaleCosti) : null,
      rollup: pickTotaleCostiLordiRollup(kpis),
    },
    {
      key: 'risultatoEsercizio',
      label: 'Risultato esercizio',
      extracted: totals.risultato != null ? round2(totals.risultato) : null,
      rollup: pickKpi(kpis, ['risultatoEsercizio', 'risultato']),
    },
  ];

  return pairs.map(({ key, label, extracted, rollup }) => {
    const { delta, ok } = compareQuadraturePair(extracted, rollup);
    return { key, label, extracted, rollup, delta, ok };
  });
}

export function buildBilancinoActionLinks(companySlug?: string | null): BilancinoActionLink[] {
  const companyQuery = companySlug ? `company=${encodeURIComponent(companySlug)}` : '';
  const mappingBase = companyQuery
    ? `/ledger-mappings?${companyQuery}`
    : '/ledger-mappings';
  const incompleteHref = companyQuery
    ? `/ledger-mappings?filter=incomplete&${companyQuery}`
    : '/ledger-mappings?filter=incomplete';

  return [
    { label: 'Modifica mapping', href: incompleteHref },
    { label: 'Mapping conti', href: mappingBase },
    { label: 'Editor bilancio', href: '/editor/ledger-balances' },
  ];
}

/**
 * Valuta se l'import/publish bilancino deve essere bloccato.
 * Aggiunge warnings severity error per ogni violazione.
 */
export function evaluateBilancinoPublishGate(input: {
  extracted: BilancinoExtractResult;
  kpis: Record<string, number>;
  warnings: Warning[];
  companySlug?: string | null;
}): BilancinoPublishGateResult {
  const errors: string[] = [];
  const quadratureChecks = buildQuadratureChecks(input.extracted.totals, input.kpis);

  for (const w of input.warnings) {
    if (w.severity !== 'error') continue;
    if (!errors.includes(w.message)) errors.push(w.message);
  }

  const checksWithTotals = quadratureChecks.filter((c) => c.extracted != null && c.rollup != null);
  for (const check of checksWithTotals) {
    if (check.ok) continue;
    const msg =
      `Quadratura KPI: ${check.label} bilancino=${check.extracted!.toFixed(2)} `
      + `≠ rollup=${check.rollup!.toFixed(2)} (Δ=${check.delta!.toFixed(2)}). `
      + 'Verifica mapping conti, natura economica (58/64 ricavi; storni 66–88 restano costi) e segno crediti, poi re-importa.';
    errors.push(msg);
    input.warnings.push({ severity: 'error', message: msg });
  }

  if (
    input.extracted.totals.totaleRicavi != null
    && input.extracted.totals.totaleCosti != null
    && input.extracted.totals.risultato != null
  ) {
    const internal = round2(
      input.extracted.totals.totaleRicavi
      - input.extracted.totals.totaleCosti
      - input.extracted.totals.risultato,
    );
    if (Math.abs(internal) > BILANCINO_QUADRATURE_TOLERANCE) {
      const msg =
        `Quadratura bilancino (natura economica): ricavi − costi − risultato = ${internal.toFixed(2)} (atteso ~0). `
        + 'I totali footer layout possono includere storni costo in colonna ricavi: usare somma conti per natura.';
      if (!errors.some((e) => e.startsWith('Quadratura bilancino sorgente'))) {
        errors.push(msg);
        input.warnings.push({ severity: 'error', message: msg });
      }
    }
  }

  return {
    blocked: errors.length > 0,
    errors,
    quadratureChecks,
    actionLinks: buildBilancinoActionLinks(input.companySlug),
  };
}

/** Gate publish periodo editor: blocca solo su quadratura, non su mapping incompleti (D3). */
export function evaluatePublishPeriodGate(input: {
  extracted: BilancinoExtractResult;
  kpis: Record<string, number>;
  warnings: Warning[];
  companySlug?: string | null;
}): BilancinoPublishGateResult {
  const gate = evaluateBilancinoPublishGate(input);
  const quadratureErrors = gate.errors.filter(
    (e) => e.startsWith('Quadratura KPI:') || e.startsWith('Quadratura bilancino'),
  );
  return {
    ...gate,
    blocked: quadratureErrors.length > 0,
    errors: quadratureErrors,
  };
}
