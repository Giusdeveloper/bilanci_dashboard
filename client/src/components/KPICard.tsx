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
    <Card className="p-6 hover:shadow-md transition-all duration-300 border-border/50 group" data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex flex-col mb-4">
        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1" data-testid="text-kpi-label">
          {label}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground/60">
            {description}
          </div>
        )}
      </div>
      <div className="text-4xl font-bold mb-3 font-heading text-imm-blue-dark group-hover:text-imm-blue transition-colors" data-testid="text-kpi-value">
        {value}
      </div>
      {change && (
        <div
          className={`text-sm font-bold flex items-center gap-1.5 ${changeType === "positive"
              ? "text-imm-signal-teal-dark" 
              : "text-imm-equity-magenta"
            }`}
          data-testid="text-kpi-change"
        >
          <div className={`p-1 rounded-full ${changeType === "positive" ? "bg-imm-signal-teal/10" : "bg-imm-equity-magenta/10"}`}>
            {changeType === "positive" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          </div>
          {change}
        </div>
      )}
    </Card>
  );
}
