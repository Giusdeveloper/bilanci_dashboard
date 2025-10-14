import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { financialData, formatCurrency } from "@/data/financialData";

export default function CEDettaglioMensile() {
  const { progressivo2025 } = financialData.ceDettaglioMensile;
  const months = progressivo2025.months;

  const createRowData = (label: string, values: number[], isBold = false, isHighlight = false) => ({
    voce: label,
    values: values.map((v) => formatCurrency(v).replace("€", "").trim()),
    total: formatCurrency(values[values.length - 1]).replace("€", "").trim(),
    isBold,
    isHighlight,
  });

  const data = [
    createRowData("Ricavi caratteristici", progressivo2025.ricaviCaratteristici),
    createRowData("Altri ricavi", progressivo2025.altriRicavi),
    createRowData("TOTALE RICAVI", progressivo2025.totaleRicavi, true, true),
    { voce: "", values: [], total: "", isBold: false, isHighlight: false },
    createRowData("Costi diretti", progressivo2025.costiDiretti),
    createRowData("Costi indiretti", progressivo2025.costiIndiretti),
    createRowData("GROSS PROFIT", progressivo2025.grossProfit, true, true),
    { voce: "", values: [], total: "", isBold: false, isHighlight: false },
    createRowData("Spese commerciali", progressivo2025.speseCommerciali),
    createRowData("Personale", progressivo2025.personale),
    createRowData("Compensi amministratore", progressivo2025.compensiAmministratore),
    createRowData("Servizi contabili e paghe", progressivo2025.serviziContabiliPaghe),
    createRowData("Consulenze tecniche", progressivo2025.consulenzeTecniche),
    createRowData("Altre spese di funzionamento", progressivo2025.altreSpeseFunzionamento),
    createRowData("TOTALE STRUTTURA", progressivo2025.totaleStruttura, true, true),
    { voce: "", values: [], total: "", isBold: false, isHighlight: false },
    createRowData("EBITDA", progressivo2025.ebitda, true, true),
    createRowData("Ammortamenti", progressivo2025.ammortamenti),
    createRowData("Gestione finanziaria", progressivo2025.gestioneFinanziaria),
    createRowData("RISULTATO", progressivo2025.risultato, true, true),
  ];

  return (
    <div data-testid="page-ce-dettaglio-mensile">
      <PageHeader 
        title="CE Dettaglio Mensile" 
        subtitle="Analisi mensile del Conto Economico - Progressivi Gennaio-Agosto 2025"
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
                  Ago (Finale)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                if (row.voce === "") {
                  return (
                    <tr key={idx}>
                      <td colSpan={10} className="py-1"></td>
                    </tr>
                  );
                }

                const rowClassName = row.isHighlight
                  ? "bg-blue-50 dark:bg-blue-950/20 font-bold" 
                  : row.isBold
                  ? "font-bold"
                  : "hover:bg-muted/50";

                return (
                  <tr key={idx} className={rowClassName}>
                    <td className="px-3 py-3 text-sm border-b border-border font-semibold sticky left-0 bg-card">
                      {row.voce}
                    </td>
                    {row.values.map((value, i) => (
                      <td key={i} className="px-3 py-3 text-sm border-b border-border text-right whitespace-nowrap">
                        € {value}
                      </td>
                    ))}
                    <td className={`px-3 py-3 text-sm border-b border-border text-right font-bold whitespace-nowrap ${row.isHighlight ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted/30'}`}>
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
