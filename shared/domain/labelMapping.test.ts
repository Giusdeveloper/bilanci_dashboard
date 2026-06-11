import { describe, it, expect } from 'vitest';
import { getCanonicalKey, EXCEL_ROW_MAP } from './labelMapping';

describe('getCanonicalKey - match esatto su label reali', () => {
  const cases: Array<[string, string]> = [
    ['Ricavi caratteristici', 'ricaviCaratteristici'],
    ['Altri ricavi', 'altriRicavi'],
    ['TOTALE RICAVI', 'totaleRicavi'],
    ['Servizi diretti', 'serviziDiretti'],
    ['COSTI DIRETTI', 'costiDiretti'],
    ['GROSS PROFIT', 'grossProfit'],
    ['EBITDA', 'ebitda'],
    ['EBIT', 'ebit'],
    ['EBT', 'ebt'],
    ['Personale', 'personale'],
    ["RISULTATO DELL'ESERCIZIO", 'risultatoEsercizio'],
    ['Imposte dirette', 'imposteDirette'],
  ];

  it.each(cases)('mappa "%s" -> "%s"', (label, expected) => {
    expect(getCanonicalKey(label)).toBe(expected);
  });
});

describe('getCanonicalKey - normalizzazione maiuscole', () => {
  it('riconosce label in case diverso ("Gross Profit")', () => {
    expect(getCanonicalKey('Gross Profit')).toBe('grossProfit');
  });

  it('riconosce "Totale Ricavi" non in stampatello', () => {
    expect(getCanonicalKey('Totale Ricavi')).toBe('totaleRicavi');
  });
});

describe('getCanonicalKey - euristiche fuzzy', () => {
  it('riconosce varianti azienda-specifiche (Sherpa42)', () => {
    expect(getCanonicalKey('Costi Board 2024')).toBe('compensiAmministratore');
    expect(getCanonicalKey('Costo IT/Tool e Software')).toBe('serviziInformatici');
  });

  it('riconosce la voce composta degli ammortamenti', () => {
    expect(getCanonicalKey('AMMORTAMENTI, ACCANT. SVALUTAZIONI')).toBe('totaleAmmortamenti');
  });

  it('riconosce risultato/utile in forma generica', () => {
    expect(getCanonicalKey('UTILE (PERDITA) DELL\'ESERCIZIO')).toBe('risultatoEsercizio');
  });
});

describe('getCanonicalKey - casi limite', () => {
  it('ritorna null per label sconosciute', () => {
    expect(getCanonicalKey('Voce inesistente xyz')).toBeNull();
  });

  it('ritorna null per input vuoti', () => {
    expect(getCanonicalKey('')).toBeNull();
    expect(getCanonicalKey(null)).toBeNull();
    expect(getCanonicalKey(undefined)).toBeNull();
  });
});

describe('EXCEL_ROW_MAP', () => {
  it('contiene i mapping fondamentali', () => {
    expect(EXCEL_ROW_MAP['TOTALE RICAVI']).toBe('totaleRicavi');
    expect(EXCEL_ROW_MAP['EBITDA']).toBe('ebitda');
  });
});
