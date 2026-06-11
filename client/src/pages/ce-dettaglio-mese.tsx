import { useParams, Link } from "wouter";
import PageHeader from "@/components/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import DataTable from "@/components/DataTable";
import { formatCurrency, formatPercentage } from "@/data/financialData";
import { fetchCEDettaglio } from "@/data/financialReads";
import {
  buildSingleMonthDetailRows,
  MONTH_NAMES_FULL,
  monthFromSlug,
} from "@/data/financialShaping";
import type { CEDettaglioModel } from "@shared/queries";
import { ArrowLeft } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useCompanyPeriods } from "@/hooks/useCompanyPeriods";
import { useEffect, useMemo, useState } from "react";

function resolveYearFromSearch(): number | null {
  const raw = new URLSearchParams(window.location.search).get("anno");
  if (!raw) return null;
  const year = parseInt(raw, 10);
  return Number.isFinite(year) ? year : null;
}

export default function CEDettaglioMese() {
  const { selectedCompany } = useFinancialData();
  const companyId = selectedCompany?.id ?? null;
  const { periods, loading: periodsLoading, monthsForYear } = useCompanyPeriods(companyId);
  const params = useParams<{ mese: string }>();
  const monthNum = monthFromSlug(params.mese ?? "");
  const monthName = monthNum ? MONTH_NAMES_FULL[monthNum - 1] : null;

  const [selectedYear, setSelectedYear] = useState<number | null>(() => resolveYearFromSearch());
  const [model, setModel] = useState<CEDettaglioModel | null>(null);
  const [prevModel, setPrevModel] = useState<CEDettaglioModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedYear(resolveYearFromSearch());
  }, [params.mese]);

  useEffect(() => {
    if (!periods || periods.years.length === 0) return;
    setSelectedYear((prev) => {
      if (prev && periods.years.includes(prev)) return prev;
      return periods.years[0];
    });
  }, [periods]);

  const yearNum = selectedYear;
  const prevYear = yearNum !== null ? yearNum - 1 : null;
  const availableMonths = yearNum !== null ? monthsForYear(yearNum) : [];
  const monthAvailable = monthNum !== undefined && availableMonths.includes(monthNum);

  useEffect(() => {
    if (!companyId || yearNum === null || monthNum === undefined) {
      setModel(null);
      setPrevModel(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const loads = [fetchCEDettaglio(companyId, yearNum)];
    if (prevYear !== null && periods?.years.includes(prevYear)) {
      loads.push(fetchCEDettaglio(companyId, prevYear));
    }

    Promise.all(loads)
      .then(([current, previous]) => {
        if (cancelled) return;
        setModel(current);
        setPrevModel(previous ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("CE Dettaglio Mese Load Error:", e);
          setError("Impossibile caricare i dati del mese.");
          setModel(null);
          setPrevModel(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, yearNum, monthNum, prevYear, periods?.years]);

  const hasPrevYear = !!prevModel && prevModel.rows.length > 0;

  const tableRows = useMemo(() => {
    if (!model || monthNum === undefined) return [];
    return buildSingleMonthDetailRows(
      model,
      monthNum,
      formatCurrency,
      formatPercentage,
      hasPrevYear ? prevModel : null,
    );
  }, [model, monthNum, hasPrevYear, prevModel]);

  if (monthNum === undefined || !monthName) {
    return (
      <div className="p-8">
        <PageHeader title="Mese non trovato" subtitle="Il mese richiesto non è valido." />
        <Link href="/ce-dettaglio-mensile">
          <a className="text-primary hover:underline">Torna a CE Dettaglio Mensile</a>
        </Link>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="p-8">
        <PageHeader title={`Analisi ${monthName}`} subtitle="Seleziona un'azienda" />
        <div className="mt-8 text-center text-muted-foreground">Seleziona un'azienda per visualizzare i dati.</div>
      </div>
    );
  }

  if (periodsLoading || loading) {
    return <div className="p-8 text-center">Caricamento...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">{error}</div>;
  }

  if (!model || !yearNum || !monthAvailable) {
    return (
      <div className="p-8">
        <PageHeader
          title={`Analisi ${monthName}`}
          subtitle="Dati non disponibili"
        />
        <div className="mt-8 text-center text-muted-foreground">
          Nessun dato puntuale disponibile per {monthName} {yearNum ?? ""}.
        </div>
        <div className="mt-4 text-center">
          <Link href="/ce-dettaglio-mensile">
            <a className="text-primary hover:underline">Torna a CE Dettaglio Mensile</a>
          </Link>
        </div>
      </div>
    );
  }

  const columns = hasPrevYear
    ? [
        { key: "voce", label: "Voce", align: "left" as const },
        { key: "valueCurrent", label: `${monthName} ${yearNum}`, align: "right" as const },
        { key: "percentage", label: "% Incidenza", align: "right" as const },
        { key: "valuePrevious", label: `${monthName} ${prevYear}`, align: "right" as const },
        { key: "varianceEuro", label: "Var €", align: "right" as const },
        { key: "variance", label: "Var %", align: "right" as const },
      ]
    : [
        { key: "voce", label: "Voce", align: "left" as const },
        { key: "valueCurrent", label: `${monthName} ${yearNum}`, align: "right" as const },
        { key: "percentage", label: "% Incidenza", align: "right" as const },
      ];

  return (
    <div data-testid="page-ce-mese-specifico">
      <div className="mb-4">
        <Link href="/ce-dettaglio-mensile">
          <a className="text-primary hover:underline flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Torna a CE Dettaglio Mensile
          </a>
        </Link>
      </div>

      <PageHeader
        title={`Conto Economico - ${monthName} ${yearNum}`}
        subtitle={
          hasPrevYear
            ? `Analisi puntuale del mese di ${monthName} con confronto rispetto a ${monthName} ${prevYear}`
            : `Analisi puntuale del mese di ${monthName}`
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Dettaglio mensile puntuale</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={tableRows} />
        </CardContent>
      </Card>
    </div>
  );
}
