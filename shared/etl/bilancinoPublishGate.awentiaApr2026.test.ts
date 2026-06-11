/**
 * Gate quadratura Awentia aprile 2026 — storni costo 68/88 in colonna ricavi layout.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import {
  readWorkbookData,
  detectProfile,
  extractBilancino,
  runBilancinoPipeline,
  buildResolver,
  buildMasterChart,
  mappingsForCompany,
  type BilancinoExtractResult,
  type BilancinoPipelineResult,
} from './index.ts';
import { extractSourceMapping } from './seed/extractSourceMapping.ts';
import { findSheetName, getSheet } from './workbook.ts';
import { hasImportFixtures } from '../test/importFixtures.ts';

const BILANCINO_FILE =
  'import_data/Bilancini/Awentia/Bilancini 2026/AWENTIA SRL 30 04 provvisorio.xlsx';
const ANALISI_FILE =
  'import_data/2026/[2026] Analisi Bilanci al 30 aprile  Awentia.xlsx';
const STORNO_ACCOUNTS = ['68/05/125', '68/05/491', '68/05/325', '88/20/552'] as const;

function loadLedgerFromAnalisiSource() {
  const bytes = new Uint8Array(readFileSync(ANALISI_FILE));
  const wb = readWorkbookData(XLSX as never, bytes);
  const sheetName = findSheetName(wb, /^source$/i);
  if (!sheetName) return [];
  const sourceRows = extractSourceMapping(getSheet(wb, sheetName));
  return sourceRows.map((row) => {
    const isRicavi = row.famiglia?.toLowerCase().includes('ricav');
    return {
      accountCode: row.accountCode,
      analiticaLabel: row.analiticaLabel,
      signMultiplier: isRicavi ? -1 : 1,
    };
  });
}

if (hasImportFixtures()) {
  describe('Awentia apr 2026 — gate quadratura CFO', () => {
    let extracted: BilancinoExtractResult;
    let pipeline: BilancinoPipelineResult;

    beforeAll(() => {
      const wb = readWorkbookData(
        XLSX as never,
        new Uint8Array(readFileSync(BILANCINO_FILE)),
      );
      extracted = extractBilancino(
        wb,
        detectProfile(wb).profile,
        'AWENTIA SRL 30 04 provvisorio.xlsx',
      );
      const validCodes = new Set(buildMasterChart().map((a) => a.code));
      const labelResolver = buildResolver(mappingsForCompany('awentia'), validCodes);
      pipeline = runBilancinoPipeline({
        workbook: wb,
        ledgerMappings: loadLedgerFromAnalisiSource(),
        labelResolver,
        extract: extracted,
        companySlug: 'awentia',
      });
    });

    it('classifica i 4 storni come costi con importo negativo', () => {
      for (const code of STORNO_ACCOUNTS) {
        const acc = extracted.accounts.find((a) => a.accountCode === code);
        expect(acc, code).toBeDefined();
        expect(acc!.side).toBe('costi');
        expect(acc!.balanceNormalized).toBeLessThan(0);
      }
    });

    it('totali estratti per natura economica, non footer layout ricavi', () => {
      expect(extracted.totals.totaleRicavi).toBeCloseTo(12500, 2);
      expect(extracted.totals.footer?.totaleRicavi).toBeCloseTo(21178.05, 2);
      expect(extracted.totals.risultato).toBeCloseTo(-98874.79, 2);
    });

    it('rollup mantiene storni in categorie costo', () => {
      expect(pipeline.kpis.assicurazioni).toBeCloseTo(-3796.8, 2);
      expect(pipeline.kpis.serviziIndeducibili).toBeCloseTo(-1606, 2);
      // 68/05/320 (+137.60) + storno 68/05/325 (−90.48)
      expect(pipeline.kpis.utenzeTelefoniche).toBeCloseTo(47.12, 2);
      // 88/20/551 (+5.65) + storno 88/20/552 (−3184.77)
      expect(pipeline.kpis.speseCommissioniBancarie).toBeCloseTo(-3179.12, 2);
      expect(pipeline.kpis.altriRicavi ?? 0).toBe(0);
    });

    it('gate publish passa senza remap a ricavi', () => {
      expect(pipeline.publishGate?.blocked).toBe(false);
      expect(pipeline.publishGate?.quadratureChecks.every((c) => c.ok)).toBe(true);
    });
  });
}
