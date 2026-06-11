/**
 * Test profili CE per company (layout, formule, prefix rules).
 */

import { describe, it, expect } from 'vitest';
import {
  getCeProfile,
  getMacroMetricsForProfile,
  rollupLeafSums,
  suggestFamigliaFromAccountCode,
} from '../index.ts';
import { awentiaCeProfile } from './awentia.ts';
import { sherpa42CeProfile } from './sherpa42.ts';

describe('getCeProfile', () => {
  it('risolve awentia e sherpa42 per slug', () => {
    expect(getCeProfile('awentia').id).toBe('awentia');
    expect(getCeProfile('sherpa42').id).toBe('sherpa42');
    expect(getCeProfile('maia-management').id).toBe('awentia');
  });

  it('fallback awentia per slug sconosciuto', () => {
    expect(getCeProfile('unknown-co').id).toBe('awentia');
  });
});

describe('rollupLeafSums — awentia', () => {
  it('calcola EBITDA e risultato da leaf noti (Dec 2025)', () => {
    const rolled = rollupLeafSums({
      ricaviCaratteristici: 318148.36,
      altriRicavi: 13693.72,
      serviziDiretti: 37068.18,
      serviziInformatici: 1388.57,
      altriServizi: 1750,
      speseViaggio: 3735.27,
      speseRappresentanza: 7426.66,
      mostreFiere: 10814.96,
      serviziCommerciali: 608.44,
      carburante: 1651.49,
      beniIndeducibili: 8413.8,
      speseGenerali: 26606.17,
      utenze: 1182.53,
      assicurazioni: 291.69,
      tasseValori: 620.16,
      sanzioniMulte: 507.17,
      personale: 207496.26,
      serviziAmministrativi: 18776.43,
      consulenzeTecniche: 35513.73,
      consulenzeLegali: 4784,
      locazioniNoleggi: 10984.24,
      serviziIndeducibili: 6245.43,
      utiliPerditeCambi: 516.64,
      licenzeUso: 204,
      utenzeTelefoniche: 327.74,
      altriOneri: 7328.96,
      abbuoniArrotondamenti: 12.42,
      ammortamentiImmateriali: 51870.55,
      ammortamentiMateriali: 858.09,
      speseCommissioniBancarie: 1039.64,
      interessiPassiviMutui: 3700.98,
      altriInteressi: 364.51,
    }, 'awentia');

    expect(rolled.totaleRicavi).toBeCloseTo(331842.08, 2);
    expect(rolled.ebitda).toBeCloseTo(-62412.86, 2);
    expect(rolled.risultatoEsercizio).toBeCloseTo(-120246.63, 2);
  });
});

describe('rollupLeafSums — sherpa42', () => {
  it('calcola PRIMO MARGINE e EBITDA con costi variabili/fissi', () => {
    const rolled = rollupLeafSums({
      ricaviCaratteristici: 491300,
      totaleCostiVariabili: 61185,
      personale: 12273,
      costiServizi: 9188,
      speseCommerciali: 225,
      speseStruttura: 123,
      serviziInformatici: 919,
      ammortamentiImmateriali: 274,
      ammortamentiMateriali: 276,
      speseCommissioniBancarie: 185,
      altriInteressi: 994,
    }, 'sherpa42');

    expect(rolled.grossProfit).toBeCloseTo(430115, 0);
    expect(rolled.totaleCostoDelLavoro).toBeCloseTo(12273, 0);
    expect(rolled.totaleGestioneStruttura).toBeCloseTo(10455, 0);
    expect(rolled.totaleCostiFissi).toBeCloseTo(22728, 0);
    expect(rolled.ebitda).toBeCloseTo(407387, 0);
  });

  it('layout sherpa espone PRIMO MARGINE', () => {
    const primo = sherpa42CeProfile.layout.find((r) => r.code === 'grossProfit');
    expect(primo?.label).toBe('PRIMO MARGINE');
  });

  it('layout awentia espone GROSS PROFIT', () => {
    const gp = awentiaCeProfile.layout.find((r) => r.code === 'grossProfit');
    expect(gp?.label).toBe('GROSS PROFIT');
  });
});

describe('getMacroMetricsForProfile', () => {
  it('espone PRIMO MARGINE per sherpa42 e GROSS PROFIT per awentia', () => {
    const sherpaGp = getMacroMetricsForProfile('sherpa42').find((m) => m.keys.includes('grossProfit'));
    const awentiaGp = getMacroMetricsForProfile('awentia').find((m) => m.keys.includes('grossProfit'));
    expect(sherpaGp?.label).toBe('PRIMO MARGINE');
    expect(awentiaGp?.label).toBe('GROSS PROFIT');
  });
});

describe('suggestFamigliaFromAccountCode', () => {
  it('suggerisce Ricavi per conto 58/', () => {
    const labels = new Map([['ricavi', 'Ricavi']]);
    const s = suggestFamigliaFromAccountCode('58/05/010', awentiaCeProfile, labels);
    expect(s.famiglia).toBe('Ricavi');
    expect(s.analiticaHint).toBe('Ricavi caratteristici');
  });

  it('suggerisce Costi variabili per sherpa', () => {
    const labels = new Map([['costi_variabili', 'Costi variabili']]);
    const s = suggestFamigliaFromAccountCode('66/05/010', sherpa42CeProfile, labels);
    expect(s.famiglia).toBe('Costi variabili');
  });
});
