import PageHeader from "@/components/PageHeader";
import PartitariView from "@/components/PartitariView";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCallback } from "react";

export default function Partitari() {
  const { selectedCompany, loadFinancialData } = useFinancialData();

  const loadPartitari = useCallback(
    async (companyId: string, year: number, month: number) => {
      const data = await loadFinancialData(companyId, 'partitari', year, month);
      if (data && data.length > 0 && data[0].data) {
        const partitari = data[0].data as { headers: string[]; data: Record<string, unknown>[] };
        return { headers: partitari.headers ?? [], data: partitari.data ?? [] };
      }
      return null;
    },
    [loadFinancialData],
  );

  if (!selectedCompany) {
    return (
      <div data-testid="page-partitari">
        <PageHeader
          title="Partitari"
          subtitle="Registro completo delle movimentazioni contabili"
        />
        <PartitariView companyId={null} loadPartitari={loadPartitari} />
      </div>
    );
  }

  return (
    <div data-testid="page-partitari">
      <PageHeader
        title="Partitari"
        subtitle="Registro completo delle movimentazioni contabili"
      />
      <PartitariView
        companyId={selectedCompany.id}
        companyName={selectedCompany.name}
        loadPartitari={loadPartitari}
      />
    </div>
  );
}
