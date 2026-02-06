import { useState, useEffect } from "react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Upload, Save, FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight, XCircle, Info, Building, Table } from "lucide-react";
import { ExcelParser } from "@/utils/excelParser";
import { calculateVariance, formatCurrency } from "@/data/financialData";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Tipi per l'anteprima
interface ExtractedData {
    kpis: {
        ricavi: number;
        costi: number;
        ebitda: number;
        risultato: number;
    };
    sanityCheck: {
        isBalanced: boolean;
        warnings: string[];
    };
    commentary: string; // Nuovo campo per il commento AI
    costLabel?: string; // Etichetta dinamica per i costi
    costDescription?: string; // Sottotitolo descrittivo per i costi
    rawData: {
        ceDettaglio: any;
        ceDettaglioMensile: any;
        ceSintetico: any;
        ceSinteticoMensile: any;
    }
}

interface PreviewData {
    yearly: { rows: number; has2024: boolean } | null;
    monthly: { rows: number; months: string[] } | null;
    sintetico: { rows: number } | null;
    sinteticoMensile: { rows: number } | null;
    partitari?: { headers: number; data: number } | null;
    sourceData?: any[] | null;
}

export default function ImportData() {
    const { companies, selectedCompany, setSelectedCompany, createCompany, saveFinancialData, deleteFinancialData } = useFinancialData();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Stati del wizard
    const [step, setStep] = useState<"upload" | "preview" | "manual">("upload");

    // Stati del form
    const [year, setYear] = useState<string>("2025");
    const [month, setMonth] = useState<string>("10"); // Default a Ottobre

    // Dati in anteprima (non ancora salvati)
    const [preview, setPreview] = useState<ExtractedData | null>(null);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [partitariContent, setPartitariContent] = useState<any | null>(null);

    // Stato per la registrazione nuova azienda
    const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
    const [detectedName, setDetectedName] = useState("");
    const [newCompanyName, setNewCompanyName] = useState("");
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    // Editor manuale
    const [manualKpis, setManualKpis] = useState({
        ricavi: "",
        costi: "",
        ebitda: "",
        risultato: "",
    });

    const resetWizard = () => {
        setStep("upload");
        setPreview(null);
        setPreviewData(null);
        setPartitariContent(null);
        setManualKpis({ ricavi: "", costi: "", ebitda: "", risultato: "" });
        setPendingFile(null);
    };

    // --- MAIN PROCESSING FUNCTION (Defined first to be available for calls) ---
    const processFile = async (file: File, companyId: string) => {
        setLoading(true);
        setStep("upload");
        setSelectedCompany(companies.find(c => c.id === companyId) || null);
        setPendingFile(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const data = event.target?.result;
            if (!data) {
                setLoading(false);
                return;
            }

            try {
                // Initialize parser
                const parser = new ExcelParser(data as string);

                // 1. Check for Partitari CSV
                if (parser.detectPartitari()) {
                    console.log("File detected as Partitari CSV");
                    const partitari = parser.parsePartitari();

                    setPartitariContent(partitari);
                    setPreviewData({
                        yearly: null,
                        monthly: null,
                        sintetico: null,
                        sinteticoMensile: null,
                        partitari: { headers: partitari.headers.length, data: partitari.data.length }
                    });

                    // Dummy preview for Partitari-only import
                    setPreview({
                        kpis: { ricavi: 0, costi: 0, ebitda: 0, risultato: 0 },
                        sanityCheck: { isBalanced: true, warnings: [] },
                        commentary: "Importazione Partitari Rilevata. I dati verranno salvati direttamente.",
                        costLabel: "Partitari",
                        costDescription: "Movimenti contabili",
                        rawData: { ceDettaglio: null, ceDettaglioMensile: null, ceSintetico: null, ceSinteticoMensile: null }
                    });

                    setStep("preview");
                    setLoading(false);
                    return;
                }

                // 2. Standard Financial Data Parsing
                const ceDettaglio = parser.parseCEDettaglio();
                const ceDettaglioMensile = parser.parseCEDettaglioMensile();
                const ceSintetico = parser.parseCESintetico();
                const ceSinteticoMensile = parser.parseCESinteticoMensile();
                const sourceData = parser.parseSource();

                // AUTO-DETECT MONTH
                const detectedMonth = parser.detectReferenceMonth();
                // ... (lines 143-255 skipped for brevity of replacement chunk, I will target the block around 140 AND 257 separately if needed, but here I can do it in one if I skip lines properly?)
                // No, replace_file_content replaces a contiguous block. I cannot skip.
                // I'll do two edits. One to adds parseSource, one to add to state.

                // Edit 1: Add parseSource

                if (detectedMonth) {
                    setMonth(detectedMonth.toString());
                    toast({
                        title: "Periodo Rilevato",
                        description: `Impostato automaticamente al mese: ${new Date(0, detectedMonth - 1).toLocaleString('it-IT', { month: 'long' })}`,
                        className: "bg-blue-50 border-blue-200"
                    });
                }

                // Initialize KPIs
                let ricavi = 0, ebitda = 0, risultato = 0, costi = 0, grossProfit = 0, costiStruttura = 0;
                let costLabel = "Costi";
                let costDescription = "Costi operativi";

                if (ceDettaglio && ceDettaglio.progressivo2025) {
                    const d = ceDettaglio.progressivo2025;
                    ricavi = d.totaleRicavi || d.ricaviCaratteristici || 0;
                    ebitda = d.ebitda || 0;
                    risultato = d.risultato || d.risultatoEsercizio || 0;

                    // Dynamic Cost Logic
                    if (d.totaleCostiDirettiIndiretti && d.totaleCostiDirettiIndiretti !== 0) {
                        costi = d.totaleCostiDirettiIndiretti;
                        costLabel = "Costi Diretti e Indiretti";
                        costDescription = "Costi diretti e indiretti";
                    } else if ((d.totaleGestioneStruttura || 0) + (d.costiServizi || 0) > 0) {
                        costi = (d.costiMateriePrime || 0) +
                            (d.costiServizi || 0) +
                            (d.serviziDiretti || 0) +
                            (d.consulenzeDirette || 0) +
                            (d.serviziInformatici || 0) +
                            (d.serviziCloud || 0) +
                            (d.altriServizi || 0) +
                            (d.godimentoBeniTerzi || 0) +
                            (d.personale || 0) +
                            (d.compensiAmministratore || 0) +
                            (d.speseCommerciali || 0) +
                            (d.speseGenerali || 0) +
                            (d.speseStruttura || 0) +
                            (d.totaleGestioneStruttura || 0);

                        if (Math.abs(costi - (ricavi - ebitda)) > 100) {
                            costi = ricavi - ebitda;
                        }
                        costLabel = "Costi Totali Operativi";
                        costDescription = "Costi variabili e costi fissi";
                    } else {
                        costi = ricavi - ebitda;
                        costLabel = "Costi Operativi";
                        costDescription = "Costi operativi";
                    }

                    grossProfit = d.grossProfit || 0;
                    costiStruttura = d.totaleGestioneStruttura || 0;
                } else if (ceSintetico && ceSintetico.progressivo2025) {
                    const s = ceSintetico.progressivo2025;
                    ricavi = s.totaleRicavi || 0;
                    ebitda = s.ebitda || 0;
                    risultato = s.risultatoEsercizio || 0;
                    costi = ricavi - ebitda;
                    costLabel = "Costi Operativi";
                    costDescription = "Costi operativi";
                }

                // OVERRIDE: Source Summary (User Requested Specific Rows: Costi, Ricavi, Differenza)
                const sourceSummary = parser.parseSourceSummary(sourceData || []);
                if (sourceSummary) {
                    console.log("[Import] Overriding KPIs with Source Summary values:", sourceSummary);
                    ricavi = sourceSummary.ricavi;
                    costi = sourceSummary.costi;
                    risultato = sourceSummary.risultato; // "Differenza" row
                    // Recalculate EBITDA if needed or keep derived? 
                    // Usually EBITDA = Ricavi - Costi + Ammortamenti etc.
                    // If we overwrite Ricavi/Costi/Risultato, we might create inconsistency with EBITDA derived from details.
                    // But user wants THESE cards to match. 
                    // Let's trust "Differenza" as Risultato. Use "Ricavi" as Ricavi. "Costi" as Costi.

                    costLabel = "Costi Totali (Source)";
                    costDescription = "Da Source: 'Costi'";
                }

                // AI Analysis
                let analysisResult = {
                    isBalanced: true,
                    warnings: [] as string[],
                    commentary: "Analisi AI non disponibile (Offline)"
                };

                if (!parser.detectPartitari()) { // Only run analysis for non-partitari
                    if (ricavi === 0) analysisResult.warnings.push("⚠️ Ricavi pari a zero.");
                    if (risultato === 0) analysisResult.warnings.push("⚠️ Risultato nullo.");

                    try {
                        const cName = companies.find(c => c.id === companyId)?.name || newCompanyName || "Unknown";
                        const response = await fetch("/api/analyze-financials", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                companyName: cName,
                                year: parseInt(year),
                                kpis: { ricavi, costi, ebitda, risultato },
                                details: { grossProfit, costiStruttura }
                            })
                        });

                        if (response.ok) {
                            const aiData = await response.json();
                            analysisResult = {
                                isBalanced: aiData.isBalanced,
                                warnings: [...analysisResult.warnings, ...aiData.warnings],
                                commentary: aiData.commentary
                            };
                        }
                    } catch (aiError) {
                        console.error("AI Error:", aiError);
                    }
                }

                setPreview({
                    kpis: { ricavi, costi, ebitda, risultato },
                    sanityCheck: {
                        isBalanced: analysisResult.warnings.length === 0,
                        warnings: analysisResult.warnings
                    },
                    commentary: analysisResult.commentary,
                    costLabel,
                    costDescription,
                    rawData: { ceDettaglio, ceDettaglioMensile, ceSintetico, ceSinteticoMensile }
                });

                setPreviewData({
                    yearly: ceDettaglio ? { rows: Object.keys(ceDettaglio.progressivo2025).length, has2024: false } : null,
                    monthly: ceDettaglioMensile ? { rows: ceDettaglioMensile.progressivo2025?.months?.length || 0, months: ceDettaglioMensile.progressivo2025?.months || [] } : null,
                    sintetico: null,
                    sinteticoMensile: null,
                    partitari: null,
                    sourceData
                });

                setManualKpis({
                    ricavi: ricavi.toString(),
                    costi: costi.toString(),
                    ebitda: ebitda.toString(),
                    risultato: risultato.toString()
                });

                setStep("preview");

            } catch (error: any) {
                console.error("Errore parsing:", error);
                toast({
                    title: "Errore Lettura File",
                    description: "Impossibile leggere il file.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- OTHER HELPERS ---

    const detectAndProcess = async (file: File) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            const data = event.target?.result;
            if (!data) return;
            const parser = new ExcelParser(data as string);

            // Check for partitari first
            if (parser.detectPartitari()) {
                toast({ title: "File Partitari Rilevato", description: "Seleziona un'azienda per importare i partitari." });
                return;
            }

            const name = parser.detectCompanyName();
            if (name) {
                const match = companies.find(c => c.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(c.name.toLowerCase()));
                if (match) {
                    toast({ title: "Azienda Riconosciuta", description: `File associato a: ${match.name}` });
                    setSelectedCompany(match);
                    processFile(file, match.id);
                } else {
                    setDetectedName(name);
                    setNewCompanyName(name);
                    setPendingFile(file);
                    setShowRegistrationDialog(true);
                }
            } else {
                toast({ title: "Attenzione", description: "Nome azienda non rilevato.", variant: "destructive" });
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleRegisterCompany = async () => {
        if (!newCompanyName.trim()) return;
        setLoading(true);
        const company = await createCompany(newCompanyName);
        if (company) {
            setSelectedCompany(company);
            setShowRegistrationDialog(false);
            toast({ title: "Azienda Creata", description: `Benvenuto in ${company.name}` });

            // Resume upload if file is pending
            if (pendingFile) {
                processFile(pendingFile, company.id);
            }
        } else {
            toast({ title: "Errore", description: "Impossibile creare l'azienda.", variant: "destructive" });
        }
        setLoading(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        if (selectedCompany) {
            processFile(file, selectedCompany.id);
        } else {
            await detectAndProcess(file);
        }
    };

    const populateMonthlyTrend = (ceDettaglioMensile: any) => {
        if (ceDettaglioMensile && ceDettaglioMensile.puntuale2025) {
            return {
                labels: ceDettaglioMensile.puntuale2025.months || [],
                ricavi: ceDettaglioMensile.puntuale2025.totaleRicavi || [],
                ebitda: ceDettaglioMensile.puntuale2025.ebitda || []
            };
        }
        return { labels: [], ricavi: [], ebitda: [] };
    };

    const generateSummary = (kpis: any, d25: any, d24: any) => {
        const createRow = (label: string, val25: number, val24: number) => ({
            voce: label,
            value2025: val25,
            percentage: kpis.ricavi2025 ? (val25 / kpis.ricavi2025) * 100 : 0,
            value2024: val24
        });

        // Use precise values from Detail if available, otherwise Fallback to KPIs or 0
        const ricavi25 = d25.totaleRicavi || d25.ricaviCaratteristici || kpis.ricavi2025;
        const ricavi24 = d24.totaleRicavi || d24.ricaviCaratteristici || kpis.ricavi2024;

        return [
            createRow("Ricavi", ricavi25, ricavi24),
            createRow("Costi Operativi", (d25.totaleCostiDirettiIndiretti || kpis.costi2025), (d24.totaleCostiDirettiIndiretti || kpis.costi2024)),
            createRow("EBITDA", (d25.ebitda || kpis.ebitda2025), (d24.ebitda || kpis.ebitda2024)),
            createRow("Ammortamenti", (d25.ammortamenti || d25.totaleAmmortamenti || 0), (d24.ammortamenti || d24.totaleAmmortamenti || 0)),
            createRow("EBIT", (d25.ebit || kpis.ebitda2025 - (d25.ammortamenti || 0)), (d24.ebit || kpis.ebitda2024 - (d24.ammortamenti || 0))),
            createRow("Gestione Finanziaria", (d25.gestioneFinanziaria || 0), (d24.gestioneFinanziaria || 0)),
            createRow("Risultato Esercizio", (d25.risultato || d25.risultatoEsercizio || kpis.risultato2025), (d24.risultato || d24.risultatoEsercizio || kpis.risultato2024))
        ];
    };

    const handleConfirmImport = async () => {
        if (!selectedCompany || !preview) return;

        try {
            setLoading(true);

            // 1. Save Partitari
            if (partitariContent) {
                await saveFinancialData(selectedCompany.id, 'partitari', partitariContent, parseInt(year), parseInt(month));
                toast({ title: "Partitari Importati", description: `Salvate ${partitariContent.data.length} righe.` });
            }

            // Save Source Data
            if (previewData?.sourceData && previewData.sourceData.length > 0) {
                console.log(`[Import] Saving Source data: ${previewData.sourceData.length} rows...`);
                try {
                    await saveFinancialData(selectedCompany.id, 'source', previewData.sourceData, parseInt(year), parseInt(month));
                    console.log("[Import] Source data saved successfully.");
                } catch (err) {
                    console.error("[Import] Error saving Source data:", err);
                }
            } else {
                console.warn("[Import] No Source data to save or empty array.");
            }

            // 2. Save Financial Data if present
            if (preview.rawData && (preview.rawData.ceDettaglio || preview.rawData.ceSintetico)) {
                const promises = [];
                const yr = parseInt(year);
                const mon = parseInt(month);
                const { rawData } = preview;

                if (rawData.ceDettaglio) promises.push(saveFinancialData(selectedCompany.id, 'ce-dettaglio', rawData.ceDettaglio, yr, mon));
                if (rawData.ceDettaglioMensile) promises.push(saveFinancialData(selectedCompany.id, 'ce-dettaglio-mensile', rawData.ceDettaglioMensile, yr, mon));
                if (rawData.ceSintetico) promises.push(saveFinancialData(selectedCompany.id, 'ce-sintetico', rawData.ceSintetico, yr, mon));
                if (rawData.ceSinteticoMensile) promises.push(saveFinancialData(selectedCompany.id, 'ce-sintetico-mensile', rawData.ceSinteticoMensile, yr, mon));

                // Dashboard Data
                const d24 = rawData.ceDettaglio?.progressivo2024 || {};
                const kpis = preview.kpis;

                const ricavi25 = parseFloat(manualKpis.ricavi) || kpis.ricavi;
                const ricavi24 = d24.totaleRicavi || 0;
                const ebitda25 = parseFloat(manualKpis.ebitda) || kpis.ebitda;
                const ebitda24 = d24.ebitda || 0;

                const dashboardData = {
                    kpis: {
                        ricavi2025: ricavi25,
                        ricavi2024: ricavi24,
                        costi2025: parseFloat(manualKpis.costi) || kpis.costi,
                        costi2024: d24.totaleCostiDirettiIndiretti || 0,
                        ebitda2025: ebitda25,
                        ebitda2024: ebitda24,
                        risultato2025: parseFloat(manualKpis.risultato) || kpis.risultato,
                        risultato2024: d24.risultatoEsercizio || d24.risultato || 0,
                        margineEbitda2025: ricavi25 ? (ebitda25 / ricavi25) * 100 : 0,
                        margineEbitda2024: ricavi24 ? (ebitda24 / ricavi24) * 100 : 0,
                        costLabel: preview.costLabel || "Costi"
                    },
                    summary: generateSummary({ ...preview.kpis, ricavi2025: ricavi25, ricavi2024: ricavi24 }, (rawData.ceDettaglio?.progressivo2025 || {}), d24),
                    comparison: {},
                    monthlyTrend: populateMonthlyTrend(rawData.ceDettaglioMensile)
                };

                promises.push(saveFinancialData(selectedCompany.id, 'dashboard', dashboardData, yr, mon));
                await Promise.all(promises);
            }

            toast({
                title: "Importazione Completata",
                description: "Dati salvati con successo.",
                className: "bg-green-50 border-green-200"
            });

            resetWizard();

        } catch (error) {
            console.error(error);
            toast({ title: "Errore Salvataggio", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500" >
            <PageHeader
                title="Importa Dati"
                subtitle="Carica i bilanci e lascia che l'AI li analizzi per te"
            />

            {/* ALERT BOX if no company selected but allows upload now */}
            {!selectedCompany && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="font-medium text-blue-800">Nuova Funzionalità: Rilevamento Automatico</p>
                        <p className="text-sm text-blue-600">
                            Puoi caricare un file senza selezionare un'azienda. Il sistema proverà a riconoscere il nome
                            e ti proporrà di creare una nuova azienda se necessario.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* COLONNA SINISTRA: INPUT */}
                <Card className="md:col-span-1 shadow-lg border-t-4 border-t-primary">
                    <CardHeader>
                        <CardTitle>1. Carica File</CardTitle>
                        <CardDescription>Seleziona azienda e periodo</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Azienda</Label>
                            <Select
                                value={selectedCompany?.id || ""}
                                onValueChange={(val) => {
                                    const c = companies.find(c => c.id === val);
                                    if (c) setSelectedCompany(c);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona o Rileva Autom." />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Anno</Label>
                                <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Mese Riferimento</Label>
                                <Select value={month} onValueChange={setMonth}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Gennaio</SelectItem>
                                        <SelectItem value="2">Febbraio</SelectItem>
                                        <SelectItem value="3">Marzo</SelectItem>
                                        <SelectItem value="4">Aprile</SelectItem>
                                        <SelectItem value="5">Maggio</SelectItem>
                                        <SelectItem value="6">Giugno</SelectItem>
                                        <SelectItem value="7">Luglio</SelectItem>
                                        <SelectItem value="8">Agosto</SelectItem>
                                        <SelectItem value="9">Settembre</SelectItem>
                                        <SelectItem value="10">Ottobre</SelectItem>
                                        <SelectItem value="11">Novembre</SelectItem>
                                        <SelectItem value="12">Dicembre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Label className="block mb-2">File Excel (Bilancio) o CSV (Partitari)</Label>
                            {/* Partitari Preview */}
                            {previewData?.partitari && (
                                <div className="md:col-span-2 border rounded-lg p-4 bg-muted/20">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
                                            <Table className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">Partitari</h3>
                                            <p className="text-sm text-muted-foreground">Movimenti contabili</p>
                                        </div>
                                    </div>
                                    <div className="pl-[52px]">
                                        <div className="flex gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Righe:</span>{" "}
                                                <span className="font-medium">{previewData.partitari.data}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Colonne:</span>{" "}
                                                <span className="font-medium">{previewData.partitari.headers}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Standard Financial Data Previews */}
                            {previewData?.yearly && (
                                <div className="border rounded-lg p-4 bg-muted/20">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-medium">Bilancio Annuale</span>
                                        <span className="text-xs text-muted-foreground">{previewData.yearly.rows} righe estratte</span>
                                    </div>
                                </div>
                            )}
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative mt-2">
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={loading}
                                />
                                <div className="flex flex-col items-center gap-2">
                                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                                    <p className="text-sm font-medium">Trascina o clicca per caricare</p>
                                    <p className="text-xs text-muted-foreground">Supporta .xlsx, .csv</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                    if (!selectedCompany) {
                                        toast({ title: "Errore", description: "Seleziona un'azienda per eliminare i dati.", variant: "destructive" });
                                        return;
                                    }
                                    if (confirm(`Sei sicuro di voler eliminare TUTTI i dati del ${year} per ${selectedCompany.name}? Questa azione è irreversibile.`)) {
                                        try {
                                            setLoading(true);
                                            await deleteFinancialData(selectedCompany.id, parseInt(year));
                                            toast({ title: "Dati eliminati", description: `I dati del ${year} sono stati rimossi con successo.` });
                                        } catch (e) {
                                            toast({ title: "Errore", description: "Impossibile eliminare i dati.", variant: "destructive" });
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                            >
                                Elimina Dati {year} (Reset)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Step 2: Verifica (CFO Analysis) */}
                {step === "preview" && preview && (
                    <Card className="md:col-span-2 shadow-lg">
                        <CardHeader>
                            <CardTitle>2. Anteprima e Validazione</CardTitle>
                            <CardDescription>Verifica i dati estratti dall'intelligenza artificiale</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Status Banner */}
                                <div className={`p-4 rounded-lg flex items-start gap-3 ${preview.sanityCheck.isBalanced ? "bg-green-50 text-green-900 border border-green-200" : "bg-amber-50 text-amber-900 border border-amber-200"}`}>
                                    {preview.sanityCheck.isBalanced ? <CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600" /> : <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-600" />}
                                    <div>
                                        <h4 className="font-semibold">{preview.sanityCheck.isBalanced ? "Analisi Preliminare: OK" : "Analisi Preliminare: Attenzione"}</h4>
                                        <p className="text-sm opacity-90 mt-1">
                                            {preview.sanityCheck.isBalanced
                                                ? "I dati principali sembrano coerenti. Verifica comunque i valori qui sotto prima di confermare."
                                                : "Sono state rilevate potenziali anomalie. Controlla i messaggi di avviso."}
                                        </p>
                                        {preview.sanityCheck.warnings.length > 0 && (
                                            <ul className="list-disc list-inside text-sm mt-2 ml-1 space-y-1">
                                                {preview.sanityCheck.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* AI Commentary Box */}
                                <div className="bg-violet-50 border border-violet-100 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2 text-violet-800 font-semibold">
                                        <Info className="w-5 h-5" />
                                        <span>Parere dell'AI CFO</span>
                                    </div>
                                    <p className="text-sm text-violet-900 italic">
                                        "{preview.commentary || 'Nessun commento disponibile.'}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {["Ricavi", "Costi", "EBITDA", "Risultato"].map((label) => {
                                        const key = label.toLowerCase() as keyof typeof manualKpis;
                                        return (
                                            <Card key={key}>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <Input
                                                        value={manualKpis[key]}
                                                        onChange={(e) => setManualKpis(prev => ({ ...prev, [key]: e.target.value }))}
                                                        className="font-bold text-lg"
                                                    />
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        Rilevato: {formatCurrency(preview.kpis[key])}
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between border-t pt-6">
                            <Button variant="outline" onClick={resetWizard}>Annulla e Ricarica</Button>
                            <Button size="lg" onClick={handleConfirmImport} disabled={loading} className="gap-2">
                                {loading ? "Salvataggio..." : "Conferma e Importa Dati"} <ArrowRight className="w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>

            {/* DIALOG REGISTRAZIONE NUOVA AZIENDA */}
            <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nuova Azienda Rilevata</DialogTitle>
                        <DialogDescription>
                            Sembra che tu stia importando un file per <strong>"{detectedName}"</strong>.
                            Questa azienda non esiste ancora nel sistema. Vuoi crearla?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Nome Azienda</Label>
                        <Input
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRegistrationDialog(false)}>Annulla</Button>
                        <Button onClick={handleRegisterCompany} disabled={loading}>
                            {loading ? "Creazione..." : (
                                <>
                                    <Building className="mr-2 h-4 w-4" />
                                    Crea e Continua
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
