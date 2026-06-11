import { getCeProfile } from '@shared/etl/ceProfiles/index.ts';
import type { Company } from '@/lib/supabase';

/** Id profilo CE da colonna DB o slug azienda (fallback). */
export function resolveCompanyCeProfileId(
  company: Pick<Company, 'slug' | 'ce_profile'> | null | undefined,
): string | undefined {
  if (!company) return undefined;
  return company.ce_profile ?? company.slug;
}

/** Etichetta leggibile del profilo CE risolto (es. awentia, sherpa42). */
export function resolveCompanyCeProfileLabel(
  company: Pick<Company, 'slug' | 'ce_profile'> | null | undefined,
): string {
  return getCeProfile(resolveCompanyCeProfileId(company)).id;
}
