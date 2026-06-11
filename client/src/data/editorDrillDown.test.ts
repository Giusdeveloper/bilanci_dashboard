import { describe, it, expect } from 'vitest';
import { buildCategoryAccountIndex, primaryAccountForCategory } from './editorDrillDown';

describe('editorDrillDown', () => {
  it('indicizza i conti per categoryCode master', () => {
    const index = buildCategoryAccountIndex(
      [
        {
          accountCode: '66/05/724',
          accountDescription: 'Consulenze',
          famiglia: 'Servizi',
          analiticaLabel: 'Consulenze tecniche',
          masterAccountId: 'ma-1',
          signMultiplier: 1,
          sourceSheet: 'Editor',
        },
      ],
      [{ id: 'ma-1', code: 'costiServizi', label: 'Consulenze', type: 'costo' }],
    );
    expect(index.get('costiServizi')).toEqual(['66/05/724']);
    expect(primaryAccountForCategory('costiServizi', index)).toBe('66/05/724');
  });
});
