/**
 * ceProfiles/awentia — layout CE dettaglio standard (template consulente).
 */

import type { CeProfile } from './types.ts';

function round2(n: number): number {
  return Number((Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2));
}

export const AWENTIA_SUM_CHILDREN: Record<string, string[]> = {
  totaleRicavi: ['ricaviCaratteristici', 'altriRicavi', 'merci'],
  costiDiretti: [
    'serviziDiretti', 'consulenzeDirette', 'serviziInformatici', 'serviziCloud', 'costiServizi',
  ],
  costiIndiretti: ['altriServizi'],
  ricaviNonTipici: ['autofatture', 'rimborsiSpese', 'altriProventi'],
  speseCommerciali: [
    'speseViaggio', 'pedaggi', 'pubblicita', 'materialePubblicitario', 'omaggi',
    'speseRappresentanza', 'mostreFiere', 'serviziCommerciali', 'carburante',
  ],
  speseStruttura: [
    'beniIndeducibili', 'speseGenerali', 'materialeConsumo', 'spesePulizia', 'utenze',
    'assicurazioni', 'rimanenze', 'tasseValori', 'sanzioniMulte', 'compensiAmministratore',
    'rimborsiAmministratore', 'personale', 'serviziAmministrativi', 'serviziAmministrativiPaghe',
    'consulenzeTecniche', 'consulenzeLegali', 'locazioniNoleggi', 'serviziIndeducibili',
    'utiliPerditeCambi', 'perditeSuCrediti', 'licenzeUso', 'utenzeTelefoniche', 'altriOneri',
    'abbuoniArrotondamenti',
  ],
  totaleAmmortamenti: ['ammortamentiImmateriali', 'ammortamentiMateriali', 'svalutazioni'],
  gestioneStraordinaria: [],
  gestioneFinanziaria: ['speseCommissioniBancarie', 'interessiPassiviMutui', 'altriInteressi'],
};

const AWENTIA_FORMULA_KEYS = new Set([
  'totaleCostiDirettiIndiretti', 'grossProfit', 'totaleGestioneStruttura', 'ebitda',
  'ebit', 'ebt', 'risultatoEsercizio', 'totaleCosti',
]);

export const AWENTIA_ROLLUP_ORDER: string[] = [
  'totaleRicavi',
  'costiDiretti',
  'costiIndiretti',
  'totaleCostiDirettiIndiretti',
  'grossProfit',
  'ricaviNonTipici',
  'speseCommerciali',
  'speseStruttura',
  'totaleGestioneStruttura',
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

/** Layout CE dettaglio standard Awentia / template generico. */
export const AWENTIA_CE_LAYOUT = [
  { label: 'Ricavi caratteristici', code: 'ricaviCaratteristici', rowKind: 'voce', indentLevel: 1 },
  { label: 'Altri ricavi', code: 'altriRicavi', rowKind: 'voce', indentLevel: 1 },
  { label: 'TOTALE RICAVI', code: 'totaleRicavi', rowKind: 'totale', indentLevel: 0 },
  { label: 'Servizi diretti', code: 'serviziDiretti', rowKind: 'voce', indentLevel: 1 },
  { label: 'Consulenze dirette', code: 'consulenzeDirette', rowKind: 'voce', indentLevel: 1 },
  { label: 'Servizi informatici web', code: 'serviziInformatici', rowKind: 'voce', indentLevel: 1 },
  { label: 'Servizi cloud', code: 'serviziCloud', rowKind: 'voce', indentLevel: 1 },
  { label: 'COSTI DIRETTI', code: 'costiDiretti', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'Altri servizi e prestazioni', code: 'altriServizi', rowKind: 'voce', indentLevel: 1 },
  { label: 'COSTI INDIRETTI', code: 'costiIndiretti', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'TOTALE COSTI DIRETTI E INDIRETTI', code: 'totaleCostiDirettiIndiretti', rowKind: 'totale', indentLevel: 0 },
  { label: 'GROSS PROFIT', code: 'grossProfit', rowKind: 'margine', indentLevel: 0 },
  { label: 'Autofatture', code: 'autofatture', rowKind: 'voce', indentLevel: 1 },
  { label: 'Rimborsi spese', code: 'rimborsiSpese', rowKind: 'voce', indentLevel: 1 },
  { label: 'Altri proventi', code: 'altriProventi', rowKind: 'voce', indentLevel: 1 },
  { label: 'ALTRI RICAVI NON TIPICI', code: 'ricaviNonTipici', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'Spese viaggio', code: 'speseViaggio', rowKind: 'voce', indentLevel: 1 },
  { label: 'Pedaggi autostradali', code: 'pedaggi', rowKind: 'voce', indentLevel: 1 },
  { label: 'Pubblicità', code: 'pubblicita', rowKind: 'voce', indentLevel: 1 },
  { label: 'Materiale pubblicitario', code: 'materialePubblicitario', rowKind: 'voce', indentLevel: 1 },
  { label: 'Omaggi', code: 'omaggi', rowKind: 'voce', indentLevel: 1 },
  { label: 'Spese di rappresentanza', code: 'speseRappresentanza', rowKind: 'voce', indentLevel: 1 },
  { label: 'Mostre e fiere', code: 'mostreFiere', rowKind: 'voce', indentLevel: 1 },
  { label: 'Servizi commerciali', code: 'serviziCommerciali', rowKind: 'voce', indentLevel: 1 },
  { label: 'Carburante', code: 'carburante', rowKind: 'voce', indentLevel: 1 },
  { label: 'SPESE COMMERCIALI', code: 'speseCommerciali', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'Beni indeducibili', code: 'beniIndeducibili', rowKind: 'voce', indentLevel: 1 },
  { label: 'Spese generali', code: 'speseGenerali', rowKind: 'voce', indentLevel: 1 },
  { label: 'Materiale vario e di consumo', code: 'materialeConsumo', rowKind: 'voce', indentLevel: 1 },
  { label: 'Spese di pulizia', code: 'spesePulizia', rowKind: 'voce', indentLevel: 1 },
  { label: 'Utenze', code: 'utenze', rowKind: 'voce', indentLevel: 1 },
  { label: 'Assicurazioni', code: 'assicurazioni', rowKind: 'voce', indentLevel: 1 },
  { label: 'Rimanenze', code: 'rimanenze', rowKind: 'voce', indentLevel: 1 },
  { label: 'Tasse e valori bollati', code: 'tasseValori', rowKind: 'voce', indentLevel: 1 },
  { label: 'Sanzioni e multe', code: 'sanzioniMulte', rowKind: 'voce', indentLevel: 1 },
  { label: 'Compensi amministratore', code: 'compensiAmministratore', rowKind: 'voce', indentLevel: 1 },
  { label: 'Rimborsi amministratore', code: 'rimborsiAmministratore', rowKind: 'voce', indentLevel: 1 },
  { label: 'Personale', code: 'personale', rowKind: 'voce', indentLevel: 1 },
  { label: 'Servizi amministrativi contabilità', code: 'serviziAmministrativi', rowKind: 'voce', indentLevel: 1 },
  { label: 'Servizi amministrativi paghe', code: 'serviziAmministrativiPaghe', rowKind: 'voce', indentLevel: 1 },
  { label: 'Consulenze tecniche', code: 'consulenzeTecniche', rowKind: 'voce', indentLevel: 1 },
  { label: 'Consulenze legali', code: 'consulenzeLegali', rowKind: 'voce', indentLevel: 1 },
  { label: 'Locazioni e noleggi', code: 'locazioniNoleggi', rowKind: 'voce', indentLevel: 1 },
  { label: 'Servizi indeducibili', code: 'serviziIndeducibili', rowKind: 'voce', indentLevel: 1 },
  { label: 'Utili e perdite su cambi', code: 'utiliPerditeCambi', rowKind: 'voce', indentLevel: 1 },
  { label: 'Perdite su crediti', code: 'perditeSuCrediti', rowKind: 'voce', indentLevel: 1 },
  { label: "Licenze d'uso", code: 'licenzeUso', rowKind: 'voce', indentLevel: 1 },
  { label: 'Utenze telefoniche e cellulari', code: 'utenzeTelefoniche', rowKind: 'voce', indentLevel: 1 },
  { label: 'Altri oneri', code: 'altriOneri', rowKind: 'voce', indentLevel: 1 },
  { label: 'Abbuoni e arrotondamenti', code: 'abbuoniArrotondamenti', rowKind: 'voce', indentLevel: 1 },
  { label: 'SPESE DI STRUTTURA', code: 'speseStruttura', rowKind: 'subtotale', indentLevel: 0 },
  { label: 'TOTALE GESTIONE STRUTTURA E NON TIPICA', code: 'totaleGestioneStruttura', rowKind: 'totale', indentLevel: 0 },
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

function applyAwentiaFormula(key: string, v: Record<string, number>): number {
  switch (key) {
    case 'totaleCostiDirettiIndiretti':
      return round2(v.costiDiretti + v.costiIndiretti);
    case 'grossProfit':
      return round2(v.totaleRicavi - v.totaleCostiDirettiIndiretti);
    case 'totaleGestioneStruttura':
      return round2(v.speseCommerciali + v.speseStruttura);
    case 'ebitda':
      return round2(v.grossProfit + v.ricaviNonTipici - v.totaleGestioneStruttura);
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

export const AWENTIA_PREFIX_RULES = [
  { pattern: /^58\//, famigliaCode: 'ricavi', analiticaHint: 'Ricavi caratteristici' },
  { pattern: /^66\/(05|10)/, famigliaCode: 'diretti', analiticaHint: 'Servizi diretti' },
  { pattern: /^66\/(15|20)/, famigliaCode: 'indiretti', analiticaHint: 'Altri servizi e prestazioni' },
  { pattern: /^66\/(25|30|35)/, famigliaCode: 'commerciali', analiticaHint: 'Spese viaggio' },
  { pattern: /^66\//, famigliaCode: 'struttura', analiticaHint: 'Spese generali' },
  { pattern: /^68\//, famigliaCode: 'ammortamenti', analiticaHint: 'Ammortamenti immateriali' },
  { pattern: /^84\//, famigliaCode: 'imposte', analiticaHint: 'Imposte dirette' },
  { pattern: /^88\//, famigliaCode: 'gestione_finanziaria', analiticaHint: 'Spese e commissioni bancarie' },
];

export const awentiaCeProfile: CeProfile = {
  id: 'awentia',
  layout: [...AWENTIA_CE_LAYOUT],
  sumChildren: AWENTIA_SUM_CHILDREN,
  rollupOrder: AWENTIA_ROLLUP_ORDER,
  formulaKeys: AWENTIA_FORMULA_KEYS,
  applyFormula: applyAwentiaFormula,
  prefixRules: AWENTIA_PREFIX_RULES,
};

/** @deprecated Usare awentiaCeProfile.layout — retrocompat test/import. */
export const CE_DETTAGLIO_LAYOUT = AWENTIA_CE_LAYOUT;

/** @deprecated Usare awentiaCeProfile.sumChildren. */
export const SUM_CHILDREN = AWENTIA_SUM_CHILDREN;
