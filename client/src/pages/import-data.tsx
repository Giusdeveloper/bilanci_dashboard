import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

import { useFinancialData } from "@/contexts/FinancialDataContext";
import LedgerMappingDialog from "@/components/LedgerMappingDialog";
import { parseIncompleteStubWarnings, parseUnmappedAccountWarnings } from "@/data/ledgerMappings";
import { fetchDrafts, fetchOpenDraftForPeriod, type DraftEdit } from "@/data/draftEdits";

import PageHeader from "@/components/PageHeader";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";

import { Separator } from "@/components/ui/separator";

import { FileSpreadsheet, CheckCircle2, AlertTriangle, Info, ShieldCheck, BookOpen, Link2, MapPin } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";

import { formatCurrency } from "@/data/financialData";
import { resolveCompanyCeProfileLabel } from "@/data/companyCeProfile";

import {

    importBilancio,

    HEADLINE_KPIS,

    BILANCINO_KPIS,

    IMPORT_KIND_LABELS,

    RESOLVED_KIND_LABELS,

    isBilancinoPreview,

    type ImportPreview,

    type ImportKind,

} from "@/data/importBilancio";

import {
    previewPartitariImport,
    savePartitariImport,
    type PartitariPreview,
} from "@/data/importPartitari";



const MONTH_LABELS = [

    "", "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",

    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",

];



type UploadKind = ImportKind | "partitari";

const UPLOAD_KIND_LABELS: Record<UploadKind, string> = {
    ...IMPORT_KIND_LABELS,
    partitari: "Export partitario (CSV/XLSX)",
};

const COMPARE_KEY_LABELS: Record<string, string> = {

    totaleRicavi: "Ricavi",

    totaleCosti: "Costi",

    risultatoEsercizio: "Risultato",

    ebitda: "EBITDA",

};



export default function ImportData({ embedded = false, editorMode = false }: { embedded?: boolean; editorMode?: boolean }) {

    const { companies, selectedCompany, setSelectedCompany, saveFinancialData } = useFinancialData();

    const { toast } = useToast();

    const [loading, setLoading] = useState(false);

    const [confirming, setConfirming] = useState(false);

    const [creatingStubs, setCreatingStubs] = useState(false);

    const [step, setStep] = useState<"upload" | "preview">("upload");

    const [preview, setPreview] = useState<ImportPreview | null>(null);

    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const [uploadKind, setUploadKind] = useState<UploadKind>("auto");
    const [partitariPreview, setPartitariPreview] = useState<PartitariPreview | null>(null);

    const [publishFacts, setPublishFacts] = useState(false);

    const [replaceExisting, setReplaceExisting] = useState(false);

    const [mappingDialogOpen, setMappingDialogOpen] = useState(false);

    const [mappingPrefill, setMappingPrefill] = useState<{
        accountCode: string;
        accountDescription: string | null;
    } | undefined>();

    const [openDrafts, setOpenDrafts] = useState<DraftEdit[]>([]);
    const [periodDraft, setPeriodDraft] = useState<DraftEdit | null>(null);

    useEffect(() => {
        if (!selectedCompany) {
            setOpenDrafts([]);
            setPeriodDraft(null);
            return;
        }
        fetchDrafts(selectedCompany.id, "draft")
            .then(setOpenDrafts)
            .catch(() => setOpenDrafts([]));
    }, [selectedCompany]);

    useEffect(() => {
        if (!selectedCompany || !preview?.year || preview.referenceMonth == null) {
            setPeriodDraft(null);
            return;
        }
        fetchOpenDraftForPeriod(selectedCompany.id, preview.year, preview.referenceMonth)
            .then(setPeriodDraft)
            .catch(() => setPeriodDraft(null));
    }, [selectedCompany, preview?.year, preview?.referenceMonth]);

    const resetWizard = () => {

        setStep("upload");

        setPreview(null);

        setPartitariPreview(null);

        setPendingFile(null);

        setPublishFacts(false);

        setReplaceExisting(false);

    };



    const processFile = async (file: File) => {

        if (!selectedCompany) {

            toast({ title: "Seleziona prima un'azienda", variant: "destructive" });

            return;

        }

        setLoading(true);

        setPendingFile(file);

        try {

            if (uploadKind === "partitari") {

                const result = await previewPartitariImport(file);

                setPartitariPreview(result);

                setPreview(null);

                setStep("preview");

                return;

            }

            const result = await importBilancio({

                file,

                companyId: selectedCompany.id,

                dryRun: true,

                importKind: uploadKind as ImportKind,

                publishFacts,

                replaceExisting,

            });

            setPreview(result);

            setPartitariPreview(null);

            setStep("preview");

        } catch (error) {

            console.error(error);

            toast({

                title: "Errore in fase di anteprima",

                description: (error as Error).message,

                variant: "destructive",

            });

            resetWizard();

        } finally {

            setLoading(false);

        }

    };



    const handleConfirmImport = async () => {

        if (!selectedCompany || !pendingFile) return;

        setConfirming(true);

        try {

            if (uploadKind === "partitari" && partitariPreview) {

                await savePartitariImport(saveFinancialData, selectedCompany.id, partitariPreview);

                toast({

                    title: "Partitario importato",

                    description: `${partitariPreview.rowCount} righe CE salvate per ${partitariPreview.periodLabel}.`,

                });

                resetWizard();

                return;

            }

            const result = await importBilancio({

                file: pendingFile,

                companyId: selectedCompany.id,

                dryRun: false,

                importKind: uploadKind as ImportKind,

                publishFacts,

                replaceExisting,

            });

            if (isBilancinoPreview(result)) {

                toast({

                    title: "Bilancino importato",

                    description: `Caricati ${result.import?.accountBalances ?? 0} saldi contabili${result.import?.facts ? `, ${result.import.facts} KPI pubblicati` : ""}.`,

                });

            } else {

                toast({

                    title: "Importazione completata",

                    description: `Caricati ${result.import?.facts ?? 0} valori (${result.import?.layout ?? 0} righe di layout).`,

                });

            }

            resetWizard();

        } catch (error) {

            console.error(error);

            toast({

                title: "Errore in fase di salvataggio",

                description: (error as Error).message,

                variant: "destructive",

            });

        } finally {

            setConfirming(false);

        }

    };



    const errorWarnings = preview?.warnings.filter((w) =>
        w.severity === "error"
        && !w.message.includes("non mappati in ledger_account_mappings")
        && !w.message.includes("mapping stub da completare")
        && !w.message.startsWith("Conto bilancino non mappato in ledger:")
        && !w.message.startsWith("Mapping incompleto per conto")
    ) ?? [];

    const otherWarnings = preview?.warnings.filter((w) => w.severity !== "error") ?? [];

    const isBilancino = preview ? isBilancinoPreview(preview) : false;

    const importBlocked = Boolean(
        preview && (
            (isBilancinoPreview(preview) && (
                preview.blocked
                || preview.unmappedAccounts > 0
                || (preview.incompleteStubs ?? 0) > 0
            ))
            || (preview.counts.errors ?? 0) > 0
        ),
    );

    const failedQuadratureChecks = preview && isBilancinoPreview(preview)
        ? (preview.quadratureChecks ?? []).filter((c) => !c.ok && c.extracted != null && c.rollup != null)
        : [];

    const mappingBlockHref = selectedCompany
        ? `${editorMode ? '/editor/ledger-mappings' : '/ledger-mappings'}?filter=incomplete&company=${encodeURIComponent(selectedCompany.slug)}`
        : `${editorMode ? '/editor/ledger-mappings' : '/ledger-mappings'}?filter=incomplete`;

    const headlineKpis = isBilancino ? BILANCINO_KPIS : HEADLINE_KPIS;

    const unmappedAccounts = useMemo(
        () => (preview ? parseUnmappedAccountWarnings(preview.warnings) : []),
        [preview],
    );

    const incompleteStubAccounts = useMemo(
        () => (preview ? parseIncompleteStubWarnings(preview.warnings) : []),
        [preview],
    );

    const openMapAccount = (accountCode: string, description: string) => {
        setMappingPrefill({ accountCode, accountDescription: description });
        setMappingDialogOpen(true);
    };

    const mappingsPageHref = selectedCompany
        ? `${editorMode ? '/editor/ledger-mappings' : '/ledger-mappings'}?company=${encodeURIComponent(selectedCompany.slug)}`
        : (editorMode ? '/editor/ledger-mappings' : '/ledger-mappings');

    const bulkMappingsHref = selectedCompany
        ? `${editorMode ? '/editor/ledger-mappings' : '/ledger-mappings'}?company=${encodeURIComponent(selectedCompany.slug)}&filter=incomplete`
        : `${editorMode ? '/editor/ledger-mappings' : '/ledger-mappings'}?filter=incomplete`;

    const handleCreateStubs = async () => {
        if (!selectedCompany || !pendingFile || uploadKind === "partitari") return;
        setCreatingStubs(true);
        try {
            const result = await importBilancio({
                file: pendingFile,
                companyId: selectedCompany.id,
                dryRun: true,
                importKind: uploadKind as ImportKind,
                publishFacts,
                replaceExisting,
                createMappingStubs: true,
            });
            setPreview(result);
            const created = isBilancinoPreview(result) ? (result.stubsCreated ?? 0) : 0;
            toast({
                title: created > 0 ? "Stub creati" : "Nessun nuovo stub",
                description: created > 0
                    ? `Creati ${created} mapping stub. Completa famiglia e analitica, poi ricarica l'anteprima.`
                    : "Tutti i conti erano già presenti nei mapping.",
            });
        } catch (error) {
            toast({
                title: "Errore creazione stub",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setCreatingStubs(false);
        }
    };



    return (

        <div className={embedded ? "space-y-8" : "space-y-8 p-6 animate-in fade-in duration-500 font-sans"}>

            {!embedded && (
            <PageHeader title="Importa Dati" subtitle="Excel analisi CE, bilancino mensile e export partitario" />
            )}

            {(periodDraft || openDrafts.length > 0) && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-900">
                        <p className="font-bold">Bozza di modifica aperta</p>
                        {periodDraft ? (
                            <p>
                                Esiste una bozza attiva per{" "}
                                <span className="font-medium">
                                    {MONTH_LABELS[periodDraft.month ?? 0]} {periodDraft.year}
                                </span>
                                . Un nuovo import potrebbe sovrascrivere i dati pubblicati del periodo.
                            </p>
                        ) : (
                            <p>
                                {openDrafts.length === 1
                                    ? "Esiste una bozza aperta per questa azienda."
                                    : `Esistono ${openDrafts.length} bozze aperte per questa azienda.`}
                            </p>
                        )}
                        <Link href={editorMode ? "/editor/ledger-balances" : "/editor/ledger-balances"} className="text-amber-800 underline font-medium mt-1 inline-block">
                            Apri editor bilancio
                        </Link>
                    </div>
                </div>
            )}

            <div className="flex items-start gap-3 bg-imm-signal-teal/10 border border-imm-signal-teal/20 rounded-xl p-4">

                <ShieldCheck className="w-5 h-5 text-imm-signal-teal flex-shrink-0 mt-0.5" />

                <div className="text-sm text-imm-blue-dark">

                    <p className="font-bold">Import server-side idempotente</p>

                    <p>

                        Il file viene elaborato dalla pipeline ETL su Supabase: rilevamento automatico del

                        tipo (analisi CE o bilancino contabile), estrazione e validazione, anteprima con KPI

                        e avvisi, caricamento idempotente. Il bilancino salva i saldi in{" "}

                        <span className="font-medium">account_balances</span> senza sovrascrivere i dati CE esistenti.

                    </p>

                </div>

            </div>



            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                <Card className="md:col-span-1 border-none shadow-lg bg-white/50 backdrop-blur-sm">

                    <CardHeader><CardTitle className="font-heading text-imm-blue-dark">1. Carica File</CardTitle></CardHeader>

                    <CardContent className="space-y-6">

                        {!embedded && (
                        <div className="space-y-1">

                            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Azienda</Label>

                            <Select value={selectedCompany?.id || ""} onValueChange={(val) => setSelectedCompany(companies.find(c => c.id === val) || null)}>

                                <SelectTrigger className="h-12 border-imm-neutral-mid"><SelectValue placeholder="Seleziona Azienda" /></SelectTrigger>

                                <SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>

                            </Select>

                        </div>
                        )}

                        {embedded && selectedCompany && (
                        <div className="rounded-lg bg-imm-neutral-base px-3 py-2 text-sm text-imm-blue-dark">
                            Azienda: <strong>{selectedCompany.name}</strong>
                        </div>
                        )}

                        <div className="space-y-1">

                            <Label className="text-xs font-bold text-imm-blue-dark/60 uppercase">Tipo file</Label>

                            <Select value={uploadKind} onValueChange={(v) => setUploadKind(v as UploadKind)}>

                                <SelectTrigger className="h-12 border-imm-neutral-mid">

                                    <SelectValue />

                                </SelectTrigger>

                                <SelectContent>

                                    {(Object.keys(UPLOAD_KIND_LABELS) as UploadKind[]).map((k) => (

                                        <SelectItem key={k} value={k}>{UPLOAD_KIND_LABELS[k]}</SelectItem>

                                    ))}

                                </SelectContent>

                            </Select>

                            <p className="text-xs text-imm-blue-dark/50">

                                {uploadKind === "partitari"
                                    ? "Export PARTITARIO dal gestionale (CodiceConto, Data_registraz, ecc.)."
                                    : "Lascia su automatico per rilevare il template dal file."}

                            </p>

                        </div>

                        <div className="border-2 border-dashed border-imm-trust-blue/30 rounded-xl p-10 text-center relative hover:bg-imm-blue/5 transition-all cursor-pointer group">

                            <input

                                type="file"

                                accept={uploadKind === "partitari" ? ".xlsx,.xls,.csv" : ".xlsx, .xls"}

                                disabled={!selectedCompany || loading}

                                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; }}

                                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"

                            />

                            <FileSpreadsheet className="mx-auto h-12 w-12 text-imm-trust-blue mb-4 group-hover:scale-110 transition-transform" />

                            <p className="text-sm font-bold text-imm-blue-dark">

                                {loading ? "Analisi in corso..." : "Trascina o clicca per caricare"}

                            </p>

                            {!selectedCompany && <p className="text-xs text-imm-blue-dark/50 mt-2">Seleziona prima un'azienda</p>}

                        </div>

                    </CardContent>

                </Card>



                {step === "preview" && partitariPreview && (

                    <Card className="md:col-span-2 border-none shadow-2xl bg-white animate-in slide-in-from-right duration-500">

                        <CardHeader className="bg-imm-blue-dark text-white rounded-t-xl">

                            <CardTitle className="font-heading flex items-center justify-between gap-4">

                                <span className="flex items-center gap-2">

                                    <BookOpen className="w-5 h-5" />

                                    2. Anteprima partitario

                                </span>

                                <span className="text-xs font-normal opacity-80 text-right">

                                    Export PARTITARIO

                                    <br />

                                    {partitariPreview.periodLabel}

                                </span>

                            </CardTitle>

                        </CardHeader>

                        <CardContent className="p-8 space-y-8">

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">

                                <div className="flex justify-between bg-imm-neutral-base rounded-lg px-4 py-3">

                                    <span className="text-imm-blue-dark/60">Righe CE</span>

                                    <span className="font-bold text-imm-blue-dark">{partitariPreview.rowCount}</span>

                                </div>

                                <div className="flex justify-between bg-imm-neutral-base rounded-lg px-4 py-3">

                                    <span className="text-imm-blue-dark/60">Conti CE</span>

                                    <span className="font-bold text-imm-blue-dark">{partitariPreview.ceAccountCount}</span>

                                </div>

                                <div className="flex justify-between bg-imm-neutral-base rounded-lg px-4 py-3">

                                    <span className="text-imm-blue-dark/60">Periodo</span>

                                    <span className="font-bold text-imm-blue-dark">{partitariPreview.periodLabel}</span>

                                </div>

                                <div className="flex justify-between bg-imm-neutral-base rounded-lg px-4 py-3">

                                    <span className="text-imm-blue-dark/60">Colonne</span>

                                    <span className="font-bold text-imm-blue-dark">{partitariPreview.headers.length}</span>

                                </div>

                            </div>

                            <div className="flex items-center gap-4 bg-imm-signal-teal/10 p-4 rounded-xl border border-imm-signal-teal/20">

                                <CheckCircle2 className="w-6 h-6 text-imm-signal-teal" />

                                <p className="text-sm font-medium text-imm-blue-dark">

                                    File riconosciuto. Verranno salvati solo i movimenti sui conti economici (58–88).

                                    Dopo la conferma consulta la vista{" "}

                                    <Link href="/partitari" className="underline font-semibold">Partitari</Link>.

                                </p>

                            </div>

                        </CardContent>

                        <CardFooter className="bg-imm-neutral-base p-6 rounded-b-xl flex justify-between">

                            <Button variant="ghost" onClick={resetWizard} disabled={confirming}>Annulla</Button>

                            <Button

                                onClick={handleConfirmImport}

                                className="bg-imm-yellow text-imm-blue-dark hover:bg-imm-yellow-dark px-10 h-12 text-lg"

                                disabled={confirming}

                            >

                                {confirming ? "Salvataggio..." : "Conferma partitario"}

                            </Button>

                        </CardFooter>

                    </Card>

                )}



                {step === "preview" && preview && !partitariPreview && (

                    <Card className="md:col-span-2 border-none shadow-2xl bg-white animate-in slide-in-from-right duration-500">

                        <CardHeader className="bg-imm-blue-dark text-white rounded-t-xl">

                            <CardTitle className="font-heading flex items-center justify-between gap-4">

                                <span className="flex items-center gap-2">

                                    {isBilancino && <BookOpen className="w-5 h-5" />}

                                    2. Anteprima Import

                                </span>

                                <span className="text-xs font-normal opacity-80 text-right">

                                    {RESOLVED_KIND_LABELS[preview.importKind]} · {preview.profile}
                                    {selectedCompany && (
                                        <> · CE {resolveCompanyCeProfileLabel(selectedCompany)}</>
                                    )}

                                    <br />

                                    {MONTH_LABELS[preview.referenceMonth ?? 0] || "—"} {preview.year}

                                </span>

                            </CardTitle>

                        </CardHeader>

                        <CardContent className="p-8 space-y-8">

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">

                                {headlineKpis.map(({ label, key }) => (

                                    <div key={key} className="space-y-2">

                                        <Label className="text-[10px] font-bold text-imm-blue-dark/40 uppercase tracking-widest">{label}</Label>

                                        <div className="text-2xl font-bold font-heading text-imm-blue-dark">{formatCurrency(preview.kpis[key] ?? 0)}</div>

                                    </div>

                                ))}

                            </div>



                            <Separator />



                            {isBilancinoPreview(preview) ? (

                                <>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">

                                        <div className="flex justify-between bg-imm-neutral-base rounded-lg px-4 py-3">

                                            <span className="text-imm-blue-dark/60">Conti CE</span>

                                            <span className="font-bold text-imm-blue-dark">{preview.accountsCount}</span>

                                        </div>

                                        <div className={`flex justify-between rounded-lg px-4 py-3 ${preview.unmappedAccounts > 0 ? "bg-red-50 border border-red-200" : "bg-imm-neutral-base"}`}>

                                            <span className={preview.unmappedAccounts > 0 ? "text-red-800" : "text-imm-blue-dark/60"}>Conti non mappati</span>

                                            <span className={`font-bold ${preview.unmappedAccounts > 0 ? "text-red-700" : "text-imm-blue-dark"}`}>

                                                {preview.unmappedAccounts}

                                            </span>

                                        </div>

                                    </div>



                                    {(preview.unmappedAccounts > 0 || (preview.incompleteStubs ?? 0) > 0) && (

                                        <div className="space-y-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">

                                            <div className="flex items-start gap-3">

                                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />

                                                <div className="flex-1">

                                                    <p className="font-bold">Mapping ledger incompleto — import bloccato</p>

                                                    <p className="mt-1">

                                                        {preview.unmappedAccounts > 0
                                                            ? "Crea stub automatici dai conti scoperti, completa famiglia e analitica CE, poi ricarica l'anteprima."
                                                            : "Completa i mapping stub (famiglia + analitica CE), poi ricarica l'anteprima."}

                                                    </p>

                                                    <div className="flex flex-wrap gap-2 mt-3">

                                                        {preview.unmappedAccounts > 0 && (

                                                            <Button

                                                                type="button"

                                                                size="sm"

                                                                variant="outline"

                                                                className="border-red-300 text-red-900 hover:bg-red-100"

                                                                disabled={creatingStubs}

                                                                onClick={handleCreateStubs}

                                                            >

                                                                {creatingStubs
                                                                    ? "Creazione stub..."
                                                                    : `Crea stub automatici (${preview.unmappedAccounts})`}

                                                            </Button>

                                                        )}

                                                        {(preview.incompleteStubs ?? incompleteStubAccounts.length) > 0 && (

                                                            <Link href={bulkMappingsHref}>

                                                                <Button

                                                                    type="button"

                                                                    size="sm"

                                                                    className="bg-red-800 text-white hover:bg-red-900"

                                                                >

                                                                    <Link2 className="w-3.5 h-3.5 mr-1.5" />

                                                                    Completa mapping ({preview.incompleteStubs ?? incompleteStubAccounts.length})

                                                                </Button>

                                                            </Link>

                                                        )}

                                                        <Link

                                                            href={mappingsPageHref}

                                                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-900 underline underline-offset-2 hover:text-red-700 self-center"

                                                        >

                                                            Mapping conti

                                                        </Link>

                                                    </div>

                                                    {isBilancinoPreview(preview) && (preview.stubsCreated ?? 0) > 0 && (

                                                        <p className="mt-2 text-red-700/80">

                                                            Ultima operazione: creati {preview.stubsCreated} stub in piattaforma.

                                                        </p>

                                                    )}

                                                </div>

                                            </div>



                                            {(unmappedAccounts.length > 0 || incompleteStubAccounts.length > 0) && (

                                                <div className="rounded-lg border border-red-200 bg-white overflow-hidden">

                                                    <table className="w-full text-sm">

                                                        <thead className="bg-red-100/60 text-left text-red-900/70">

                                                            <tr>

                                                                <th className="px-4 py-2 font-medium">Conto</th>

                                                                <th className="px-4 py-2 font-medium">Descrizione</th>

                                                                <th className="px-4 py-2 font-medium">Stato</th>

                                                                <th className="px-4 py-2 font-medium text-right">Azione</th>

                                                            </tr>

                                                        </thead>

                                                        <tbody>

                                                            {unmappedAccounts.map((acc) => (

                                                                <tr key={`u-${acc.accountCode}`} className="border-t border-red-100">

                                                                    <td className="px-4 py-2 font-mono">{acc.accountCode}</td>

                                                                    <td className="px-4 py-2">{acc.description}</td>

                                                                    <td className="px-4 py-2 text-amber-700">Non mappato</td>

                                                                    <td className="px-4 py-2 text-right">

                                                                        <Button

                                                                            type="button"

                                                                            size="sm"

                                                                            variant="outline"

                                                                            className="border-red-300 text-red-900 hover:bg-red-50"

                                                                            onClick={() => openMapAccount(acc.accountCode, acc.description)}

                                                                        >

                                                                            <MapPin className="w-3.5 h-3.5 mr-1.5" />

                                                                            Mappa ora

                                                                        </Button>

                                                                    </td>

                                                                </tr>

                                                            ))}

                                                            {incompleteStubAccounts.map((acc) => (

                                                                <tr key={`s-${acc.accountCode}`} className="border-t border-red-100">

                                                                    <td className="px-4 py-2 font-mono">{acc.accountCode}</td>

                                                                    <td className="px-4 py-2">{acc.description}</td>

                                                                    <td className="px-4 py-2 text-red-700">Stub da completare</td>

                                                                    <td className="px-4 py-2 text-right">

                                                                        <Link href={`${bulkMappingsHref}&account=${encodeURIComponent(acc.accountCode)}`}>

                                                                            <Button

                                                                                type="button"

                                                                                size="sm"

                                                                                variant="outline"

                                                                                className="border-red-300 text-red-900 hover:bg-red-50"

                                                                            >

                                                                                Completa

                                                                            </Button>

                                                                        </Link>

                                                                    </td>

                                                                </tr>

                                                            ))}

                                                        </tbody>

                                                    </table>

                                                </div>

                                            )}

                                        </div>

                                    )}



                                    <div className="space-y-3">

                                        <Label className="text-[10px] font-bold text-imm-blue-dark/40 uppercase tracking-widest">Quadratura bilancino (natura economica)</Label>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">

                                            {[

                                                { label: "Totale ricavi", value: preview.quadrature.totaleRicavi },

                                                { label: "Totale costi", value: preview.quadrature.totaleCosti },

                                                { label: "Risultato", value: preview.quadrature.risultato },

                                            ].map(({ label, value }) => (

                                                <div key={label} className="bg-imm-neutral-base rounded-lg px-4 py-3">

                                                    <div className="text-imm-blue-dark/60 text-xs">{label}</div>

                                                    <div className="font-bold text-imm-blue-dark">{value != null ? formatCurrency(value) : "n/d"}</div>

                                                </div>

                                            ))}

                                        </div>

                                    </div>



                                    {(importBlocked || failedQuadratureChecks.length > 0) && (

                                        <div className="space-y-4 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">

                                            <div className="flex items-start gap-3">

                                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />

                                                <div className="flex-1 space-y-2">

                                                    <p className="font-bold">Import bloccato — quadratura o mapping incompleto</p>

                                                    <p>

                                                        Prima di pubblicare i KPI verifica che tutti i conti CE siano mappati

                                                        e che ricavi, costi e risultato del rollup coincidano con i totali per natura economica
                                                        (58/64 ricavi; storni 66–88 restano costi anche se in colonna ricavi del layout).

                                                    </p>

                                                    <ol className="list-decimal list-inside space-y-1 text-red-900/90">

                                                        <li>Apri <span className="font-medium">Mapping conti</span> e completa famiglia + analitica CE per gli stub.</li>

                                                        <li>Controlla storni/crediti su 66/, 68/, 88/: non devono essere mappati come ricavi.</li>

                                                        <li>Ricarica l&apos;anteprima del file bilancino.</li>

                                                    </ol>

                                                    {(isBilancinoPreview(preview) && (preview.errors?.length ?? 0) > 0) && (

                                                        <ul className="mt-2 space-y-1 text-xs font-mono bg-red-100/60 rounded p-2">

                                                            {preview.errors!.slice(0, 5).map((err) => (

                                                                <li key={err}>{err}</li>

                                                            ))}

                                                        </ul>

                                                    )}

                                                    <div className="flex flex-wrap gap-2 pt-2">

                                                        <Link href={mappingBlockHref}>

                                                            <Button

                                                                type="button"

                                                                size="sm"

                                                                className="bg-red-800 text-white hover:bg-red-900"

                                                            >

                                                                <Link2 className="w-3.5 h-3.5 mr-1.5" />

                                                                Modifica mapping

                                                            </Button>

                                                        </Link>

                                                        <Link href="/editor/ledger-balances">

                                                            <Button type="button" size="sm" variant="outline" className="border-red-300 text-red-900 hover:bg-red-100">

                                                                Editor bilancio

                                                            </Button>

                                                        </Link>

                                                    </div>

                                                </div>

                                            </div>



                                            {failedQuadratureChecks.length > 0 && (

                                                <div className="overflow-x-auto rounded-lg border border-red-200 bg-white">

                                                    <table className="w-full text-sm">

                                                        <thead className="bg-red-100/60 text-left text-red-900/70">

                                                            <tr>

                                                                <th className="px-4 py-2 font-medium">Voce</th>

                                                                <th className="px-4 py-2 font-medium text-right">Bilancino</th>

                                                                <th className="px-4 py-2 font-medium text-right">Rollup KPI</th>

                                                                <th className="px-4 py-2 font-medium text-right">Δ</th>

                                                            </tr>

                                                        </thead>

                                                        <tbody>

                                                            {failedQuadratureChecks.map((row) => (

                                                                <tr key={row.key} className="border-t border-red-100">

                                                                    <td className="px-4 py-2">{row.label}</td>

                                                                    <td className="px-4 py-2 text-right font-mono">

                                                                        {row.extracted != null ? formatCurrency(row.extracted) : "—"}

                                                                    </td>

                                                                    <td className="px-4 py-2 text-right font-mono">

                                                                        {row.rollup != null ? formatCurrency(row.rollup) : "—"}

                                                                    </td>

                                                                    <td className="px-4 py-2 text-right font-mono font-bold text-red-700">

                                                                        {row.delta != null ? formatCurrency(row.delta) : "—"}

                                                                    </td>

                                                                </tr>

                                                            ))}

                                                        </tbody>

                                                    </table>

                                                </div>

                                            )}

                                        </div>

                                    )}



                                    {preview.compareDiff.length > 0 && (

                                        <div className="space-y-3">

                                            <Label className="text-[10px] font-bold text-imm-blue-dark/40 uppercase tracking-widest">

                                                Confronto vs dati CE in piattaforma

                                            </Label>

                                            <div className="overflow-x-auto rounded-lg border border-imm-neutral-mid">

                                                <table className="w-full text-sm">

                                                    <thead className="bg-imm-neutral-base text-imm-blue-dark/60 text-left">

                                                        <tr>

                                                            <th className="px-4 py-2 font-medium">KPI</th>

                                                            <th className="px-4 py-2 font-medium text-right">Bilancino</th>

                                                            <th className="px-4 py-2 font-medium text-right">CE in DB</th>

                                                            <th className="px-4 py-2 font-medium text-right">Delta</th>

                                                        </tr>

                                                    </thead>

                                                    <tbody>

                                                        {preview.compareDiff.map((row) => (

                                                            <tr key={row.key} className="border-t border-imm-neutral-mid/50">

                                                                <td className="px-4 py-2 text-imm-blue-dark">{COMPARE_KEY_LABELS[row.key] ?? row.key}</td>

                                                                <td className="px-4 py-2 text-right font-mono">{row.bilancino != null ? formatCurrency(row.bilancino) : "—"}</td>

                                                                <td className="px-4 py-2 text-right font-mono">{row.database != null ? formatCurrency(row.database) : "—"}</td>

                                                                <td className={`px-4 py-2 text-right font-mono font-bold ${row.ok ? "text-imm-signal-teal" : row.delta != null ? "text-amber-600" : ""}`}>

                                                                    {row.delta != null ? formatCurrency(row.delta) : "—"}

                                                                </td>

                                                            </tr>

                                                        ))}

                                                    </tbody>

                                                </table>

                                            </div>

                                        </div>

                                    )}

                                </>

                            ) : (

                                <div className="grid grid-cols-2 gap-4 text-sm">

                                    <div className="flex justify-between bg-imm-neutral-base rounded-lg px-4 py-3">

                                        <span className="text-imm-blue-dark/60">Valori annuali</span>

                                        <span className="font-bold text-imm-blue-dark">{preview.counts.factsAnnual}</span>

                                    </div>

                                    <div className="flex justify-between bg-imm-neutral-base rounded-lg px-4 py-3">

                                        <span className="text-imm-blue-dark/60">Valori mensili</span>

                                        <span className="font-bold text-imm-blue-dark">{preview.counts.factsMonthly}</span>

                                    </div>

                                </div>

                            )}



                            {errorWarnings.length > 0 && (

                                <div className="space-y-2">

                                    {errorWarnings.map((w, i) => (

                                        <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">

                                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />

                                            <span>{w.message}</span>

                                        </div>

                                    ))}

                                </div>

                            )}



                            {otherWarnings.length > 0 ? (

                                <div className="space-y-2 max-h-48 overflow-y-auto">

                                    <Label className="text-[10px] font-bold text-imm-blue-dark/40 uppercase tracking-widest">Avvisi ({otherWarnings.length})</Label>

                                    {otherWarnings.map((w, i) => (

                                        <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">

                                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />

                                            <span>{w.message}</span>

                                        </div>

                                    ))}

                                </div>

                            ) : errorWarnings.length === 0 && (

                                <div className="flex items-center gap-4 bg-imm-signal-teal/10 p-4 rounded-xl border border-imm-signal-teal/20">

                                    <CheckCircle2 className="w-6 h-6 text-imm-signal-teal" />

                                    <p className="text-sm font-medium text-imm-blue-dark">

                                        {isBilancino

                                            ? "Nessun avviso bloccante: quadratura OK e tutti i conti mappati."

                                            : "Nessun avviso: tutte le voci sono state mappate e le quadrature tornano."}

                                    </p>

                                </div>

                            )}

                        </CardContent>

                        {isBilancino && (

                            <div className="px-8 pb-4 space-y-3 border-t border-imm-neutral-mid/30 pt-6">

                                <div className="flex items-center gap-3">

                                    <Checkbox

                                        id="publish-facts"

                                        checked={publishFacts}

                                        onCheckedChange={(v) => setPublishFacts(v === true)}

                                    />

                                    <Label htmlFor="publish-facts" className="text-sm text-imm-blue-dark cursor-pointer">

                                        Pubblica KPI in dashboard (scrive in financial_facts)

                                    </Label>

                                </div>

                                {publishFacts && (

                                    <div className="flex items-center gap-3 ml-7">

                                        <Checkbox

                                            id="replace-existing"

                                            checked={replaceExisting}

                                            onCheckedChange={(v) => setReplaceExisting(v === true)}

                                        />

                                        <Label htmlFor="replace-existing" className="text-sm text-imm-blue-dark/80 cursor-pointer">

                                            Sostituisci dati CE esistenti per lo stesso periodo

                                        </Label>

                                    </div>

                                )}

                            </div>

                        )}



                        <CardFooter className="bg-imm-neutral-base p-6 rounded-b-xl flex justify-between">

                            <Button variant="ghost" onClick={resetWizard} disabled={confirming}>Annulla</Button>

                            <Button

                                onClick={handleConfirmImport}

                                className="bg-imm-yellow text-imm-blue-dark hover:bg-imm-yellow-dark px-10 h-12 text-lg"

                                disabled={confirming || importBlocked}

                            >

                                {confirming ? "Salvataggio..." : isBilancino ? "Conferma bilancino" : "Conferma e Importa"}

                            </Button>

                        </CardFooter>

                    </Card>

                )}

            </div>



            {selectedCompany && (

                <LedgerMappingDialog

                    open={mappingDialogOpen}

                    onOpenChange={setMappingDialogOpen}

                    companyId={selectedCompany.id}

                    initial={mappingPrefill}

                    onSaved={() => {

                        toast({

                            title: "Mapping salvato",

                            description: "Ricarica il file bilancino per verificare l'import.",

                        });

                    }}

                />

            )}

        </div>

    );

}


