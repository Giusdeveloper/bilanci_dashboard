import { describe, it, expect } from 'vitest';
import {
  cleanNumber,
  calculatePuntualFromProgressive,
  calculateProgressiveFromPuntual,
  sumFirstN,
  sumYTD,
  sumQuarter,
  sumSemester,
  sumPeriod,
} from './periodMath';

describe('cleanNumber', () => {
  it('passa attraverso i numeri validi', () => {
    expect(cleanNumber(1234.56)).toBe(1234.56);
    expect(cleanNumber(0)).toBe(0);
    expect(cleanNumber(-42)).toBe(-42);
  });

  it('NaN numerico diventa 0', () => {
    expect(cleanNumber(NaN)).toBe(0);
  });

  it('parsa il formato italiano (punto = migliaia, virgola = decimale)', () => {
    expect(cleanNumber('1.234,56')).toBe(1234.56);
    expect(cleanNumber('1.000')).toBe(1000);
    expect(cleanNumber('12,5')).toBe(12.5);
    expect(cleanNumber('1.234.567,89')).toBe(1234567.89);
  });

  it('gestisce valuta e spazi', () => {
    expect(cleanNumber('€ 1.234,56')).toBe(1234.56);
    expect(cleanNumber(' 2.000,00 ')).toBe(2000);
  });

  it('gestisce i negativi', () => {
    expect(cleanNumber('-1.234,56')).toBe(-1234.56);
  });

  it('input sporchi / errori Excel diventano 0', () => {
    expect(cleanNumber('#REF!')).toBe(0);
    expect(cleanNumber('#VALUE!')).toBe(0);
    expect(cleanNumber('#DIV/0!')).toBe(0);
    expect(cleanNumber('#ERROR!')).toBe(0);
    expect(cleanNumber('-')).toBe(0);
    expect(cleanNumber('')).toBe(0);
    expect(cleanNumber('   ')).toBe(0);
    expect(cleanNumber('N/A')).toBe(0);
  });

  it('null/undefined/oggetti diventano 0', () => {
    expect(cleanNumber(null)).toBe(0);
    expect(cleanNumber(undefined)).toBe(0);
    expect(cleanNumber({})).toBe(0);
    expect(cleanNumber([])).toBe(0);
  });
});

describe('conversione progressivo <-> puntuale', () => {
  it('calcola il puntuale dal progressivo', () => {
    const prog = { months: ['Gen', 'Feb', 'Mar', 'Apr'], ricavi: [100, 250, 400, 600] };
    const punt = calculatePuntualFromProgressive(prog)!;
    expect(punt.ricavi).toEqual([100, 150, 150, 200]);
    expect(punt.months).toEqual(['Gen', 'Feb', 'Mar', 'Apr']);
  });

  it('ricostruisce il progressivo dal puntuale', () => {
    const punt = { months: ['Gen', 'Feb', 'Mar', 'Apr'], ricavi: [100, 150, 150, 200] };
    const prog = calculateProgressiveFromPuntual(punt)!;
    expect(prog.ricavi).toEqual([100, 250, 400, 600]);
  });

  it('round-trip progressivo -> puntuale -> progressivo è identità', () => {
    const prog = {
      months: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
      ricavi: [56600, 82100, 117340, 142840, 161441, 186441],
      ebitda: [45971, 21850, -17092, -15105, -19148, -22632],
    };
    const back = calculateProgressiveFromPuntual(calculatePuntualFromProgressive(prog))!;
    expect(back.ricavi).toEqual(prog.ricavi);
    expect(back.ebitda).toEqual(prog.ebitda);
  });

  it('round-trip puntuale -> progressivo -> puntuale è identità', () => {
    const punt = {
      months: ['Gen', 'Feb', 'Mar'],
      v: [10.25, -3.5, 7.1],
    };
    const back = calculatePuntualFromProgressive(calculateProgressiveFromPuntual(punt))!;
    expect(back.v).toEqual([10.25, -3.5, 7.1]);
  });

  it('ritorna null per input null', () => {
    expect(calculatePuntualFromProgressive(null)).toBeNull();
    expect(calculateProgressiveFromPuntual(null)).toBeNull();
  });
});

describe('somme di periodo', () => {
  const punt = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

  it('sumFirstN somma i primi N', () => {
    expect(sumFirstN(punt, 3)).toBe(60);
    expect(sumFirstN(punt, 0)).toBe(0);
    expect(sumFirstN([], 5)).toBe(0);
    expect(sumFirstN(null, 5)).toBe(0);
  });

  it('sumYTD somma fino al mese', () => {
    expect(sumYTD(punt, 1)).toBe(10);
    expect(sumYTD(punt, 6)).toBe(210);
    expect(sumYTD(punt, 12)).toBe(780);
  });

  it('sumQuarter somma i 3 mesi del trimestre', () => {
    expect(sumQuarter(punt, 1)).toBe(60); // 10+20+30
    expect(sumQuarter(punt, 2)).toBe(150); // 40+50+60
    expect(sumQuarter(punt, 4)).toBe(330); // 100+110+120
  });

  it('sumSemester somma i 6 mesi del semestre', () => {
    expect(sumSemester(punt, 1)).toBe(210);
    expect(sumSemester(punt, 2)).toBe(570);
  });

  it('sumPeriod replica la logica della dashboard', () => {
    expect(sumPeriod(punt, 'M', 3)).toBe(30);
    expect(sumPeriod(punt, 'Q1', 12)).toBe(60);
    expect(sumPeriod(punt, '3M', 12)).toBe(60);
    expect(sumPeriod(punt, 'Q2', 12)).toBe(150);
    expect(sumPeriod(punt, 'Q3', 12)).toBe(240);
    expect(sumPeriod(punt, 'Q4', 12)).toBe(330);
    expect(sumPeriod(punt, 'H1', 12)).toBe(210);
    expect(sumPeriod(punt, '6M', 12)).toBe(210);
    expect(sumPeriod(punt, 'H2', 12)).toBe(570);
    expect(sumPeriod(punt, '9M', 12)).toBe(450);
    expect(sumPeriod(punt, '12M', 12)).toBe(780);
    expect(sumPeriod(punt, 'YTD', 4)).toBe(100);
    expect(sumPeriod(null, 'YTD', 4)).toBe(0);
  });

  it('i null nelle serie contano come 0', () => {
    expect(sumFirstN([10, null, 30, undefined], 4)).toBe(40);
  });
});
