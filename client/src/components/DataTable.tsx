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

export default function DataTable({ title, columns, data, highlightRows = [], totalRows = [], keyMetricRows = [], resultRow = [] }: DataTableProps) {
  return (
    <Card className="p-6 overflow-x-auto" data-testid={title ? `table-${title.toLowerCase().replace(/\s+/g, '-')}` : "data-table"}>
      {title && (
        <h3 className="text-lg font-bold mb-5" data-testid="text-table-title">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" data-testid="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-${col.align || "left"}`}
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
              const rowClassName = isResult
                ? "bg-yellow-100 dark:bg-yellow-900/40 font-bold" 
                : isKeyMetric
                ? "bg-blue-50 dark:bg-blue-950/20 font-bold" 
                : isTotal 
                ? "bg-blue-900/10 dark:bg-blue-900/30 font-bold" 
                : isHighlight 
                ? "font-semibold" 
                : "hover:bg-muted/50";

              return (
                <tr key={idx} className={rowClassName} data-testid={`row-${idx}`}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-3 py-3 text-sm border-b border-border text-${col.align || "left"} ${col.className || ""}`}
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
