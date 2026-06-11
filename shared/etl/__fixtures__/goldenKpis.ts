/**
 * Fixture dei golden test: KPI attesi estratti dai file Excel reali 2025.
 * I valori sono presi direttamente dal foglio "1_CE dettaglio" (colonna
 * progressivo anno corrente) dei file ufficiali e fungono da oracolo di
 * regressione per il motore di estrazione.
 */

export interface GoldenCase {
  file: string;
  companySlug: string;
  expectedProfile: string;
  year: number;
  /** KPI attesi (code canonico -> valore progressivo annuale). */
  kpis: {
    totaleRicavi: number;
    ebitda: number;
    risultatoEsercizio: number;
  };
}

export const GOLDEN_CASES: GoldenCase[] = [
  {
    file: 'import_data/2025/[2025] Analisi Bilanci Awentia v. 2.xlsx',
    companySlug: 'awentia',
    expectedProfile: 'awentia',
    year: 2025,
    kpis: {
      totaleRicavi: 331842.08,
      ebitda: -62412.86,
      risultatoEsercizio: -120246.63,
    },
  },
  {
    file: 'import_data/2025/(2025) Analisi Bilancio SHERPA42 al 31-12-2025.xlsx',
    companySlug: 'sherpa42',
    expectedProfile: 'sherpa42',
    year: 2025,
    kpis: {
      totaleRicavi: 609600.02,
      ebitda: 292367.53,
      risultatoEsercizio: 290219.33,
    },
  },
];
