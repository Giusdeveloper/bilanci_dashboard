import { describe, it, expect } from 'vitest';
import {
  buildEditorCEDiffRows,
  buildPreviewAmountMaps,
} from './editorPreviewShaping';
import type { CEDettaglioModel } from '@shared/queries';

describe('buildPreviewAmountMaps', () => {
  it('indicizza i facts per categoryCode al mese editor', () => {
    const maps = buildPreviewAmountMaps(
      [
        {
          categoryCode: 'totaleRicavi',
          year: 2025,
          month: 6,
          amountProgressive: 1000,
          amountPeriod: 200,
          sourceLabel: 'test',
        },
      ],
      2025,
      6,
    );
    expect(maps.progressiveByCode.get('totaleRicavi')).toBe(1000);
    expect(maps.periodByCode.get('totaleRicavi')).toBe(200);
  });
});

describe('buildEditorCEDiffRows', () => {
  const model: CEDettaglioModel = {
    year: 2025,
    reportType: 'ce_dettaglio',
    profile: null,
    rows: [
      {
        rowIndex: 1,
        label: 'Ricavi',
        indentLevel: 0,
        rowKind: 'totale',
        code: 'totaleRicavi',
        isMapped: true,
        amountProgressive: 900,
        monthlyProgressive: [100, 200, 300, 400, 500, 900, 0, 0, 0, 0, 0, 0],
        monthlyPeriod: null,
      },
    ],
  };

  it('calcola delta tra published e anteprima', () => {
    const previewMaps = buildPreviewAmountMaps(
      [
        {
          categoryCode: 'totaleRicavi',
          year: 2025,
          month: 6,
          amountProgressive: 950,
          amountPeriod: 250,
          sourceLabel: 'test',
        },
      ],
      2025,
      6,
    );
    const rows = buildEditorCEDiffRows(model, previewMaps, 6);
    expect(rows[0].published).toBe(900);
    expect(rows[0].preview).toBe(950);
    expect(rows[0].delta).toBe(50);
    expect(rows[0].hasDiff).toBe(true);
  });
});
