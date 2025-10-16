import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/PageHeader";
import { Search, X } from "lucide-react";
import { partitariData, partitariHeaders } from "@/data/partitariData";

export default function Partitari() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const filteredData = useMemo(() => {
    return partitariData.filter((row: any) => {
      return Object.keys(filters).every((key) => {
        if (!filters[key]) return true;
        const value = row[key]?.toString().toLowerCase() || '';
        return value.includes(filters[key].toLowerCase());
      });
    });
  }, [filters]);

  const handleFilterChange = (column: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div data-testid="page-partitari">
      <PageHeader 
        title="Partitari" 
        subtitle="Registro completo delle movimentazioni contabili"
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Search className="w-4 h-4 mr-2" />
            {showFilters ? "Nascondi Filtri" : "Mostra Filtri"}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              data-testid="button-clear-filters"
            >
              <X className="w-4 h-4 mr-2" />
              Cancella Filtri
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredData.length} di {partitariData.length} righe
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max" data-testid="table-partitari">
            <thead>
              <tr>
                {partitariHeaders.map((header) => (
                  <th
                    key={header}
                    className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left whitespace-nowrap sticky top-0 z-10"
                  >
                    <div className="flex flex-col gap-2">
                      <span>{header}</span>
                      {showFilters && (
                        <Input
                          placeholder={`Filtra ${header}...`}
                          value={filters[header] || ''}
                          onChange={(e) => handleFilterChange(header, e.target.value)}
                          className="h-8 text-xs"
                          data-testid={`filter-${header}`}
                        />
                      )}
                    </div>
                  </th>
                ))}
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
