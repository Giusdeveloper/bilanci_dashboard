import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { formatCurrency, formatPercentage, calculateVariance } from "@/data/financialData";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useEffect, useState } from "react";

interface CESinteticoData {
  progressivo2025: any;
  progressivo2024: any;
}

export default function CESintetico() {
  const { selectedCompany, getCESinteticoData } = useFinancialData();
  const [ceData, setCeData] = useState<CESinteticoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("Dic");

  useEffect(() => {
    const loadData = async () => {
      if (!selectedCompany) {
        setCeData(null);
        return;
      }

      setLoading(true);
      try {
        const data = await getCESinteticoData(selectedCompany.id);
        if (data && data.length > 0 && data[0].data) {
          setCeData(data[0].data as CESinteticoData);
          if (data[0].month) {
            const monthNames = ["", "Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
            setPeriodLabel(monthNames[data[0].month] || "Dic");
          }
        } else {
          setCeData(null);
        }
      } catch (error) {
        console.error('Errore nel caricamento dati CE Sintetico:', error);
        setCeData(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, getCESinteticoData]);

  if (!selectedCompany) {
    return (
      <div data-testid="page-ce-sintetico">
        <PageHeader title="CE Sintetico" subtitle="Conto Economico Sintetico" />
        <div className="p-8 bg-muted rounded-lg text-center mt-6">
          <p className="text-lg text-muted-foreground">Seleziona un'azienda per visualizzare i dati.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center">Caricamento...</div>;

  if (!ceData || !ceData.progressivo2025) {
    return (
      <div className="p-8 text-center text-muted-foreground">Dati non disponibili per CE Sintetico.</div>
    );
  }

  const { progressivo2025, progressivo2024 } = ceData;
  const columns = [
    { key: "voce", label: "Voce", align: "left" as const },
    { key: "value2025", label: `2025 (Gen-${periodLabel})`, align: "right" as const },
    { key: "percentage", label: "% sui Ricavi", align: "right" as const },
    { key: "value2024", label: `2024 (Gen-${periodLabel})`, align: "right" as const },
    { key: "varianceEuro", label: "Var €", align: "right" as const },
    { key: "variance", label: "Var %", align: "right" as const },
  ];

  let tableData: any[] = [];
  const emptyRow = { voce: "", value2025: "", percentage: "", value2024: "", varianceEuro: "", variance: "" };

  if (progressivo2025.isDynamic && progressivo2025.rows) {
    // RENDERING DINAMICO UNIVERSALE (Awentia, Sherpa42, Maia)
    const totalRicavi = progressivo2025.totaleRicavi || 1;
    const dynamicRows: any[] = [];
    const emptyRow = { voce: "", value2025: "", percentage: "", value2024: "", varianceEuro: "", variance: "", className: "" };

    progressivo2025.rows.forEach((row: any) => {
      const cleanLabel = row.voce.trim();
      const upperLabel = cleanLabel.toUpperCase().replace(/\s+/g, '');
      const noise = ["CONTOECONOMICO", "DICEMBRE", "GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE"];
      if (upperLabel.includes("CONTOECONOMICO") || noise.includes(upperLabel) || /^\d{2,4}$/.test(upperLabel)) return;

      const v25 = typeof row.value2025 === 'number' ? row.value2025 : 0;
      const v24 = typeof row.value2024 === 'number' ? row.value2024 : 0;
      const percentage = (v25 / totalRicavi) * 100;
      const variance = calculateVariance(v25, v24);
      
      const labelUpper = row.voce.toUpperCase();
      
      // Add spacer before key sections
      if (labelUpper.includes("EBITDA") || labelUpper.includes("EBIT") || labelUpper.includes("RISULTATO")) {
        dynamicRows.push(emptyRow);
      }

      let className = row.type || "";
      if (className === "total") className = "total-dark";
      if (className === "result" || labelUpper.includes("RISULTATO")) className = "result";
      if (className === "key-metric") className = "key-metric";
      if (className === "subtotal") className = "highlight";

      dynamicRows.push({
        voce: row.voce,
        value2025: formatCurrency(v25),
        percentage: formatPercentage(percentage, 1),
        value2024: formatCurrency(v24),
        varianceEuro: v24 === 0 && v25 === 0 ? "n/a" : formatCurrency(v25 - v24),
        variance: v24 === 0 && v25 === 0 ? "n/a" : `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
        className: className
      });
    });
    tableData = dynamicRows;
  } else {
    // RENDERING HARDCODED (Awentia)
    const createRow = (label: string, val25: number, val24: number, isBold = false, className = "") => {
      const ricavi25 = progressivo2025.totaleRicavi || 1;
      const percentage = (val25 / ricavi25) * 100;
      const variance = calculateVariance(val25, val24);
      return {
        voce: label,
        value2025: formatCurrency(val25),
        percentage: formatPercentage(percentage, 1),
        value2024: formatCurrency(val24),
        varianceEuro: val24 === 0 && val25 === 0 ? "n/a" : formatCurrency(val25 - val24),
        variance: val24 === 0 && val25 === 0 ? "n/a" : `${variance >= 0 ? '+' : ''}${formatPercentage(variance, 1)}`,
        className: className || (isBold ? "font-bold" : ""),
      };
    };

    tableData = [
      createRow("TOTALE RICAVI", progressivo2025.totaleRicavi, progressivo2024.totaleRicavi, true, "total-dark"),
      emptyRow,
      createRow("COSTI DIRETTI", progressivo2025.costiDiretti, progressivo2024.costiDiretti, true, "highlight"),
      createRow("COSTI INDIRETTI", progressivo2025.costiIndiretti, progressivo2024.costiIndiretti, true, "highlight"),
      createRow("TOTALE COSTI DIRETTI E INDIRETTI", progressivo2025.totaleCostiDirettiIndiretti, progressivo2024.totaleCostiDirettiIndiretti, true, "total-dark"),
      createRow("MARGINE", progressivo2025.margine || progressivo2025.grossProfit, progressivo2024.margine || progressivo2024.grossProfit, true, "key-metric"),
      emptyRow,
      createRow("TOTALE GESTIONE STRUTTURA", progressivo2025.totaleGestioneStruttura, progressivo2024.totaleGestioneStruttura, true, "total-dark"),
      createRow("EBITDA", progressivo2025.ebitda, progressivo2024.ebitda, true, "key-metric"),
      emptyRow,
      createRow("RISULTATO ANTE IMPOSTE", progressivo2025.ebt, progressivo2024.ebt, true, "key-metric"),
      createRow("RISULTATO DELL'ESERCIZIO", progressivo2025.risultatoEsercizio, progressivo2024.risultatoEsercizio, true, "result"),
    ];
  }

  return (
    <div data-testid="page-ce-sintetico" className="space-y-6">
      <PageHeader title="CE Sintetico" subtitle={`Conto Economico Sintetico - Principali aggregati (Progressivo ${periodLabel})`} />
      <DataTable columns={columns} data={tableData} />
    </div>
  );
}
