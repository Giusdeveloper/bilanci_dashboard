import React, { useEffect, useState, useMemo } from 'react';
import { useFinancialData } from '../contexts/FinancialDataContext';
import PageHeader from '../components/PageHeader';
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { formatCurrency } from "@/data/financialData";

type ViewMode = 'current' | 'previous';

const SourcePage = () => {
    const { selectedCompany, getSourceData } = useFinancialData();
    const [data, setData] = useState<any[][]>([]);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("current");
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState<Record<string, string>>({});

    // Metadata per la struttura della matrice
    const [structure, setStructure] = useState({
        headerRowIndex: 0,
        dataStartIndex: 0,
        splitIndex: -1,
        hasSplit: false
    });

    useEffect(() => {
        if (selectedCompany) loadSourceData();
    }, [selectedCompany]);

    const loadSourceData = async () => {
        if (!selectedCompany) return;
        setLoading(true);
        try {
            const result = await getSourceData(selectedCompany.id);
            if (result && result.length > 0) {
                const rows = result[0].data as any[][];
                setData(rows);
                analyzeMatrix(rows);
            } else {
                setData([]);
            }
        } finally {
            setLoading(false);
        }
    };

    const analyzeMatrix = (rows: any[][]) => {
        if (!rows || rows.length < 1) return;

        let headerIdx = 0;
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const rowStr = rows[i].join(" ").toLowerCase();
            if (rowStr.includes("descrizione") && (rowStr.includes("conto") || rowStr.includes("famiglia"))) {
                headerIdx = i;
                break;
            }
        }

        const headerRow = rows[headerIdx];
        let splitIdx = -1;
        for (let r = 0; r < headerIdx + 5; r++) {
            const row = rows[r];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
                if (String(row[c]).toUpperCase().includes("ANNO PRECEDENTE")) {
                    splitIdx = c;
                    break;
                }
            }
            if (splitIdx !== -1) break;
        }

        let dataStart = 0;
        const monthNames = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
        for (let c = 0; c < headerRow.length; c++) {
            const cell = String(headerRow[c]).toLowerCase().trim();
            if (monthNames.includes(cell.substring(0, 3)) || cell === "1") {
                dataStart = c;
                break;
            }
        }

        setStructure({
            headerRowIndex: headerIdx,
            dataStartIndex: dataStart,
            splitIndex: splitIdx,
            hasSplit: splitIdx !== -1
        });
    };

    // 1. Definiamo quali colonne mostrare per la vista corrente
    const activeViewIndices = useMemo(() => {
        const { dataStartIndex, splitIndex, hasSplit } = structure;
        if (data.length === 0) return [];

        const contextCols = Array.from({ length: dataStartIndex }, (_, i) => i);
        const dataCols = hasSplit 
            ? (viewMode === 'current' 
                ? Array.from({ length: splitIndex - dataStartIndex }, (_, i) => i + dataStartIndex)
                : Array.from({ length: data[0].length - splitIndex }, (_, i) => i + splitIndex))
            : Array.from({ length: data[0].length - dataStartIndex }, (_, i) => i + dataStartIndex);

        const allIndices = [...contextCols, ...dataCols];

        // Filtro per nascondere colonne totalmente vuote (escludendo le prime 4 di contesto)
        return allIndices.filter(i => {
            if (i < 4) return true;
            return data.slice(structure.headerRowIndex + 1).some(row => {
                const val = row[i];
                return val !== null && val !== undefined && val !== "" && val !== 0 && val !== "-";
            });
        });
    }, [data, structure, viewMode]);

    const headers = useMemo(() => {
        if (data.length === 0) return [];
        return activeViewIndices.map(i => data[structure.headerRowIndex][i] || "");
    }, [data, structure, activeViewIndices]);

    const filterableColumns = useMemo(() => {
        return headers.map((h, i) => {
            const name = String(h).toUpperCase();
            if (name.includes("CONTO") || name.includes("DESCRIZIONE") || name.includes("FAMIGLIA") || name.includes("ANALITICA")) {
                return { name: String(h), index: activeViewIndices[i], displayIndex: i };
            }
            return null;
        }).filter(Boolean) as any[];
    }, [headers, activeViewIndices]);

    // 2. Filtriamo le righe
    const bodyRows = useMemo(() => {
        if (data.length === 0) return [];
        
        return data.slice(structure.headerRowIndex + 1).filter(row => {
            // Regola di validità: identità + almeno un valore numerico nella vista attiva
            const hasIdentity = String(row[0] || "").trim() !== "" || String(row[1] || "").trim() !== "";
            const hasValue = activeViewIndices.some(i => {
                if (i < structure.dataStartIndex) return false;
                const val = Number(row[i]);
                return row[i] !== null && row[i] !== "" && !isNaN(val) && val !== 0;
            });
            
            // Filtro globale
            const matchesSearch = !searchQuery || row.some(cell => String(cell || "").toLowerCase().includes(searchQuery.toLowerCase()));
            
            // Filtri a discesa
            const matchesDropdown = filterableColumns.every(f => {
                const val = filters[f.name];
                return !val || val === "all" || String(row[f.index]).trim() === val;
            });

            return hasIdentity && hasValue && matchesSearch && matchesDropdown;
        }).map(row => activeViewIndices.map(i => row[i]));
    }, [data, structure, activeViewIndices, searchQuery, filters, filterableColumns]);

    const columnOptions = useMemo(() => {
        const options: Record<string, string[]> = {};
        filterableColumns.forEach(f => {
            const vals = new Set<string>();
            data.slice(structure.headerRowIndex + 1).forEach(row => {
                const v = String(row[f.index] || "").trim();
                if (v) vals.add(v);
            });
            options[f.name] = Array.from(vals).sort();
        });
        return options;
    }, [data, structure, filterableColumns]);

    const formatValue = (v: any) => {
        if (v === null || v === undefined || v === "" || v === "-") return "";
        if (typeof v === 'number') return v.toLocaleString('it-IT', { maximumFractionDigits: 2 });
        return v;
    };

    if (!selectedCompany) return <div className="p-8 text-center">Seleziona un'azienda.</div>;
    if (loading) return <div className="p-8 text-center">Caricamento...</div>;
    if (data.length === 0) return <div className="p-8 text-center">Nessun dato sorgente.</div>;

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col p-4 space-y-4">
            <div className="bg-primary rounded-lg p-4 text-primary-foreground shadow-lg">
                <h1 className="text-xl font-bold">Source Data: {selectedCompany.name}</h1>
                <p className="text-sm opacity-90">Visualizzazione fedele dei dati grezzi Excel</p>
            </div>

            <div className="flex items-center gap-4">
                <Input placeholder="Cerca..." className="max-w-md" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                {structure.hasSplit && (
                    <div className="flex bg-muted p-1 rounded-md">
                        <button onClick={() => setViewMode('current')} className={`px-3 py-1 text-sm rounded ${viewMode === 'current' ? 'bg-background shadow-sm' : ''}`}>Anno Corrente</button>
                        <button onClick={() => setViewMode('previous')} className={`px-3 py-1 text-sm rounded ${viewMode === 'previous' ? 'bg-background shadow-sm' : ''}`}>Anno Precedente</button>
                    </div>
                )}
            </div>

            {filterableColumns.length > 0 && (
                <div className="flex flex-wrap gap-2 items-end">
                    {filterableColumns.map(f => (
                        <div key={f.name} className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">{f.name}</label>
                            <Select value={filters[f.name] || "all"} onValueChange={v => setFilters(prev => ({...prev, [f.name]: v}))}>
                                <SelectTrigger className="h-8 min-w-[150px] text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tutti</SelectItem>
                                    {columnOptions[f.name]?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                    <button onClick={() => setFilters({})} className="text-xs text-destructive h-8 px-2 hover:underline">Reset</button>
                </div>
            )}

            <Card className="flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto relative">
                    <table className="border-collapse text-xs min-w-full">
                        <thead className="sticky top-0 z-30">
                            <tr className="bg-muted">
                                {headers.map((h, i) => {
                                    const isSticky1 = i === 0;
                                    const isSticky2 = i === 1;
                                    
                                    let stickyClass = "";
                                    let widthClass = "min-w-[100px]";
                                    
                                    if (isSticky1) {
                                        stickyClass = "sticky left-0 z-40 bg-muted shadow-[2px_0_4px_rgba(0,0,0,0.05)]";
                                        widthClass = "min-w-[120px] w-[120px]";
                                    } else if (isSticky2) {
                                        stickyClass = "sticky left-[120px] z-40 bg-muted shadow-[2px_0_4px_rgba(0,0,0,0.05)]";
                                        widthClass = "min-w-[250px] w-[250px]";
                                    }

                                    return (
                                        <th key={i} className={`p-2 border-b-2 border-border text-left font-bold whitespace-nowrap ${widthClass} ${stickyClass}`}>
                                            {String(h)}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {bodyRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-muted/30 border-b border-border transition-colors">
                                    {row.map((cell, i) => {
                                        const isSticky1 = i === 0;
                                        const isSticky2 = i === 1;
                                        const isNumeric = i >= structure.dataStartIndex;
                                        
                                        let stickyClass = "";
                                        let widthClass = "min-w-[100px]";
                                        const cellBg = "bg-card";

                                        if (isSticky1) {
                                            stickyClass = `sticky left-0 z-20 ${cellBg} shadow-[2px_0_4px_rgba(0,0,0,0.05)]`;
                                            widthClass = "min-w-[120px] w-[120px]";
                                        } else if (isSticky2) {
                                            stickyClass = `sticky left-[120px] z-20 ${cellBg} shadow-[2px_0_4px_rgba(0,0,0,0.05)]`;
                                            widthClass = "min-w-[250px] w-[250px]";
                                        }

                                        return (
                                            <td key={i} className={`p-2 whitespace-nowrap ${isNumeric ? 'text-right' : 'text-left'} ${isSticky2 ? 'truncate max-w-[250px]' : ''} ${stickyClass} ${widthClass}`}>
                                                {isNumeric && typeof cell === 'number' ? `€ ${formatValue(cell)}` : formatValue(cell)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default SourcePage;
