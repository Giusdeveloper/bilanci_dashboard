import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";

export default function CEDettaglio() {
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
      voce: "RICAVI DELLE VENDITE",
      value2025: "€ 56.600,36",
      percentage: "100,0%",
      value2024: "€ 8.733,00",
      variance: "+548,3%",
    },
    {
      voce: "Vendite prodotti",
      value2025: "€ 45.200,00",
      percentage: "79,9%",
      value2024: "€ 6.500,00",
      variance: "+595,4%",
    },
    {
      voce: "Prestazioni servizi",
      value2025: "€ 11.400,36",
      percentage: "20,1%",
      value2024: "€ 2.233,00",
      variance: "+410,5%",
    },
    {
      voce: "",
      value2025: "",
      percentage: "",
      value2024: "",
      variance: "",
    },
    {
      voce: "COSTI PER SERVIZI",
      value2025: "€ 9.092,05",
      percentage: "16,1%",
      value2024: "€ 19.535,00",
      variance: "-53,5%",
    },
    {
      voce: "Costi commerciali",
      value2025: "€ 3.450,00",
      percentage: "6,1%",
      value2024: "€ 8.200,00",
      variance: "-57,9%",
    },
    {
      voce: "Consulenze professionali",
      value2025: "€ 2.800,00",
      percentage: "4,9%",
      value2024: "€ 5.100,00",
      variance: "-45,1%",
    },
    {
      voce: "Spese generali",
      value2025: "€ 1.542,05",
      percentage: "2,7%",
      value2024: "€ 3.235,00",
      variance: "-52,3%",
    },
    {
      voce: "Marketing e pubblicità",
      value2025: "€ 1.300,00",
      percentage: "2,3%",
      value2024: "€ 3.000,00",
      variance: "-56,7%",
    },
    {
      voce: "",
      value2025: "",
      percentage: "",
      value2024: "",
      variance: "",
    },
    {
      voce: "COSTI DEL PERSONALE",
      value2025: "€ 1.537,20",
      percentage: "2,7%",
      value2024: "€ 0,00",
      variance: "n/a",
    },
    {
      voce: "Salari e stipendi",
      value2025: "€ 1.200,00",
      percentage: "2,1%",
      value2024: "€ 0,00",
      variance: "n/a",
    },
    {
      voce: "Oneri sociali",
      value2025: "€ 337,20",
      percentage: "0,6%",
      value2024: "€ 0,00",
      variance: "n/a",
    },
    {
      voce: "",
      value2025: "",
      percentage: "",
      value2024: "",
      variance: "",
    },
    {
      voce: "VALORE AGGIUNTO",
      value2025: "€ 45.971,11",
      percentage: "81,2%",
      value2024: "€ -10.802,00",
      variance: "+525,5%",
    },
    {
      voce: "",
      value2025: "",
      percentage: "",
      value2024: "",
      variance: "",
    },
    {
      voce: "Altri proventi operativi",
      value2025: "€ 0,00",
      percentage: "0,0%",
      value2024: "€ 20.095,00",
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
      voce: "Ammortamenti immobilizzazioni",
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
      voce: "RISULTATO OPERATIVO",
      value2025: "€ 41.439,11",
      percentage: "73,2%",
      value2024: "€ 8.893,00",
      variance: "+366,0%",
    },
  ];

  return (
    <div data-testid="page-ce-dettaglio">
      <PageHeader 
        title="CE Dettaglio" 
        subtitle="Conto Economico Dettagliato - Analisi completa per voce"
      />

      <DataTable 
        columns={columns} 
        data={data}
        highlightRows={[14, 18]}
        totalRows={[0, 4, 10, 22]}
      />
    </div>
  );
}
