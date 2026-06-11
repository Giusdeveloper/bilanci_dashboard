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
      return "bg-imm-yellow/20 font-bold border-b-2 border-imm-yellow/30";
    case "key-metric":
      return "bg-imm-blue/5 font-bold text-imm-blue-dark";
    case "total-dark":
      return "bg-imm-blue-dark/5 font-bold text-imm-blue-dark";
    case "highlight":
      return "font-semibold bg-imm-neutral/40";
    default:
      return className || "odd:bg-white even:bg-imm-neutral/30";
  }
};

export default function DataTable({ title, columns, data, highlightRows = [], totalRows = [], keyMetricRows = [], resultRow = [] }: DataTableProps) {
  return (
    <Card className="p-3 md:p-6 overflow-hidden border-border/50" data-testid={title ? `table-${title.toLowerCase().replace(/\s+/g, '-')}` : "data-table"}>
      {title && (
        <h3 className="text-lg md:text-xl font-bold mb-4 font-heading text-imm-blue-dark tracking-tight" data-testid="text-table-title">
          {title}
        </h3>
      )}
      <div className="overflow-x-auto -mx-3 md:mx-0 rounded-lg border border-border/50 shadow-sm">
        <table className="w-full border-collapse" data-testid="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`bg-imm-blue-dark px-4 py-4 text-xs md:text-sm font-bold text-white uppercase tracking-wider text-${col.align || "left"} whitespace-nowrap`}
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
              let rowClassName = "transition-colors ";
              if (row.className) {
                rowClassName += getRowClassName(row.className);
              } else {
                rowClassName += isResult
                  ? "bg-imm-yellow/20 font-bold" 
                  : isKeyMetric
                  ? "bg-imm-blue/5 font-bold text-imm-blue-dark" 
                  : isTotal 
                  ? "bg-imm-blue-dark/5 font-bold text-imm-blue-dark" 
                  : isHighlight 
                  ? "font-semibold bg-imm-neutral/40" 
                  : hasBold
                  ? "font-bold"
                  : "odd:bg-white even:bg-imm-neutral/30";
              }

              rowClassName += " hover:bg-imm-blue/10";

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
