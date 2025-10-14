import ChartCard from '../ChartCard';

export default function ChartCardExample() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard title="Trend Ricavi vs EBITDA">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Grafico Chart.js verrà inserito qui
        </div>
      </ChartCard>
      <ChartCard title="Confronto 2024 vs 2025">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Grafico Chart.js verrà inserito qui
        </div>
      </ChartCard>
    </div>
  );
}
