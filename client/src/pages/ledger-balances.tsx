import { useEffect, useMemo, useState } from 'react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { formatCurrency } from '@/data/financialData';
import {
  fetchLedgerBalances,
  fetchLedgerMonths,
  fetchLedgerYears,
  type LedgerBalanceRow,
} from '@/data/ledgerReads';

const MONTH_LABELS = [
  '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

export default function LedgerBalances() {
  const { selectedCompany } = useFinancialData();
  const [years, setYears] = useState<number[]>([]);
  const [months, setMonths] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [rows, setRows] = useState<LedgerBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!selectedCompany) return;
    fetchLedgerYears(selectedCompany.id).then((y) => {
      setYears(y);
      setYear(y[0] ?? null);
    });
  }, [selectedCompany]);

  useEffect(() => {
    if (!selectedCompany || year == null) return;
    fetchLedgerMonths(selectedCompany.id, year).then((m) => {
      setMonths(m);
      setMonth(m[m.length - 1] ?? null);
    });
  }, [selectedCompany, year]);

  useEffect(() => {
    if (!selectedCompany || year == null || month == null) {
      setRows([]);
      return;
    }
    setLoading(true);
    fetchLedgerBalances(selectedCompany.id, year, month)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [selectedCompany, year, month]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.accountCode.toLowerCase().includes(q)
        || (r.accountDescription?.toLowerCase().includes(q) ?? false)
        || (r.analiticaLabel?.toLowerCase().includes(q) ?? false),
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    let ricavi = 0;
    let costi = 0;
    for (const r of filtered) {
      if (r.accountSide === 'ricavi') ricavi += r.balanceNormalized;
      else costi += r.balanceNormalized;
    }
    return { ricavi, costi, risultato: ricavi - costi };
  }, [filtered]);

  if (!selectedCompany) {
    return (
      <div className="p-6">
        <PageHeader title="Saldi contabili" subtitle="Seleziona un'azienda" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-500 font-sans">
      <PageHeader
        title="Saldi contabili"
        subtitle={`Drill-down bilancino — ${selectedCompany.name}`}
      />

      <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-imm-blue-dark text-lg">Filtri</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1 min-w-[120px]">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Anno</Label>
            <Select value={year?.toString() ?? ''} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[140px]">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Mese</Label>
            <Select value={month?.toString() ?? ''} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={String(m)}>{MONTH_LABELS[m] ?? m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Cerca conto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-imm-blue-dark/40" />
              <Input
                className="pl-9"
                placeholder="Codice, descrizione o analitica..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow bg-white/70">
          <CardContent className="pt-6">
            <div className="text-xs text-imm-blue-dark/60 uppercase font-bold">Ricavi</div>
            <div className="text-xl font-bold text-imm-blue-dark">{formatCurrency(totals.ricavi)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow bg-white/70">
          <CardContent className="pt-6">
            <div className="text-xs text-imm-blue-dark/60 uppercase font-bold">Costi</div>
            <div className="text-xl font-bold text-imm-blue-dark">{formatCurrency(totals.costi)}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow bg-white/70">
          <CardContent className="pt-6">
            <div className="text-xs text-imm-blue-dark/60 uppercase font-bold">Risultato</div>
            <div className="text-xl font-bold text-imm-blue-dark">{formatCurrency(totals.risultato)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-imm-blue-dark/60">Caricamento...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-imm-blue-dark/60">
              Nessun saldo bilancino per il periodo selezionato.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-imm-neutral-base text-imm-blue-dark/60 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Conto</th>
                    <th className="px-4 py-3 font-medium">Descrizione</th>
                    <th className="px-4 py-3 font-medium">Analitica CE</th>
                    <th className="px-4 py-3 font-medium">Famiglia</th>
                    <th className="px-4 py-3 font-medium text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.accountCode} className="border-t border-imm-neutral-mid/40 hover:bg-imm-neutral-base/50">
                      <td className="px-4 py-2 font-mono text-imm-blue-dark">{r.accountCode}</td>
                      <td className="px-4 py-2 text-imm-blue-dark">{r.accountDescription ?? '—'}</td>
                      <td className="px-4 py-2 text-imm-blue-dark/80">{r.analiticaLabel ?? '—'}</td>
                      <td className="px-4 py-2 text-imm-blue-dark/60 text-xs">{r.famiglia ?? '—'}</td>
                      <td className="px-4 py-2 text-right font-mono font-medium text-imm-blue-dark">
                        {formatCurrency(r.balanceNormalized)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
