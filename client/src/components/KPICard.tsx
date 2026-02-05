import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

interface KPICardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative";
  description?: string;
}

export default function KPICard({ label, value, change, changeType, description }: KPICardProps) {
  return (
    <Card className="p-6 hover-elevate active-elevate-2 transition-all duration-200" data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex flex-col mb-2">
        <div className="text-sm text-muted-foreground font-medium" data-testid="text-kpi-label">
          {label}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground/70 mt-0.5">
            {description}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold mb-2" data-testid="text-kpi-value">
        {value}
      </div>
      {change && (
        <div
          className={`text-sm font-semibold flex items-center gap-1 ${changeType === "positive"
              ? "text-[#4A82BF] dark:text-[#9cbfe0]" // Imment Blu chiaro per positivo
              : "text-[#9e005c] dark:text-[#c41d7a]" // Imment Magenta per negativo/alert
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
