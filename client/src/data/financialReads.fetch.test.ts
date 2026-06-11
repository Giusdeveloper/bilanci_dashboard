import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rangeMock } = vi.hoisted(() => ({
  rangeMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    range: rangeMock,
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);

  return {
    supabase: {
      from: vi.fn(() => chain),
    },
  };
});

import {
  FACT_ROWS_PAGE_SIZE,
  fetchFactRows,
  mapRawFactRows,
  resolveComparisonYears,
} from './financialReads';

describe('mapRawFactRows', () => {
  it('maps embedded account fields', () => {
    const rows = mapRawFactRows([
      {
        year: 2024,
        month: 12,
        amount_progressive: '125032.34',
        amount_period: '1000',
        master_chart_of_accounts: {
          code: 'totaleRicavi',
          label: 'TOTALE RICAVI',
          type: 'total',
        },
      },
    ]);

    expect(rows).toEqual([
      {
        code: 'totaleRicavi',
        label: 'TOTALE RICAVI',
        type: 'total',
        year: 2024,
        month: 12,
        amountProgressive: 125032.34,
        amountPeriod: 1000,
      },
    ]);
  });

  it('skips rows without account', () => {
    expect(mapRawFactRows([{ year: 2024, month: 1 }])).toEqual([]);
  });
});

describe('fetchFactRows pagination', () => {
  beforeEach(() => {
    rangeMock.mockReset();
  });

  it('requests additional pages until a short page is returned', async () => {
    const fullPage = Array.from({ length: FACT_ROWS_PAGE_SIZE }, (_, i) => ({
      year: 2025,
      month: (i % 12) + 1,
      amount_progressive: i,
      amount_period: i,
      master_chart_of_accounts: {
        code: 'totaleRicavi',
        label: 'TOTALE RICAVI',
        type: 'total',
      },
    }));

    rangeMock
      .mockResolvedValueOnce({ data: fullPage, error: null })
      .mockResolvedValueOnce({
        data: [
          {
            year: 2024,
            month: 12,
            amount_progressive: 125032.34,
            amount_period: null,
            master_chart_of_accounts: {
              code: 'totaleRicavi',
              label: 'TOTALE RICAVI',
              type: 'total',
            },
          },
        ],
        error: null,
      });

    const rows = await fetchFactRows('company-1', [2026, 2025, 2024]);

    expect(rangeMock).toHaveBeenCalledTimes(2);
    expect(rangeMock.mock.calls[0]).toEqual([0, FACT_ROWS_PAGE_SIZE - 1]);
    expect(rangeMock.mock.calls[1]).toEqual([
      FACT_ROWS_PAGE_SIZE,
      FACT_ROWS_PAGE_SIZE * 2 - 1,
    ]);
    expect(rows).toHaveLength(FACT_ROWS_PAGE_SIZE + 1);
    expect(rows.at(-1)).toMatchObject({ year: 2024, month: 12, code: 'totaleRicavi' });
  });
});

describe('resolveComparisonYears', () => {
  it('includes three consecutive years for triennial dashboard', () => {
    expect(resolveComparisonYears(2026, 2)).toEqual([2026, 2025, 2024]);
  });
});
