import { Card } from "@/components/ui/card";
import { useEffect, useRef } from "react";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
}

interface DataTableProps {
  title?: string;
  columns: Column[];
  data: Record<string, any>[];
  highlightRows?: number[];
  totalRows?: number[];
  keyMetricRows?: number[];
  resultRow?: number[];
  columnGroups?: Array<{ 
    label: string; 
    keys: string[];
    subGroups?: Array<{ label: string; keys: string[] }>; // sottogruppi opzionali
  }>; // header di gruppo opzionali
}

const getRowClassName = (className: string) => {
  switch (className) {
    case "result":
      return "bg-yellow-100 dark:bg-yellow-900/40 font-bold";
    case "key-metric":
      return "bg-blue-50 dark:bg-blue-950/20 font-bold";
    case "total-dark":
      return "bg-blue-900/10 dark:bg-blue-900/30 font-bold";
    case "highlight":
      return "font-semibold";
    default:
      return "hover:bg-muted/50";
  }
};

export default function DataTable({ title, columns, data, highlightRows = [], totalRows = [], keyMetricRows = [], resultRow = [], columnGroups = [] }: DataTableProps) {
  const tableScrollRef = useRef<HTMLDivElement | null>(null);

  // Mantieni la scrollbar sempre visibile
  useEffect(() => {
    const scrollContainer = tableScrollRef.current;
    if (!scrollContainer) return;

    // Forza la visibilità della scrollbar
    const forceScrollbarVisibility = () => {
      scrollContainer.style.overflowX = 'scroll';
    };

    forceScrollbarVisibility();

    // Osserva i cambiamenti di dimensione per mantenere la scrollbar visibile
    const observer = new ResizeObserver(forceScrollbarVisibility);
    observer.observe(scrollContainer);

    return () => {
      observer.disconnect();
    };
  }, []);

  const groupKeyToGroup = new Map<string, string>();
  columnGroups.forEach(g => g.keys.forEach(k => groupKeyToGroup.set(k, g.label)));

  return (
    <Card className="p-3 md:p-6" data-testid={title ? `table-${title.toLowerCase().replace(/\s+/g, '-')}` : "data-table"}>
      {title && (
        <h3 className="text-base md:text-lg font-bold mb-3 md:mb-5" data-testid="text-table-title">
          {title}
        </h3>
      )}
      <div ref={tableScrollRef} className="overflow-x-scroll -mx-3 md:mx-0 [scrollbar-width:thin]">
        <table className="w-full border-collapse" data-testid="table">
          <thead>
            {columnGroups.length > 0 ? (
              <>
                {/* Riga 1: Gruppi principali (PROGRESSIVO, GENNAIO) */}
                <tr>
                  {columns.map((col, idx) => {
                    const groupLabel = groupKeyToGroup.get(col.key);
                    // se la colonna non è in nessun gruppo, crea una cella vuota (prima colonna per le voci)
                    if (!groupLabel) {
                      return (
                        <th
                          key={`empty-${col.key}`}
                          rowSpan={3}
                          className="bg-blue-900/20 px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-bold text-foreground border-b-2 border-border text-center whitespace-nowrap"
                        >
                          {/* Prima colonna per le voci - senza header */}
                        </th>
                      );
                    }

                    // calcola quante colonne consecutive appartengono allo stesso gruppo a partire da idx
                    let span = 0;
                    for (let j = idx; j < columns.length; j++) {
                      if (groupKeyToGroup.get(columns[j].key) === groupLabel) span++;
                      else break;
                    }
                    // evita di renderizzare header di gruppo duplicati (solo il primo della sequenza)
                    const isFirstOfGroup = idx === 0 || groupKeyToGroup.get(columns[idx - 1].key) !== groupLabel;
                    if (!isFirstOfGroup) return null;

                    return (
                      <th
                        key={`grp-${groupLabel}-${idx}`}
                        colSpan={span}
                        className="bg-blue-900/20 px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-bold text-foreground border-b-2 border-border text-center whitespace-nowrap"
                      >
                        {groupLabel}
                      </th>
                    );
                  })}
                </tr>
                {/* Riga 2: Sottogruppi (2025, 2024) */}
                <tr>
                  {columns.map((col, idx) => {
                    const groupLabel = groupKeyToGroup.get(col.key);
                    if (!groupLabel) {
                      // Prima colonna - cella vuota con stesso colore
                      return (
                        <th
                          key={`empty-row2-${col.key}`}
                          className="bg-blue-800/10 px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-semibold text-foreground border-b border-border text-center whitespace-nowrap"
                        >
                          {/* Cella vuota per allineamento */}
                        </th>
                      );
                    }

                    // Determina se è 2025 o 2024 basandosi sul nome della colonna
                    const is2025 = col.key.includes('Current') || col.key.includes('Prog') || col.key.includes('Punt');
                    const yearLabel = is2025 ? '2025' : '2024';
                    
                    // calcola quante colonne consecutive appartengono allo stesso anno
                    let span = 0;
                    for (let j = idx; j < columns.length; j++) {
                      const nextCol = columns[j];
                      const nextGroupLabel = groupKeyToGroup.get(nextCol.key);
                      if (nextGroupLabel !== groupLabel) break;
                      
                      const nextIs2025 = nextCol.key.includes('Current') || nextCol.key.includes('Prog') || nextCol.key.includes('Punt');
                      if (nextIs2025 === is2025) span++;
                      else break;
                    }
                    
                    // evita di renderizzare header di anno duplicati
                    const isFirstOfYear = idx === 0 || 
                      groupKeyToGroup.get(columns[idx - 1].key) !== groupLabel ||
                      (columns[idx - 1].key.includes('Current') || columns[idx - 1].key.includes('Prog') || columns[idx - 1].key.includes('Punt')) !== is2025;
                    if (!isFirstOfYear) return null;

                    return (
                      <th
                        key={`year-${yearLabel}-${idx}`}
                        colSpan={span}
                        className="bg-blue-800/10 px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-semibold text-foreground border-b border-border text-center whitespace-nowrap"
                      >
                        {yearLabel}
                      </th>
                    );
                  })}
                </tr>
                {/* Riga 3: Etichette delle colonne */}
                <tr>
                  {columns.map((col, idx) => {
                    const groupLabel = groupKeyToGroup.get(col.key);
                    
                    // Se la colonna non è in nessun gruppo, crea una cella vuota con stesso colore
                    if (!groupLabel) {
                      return (
                        <th
                          key={`empty-row3-${col.key}`}
                          className="bg-muted px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-semibold text-muted-foreground border-b-2 border-border text-center whitespace-nowrap"
                        >
                          {/* Cella vuota per allineamento */}
                        </th>
                      );
                    }
                    
                    // Abbassa le etichette "% RICAVI" e "VARIAZIONE"
                    const isPercentageOrVariance = col.label === "% RICAVI" || col.label === "VARIAZIONE";
                    const labelStyle = isPercentageOrVariance ? "transform translate-y-1" : "";
                    
                    return (
                      <th
                        key={col.key}
                        className={`bg-muted px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-semibold text-muted-foreground border-b-2 border-border text-${col.align || "left"} whitespace-nowrap ${labelStyle}`}
                        data-testid={`th-${col.key}`}
                      >
                        {col.label}
                      </th>
                    );
                  })}
                </tr>
              </>
            ) : (
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`bg-muted px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-semibold text-muted-foreground border-b-2 border-border text-${col.align || "left"} whitespace-nowrap`}
                    data-testid={`th-${col.key}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {data.map((row, idx) => {
              const isHighlight = highlightRows.includes(idx);
              const isTotal = totalRows.includes(idx);
              const isKeyMetric = keyMetricRows.includes(idx);
              const isResult = resultRow.includes(idx);
              const hasBold = row.className?.includes("font-bold");

              // Determina il className in base alle props o alla className della riga
              let rowClassName = "";
              if (row.className) {
                // Se la riga ha una className custom, usa getRowClassName
                rowClassName = getRowClassName(row.className);
              } else {
                // Altrimenti usa la logica basata sulle props
                rowClassName = isResult
                  ? "bg-yellow-100 dark:bg-yellow-900/40 font-bold" 
                  : isKeyMetric
                  ? "bg-blue-50 dark:bg-blue-950/20 font-bold" 
                  : isTotal 
                  ? "bg-blue-900/10 dark:bg-blue-900/30 font-bold" 
                  : isHighlight 
                  ? "font-semibold" 
                  : hasBold
                  ? "font-bold hover:bg-muted/50"
                  : "hover:bg-muted/50";
              }

              return (
                <tr key={idx} className={rowClassName} data-testid={`row-${idx}`}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm border-b border-border text-${col.align || "left"} ${col.className || ""} ${col.align === 'right' ? 'whitespace-nowrap' : ''}`}
                      data-testid={`cell-${idx}-${col.key}`}
                    >
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
