import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
}

export default function KPICard({ label, value, change, changeType }: KPICardProps) {
  return (
    <Card className="p-6 hover-elevate active-elevate-2 transition-all duration-200" data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="text-sm text-muted-foreground font-medium mb-2" data-testid="text-kpi-label">
        {label}
      </div>
      <div className="text-3xl font-bold mb-2" data-testid="text-kpi-value">
        {value}
      </div>
      {change && (
        <div 
          className={`text-sm font-semibold flex items-center gap-1 ${
            changeType === "positive" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
          data-testid="text-kpi-change"
        >
          {changeType === "positive" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          {change}
        </div>
      )}
    </Card>
  );
}
