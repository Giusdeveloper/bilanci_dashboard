/**
 * Golden test del motore ETL.
 *
 * Verifica, sui file Excel REALI 2025 di Awentia e Sherpa42:
 *  - la detection del template profile;
 *  - i KPI principali (ricavi / EBITDA / risultato) contro valori attesi;
 *  - l'assenza di errori bloccanti;
 *  - l'idempotenza/determinismo della pipeline (stesso file due volte ->
 *    stesso numero di fatti e stessi valori).
 *
 * Il test riusa i mapping seminati (mappingsForCompany) e il dizionario di
 * dominio come fallback: nessun accesso al database.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  buildResolver,
  runPipeline,
  buildMasterChart,
  mappingsForCompany,
} from './index.ts';
import { GOLDEN_CASES } from './__fixtures__/goldenKpis.ts';
import { hasImportFixtures } from '../test/importFixtures.ts';

const validCodes = new Set(buildMasterChart().map((a) => a.code));

function loadWorkbook(file: string) {
  const bytes = new Uint8Array(fs.readFileSync(file));
  return readWorkbookData(XLSX as never, bytes);
}

describe.skipIf(!hasImportFixtures())('ETL pipeline — golden test (file reali 2025)', () => {
  for (const gc of GOLDEN_CASES) {
    describe(`${gc.companySlug} ${gc.year}`, () => {
      const wb = loadWorkbook(gc.file);
      const detection = detectProfile(wb);
      const resolver = buildResolver(mappingsForCompany(gc.companySlug), validCodes);
      const result = runPipeline({
        workbook: wb,
        profile: detection.profile,
        resolver,
        detectionFallback: detection.usedFallback,
      });

      it(`riconosce il profilo "${gc.expectedProfile}"`, () => {
        expect(detection.profile.id).toBe(gc.expectedProfile);
        expect(detection.usedFallback).toBe(false);
      });

      it(`estrae l'anno corrente ${gc.year}`, () => {
        expect(result.currentYear).toBe(gc.year);
      });

      it('non produce errori bloccanti', () => {
        const errors = result.warnings.filter((w) => w.severity === 'error');
        expect(errors).toEqual([]);
      });

      it('estrae i KPI attesi (ricavi / EBITDA / risultato)', () => {
        expect(result.kpis.totaleRicavi).toBeCloseTo(gc.kpis.totaleRicavi, 2);
        expect(result.kpis.ebitda).toBeCloseTo(gc.kpis.ebitda, 2);
        expect(result.kpis.risultatoEsercizio).toBeCloseTo(gc.kpis.risultatoEsercizio, 2);
      });

      it('e\' deterministica/idempotente (stesso file 2x -> stesso numero di fatti)', () => {
        const again = runPipeline({
          workbook: loadWorkbook(gc.file),
          profile: detection.profile,
          resolver,
          detectionFallback: detection.usedFallback,
        });
        expect(again.facts.length).toBe(result.facts.length);
        expect(again.kpis).toEqual(result.kpis);
      });
    });
  }
});
