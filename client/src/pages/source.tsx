import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import InfoBox from "@/components/InfoBox";

export default function Source() {
  //todo: remove mock functionality
  const sourceColumns = [
    { key: "fonte", label: "Fonte Dati", align: "left" as const },
    { key: "periodo", label: "Periodo", align: "left" as const },
    { key: "dataAggiornamento", label: "Ultimo Aggiornamento", align: "left" as const },
    { key: "stato", label: "Stato", align: "center" as const },
  ];

  const sourceData = [
    {
      fonte: "Bilancio 2024",
      periodo: "Gen-Ago 2024",
      dataAggiornamento: "31/08/2024",
      stato: "✅ Verificato",
    },
    {
      fonte: "Bilancio 2025",
      periodo: "Gen-Ago 2025",
      dataAggiornamento: "31/08/2025",
      stato: "✅ Verificato",
    },
    {
      fonte: "Conto Economico Dettagliato",
      periodo: "2024-2025",
      dataAggiornamento: "31/08/2025",
      stato: "✅ Aggiornato",
    },
    {
      fonte: "Dettaglio Costi Servizi",
      periodo: "Gen-Ago 2025",
      dataAggiornamento: "31/08/2025",
      stato: "✅ Aggiornato",
    },
    {
      fonte: "Dettaglio Costi Personale",
      periodo: "Gen-Ago 2025",
      dataAggiornamento: "31/08/2025",
      stato: "✅ Aggiornato",
    },
  ];

  return (
    <div data-testid="page-source">
      <PageHeader 
        title="Source - Dati Fonte" 
        subtitle="Riepilogo delle fonti dati utilizzate per l'analisi"
      />

      <DataTable 
        title="Fonti Dati Bilancio" 
        columns={sourceColumns} 
        data={sourceData}
      />

      <div className="mt-6">
        <InfoBox title="Informazioni sui Dati">
          Tutti i dati presentati in questa dashboard provengono dai bilanci ufficiali di Awentia Srl.
          I dati sono aggiornati al 31 agosto 2025 e comprendono il periodo gennaio-agosto per entrambi gli anni fiscali 2024 e 2025.
          Ogni fonte è stata verificata e validata dal dipartimento amministrativo.
        </InfoBox>
      </div>
    </div>
  );
}
