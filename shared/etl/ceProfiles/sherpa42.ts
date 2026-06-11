/**
 * ceProfiles/sherpa42 — layout CE Sherpa42 (PRIMO MARGINE, costi fissi/variabili).
 */

import type { MacroMetricDef } from '../../domain/kpiFormulas.ts';
import type { CeProfile } from './types.ts';

/** Macro-voci CE sintetico / dashboard per profilo Sherpa42. */
export const SHERPA42_MACRO_METRICS: MacroMetricDef[] = [
  { label: 'TOTALE RICAVI COMPLESSIVI', keys: ['totaleRicavi', 'ricaviCaratteristici'], type: 'total' },
  { label: 'TOTALE COSTI VARIABILI', keys: ['totaleCostiVariabili'], type: 'subtotal' },
  { label: 'PRIMO MARGINE', keys: ['grossProfit'], type: 'key-metric' },
  { label: 'TOTALE COSTO DEL LAVORO', keys: ['totaleCostoDelLavoro'], type: 'subtotal' },
  { label: 'TOTALE COSTI FISSI GESTIONE CARATTERISTICA', keys: ['totaleGestioneStruttura'], type: 'subtotal' },
  { label: 'TOTALE COSTI FISSI', keys: ['totaleCostiFissi'], type: 'total' },
  { label: 'EBITDA', keys: ['ebitda'], type: 'key-metric' },
  { label: 'AMMORTAMENTI, ACCANT. SVALUTAZIONI', keys: ['totaleAmmortamenti', 'ammortamenti'], type: 'normal' },
  { label: 'GESTIONE STRAORDINARIA', keys: ['gestioneStraordinaria'], type: 'normal' },
  { label: 'EBIT', keys: ['ebit'], type: 'key-metric' },
  { label: 'GESTIONE FINANZIARIA', keys: ['gestioneFinanziaria'], type: 'normal' },
  { label: 'EBT', keys: ['ebt'], type: 'key-metric' },
  { label: 'TOTALE COSTI', keys: ['totaleCosti'], type: 'total' },
  { label: "RISULTATO DELL'ESERCIZIO", keys: ['risultatoEsercizio', 'risultato'], type: 'result' },
];

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

export const SHERPA42_SUM_CHILDREN: Record<string, string[]> = {
  totaleRicavi: ['ricaviCaratteristici', 'altriRicavi'],
  totaleCostoDelLavoro: ['personale'],
  totaleGestioneStruttura: [
    'costiServizi', 'speseCommerciali', 'speseStruttura', 'serviziInformatici',
    'compensiAmministratore', 'altriServizi',
  ],
  totaleAmmortamenti: ['ammortamentiImmateriali', 'ammortamentiMateriali', 'svalutazioni'],
  gestioneStraordinaria: [],
  gestioneFinanziaria: ['speseCommissioniBancarie', 'interessiPassiviMutui', 'altriInteressi'],
};

const SHERPA42_FORMULA_KEYS = new Set([
  'grossProfit', 'totaleCostiFissi', 'ebitda', 'ebit', 'ebt', 'risultatoEsercizio', 'totaleCosti',
]);

export const SHERPA42_ROLLUP_ORDER: string[] = [
  'totaleRicavi',
  'totaleCostiVariabili',
  'grossProfit',
  'totaleCostoDelLavoro',
  'totaleGestioneStruttura',
  'totaleCostiFissi',
  'ebitda',
  'totaleAmmortamenti',
  'gestioneStraordinaria',
  'ebit',
  'gestioneFinanziaria',
  'ebt',
  'imposteDirette',
  'risultatoEsercizio',
  'totaleCosti',
];

export const SHERPA42_CE_LAYOUT = [
  { label: 'Ricavi caratteristici', code: 'ricaviCaratteristici', rowKind: 'voce', indentLevel: 1 },
  { label: 'Altri ricavi', code: 'altriRicavi', rowKind: 'voce', indentLevel: 1 },
  { label: 'TOTALE RICAVI COMPLESSIVI', code: 'totaleRicavi', rowKind: 'totale', indentLevel: 0 },
  { label: 'TOTALE COSTI VARIABILI', code: 'totaleCostiVariabili', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'PRIMO MARGINE', code: 'grossProfit', rowKind: 'margine', indentLevel: 0 },
  { label: 'Costi del personale', code: 'personale', rowKind: 'voce', indentLevel: 1 },
  { label: 'TOTALE COSTO DEL LAVORO', code: 'totaleCostoDelLavoro', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'Consulenze e servizi esterni', code: 'costiServizi', rowKind: 'voce', indentLevel: 1 },
  { label: 'Costo IT/Tool e Software', code: 'serviziInformatici', rowKind: 'voce', indentLevel: 1 },
  { label: 'Spese Commerciali e Marketing', code: 'speseCommerciali', rowKind: 'voce', indentLevel: 1 },
  { label: 'Spese di Struttura', code: 'speseStruttura', rowKind: 'voce', indentLevel: 1 },
  { label: 'TOTALE COSTI FISSI GESTIONE CARATTERISTICA', code: 'totaleGestioneStruttura', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'TOTALE COSTI FISSI', code: 'totaleCostiFissi', rowKind: 'totale', indentLevel: 0 },
  { label: 'EBITDA', code: 'ebitda', rowKind: 'margine', indentLevel: 0 },
  { label: 'Ammortamenti immateriali', code: 'ammortamentiImmateriali', rowKind: 'voce', indentLevel: 1 },
  { label: 'Ammortamenti materiali', code: 'ammortamentiMateriali', rowKind: 'voce', indentLevel: 1 },
  { label: 'Svalutazioni e accantonamenti', code: 'svalutazioni', rowKind: 'voce', indentLevel: 1 },
  { label: 'AMMORTAMENTI, ACCANT. SVALUTAZIONI', code: 'totaleAmmortamenti', rowKind: 'totale', indentLevel: 0 },
  { label: 'GESTIONE STRAORDINARIA', code: 'gestioneStraordinaria', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'EBIT', code: 'ebit', rowKind: 'margine', indentLevel: 0 },
  { label: 'Spese e commissioni bancarie', code: 'speseCommissioniBancarie', rowKind: 'voce', indentLevel: 1 },
  { label: 'Interessi passivi su mutui', code: 'interessiPassiviMutui', rowKind: 'voce', indentLevel: 1 },
  { label: 'Altri interessi', code: 'altriInteressi', rowKind: 'voce', indentLevel: 1 },
  { label: 'GESTIONE FINANZIARIA', code: 'gestioneFinanziaria', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'EBT', code: 'ebt', rowKind: 'margine', indentLevel: 0 },
  { label: 'Imposte dirette', code: 'imposteDirette', rowKind: 'voce', indentLevel: 1 },
  { label: "RISULTATO DELL'ESERCIZIO", code: 'risultatoEsercizio', rowKind: 'risultato', indentLevel: 0 },
] as const;

function applySherpa42Formula(key: string, v: Record<string, number>): number {
  switch (key) {
    case 'grossProfit':
      return round2(v.totaleRicavi - (v.totaleCostiVariabili ?? 0));
    case 'totaleCostiFissi':
      return round2((v.totaleCostoDelLavoro ?? 0) + (v.totaleGestioneStruttura ?? 0));
    case 'ebitda':
      return round2(v.grossProfit - (v.totaleCostiFissi ?? 0));
    case 'ebit':
      return round2(v.ebitda - v.totaleAmmortamenti - v.gestioneStraordinaria);
    case 'ebt':
      return round2(v.ebit - v.gestioneFinanziaria);
    case 'risultatoEsercizio':
      return round2(v.ebt - (v.imposteDirette ?? 0));
    case 'totaleCosti':
      return round2(v.totaleRicavi - v.ebitda);
    default:
      return 0;
  }
}

export const SHERPA42_PREFIX_RULES = [
  { pattern: /^58\//, famigliaCode: 'ricavi', analiticaHint: 'Ricavi da attività di consulenza' },
  { pattern: /^66\/(05|10|15)/, famigliaCode: 'costi_variabili', analiticaHint: 'Costi collaboratori a partita iva' },
  { pattern: /^66\/20/, famigliaCode: 'costi_fissi', analiticaHint: 'Costi del Personale per delivery' },
  { pattern: /^66\//, famigliaCode: 'costi_fissi', analiticaHint: 'Spese di Struttura' },
  { pattern: /^68\//, famigliaCode: 'ammortamenti', analiticaHint: 'Ammortamenti immateriali' },
  { pattern: /^84\//, famigliaCode: 'imposte', analiticaHint: 'Imposte dirette' },
  { pattern: /^88\//, famigliaCode: 'gestione_finanziaria', analiticaHint: 'Spese e commissioni bancarie' },
];

export const sherpa42CeProfile: CeProfile = {
  id: 'sherpa42',
  layout: [...SHERPA42_CE_LAYOUT],
  sumChildren: SHERPA42_SUM_CHILDREN,
  rollupOrder: SHERPA42_ROLLUP_ORDER,
  formulaKeys: SHERPA42_FORMULA_KEYS,
  applyFormula: applySherpa42Formula,
  prefixRules: SHERPA42_PREFIX_RULES,
  famigliaRollup: {
    famigliaToKey: {
      'Costi variabili': 'totaleCostiVariabili',
    },
  },
};
