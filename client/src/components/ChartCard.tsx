import { Card } from "@/components/ui/card";
import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card className="p-6" data-testid={`chart-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <h3 className="text-lg font-bold mb-5" data-testid="text-chart-title">
        {title}
      </h3>
      <div className="h-[300px]" data-testid="chart-container">
        {children}
      </div>
    </Card>
  );
}
