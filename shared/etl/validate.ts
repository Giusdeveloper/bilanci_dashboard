/**
 * validate — validazione Zod dei fatti + quadrature di dominio.
 *
 * Le quadrature producono WARNING espliciti (mai correzioni silenziose):
 *  - niente NaN/valori non finiti (errore bloccante a livello di fatto);
 *  - presenza di ricavi e risultato;
 *  - coerenza somma-mesi vs progressivo annuale (per le voci chiave);
 *  - identita' ricavi - costi = risultato quando i totali sono disponibili.
 */

import { z } from 'zod';
import type { Fact, Warning } from './types.ts';

const factSchema = z.object({
  categoryCode: z.string().min(1),
  year: z.number().int(),
  month: z.number().int().min(1).max(12).nullable(),
  amountProgressive: z.number().finite(),
  amountPeriod: z.number().finite().nullable(),
  sourceLabel: z.string(),
});

/** Tolleranza per le quadrature (arrotondamenti / float noise). */
const TOLERANCE = 1.0;

export function validateFacts(facts: Fact[]): Warning[] {
  const warnings: Warning[] = [];
  for (const f of facts) {
    const r = factSchema.safeParse(f);
    if (!r.success) {
      warnings.push({
        severity: 'error',
        message: `Fatto non valido (${f.categoryCode} ${f.year}/${f.month ?? 'annuale'}): ${r.error.issues
          .map((i) => i.message)
          .join('; ')}`,
      });
    }
  }
  return warnings;
}

export interface QuadratureContext {
  /** Valori annuali per code canonico. */
  annual: Record<string, number>;
  /** Serie progressive mensili per code canonico. */
  monthlyByCategory: Record<string, number[]>;
  monthsCount: number;
}

export function buildQuadratureWarnings(ctx: QuadratureContext): Warning[] {
  const warnings: Warning[] = [];
  const { annual, monthlyByCategory, monthsCount } = ctx;

  const ricavi = annual.totaleRicavi ?? annual.ricaviCaratteristici;
  if (ricavi == null) {
    warnings.push({ severity: 'warning', message: 'Quadratura: ricavi totali non individuati nel CE.' });
  }
  if (annual.risultatoEsercizio == null) {
    warnings.push({ severity: 'warning', message: 'Quadratura: risultato d\'esercizio non individuato nel CE.' });
  }

  // ricavi - costi = risultato (solo se i totali sono entrambi disponibili).
  if (annual.totaleRicavi != null && annual.totaleCosti != null && annual.risultatoEsercizio != null) {
    const diff = annual.totaleRicavi - annual.totaleCosti - annual.risultatoEsercizio;
    if (Math.abs(diff) > TOLERANCE) {
      warnings.push({
        severity: 'warning',
        message: `Quadratura CE: ricavi - costi - risultato = ${diff.toFixed(2)} (atteso ~0).`,
      });
    }
  }

  // somma mesi ~ progressivo annuale per le voci chiave.
  if (monthsCount > 0) {
    for (const code of ['totaleRicavi', 'risultatoEsercizio', 'ebitda']) {
      const series = monthlyByCategory[code];
      const annualVal = annual[code];
      if (series && series.length > 0 && annualVal != null) {
        const last = series[series.length - 1];
        if (Math.abs(last - annualVal) > TOLERANCE) {
          warnings.push({
            severity: 'info',
            message: `Quadratura mese/progressivo (${code}): mensile=${last.toFixed(2)} vs annuale=${annualVal.toFixed(2)}.`,
          });
        }
      }
    }
  }

  return warnings;
}
