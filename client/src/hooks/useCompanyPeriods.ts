import { useEffect, useState } from 'react';
import { fetchCompanyPeriods } from '@/data/financialReads';
import type { CompanyPeriods } from '@shared/queries';

/**
 * Carica gli anni/periodi disponibili per un'azienda dal nuovo schema
 * normalizzato (`fiscal_periods`), sostituendo la deduzione degli anni dai blob.
 *
 * Espone helper per sapere quanti/quali mesi sono presenti per un dato anno,
 * così le pagine possono decidere se mostrare trend/serie mensili.
 */
export function useCompanyPeriods(companyId: string | null | undefined) {
  const [periods, setPeriods] = useState<CompanyPeriods | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!companyId) {
      setPeriods(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchCompanyPeriods(companyId)
      .then((p) => {
        if (!cancelled) setPeriods(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  /** Mesi disponibili per un anno (array ordinato asc, vuoto se solo annuale). */
  const monthsForYear = (year: number): number[] =>
    periods?.byYear[year]?.months ?? [];

  /** Numero di mesi disponibili per un anno (0 => dati solo annuali). */
  const monthsAvailableForYear = (year: number): number =>
    monthsForYear(year).length;

  return { periods, loading, error, monthsForYear, monthsAvailableForYear };
}
