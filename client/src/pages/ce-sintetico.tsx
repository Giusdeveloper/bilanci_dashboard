import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import KPICard from "@/components/KPICard";

export default function CESintetico() {
  //todo: remove mock functionality
  const columns = [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "value2025", label: "2025 (Gen-Ago)", align: "right" as const },
    { key: "percentage", label: "% sui Ricavi", align: "right" as const },
    { key: "value2024", label: "2024 (Gen-Ago)", align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ];

  const data = [
    {
      voce: "Ricavi delle Vendite",
      value2025: "€ 56.600,36",
      percentage: "100,0%",
      value2024: "€ 8.733,00",
      variance: "+548,3%",
    },
    {
      voce: "",
      value2025: "",
      percentage: "",
      value2024: "",
      variance: "",
    },
    {
      voce: "Costi per Servizi",
      value2025: "€ 9.092,05",
      percentage: "16,1%",
      value2024: "€ 19.535,00",
      variance: "-53,5%",
    },
    {
      voce: "Costi del Personale",
      value2025: "€ 1.537,20",
      percentage: "2,7%",
      value2024: "€ 0,00",
      variance: "n/a",
    },
    {
      voce: "Altri Costi Operativi",
      value2025: "€ 0,00",
      percentage: "0,0%",
      value2024: "€ -20.095,00",
      variance: "-100,0%",
    },
    {
      voce: "",
      value2025: "",
      percentage: "",
      value2024: "",
      variance: "",
    },
    {
      voce: "EBITDA",
      value2025: "€ 45.971,11",
      percentage: "81,2%",
      value2024: "€ 9.293,00",
      variance: "+395,0%",
    },
    {
      voce: "",
      value2025: "",
      percentage: "",
      value2024: "",
      variance: "",
    },
    {
      voce: "Ammortamenti",
      value2025: "€ 4.532,00",
      percentage: "8,0%",
      value2024: "€ 400,00",
      variance: "+1033,0%",
    },
    {
      voce: "",
      value2025: "",
      percentage: "",
      value2024: "",
      variance: "",
    },
    {
      voce: "RISULTATO OPERATIVO (EBIT)",
      value2025: "€ 41.439,11",
      percentage: "73,2%",
      value2024: "€ 8.893,00",
      variance: "+366,0%",
    },
  ];

  return (
    <div data-testid="page-ce-sintetico">
      <PageHeader 
        title="CE Sintetico" 
        subtitle="Conto Economico Sintetico - Principali aggregati economici"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard 
          label="Margine Lordo" 
          value="81,2%" 
          change="+60,5 pp vs 2024"
          changeType="positive"
        />
        <KPICard 
          label="ROI Operativo" 
          value="73,2%" 
          change="+366% vs 2024"
          changeType="positive"
        />
        <KPICard 
          label="Efficienza Costi" 
          value="18,8%" 
          change="-62,3 pp vs 2024"
          changeType="positive"
        />
      </div>

      <DataTable 
        columns={columns} 
        data={data}
        totalRows={[0, 6, 10]}
      />
    </div>
  );
}
