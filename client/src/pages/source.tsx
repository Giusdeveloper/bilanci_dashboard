import React, { useEffect, useState, useMemo } from 'react';
import { useFinancialData } from '../contexts/FinancialDataContext';
import PageHeader from '../components/PageHeader';
import { Card } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// View State Type
type ViewMode = 'current' | 'previous' | 'all';

const SourcePage = () => {
    const { selectedCompany, getSourceData } = useFinancialData();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // View State
    const [viewMode, setViewMode] = useState<ViewMode>("current");

    const [currentYearData, setCurrentYearData] = useState<any[]>([]);
    const [previousYearData, setPreviousYearData] = useState<any[]>([]);
    const [rawHeaders, setRawHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);

    const [hasSplit, setHasSplit] = useState(false);

    // Filter State
    const [filters, setFilters] = useState<Record<string, string>>({});

    useEffect(() => {
        if (selectedCompany) {
            loadSourceData();
        }
    }, [selectedCompany]);

    const loadSourceData = async () => {
        if (!selectedCompany) return;
        setLoading(true);
        try {
            const result = await getSourceData(selectedCompany.id);
            if (result && result.length > 0) {
                const sourceRecord = result[0];
                const rows = sourceRecord.data;

                if (Array.isArray(rows) && rows.length > 0) {
                    setData(rows);
                    processMatrix(rows);
                } else {
                    setData([]);
                    setHasSplit(false);
                }
            } else {
                setData([]);
                setHasSplit(false);
            }
        } catch (error) {
            console.error("Error loading source data:", error);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Logic to process the matrix and split it into logical views
     */
    const processMatrix = (rows: any[]) => {
        if (!rows || rows.length < 1) return;

        // 1. Identify Header Row
        // Scan for row containing "Descrizione" or "Conto"
        let headerRowIndex = 0;
        let headerRow = rows[0];

        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const rowStr = rows[i].join(" ").toLowerCase();
            if (rowStr.includes("descrizione") && (rowStr.includes("conto") || rowStr.includes("famiglia"))) {
                headerRowIndex = i;
                headerRow = rows[i];
                break;
            }
        }

        // 2. Identify Split Column (looking for "ANNO PRECEDENTE" in metadata rows)
        let splitIndex = -1;
        for (let r = 0; r < headerRowIndex + 5; r++) {
            const row = rows[r];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
                const cell = String(row[c]).toUpperCase().trim();
                if (cell.includes("ANNO PRECEDENTE")) {
                    splitIndex = c;
                    break;
                }
            }
            if (splitIndex !== -1) break;
        }

        // 3. Identify Data Start Column (First month column, usually contains "Gen" or "1")
        let dataStartIndex = 0;
        for (let c = 0; c < headerRow.length; c++) {
            const cell = String(headerRow[c]).toLowerCase();
            // Check for numeric month or month name
            if (cell === "1" || cell.includes("gen")) {
                dataStartIndex = c;
                break;
            }
        }

        // Prepare Raw View
        setRawHeaders(headerRow);
        setRawData(rows.slice(headerRowIndex + 1));

        if (splitIndex !== -1 && dataStartIndex > 0) {
            // We have a valid split. 
            // - Left Context: 0 to dataStartIndex
            // - Current Data: dataStartIndex to splitIndex
            // - Previous Data: splitIndex to End

            // Build Common Headers for Left Side
            const contextHeaders = headerRow.slice(0, dataStartIndex);

            // Current Headers
            const currentDataHeaders = headerRow.slice(dataStartIndex, splitIndex);
            const currentFullHeaders = [...contextHeaders, ...currentDataHeaders];

            // Previous Headers (We reuse the context headers!)
            const previousDataHeaders = headerRow.slice(splitIndex);
            const previousFullHeaders = [...contextHeaders, ...previousDataHeaders];

            // Filter valid rows (exclude separators/metadata inside body)
            const validRows = rows.slice(headerRowIndex + 1).filter(r => {
                // Check context cols
                const contextPart = r.slice(0, dataStartIndex);
                const hasContext = contextPart.some((c: any) => c !== null && c !== "");

                // Also filter out explicit "ANNO PRECEDENTE" title rows if they appear in body
                const rowStr = r.join(" ").toUpperCase();
                if (rowStr.includes("ANNO PRECEDENTE") || rowStr.includes("ANNO CORRENTE")) return false;

                return hasContext;
            });

            // Build Current Data Rows
            const currentRows = validRows.map((row: any[]) => {
                const context = row.slice(0, dataStartIndex);
                const values = row.slice(dataStartIndex, splitIndex);
                return [...context, ...values];
            });

            // Build Previous Data Rows
            const previousRows = validRows.map((row: any[]) => {
                const context = row.slice(0, dataStartIndex);
                const values = row.slice(splitIndex);
                return [...context, ...values];
            });

            setCurrentYearData({ headers: currentFullHeaders, rows: currentRows } as any);
            setPreviousYearData({ headers: previousFullHeaders, rows: previousRows } as any);
            setHasSplit(true);
            setViewMode('current');
        } else {
            setHasSplit(false);
            setViewMode('all');
        }
    };

    // Formatting Helpers
    const formatValue = (value: any) => {
        if (value === null || value === undefined || value === "") return "";
        const num = Number(value);
        if (!isNaN(num) && typeof value !== 'string') {
            if (Math.abs(num) > 1000 || !Number.isInteger(num)) {
                return num.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            }
        }
        return value;
    };

    const getTabClass = (mode: ViewMode) => {
        return viewMode === mode
            ? "bg-primary text-primary-foreground shadow px-4 py-2 text-sm font-medium rounded-md transition-colors"
            : "bg-muted text-muted-foreground hover:bg-muted/80 px-4 py-2 text-sm font-medium rounded-md transition-colors";
    };

    const getActiveDataSet = () => {
        if (viewMode === 'current' && hasSplit) return currentYearData as any;
        if (viewMode === 'previous' && hasSplit) return previousYearData as any;
        return { headers: rawHeaders, rows: rawData };
    };

    const activeSet = getActiveDataSet();
    const headers = activeSet?.headers || [];
    const allBodyRows = activeSet?.rows || [];

    // Identify Filterable Columns
    const filterableColumns = useMemo(() => {
        if (!headers) return [];
        return headers.map((h: any, index: number) => {
            const name = String(h || "").trim();
            const upperName = name.toUpperCase();
            if (upperName.includes("CONTO") || upperName.includes("DESCRIZIONE") || upperName.includes("FAMIGLIA") || upperName.includes("ANALITICA")) {
                return { name, index };
            }
            return null;
        }).filter(Boolean) as { name: string, index: number }[];
    }, [headers]);

    // Compute Unique Options for Filters
    const columnOptions = useMemo(() => {
        const options: Record<string, string[]> = {};
        filterableColumns.forEach(col => {
            const values = new Set<string>();
            allBodyRows.forEach((row: any[]) => {
                const val = String(row[col.index] || "").trim();
                // We keep 0 or -? Maybe yes, maybe no. Let's exclude purely empty/null.
                if (val) {
                    values.add(val);
                }
            });
            options[col.name] = Array.from(values).sort();
        });
        return options;
    }, [allBodyRows, filterableColumns]);

    // Apply Filters
    const bodyRows = useMemo(() => {
        return allBodyRows.filter((row: any[]) => {
            return filterableColumns.every(col => {
                const filterValue = filters[col.name];
                if (!filterValue || filterValue === "all") return true;

                const cellValue = String(row[col.index] || "").trim();
                // Strict match for dropdown
                return cellValue === filterValue;
            });
        });
    }, [allBodyRows, filters, filterableColumns]);

    const handleFilterChange = (colName: string, value: string) => {
        setFilters(prev => ({
            ...prev,
            [colName]: value
        }));
    };

    if (!selectedCompany) return (
        <div data-testid="page-source" className="p-8">
            <PageHeader title="Source Data" subtitle="Dati grezzi importati" />
            <div className="p-8 bg-muted rounded-lg text-center mt-6">
                <p className="text-lg text-muted-foreground">Seleziona un'azienda per visualizzare i dati</p>
            </div>
        </div>
    );

    if (loading) return <div className="p-8 text-center">Caricamento dati...</div>;

    if (!data || data.length === 0) return (
        <div data-testid="page-source" className="p-8">
            <PageHeader title="Source Data" subtitle="Dati non disponibili" />
            <div className="p-8 bg-muted rounded-lg text-center mt-6">
                <p className="text-lg text-muted-foreground">Nessun dato Source presente.</p>
            </div>
        </div>
    );

    return (
        <div data-testid="page-source" className="h-[calc(100vh-4rem)] flex flex-col p-6 animate-in fade-in duration-500 box-border">
            <div className="flex-none mb-4 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="bg-primary rounded-lg p-6 text-primary-foreground shadow-lg flex-1 mr-4">
                        <h1 className="text-2xl font-bold mb-2">Source Data</h1>
                        <p className="opacity-90">Dati originali importati - {selectedCompany.name}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {hasSplit && (
                        <div className="flex flex-wrap gap-2">
                            <button onClick={() => setViewMode('current')} className={getTabClass('current')}>Anno Corrente</button>
                            <button onClick={() => setViewMode('previous')} className={getTabClass('previous')}>Anno Precedente</button>
                            <button onClick={() => setViewMode('all')} className={getTabClass('all')}>Vista Completa (Raw)</button>
                        </div>
                    )}

                    {/* Filter Bar */}
                    {filterableColumns.length > 0 && (
                        <Card className="p-4 flex flex-wrap gap-4 items-center bg-card border shadow-sm">
                            <span className="text-sm font-semibold text-muted-foreground mr-2">Filtra per:</span>
                            {filterableColumns.map(col => (
                                <div key={col.index} className="flex flex-col gap-1 min-w-[200px]">
                                    <label className="text-xs font-medium text-muted-foreground ml-1">{col.name}</label>
                                    <Select
                                        value={filters[col.name] || "all"}
                                        onValueChange={(val) => handleFilterChange(col.name, val)}
                                    >
                                        <SelectTrigger className="h-9 w-full">
                                            <SelectValue placeholder="Tutti" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Tutti</SelectItem>
                                            {columnOptions[col.name]?.map((opt, i) => (
                                                <SelectItem key={i} value={opt}>
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                            {(Object.keys(filters).some(k => filters[k] && filters[k] !== "all")) && (
                                <button
                                    onClick={() => setFilters({})}
                                    className="h-9 px-4 py-2 mt-auto text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                >
                                    Reset Filtri
                                </button>
                            )}
                        </Card>
                    )}
                </div>
            </div>

            <Card className="flex-1 min-h-0 flex flex-col overflow-hidden shadow-sm border bg-card">
                <div className="flex-none p-4 border-b bg-muted/20 flex items-center justify-between">
                    <h3 className="text-lg font-bold">
                        {viewMode === 'current' ? 'Dati Esercizio Corrente' :
                            viewMode === 'previous' ? 'Dati Esercizio Precedente' : 'Foglio Completo'}
                    </h3>
                    <div className="flex items-center gap-2">
                        {allBodyRows.length !== bodyRows.length && (
                            <span className="text-xs font-medium text-muted-foreground">
                                Filtrati: {bodyRows.length} su {allBodyRows.length}
                            </span>
                        )}
                        <span className="text-sm font-medium text-muted-foreground bg-background px-2 py-1 rounded border shadow-sm">{bodyRows.length} righe</span>
                    </div>
                </div>

                <div className="flex-1 overflow-auto relative w-full">
                    <table className="w-full border-collapse min-w-max">
                        <thead className="sticky top-0 z-30">
                            <tr>
                                {headers.map((h: any, i: number) => {
                                    const headerName = String(h || "").toUpperCase();
                                    const isTextCol = headerName.includes("CONTO") || headerName.includes("DESCRIZIONE") || headerName.includes("FAMIGLIA") || headerName.includes("ANALITICA") || headerName.includes("NOTE");
                                    const isSticky = i === 0;
                                    const align = (isSticky || isTextCol) ? "text-left" : "text-right";
                                    const stickyStyle = isSticky ? 'sticky left-0 z-40 shadow-[2px_0_4px_rgba(0,0,0,0.05)]' : '';

                                    return (
                                        <th key={i} className={`bg-muted px-3 py-3 text-sm font-semibold text-muted-foreground border-b-2 border-border whitespace-nowrap ${align} ${stickyStyle}`}>
                                            {String(h || "")}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {bodyRows.map((row: any[], idx: number) => {
                                // Basic highlighting heuristic
                                const rowStr = row.join(" ").toUpperCase();
                                const isTotal = rowStr.includes("TOTALE") || rowStr.includes("RISULTATO") || rowStr.includes("EBITDA") || rowStr.includes("COSTI DIRETTI");
                                const isResult = rowStr.includes("RISULTATO");
                                const rowBg = isResult ? "bg-yellow-50" : isTotal ? "bg-blue-50" : "hover:bg-muted/50";
                                const fontClass = isTotal || isResult ? "font-bold" : "";

                                return (
                                    <tr key={idx} className={`${rowBg} transition-colors border-b border-border last:border-0`}>
                                        {row.map((cell: any, colIdx: number) => {
                                            // Handle Sticky Column
                                            const isSticky = colIdx === 0;
                                            // Determine alignment
                                            const headerName = String(headers[colIdx] || "").toUpperCase();
                                            const isTextCol = headerName.includes("CONTO") || headerName.includes("DESCRIZIONE") || headerName.includes("FAMIGLIA") || headerName.includes("ANALITICA") || headerName.includes("NOTE");
                                            const align = (isSticky || isTextCol) ? "text-left" : "text-right";

                                            // Sticky styling
                                            // Ensure background is solid for sticky column
                                            const cellBg = rowBg === "hover:bg-muted/50" ? "bg-card" : rowBg;
                                            const stickyStyle = isSticky ?
                                                `sticky left-0 z-20 shadow-[2px_0_4px_rgba(0,0,0,0.05)] ${cellBg}`
                                                : "";

                                            return (
                                                <td key={colIdx} className={`px-3 py-3 text-sm whitespace-nowrap text-muted-foreground/90 ${align} ${fontClass} ${stickyStyle}`}>
                                                    {formatValue(cell)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default SourcePage;
