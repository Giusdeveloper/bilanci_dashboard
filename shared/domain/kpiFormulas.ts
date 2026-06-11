/**
 * kpiFormulas — modulo PURO (nessuna dipendenza da React/Supabase/xlsx a runtime).
 *
 * Contiene le formule di dominio per KPI, varianze e margini, oltre alla
 * definizione gerarchica del Conto Economico (`macroMetricsLabels`) usata per
 * costruire la tabella sintetica della dashboard.
 */

/** Tipologia di riga nella gerarchia del Conto Economico. */
export type CEMetricType = 'normal' | 'total' | 'subtotal' | 'key-metric' | 'result';

/** Definizione di una macro-voce del Conto Economico. */
export interface MacroMetricDef {
    label: string;
    /** Chiavi canoniche candidate (la prima trovata nei dati viene usata). */
    keys: string[];
    type: CEMetricType;
}

/**
 * Definizione gerarchica/ordinata delle macro-voci del Conto Economico.
 * L'ordine riflette la sequenza di presentazione del CE riclassificato.
 */
export const macroMetricsLabels: MacroMetricDef[] = [
    { label: "TOTALE RICAVI", keys: ["totaleRicavi", "ricaviCaratteristici"], type: "total" },
    { label: "Costi Diretti", keys: ["costiDiretti", "serviziDiretti"], type: "normal" },
    { label: "Costi Indiretti", keys: ["costiIndiretti"], type: "normal" },
    { label: "TOTALE COSTI DIRETTI E INDIRETTI", keys: ["totaleCostiDirettiIndiretti"], type: "total" },
    { label: "GROSS PROFIT", keys: ["grossProfit"], type: "key-metric" },
    { label: "Altri Ricavi non Tipici", keys: ["ricaviNonTipici", "altriRicavi"], type: "normal" },
    { label: "Spese Commerciali", keys: ["speseCommerciali"], type: "normal" },
    { label: "Spese di Struttura", keys: ["speseStruttura"], type: "normal" },
    { label: "TOTALE GESTIONE STRUTTURA E NON TIPICA", keys: ["totaleGestioneStruttura"], type: "total" },
    { label: "EBITDA", keys: ["ebitda"], type: "key-metric" },
    { label: "Ammortamenti, Accantonamenti e Svalutazioni", keys: ["totaleAmmortamenti", "ammortamenti"], type: "normal" },
    { label: "Gestione Straordinaria", keys: ["gestioneStraordinaria"], type: "normal" },
    { label: "EBIT", keys: ["ebit"], type: "key-metric" },
    { label: "Gestione Finanziaria", keys: ["gestioneFinanziaria"], type: "normal" },
    { label: "EBT", keys: ["ebt"], type: "key-metric" },
    { label: "TOTALE COSTI", keys: ["totaleCosti"], type: "total" },
    { label: "RISULTATO DI ESERCIZIO", keys: ["risultatoEsercizio", "risultato"], type: "result" }
];

/**
 * Varianza percentuale tra valore corrente e precedente, normalizzata sul
 * valore assoluto del precedente. Restituisce 0 se mancano i dati o se il
 * precedente è 0 (per evitare divisioni per zero / infiniti).
 *
 * formula: ((current - previous) / |previous|) * 100
 */
export function calculateVariance(
    current: number | null | undefined,
    previous: number | null | undefined
): number {
    if (current === null || current === undefined || previous === null || previous === undefined) {
        return 0;
    }
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
}

/** Classifica una varianza in positiva/negativa/neutra (soglia ±5%). */
export function getVarianceType(variance: number): 'positive' | 'negative' | 'neutral' {
    if (variance > 5) return 'positive';
    if (variance < -5) return 'negative';
    return 'neutral';
}

/**
 * Margine EBITDA percentuale = (ebitda / ricavi) * 100.
 * Restituisce 0 se i ricavi sono 0 (evita divisione per zero).
 */
export function calculateEbitdaMargin(
    ebitda: number | null | undefined,
    ricavi: number | null | undefined
): number {
    const e = ebitda ?? 0;
    const r = ricavi ?? 0;
    return r !== 0 ? (e / r) * 100 : 0;
}

/**
 * Margine percentuale generico = (value / base) * 100.
 * Restituisce 0 se `base` è 0.
 */
export function calculateMargin(
    value: number | null | undefined,
    base: number | null | undefined
): number {
    const v = value ?? 0;
    const b = base ?? 0;
    return b !== 0 ? (v / b) * 100 : 0;
}
