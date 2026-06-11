/**
 * ceProfiles — registro profili rollup CE per company (layout + formule bilancino).
 */

import { macroMetricsLabels, type MacroMetricDef } from '../../domain/kpiFormulas.ts';
import { awentiaCeProfile } from './awentia.ts';
import { sherpa42CeProfile, SHERPA42_MACRO_METRICS } from './sherpa42.ts';
import type { CePrefixRule, CeProfile } from './types.ts';

export type { CePrefixRule, CeProfile, CELayoutTemplateRow, FamigliaRollupConfig } from './types.ts';
export {
  awentiaCeProfile,
  AWENTIA_CE_LAYOUT,
  AWENTIA_SUM_CHILDREN,
  CE_DETTAGLIO_LAYOUT,
  SUM_CHILDREN,
} from './awentia.ts';
export {
  sherpa42CeProfile,
  SHERPA42_CE_LAYOUT,
  SHERPA42_SUM_CHILDREN,
  SHERPA42_MACRO_METRICS,
} from './sherpa42.ts';

const CE_PROFILES: CeProfile[] = [awentiaCeProfile, sherpa42CeProfile];

const PROFILE_BY_ID = new Map(CE_PROFILES.map((p) => [p.id, p]));

/** Slug company → profilo CE default (allineato a companies.ce_profile). */
const SLUG_DEFAULT_PROFILE: Record<string, string> = {
  awentia: 'awentia',
  sherpa42: 'sherpa42',
  'maia-management': 'awentia',
  '2f2t': 'awentia',
  'babylon-vines': 'awentia',
  'casa-profitto': 'awentia',
  khoraline: 'awentia',
};

export const DEFAULT_CE_PROFILE_ID = 'awentia';

export function getCeProfileById(id: string): CeProfile | undefined {
  return PROFILE_BY_ID.get(id);
}

/**
 * Risolve il profilo CE per slug azienda o id esplicito (companies.ce_profile).
 * Fallback: awentia (template consulente generico).
 */
export function getCeProfile(companySlugOrProfileId?: string | null): CeProfile {
  if (!companySlugOrProfileId) return awentiaCeProfile;

  const direct = PROFILE_BY_ID.get(companySlugOrProfileId);
  if (direct) return direct;

  const mappedId = SLUG_DEFAULT_PROFILE[companySlugOrProfileId] ?? DEFAULT_CE_PROFILE_ID;
  return PROFILE_BY_ID.get(mappedId) ?? awentiaCeProfile;
}

const MACRO_METRICS_BY_PROFILE: Record<string, MacroMetricDef[]> = {
  awentia: macroMetricsLabels,
  sherpa42: SHERPA42_MACRO_METRICS,
};

/** Macro-voci CE sintetico / dashboard per profilo company (label PRIMO MARGINE vs GROSS PROFIT). */
export function getMacroMetricsForProfile(profileId?: string | null): MacroMetricDef[] {
  const profile = getCeProfile(profileId);
  return MACRO_METRICS_BY_PROFILE[profile.id] ?? macroMetricsLabels;
}

/** Suggerimento famiglia+analitica da codice conto e profilo CE. */
export function suggestFamigliaFromAccountCode(
  accountCode: string,
  profile: CeProfile,
  famigliaLabelByCode: Map<string, string>,
): { famiglia: string | null; analiticaHint: string | null } {
  const rules = profile.prefixRules ?? [];
  for (const rule of rules) {
    if (rule.pattern.test(accountCode)) {
      return {
        famiglia: famigliaLabelByCode.get(rule.famigliaCode) ?? null,
        analiticaHint: rule.analiticaHint ?? null,
      };
    }
  }
  return { famiglia: null, analiticaHint: null };
}
