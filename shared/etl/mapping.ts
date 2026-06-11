/**
 * mapping — costruzione del {@link MappingResolver}.
 *
 * Strategia (coerente col design "mai scarto silenzioso"):
 *  1. match esplicito su `account_mappings` della company (label normalizzata);
 *  2. fallback sul dizionario condiviso `getCanonicalKey` (segnalato come fallback);
 *  3. nessun match -> null (la pipeline genera un warning, la riga resta nel layout).
 *
 * Il dizionario hardcoded resta solo come SUGGERITORE di fallback, non come verita'.
 */

import { getCanonicalKey } from '../domain/labelMapping.ts';
import type { MappingResolver, MappingResolution } from './types.ts';

/** Voce di mapping esplicito per azienda. */
export interface ExplicitMapping {
  originalLabel: string;
  categoryCode: string;
  sign: number;
}

/** Normalizza una label per il confronto (trim + lowercase + spazi compressi). */
export function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Costruisce un resolver a partire dai mapping espliciti della company e
 * dall'insieme dei code canonici validi (master_chart_of_accounts.code).
 * Il fallback via `getCanonicalKey` viene accettato solo se produce un code
 * presente in `validCodes`.
 */
export function buildResolver(
  explicit: ExplicitMapping[],
  validCodes: Set<string>,
): MappingResolver {
  const byLabel = new Map<string, ExplicitMapping>();
  for (const m of explicit) byLabel.set(normalizeLabel(m.originalLabel), m);

  return (label: string): MappingResolution | null => {
    const exact = byLabel.get(normalizeLabel(label));
    if (exact) {
      return { categoryCode: exact.categoryCode, sign: exact.sign, viaFallback: false };
    }
    const key = getCanonicalKey(label);
    if (key && validCodes.has(key)) {
      return { categoryCode: key, sign: 1, viaFallback: true };
    }
    return null;
  };
}

/**
 * Resolver "solo dizionario" (nessun mapping esplicito): utile nei golden test,
 * dove vogliamo testare il motore in modo deterministico senza DB.
 */
export function buildDictionaryResolver(validCodes: Set<string>): MappingResolver {
  return buildResolver([], validCodes);
}
