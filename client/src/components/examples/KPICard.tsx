import KPICard from '../KPICard';

export default function KPICardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard 
        label="Ricavi 2025" 
        value="€ 56.600" 
        change="+548% vs 2024"
        changeType="positive"
      />
      <KPICard 
        label="EBITDA 2025" 
        value="€ 45.971" 
        change="+395% vs 2024"
        changeType="positive"
      />
      <KPICard 
        label="Risultato 2025" 
        value="€ 41.439" 
        change="+366% vs 2024"
        changeType="positive"
      />
      <KPICard 
        label="Margine EBITDA" 
        value="81,2%" 
        change="+60,5 punti"
        changeType="positive"
      />
    </div>
  );
}
