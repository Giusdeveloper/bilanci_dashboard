import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";

export default function CEDettaglioMensile() {
  //todo: remove mock functionality
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago"];
  
  const data = [
    {
      voce: "Ricavi",
      gen: "5.200",
      feb: "6.800",
      mar: "7.100",
      apr: "8.900",
      mag: "9.200",
      giu: "7.100",
      lug: "5.800",
      ago: "6.400",
      total: "56.600",
    },
    {
      voce: "Costi Servizi",
      gen: "950",
      feb: "1.100",
      mar: "1.050",
      apr: "1.200",
      mag: "1.350",
      giu: "1.100",
      lug: "950",
      ago: "1.392",
      total: "9.092",
    },
    {
      voce: "Costi Personale",
      gen: "0",
      feb: "0",
      mar: "0",
      apr: "512",
      mag: "512",
      giu: "171",
      lug: "171",
      ago: "171",
      total: "1.537",
    },
    {
      voce: "EBITDA",
      gen: "4.250",
      feb: "5.700",
      mar: "6.050",
      apr: "7.188",
      mag: "7.338",
      giu: "5.829",
      lug: "4.679",
      ago: "4.837",
      total: "45.971",
    },
    {
      voce: "Ammortamenti",
      gen: "566",
      feb: "566",
      mar: "566",
      apr: "566",
      mag: "566",
      giu: "566",
      lug: "566",
      ago: "570",
      total: "4.532",
    },
    {
      voce: "Risultato Operativo",
      gen: "3.684",
      feb: "5.134",
      mar: "5.484",
      apr: "6.622",
      mag: "6.772",
      giu: "5.263",
      lug: "4.113",
      ago: "4.267",
      total: "41.439",
    },
  ];

  return (
    <div data-testid="page-ce-dettaglio-mensile">
      <PageHeader 
        title="CE Dettaglio Mensile" 
        subtitle="Analisi mensile del Conto Economico - Gennaio-Agosto 2025"
      />

      <Card className="p-6 overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max" data-testid="table-mensile">
            <thead>
              <tr>
                <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-left sticky left-0 bg-muted z-10">
                  Voce
                </th>
                {months.map((month) => (
                  <th
                    key={month}
                    className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-right whitespace-nowrap"
                  >
                    {month}
                  </th>
                ))}
                <th className="bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border text-right font-bold">
                  Totale
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const isTotal = idx === 3 || idx === 5;
                const rowClassName = isTotal 
                  ? "bg-blue-50 dark:bg-blue-950/20 font-bold" 
                  : "hover:bg-muted/50";

                return (
                  <tr key={idx} className={rowClassName}>
                    <td className="px-3 py-3 text-sm border-b border-border font-semibold sticky left-0 bg-card">
                      {row.voce}
                    </td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">€ {row.gen}</td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">€ {row.feb}</td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">€ {row.mar}</td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">€ {row.apr}</td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">€ {row.mag}</td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">€ {row.giu}</td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">€ {row.lug}</td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right">€ {row.ago}</td>
                    <td className="px-3 py-3 text-sm border-b border-border text-right font-bold bg-blue-50 dark:bg-blue-950/20">
                      € {row.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
