import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import { ChevronDown, X, Search } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { fetchPartitariPeriods } from "@/data/financialReads";

interface PartitariData {
  headers: string[];
  data: any[];
}

const MONTHS = [
  { value: "1", label: "Gennaio" },
  { value: "2", label: "Febbraio" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Aprile" },
  { value: "5", label: "Maggio" },
  { value: "6", label: "Giugno" },
  { value: "7", label: "Luglio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Settembre" },
  { value: "10", label: "Ottobre" },
  { value: "11", label: "Novembre" },
  { value: "12", label: "Dicembre" },
];

export default function Partitari() {
  const { selectedCompany, loadFinancialData } = useFinancialData();
  const [partitariData, setPartitariData] = useState<any[]>([]);
  const [partitariHeaders, setPartitariHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [globalSearch, setGlobalSearch] = useState("");
  const [availablePeriods, setAvailablePeriods] = useState<{ year: number; month: number }[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const companyId = selectedCompany?.id ?? null;

  const availableYears = useMemo(() => {
    const years = new Set(availablePeriods.map((p) => p.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [availablePeriods]);

  const yearNum = selectedYear ? parseInt(selectedYear, 10) : null;

  const monthsForSelectedYear = useMemo(() => {
    if (yearNum === null) return [];
    return availablePeriods
      .filter((p) => p.year === yearNum)
      .map((p) => p.month)
      .sort((a, b) => a - b);
  }, [availablePeriods, yearNum]);

  const monthOptions = useMemo(
    () => MONTHS.filter((m) => monthsForSelectedYear.includes(parseInt(m.value, 10))),
    [monthsForSelectedYear],
  );

  // Reset alla selezione di una nuova azienda (pattern dashboard).
  useEffect(() => {
    setAvailablePeriods([]);
    setSelectedYear("");
    setSelectedMonth("");
    setPartitariData([]);
    setPartitariHeaders([]);
    setFilters({});
    setSearchTerms({});
    setGlobalSearch("");
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;

    let cancelled = false;
    fetchPartitariPeriods(companyId)
      .then((periods) => {
        if (!cancelled) setAvailablePeriods(periods);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Errore nel caricamento periodi partitari:", error);
          setAvailablePeriods([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Quando arrivano i periodi, seleziona l'anno più recente.
  useEffect(() => {
    if (availableYears.length > 0) {
      setSelectedYear((prev) => (prev ? prev : availableYears[0].toString()));
    }
  }, [availableYears]);

  // Al cambio anno (o arrivo periodi), mese = ultimo disponibile per quell'anno.
  useEffect(() => {
    if (yearNum === null) return;
    const lastMonth =
      monthsForSelectedYear.length > 0 ? monthsForSelectedYear[monthsForSelectedYear.length - 1] : 1;
    setSelectedMonth(lastMonth.toString());
  }, [yearNum, availablePeriods]);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedCompany || yearNum === null || !selectedMonth) {
        setPartitariData([]);
        setPartitariHeaders([]);
        return;
      }

      setLoading(true);
      try {
        const data = await loadFinancialData(
          selectedCompany.id,
          'partitari',
          yearNum,
          parseInt(selectedMonth, 10),
        );

        if (data && data.length > 0 && data[0].data) {
          const partitari = data[0].data as PartitariData;
          setPartitariHeaders(partitari.headers || []);
          setPartitariData(partitari.data || []);
        } else {
          setPartitariData([]);
          setPartitariHeaders([]);
        }
      } catch (error) {
        console.error('Errore nel caricamento dati partitari:', error);
        setPartitariData([]);
        setPartitariHeaders([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, loadFinancialData, yearNum, selectedMonth]);

  // Get unique values for each column
  const uniqueValues = useMemo(() => {
    const values: Record<string, Set<string>> = {};
    partitariHeaders.forEach(header => {
      values[header] = new Set();
      partitariData.forEach((row: any) => {
        const val = row[header]?.toString() || '';
        if (val) values[header].add(val);
      });
    });
    return values;
  }, [partitariHeaders, partitariData]);

  const filteredData = useMemo(() => {
    let result = partitariData;

    // Apply Global Search
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      result = result.filter(row => 
        Object.values(row).some(val => String(val || "").toLowerCase().includes(q))
      );
    }

    // Apply Column Filters
    return result.filter((row: any) => {
      return Object.keys(filters).every((key) => {
        if (!filters[key] || filters[key].size === 0) return true;
        const value = row[key]?.toString() || '';
        return filters[key].has(value);
      });
    });
  }, [filters, partitariData, globalSearch]);

  const toggleFilterValue = (column: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[column]) {
        newFilters[column] = new Set([value]);
      } else {
        const newSet = new Set(newFilters[column]);
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        newFilters[column] = newSet;
      }
      return newFilters;
    });
  };

  const selectAllForColumn = (column: string) => {
    const values = Array.from(uniqueValues[column]);
    const searchTerm = searchTerms[column]?.toLowerCase() || '';
    const filteredValues = searchTerm
      ? values.filter(v => v.toLowerCase().includes(searchTerm))
      : values;

    setFilters(prev => ({
      ...prev,
      [column]: new Set(filteredValues)
    }));
  };

  const clearColumnFilter = (column: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchTerms({});
  };

  const hasActiveFilters = Object.values(filters).some(set => set.size > 0);

  const getFilteredValuesForColumn = (column: string) => {
    const values = Array.from(uniqueValues[column]);
    const searchTerm = searchTerms[column]?.toLowerCase() || '';
    return searchTerm
      ? values.filter(v => v.toLowerCase().includes(searchTerm))
      : values;
  };

  const formatValue = (value: any, header: string) => {
    if (value === null || value === undefined || value === "") return "";
    
    // Handle Dates (Excel serial numbers)
    if (header.toLowerCase().includes("data") && typeof value === 'number' && value > 40000 && value < 60000) {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toLocaleDateString('it-IT');
    }

    // Handle Currency/Amounts
    if (header.toLowerCase().includes("importo") || header.toLowerCase().includes("saldo") || header.toLowerCase().includes("progr")) {
      if (typeof value === 'number') {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
      }
    }

    return value.toString();
  };

  // Se nessuna azienda è selezionata, mostra un messaggio
  if (!selectedCompany) {
    return (
      <div data-testid="page-partitari">
        <PageHeader
          title="Partitari"
          subtitle="Registro completo delle movimentazioni contabili"
        />
        <div className="p-8 bg-muted rounded-lg text-center">
          <p className="text-lg text-muted-foreground">
            Seleziona un'azienda per visualizzare i dati dei partitari
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-partitari">
      <PageHeader
        title="Partitari"
        subtitle="Registro completo delle movimentazioni contabili"
      />

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Filters Section */}
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <Select value={selectedYear} onValueChange={setSelectedYear} disabled={availableYears.length === 0}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue placeholder="Anno" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth}
            onValueChange={setSelectedMonth}
            disabled={monthOptions.length === 0}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Mese" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Cerca in tutte le colonne..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9 h-9"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="h-9"
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredData.length} di {partitariData.length} righe
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {/* Loading State Overlay or Logic */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            Caricamento dati in corso...
          </div>
        ) : availablePeriods.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <p>Nessun partitario importato per {selectedCompany.name}.</p>
            <p className="text-sm">Importa un export PARTITARIO da Importa Dati.</p>
          </div>
        ) : (partitariData.length === 0) ? (
          <div className="p-12 text-center text-muted-foreground">
            Dati non disponibili per il periodo selezionato ({MONTHS.find(m => m.value === selectedMonth)?.label ?? selectedMonth} {selectedYear})
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] table-scroll-container border rounded-md">
            <table className="w-full border-collapse min-w-max" data-testid="table-partitari">
              <thead>
                <tr>
                  {partitariHeaders.map((header) => {
                    const columnFilter = filters[header];
                    const hasFilter = columnFilter && columnFilter.size > 0;
                    const filteredValues = getFilteredValuesForColumn(header);

                    const isAmount = header.toLowerCase().includes("importo") || header.toLowerCase().includes("saldo") || header.toLowerCase().includes("progr");
                    const isDate = header.toLowerCase().includes("data");

                    // Sticky logic for identifying key columns
                    let stickyStyle = 'sticky top-0 z-30 bg-slate-100 dark:bg-slate-900';
                    let width = ''; 
                    let align = isAmount ? "text-right" : isDate ? "text-center" : "text-left";
                    
                    if (header === 'CodiceConto') {
                        stickyStyle = 'sticky left-0 top-0 z-50 bg-slate-100 dark:bg-slate-900';
                        width = 'w-[120px]';
                    } else if (header === 'Descr_conto') {
                        stickyStyle = 'sticky left-[120px] top-0 z-50 bg-slate-100 dark:bg-slate-900';
                        width = 'w-[300px]';
                    }

                    return (
                      <th
                        key={header}
                        className={`px-3 py-3 text-xs font-bold text-muted-foreground border-b-2 border-border whitespace-nowrap ${stickyStyle} ${width} ${align}`}
                      >
                        <div className={`flex items-center gap-2 ${align === "text-right" ? "justify-end" : align === "text-center" ? "justify-center" : ""}`}>
                          <span>{header}</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 ${hasFilter ? 'text-primary' : ''}`}
                                data-testid={`filter-button-${header}`}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0 z-[100]" align="start">
                              <div className="p-3 border-b">
                                <Input
                                  placeholder="Cerca..."
                                  value={searchTerms[header] || ''}
                                  onChange={(e) => setSearchTerms(prev => ({ ...prev, [header]: e.target.value }))}
                                  className="h-8"
                                />
                              </div>
                              <div className="p-2 border-b flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => selectAllForColumn(header)}
                                  className="flex-1 h-8"
                                >
                                  Seleziona Tutto
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => clearColumnFilter(header)}
                                  className="flex-1 h-8"
                                >
                                  Cancella
                                </Button>
                              </div>
                              <div className="max-h-64 overflow-y-auto p-2">
                                {filteredValues.length === 0 ? (
                                  <div className="text-sm text-muted-foreground text-center py-4">
                                    Nessun valore trovato
                                  </div>
                                ) : (
                                  filteredValues.map((value) => (
                                    <div
                                      key={value}
                                      className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted/50 rounded cursor-pointer"
                                      onClick={() => toggleFilterValue(header, value)}
                                    >
                                      <Checkbox
                                        checked={columnFilter?.has(value) || false}
                                        onCheckedChange={() => toggleFilterValue(header, value)}
                                      />
                                      <label className="text-sm flex-1 cursor-pointer">
                                        {value}
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={partitariHeaders.length}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      Nessun risultato trovato con i filtri attuali
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row: any, idx: number) => (
                    <tr
                      key={idx}
                      className="hover:bg-muted/50 group"
                      data-testid={`row-${idx}`}
                    >
                      {partitariHeaders.map((header) => {
                        const isAmount = header.toLowerCase().includes("importo") || header.toLowerCase().includes("saldo") || header.toLowerCase().includes("progr");
                        const isDate = header.toLowerCase().includes("data");
                        
                        let stickyStyle = '';
                        let width = '';
                        let align = isAmount ? "text-right" : isDate ? "text-center" : "text-left";
                        
                        if (header === 'CodiceConto') {
                            stickyStyle = 'sticky left-0 z-20 bg-white dark:bg-[#020617] group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors';
                            width = 'w-[120px]';
                        } else if (header === 'Descr_conto') {
                            stickyStyle = 'sticky left-[120px] z-20 bg-white dark:bg-[#020617] group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-colors';
                            width = 'w-[300px]';
                        }

                        return (
                          <td
                            key={header}
                            className={`px-3 py-2 text-xs border-b border-border whitespace-nowrap ${stickyStyle} ${width} ${align}`}
                            data-testid={`cell-${idx}-${header}`}
                          >
                            {formatValue(row[header], header)}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
