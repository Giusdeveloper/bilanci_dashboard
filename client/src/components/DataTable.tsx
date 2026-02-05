import { Card } from "@/components/ui/card";

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

export default function DataTable({ title, columns, data, highlightRows = [], totalRows = [], keyMetricRows = [], resultRow = [] }: DataTableProps) {
  return (
    <Card className="p-3 md:p-6" data-testid={title ? `table-${title.toLowerCase().replace(/\s+/g, '-')}` : "data-table"}>
      {title && (
        <h3 className="text-base md:text-lg font-bold mb-3 md:mb-5" data-testid="text-table-title">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto -mx-3 md:mx-0 scrollbar-thin">
        <table className="w-full border-collapse" data-testid="table">
          <thead>
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
