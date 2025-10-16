import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/PageHeader";
import { ChevronDown, X } from "lucide-react";
import { partitariData, partitariHeaders } from "@/data/partitariData";

export default function Partitari() {
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

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
  }, []);

  const filteredData = useMemo(() => {
    return partitariData.filter((row: any) => {
      return Object.keys(filters).every((key) => {
        if (!filters[key] || filters[key].size === 0) return true;
        const value = row[key]?.toString() || '';
        return filters[key].has(value);
      });
    });
  }, [filters]);

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

  return (
    <div data-testid="page-partitari">
      <PageHeader 
        title="Partitari" 
        subtitle="Registro completo delle movimentazioni contabili"
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-2" />
              Cancella Tutti i Filtri
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredData.length} di {partitariData.length} righe
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)] table-scroll-container">
          <table className="w-full border-collapse min-w-max" data-testid="table-partitari">
            <thead className="sticky top-0 z-20">
              <tr>
                {partitariHeaders.map((header) => {
                  const columnFilter = filters[header];
                  const hasFilter = columnFilter && columnFilter.size > 0;
                  const filteredValues = getFilteredValuesForColumn(header);

                  return (
                    <th
                      key={header}
                      className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        <span>{header}</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 ${hasFilter ? 'text-primary' : ''}`}
                              data-testid={`filter-button-${header}`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0" align="start">
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
                    Nessun risultato trovato
                  </td>
                </tr>
              ) : (
                filteredData.map((row: any, idx: number) => (
                  <tr
                    key={idx}
                    className="hover:bg-muted/50"
                    data-testid={`row-${idx}`}
                  >
                    {partitariHeaders.map((header) => (
                      <td
                        key={header}
                        className="px-3 py-2 text-sm border-b border-border whitespace-nowrap"
                        data-testid={`cell-${idx}-${header}`}
                      >
                        {row[header] || ''}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
