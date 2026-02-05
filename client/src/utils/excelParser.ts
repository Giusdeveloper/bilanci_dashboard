
import * as XLSX from 'xlsx';
import { EXCEL_ROW_MAP } from './excelMapper';

// Helper: Clean number string to float
const cleanNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const clean = val.replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};

// Helper: Get internal key from label
const getKey = (label: any): string | null => {
    if (!label) return null;
    const strLabel = String(label).trim();

    // 1. Exact match via map
    if (EXCEL_ROW_MAP[strLabel]) return EXCEL_ROW_MAP[strLabel];

    // 2. Fuzzy / Smart match replacements
    const cleanLabel = strLabel.toUpperCase().replace(/\s+/g, ' ');
    const labelLower = strLabel.toLowerCase().replace(/\s+/g, '');

    // Sherpa42 Specific Mappings
    if (labelLower.includes('costiboard')) return "compensiAmministratore";
    if (labelLower.includes('costoit') || labelLower.includes('tool')) return "serviziInformatici";
    if (labelLower.includes('spesecommercialie') || labelLower.includes('spesecommerciali')) return "speseCommerciali";
    if (labelLower.includes('spesedistruttura')) return "speseStruttura";
    if (labelLower.includes('speseperbenefit')) return "personale";
    if (labelLower.includes('ricavidaconsulenza') || labelLower.includes('ricavicaratteristici') || labelLower.includes('1-totalericavi')) return "ricaviCaratteristici";

    // Generic Mappings
    if (cleanLabel.includes("TOTALE RICAVI")) return "totaleRicavi";
    if (cleanLabel.includes("RISULTATO") && cleanLabel.includes("ESERCIZIO")) return "risultatoEsercizio";
    if (cleanLabel.includes("UTILE") && cleanLabel.includes("PERDITA")) return "risultatoEsercizio";
    if (cleanLabel === "AMMORTAMENTI") return "ammortamenti";
    if (cleanLabel.includes("EBITDA") || cleanLabel.includes("MARGINEMOL")) return "ebitda";
    if (cleanLabel.includes("EBIT") && !cleanLabel.includes("EBITDA")) return "ebit";

    // Sherpa42 Specific Mappings (Monthly Sheet)
    if (labelLower.includes('ricavidaconsulenza') || labelLower.includes('ricavidaattivitàdiconsulenza')) return "ricaviCaratteristici";
    if (labelLower.includes('ricavilegateadobiettivi') || labelLower.includes('obiettivivariabiali')) return "ricaviCaratteristici";

    // Ammortamenti & Gestione Finanziaria
    if (labelLower.includes('ammortamentiimmateriali')) return "ammortamenti"; // Map to main amortization key or specific if tracking separate
    if (labelLower.includes('ammortamentimateriali')) return "ammortamenti";
    if (labelLower.includes('svalutazionieaccantonamenti')) return "svalutazioni";

    // Try simplified key matching for Totals
    if (cleanLabel.includes("TOTALE COSTI FISSI")) return "totaleGestioneStruttura";
    if (cleanLabel.includes("TOTALECOSTIFISSI")) return "totaleGestioneStruttura";

    // Key Financials
    if (cleanLabel.includes("GESTIONE FINANZIARIA")) return "gestioneFinanziaria";
    if (cleanLabel.includes("EBIT") && !cleanLabel.includes("EBITDA")) return "ebit";
    if (cleanLabel.includes("RISULTATO") || cleanLabel.includes("UTILE") || cleanLabel.includes("EBT")) return "risultatoEsercizio";

    return null;
};

export class ExcelParser {
    workbook: XLSX.WorkBook;

    constructor(fileData: ArrayBuffer | string) {
        this.workbook = XLSX.read(fileData, { type: 'binary' });
    }

    // Detect Company Name from "1_CE dettaglio"
    detectCompanyName(): string | null {
        const sheetName = "1_CE dettaglio";
        if (!this.workbook.SheetNames.includes(sheetName)) return null;

        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Strategy: Scan first 5 rows for cell 0 or cell 1
        // Usually: "Azienda: MyCompany Srl" or just "MyCompany Srl" in bold at top
        for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
            const row: any = jsonData[i];
            if (!row) continue;

            // Check first few cells
            for (let j = 0; j < Math.min(row.length, 3); j++) {
                const cell = String(row[j]).trim();
                // Heuristic: Ignore empty, "Pagina", "Data", "Bilancio"
                if (cell && cell.length > 3
                    && !cell.toLowerCase().includes("pagina")
                    && !cell.toLowerCase().includes("data")
                    && !cell.toLowerCase().includes("bilancio")) {

                    // If label has "Azienda:", strip it
                    if (cell.toLowerCase().startsWith("azienda:")) {
                        return cell.substring(8).trim();
                    }
                    if (cell.toLowerCase().startsWith("società:")) {
                        return cell.substring(8).trim();
                    }

                    // Otherwise assume it might be the name if it's not a common header
                    if (!cell.match(/^\d+$/) && !cell.match(/^[0-9\/]+$/)) { // not a number or date
                        return cell;
                    }
                }
            }
        }
        return null;
    }

    // 1. Parse "1_CE dettaglio" (Yearly Comparison)
    parseCEDettaglio(): any {
        console.log("[ExcelParser] Existing sheets:", this.workbook.SheetNames);

        // Flexible sheet finding
        let sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase();
            return low.includes("1_ce dettaglio") ||
                (low.includes("dettaglio") && low.includes("ce")) ||
                low === "ce dettaglio" ||
                low === "economico dettaglio";
        });

        if (!sheetName) {
            console.warn("[ExcelParser] Could not find 'CE Dettaglio' sheet. Available:", this.workbook.SheetNames);
            return null;
        }

        console.log(`[ExcelParser] Parsing detail sheet: ${sheetName}`);
        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Logic found: 2025 in Col 2 (C), 2024 in Col 5 (F)
        // Dynamic search for columns - PRIORITIZE "Consuntivo" or "Actual" or "Progressivo"
        let col2025 = -1;
        let col2024 = -1;

        // Try to find columns dynamically with specificity
        const debugRowLogs: string[] = [];
        console.log(`[ExcelParser] Scanning ${sheetName} for headers...`);

        // Increased scan depth for Sherpa42 files which have top metadata
        for (let i = 0; i < Math.min(jsonData.length, 40); i++) {
            const row: any = jsonData[i];
            if (!row) continue;

            row.forEach((cell: any, idx: number) => {
                const s = String(cell).toUpperCase();

                // Cerca 2025
                if (s.includes("2025")) {
                    // Se non abbiamo ancora trovato nulla, prendilo come candidato
                    if (col2025 === -1) col2025 = idx;

                    // Se troviamo parole chiave forti, sovrascrivi (perché è sicuramente quello giusto)
                    if (s.includes("CONSUNTIVO") || s.includes("PROGRESSIVO") || s.includes("ACTUAL")) {
                        col2025 = idx;
                    }
                    // Attenzione: evitare "BUDGET" o "SC" (Scostamento) se possibile, ma per ora ci fidiamo del Consuntivo
                    if (s.includes("BUDGET")) {
                        // Se avevamo selezionato questa colonna solo perché aveva "2025", annulliamo se è budget
                        if (col2025 === idx) col2025 = -1;
                    }
                }

                // Cerca 2024
                if (s.includes("CONSUNTIVO") || s.includes("ACTUAL") || s.includes("12")) {
                    if (col2025 === -1) col2025 = idx;
                }

                // Cerca 2024
                if (s.includes("2024")) {
                    col2024 = idx;
                }
                if (s.includes("BUDGET") || s.includes("PRECEDENTE")) {
                    if (col2024 === -1) col2024 = idx;
                }
            });
        }

        // Context Update: If columns not found, try heuristics based on observed "Dicembre" columns
        if (col2025 === -1) {
            // Fallback: usually column C (index 2) or similar
            console.warn("[ExcelParser] Columns for 2025 not found explicitly. Using default index 2 (C).");
            col2025 = 2;
        }
        if (col2024 === -1) {
            console.warn("[ExcelParser] Columns for 2024 not found explicitly. Using default index 5 (F).");
            col2024 = 5;
        }

        console.log(`[ExcelParser] Columns Identified -> 2025: ${col2025}, 2024: ${col2024}`);

        const result2025: Record<string, number> = {};
        const result2024: Record<string, number> = {};

        jsonData.forEach((row: any) => {
            if (!row || row.length === 0) return;
            const label = row[0];
            const key = getKey(label);

            if (label && typeof label === 'string' && label.length > 5) { // Only log meaningful labels
                console.log(`[ExcelParser Debug] Label: "${label.substring(0, 30)}..." -> Key: ${key}`);
            }

            if (key) {
                result2025[key] = (result2025[key] || 0) + cleanNumber(row[col2025]);
                result2024[key] = (result2024[key] || 0) + cleanNumber(row[col2024]);
            }
        });

        // Add special "totaleRicavi" if missing (sum of parts) or map from specific keys
        if (!result2025.totaleRicavi && result2025.ricaviCaratteristici) {
            result2025.totaleRicavi = result2025.ricaviCaratteristici + (result2025.altriRicavi || 0);
            result2024.totaleRicavi = result2024.ricaviCaratteristici + (result2024.altriRicavi || 0);
        }

        // Infer Costi if missing (Ricavi - EBITDA)
        if (!result2025.totaleCostiDirettiIndiretti && result2025.totaleRicavi && result2025.ebitda !== undefined) {
            result2025.totaleCostiDirettiIndiretti = result2025.totaleRicavi - result2025.ebitda;
            result2024.totaleCostiDirettiIndiretti = result2024.totaleRicavi - result2024.ebitda;
        }

        return {
            progressivo2025: result2025,
            progressivo2024: result2024
        };
    }

    // 2. Parse "CE dettaglio mensile" (Matrix)
    parseCEDettaglioMensile(): any {
        let sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase();
            return low === "ce dettaglio mensile" ||
                low === "eco_dettaglio_mensile" ||
                (low.includes("dettaglio") && low.includes("mensile"));
        });

        if (!sheetName) return null;
        return this.parseMonthlyBlocks(sheetName);
    }

    // 3. Parse "3_CE sintetico"
    parseCESintetico(): any {
        const sheetName = "3_CE sintetico";
        return this.workbook.SheetNames.includes(sheetName) ? this.parseSummaryLikeSheet(sheetName) : null;
    }

    // 4. Parse "4_CE sintetico mensile"
    parseCESinteticoMensile(): any {
        const sheetName = "CE sintetico mensile";
        const backupSheetName = "CE dettaglio mensile";

        // Primary Parse: CE sintetico mensile
        let result = this.workbook.SheetNames.includes(sheetName)
            ? this.parseMonthlyBlocks(sheetName)
            : null;

        // Fallback Logic: If Primary failed OR is missing 2024 data
        if (!result || !result.progressivo2024 || !result.puntuale2024) {
            console.log(`[ExcelParser] Primary parse of '${sheetName}' incomplete or missing. Checking '${backupSheetName}'...`);

            if (this.workbook.SheetNames.includes(backupSheetName)) {
                // ... strict fallback logic ...
                const backupResult = this.parseMonthlyBlocks(backupSheetName);
                if (backupResult) {
                    if (!result) result = {};
                    // Merge missing parts
                    if (!result.progressivo2025 && backupResult.progressivo2025) result.progressivo2025 = backupResult.progressivo2025;
                    if (!result.puntuale2025 && backupResult.puntuale2025) result.puntuale2025 = backupResult.puntuale2025;
                    if (!result.progressivo2024 && backupResult.progressivo2024) result.progressivo2024 = backupResult.progressivo2024;
                    if (!result.puntuale2024 && backupResult.puntuale2024) result.puntuale2024 = backupResult.puntuale2024;
                }
            }
        }

        return result;
    }

    // --- GENERIC PARSERS ---

    private parseSummaryLikeSheet(sheetName: string): any {
        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let col2025 = 2;
        let col2024 = 5;

        // Dynamic cols
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            const row: any = jsonData[i];
            if (!row) continue;
            row.forEach((cell: any, idx: number) => {
                const s = String(cell);
                if (s.includes("2025")) col2025 = idx;
                if (s.includes("2024")) col2024 = idx;
            });
        }

        const result2025: Record<string, number> = {};
        const result2024: Record<string, number> = {};

        jsonData.forEach((row: any) => {
            if (!row || row.length === 0) return;
            const label = row[0];
            const key = getKey(label);
            if (key) {
                result2025[key] = (result2025[key] || 0) + cleanNumber(row[col2025]);
                result2024[key] = (result2024[key] || 0) + cleanNumber(row[col2024]);
            }
        });

        return {
            progressivo2025: result2025,
            progressivo2024: result2024
        };
    }

    private parseMonthlyBlocks(sheetName: string): any {
        const sheet = this.workbook.Sheets[sheetName];
        if (!sheet) return null;
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log(`[ExcelParser] Parsing monthly blocks for sheet: ${sheetName}`);
        const blocks: { startCol: number, startRow: number, months: string[], type?: string, year?: number }[] = [];

        // Scan deeper (up to 1000 rows)
        for (let i = 0; i < Math.min(jsonData.length, 1000); i++) {
            const row: any = jsonData[i];
            if (!row) continue;

            for (let j = 0; j < row.length; j++) {
                const cell = String(row[j]).trim();
                const cellUpper = cell.toUpperCase();

                // Robust check for January header
                const isJanuary = cellUpper === "GENNAIO" ||
                    cellUpper === "GEN" ||
                    (cellUpper.startsWith("GEN") && (cellUpper.length <= 4 || cellUpper.includes("20")));

                if (isJanuary) {
                    console.log(`[ExcelParser] Found potential block start at Row ${i}, Col ${j}: ${cell}`);

                    const months: string[] = [];
                    let mCol = j;
                    let safety = 0;

                    while (mCol < row.length && safety < 50) {
                        if (!row[mCol]) {
                            // gap
                        }
                        const mName = String(row[mCol] || "").trim();
                        if (mName.toUpperCase().match(/^(TOTALE|%|TRASCODIFICA|RIF)/)) break;
                        if (!mName && months.length > 0 && !String(row[mCol + 1] || "").trim()) break;
                        if (mName) months.push(mName.substring(0, 3));
                        mCol++;
                        safety++;
                    }

                    if (months.length >= 1) {
                        let detectedYear = 0;
                        let detectedType = "";

                        // Scan UP to 20 rows above for context
                        for (let up = 1; up <= 20; up++) {
                            if (i - up < 0) break;
                            const headerRow = jsonData[i - up] as any[];
                            if (!headerRow) continue;

                            const rowText = headerRow.join(" ").toUpperCase();
                            // LOG THE HEADER TEXT TO SEE WHAT WE ARE MISSING
                            if (rowText.trim().length > 0) {
                                console.log(`[ExcelParser] Scanning Header Row -${up}: "${rowText}"`);
                            }

                            // Year Detection - stricter but includes short 2-digit years if bounded
                            if (rowText.includes("2025") || rowText.includes(" 25 ")) detectedYear = 2025;
                            else if (rowText.includes("2024") || rowText.includes(" 24 ")) detectedYear = 2024;
                            else if (rowText.includes("2023")) detectedYear = 2023;

                            // Type Detection
                            if (rowText.includes("PROGRESSIVO") || rowText.includes("CUMULATO") || rowText.includes("CONSUNTIVO")) detectedType = "progressivo";
                            else if (rowText.includes("PUNTUALE") || rowText.includes("MENSILE") || rowText.includes("MESE")) detectedType = "puntuale";

                            if (detectedYear && detectedType) break;
                        }

                        // Also check the CURRENT row for metadata (sometimes year is on the same line as Gennaio)
                        const currentRowText = row.join(" ").toUpperCase();
                        if (!detectedYear) {
                            if (currentRowText.includes("2025") || currentRowText.includes(" 25 ")) detectedYear = 2025;
                            else if (currentRowText.includes("2024") || currentRowText.includes(" 24 ")) detectedYear = 2024;
                        }

                        console.log(`[ExcelParser] Block Metadata -> Year: ${detectedYear}, Type: ${detectedType}, Months: ${months.length}`);

                        const exists = blocks.find(b => b.startRow === i && b.startCol === j);
                        if (!exists) {
                            blocks.push({
                                startCol: j,
                                startRow: i,
                                months,
                                year: detectedYear,
                                type: detectedType
                            });
                        }
                        j = mCol - 1;
                    }
                }
            }
        }

        console.log(`[ExcelParser] Total Blocks Found: ${blocks.length}`);

        if (blocks.length === 0) return null;

        const extractData = (block: any) => {
            if (!block) return null;
            const result: Record<string, any[]> = { months: block.months };

            for (let r = block.startRow + 1; r < jsonData.length; r++) {
                const row: any = jsonData[r];
                if (!row) continue;

                const nextBlockBelow = blocks.find(b => b.startRow > block.startRow && Math.abs(b.startCol - block.startCol) < 5);
                if (nextBlockBelow && r >= nextBlockBelow.startRow) break;

                const label = row[0];
                const key = getKey(label);
                if (key) {
                    const values = [];
                    for (let k = 0; k < block.months.length; k++) {
                        values.push(cleanNumber(row[block.startCol + k]));
                    }
                    result[key] = values;
                }
            }
            return result;
        };

        // Smart Mapping with Positional Fallback

        // 1. Sort blocks by position (top-to-bottom, then left-to-right) to ensure reliable indexing
        blocks.sort((a, b) => {
            if (Math.abs(a.startRow - b.startRow) > 5) return a.startRow - b.startRow;
            return a.startCol - b.startCol;
        });

        console.log(`[ExcelParser] Sorted Blocks for Mapping:`, blocks.map(b => `(R${b.startRow},C${b.startCol}) Y:${b.year} T:${b.type}`));

        let p25 = blocks.find(b => b.year === 2025 && (b.type === 'progressivo' || !b.type));
        // Note: looser check for 'progressivo' above if explicit type missing

        // Positional Strategy: 
        // If we strictly detected metadata, use it.
        // If not (year=0), assume standard report order:
        // Index 0: Progressivo 2025
        // Index 1: Puntuale 2025
        // Index 2: Progressivo 2024
        // Index 3: Puntuale 2024

        if (blocks.length >= 1 && (!blocks[0].year || blocks[0].year === 2025)) {
            if (!p25) p25 = blocks[0]; // Default 1st block to Prog 2025
        }

        let m25 = blocks.find(b => b.year === 2025 && b.type === 'puntuale');
        if (!m25 && blocks.length >= 2) {
            // If block 1 is not already p25 (e.g. distinct from block 0)
            if (blocks[1] !== p25) m25 = blocks[1];
        }

        let p24 = blocks.find(b => b.year === 2024 && (b.type === 'progressivo' || !b.type));
        if (!p24 && blocks.length >= 3) {
            if (blocks[2] !== p25 && blocks[2] !== m25) p24 = blocks[2];
        }

        let m24 = blocks.find(b => b.year === 2024 && b.type === 'puntuale');
        if (!m24 && blocks.length >= 4) {
            if (blocks[3] !== p25 && blocks[3] !== m25 && blocks[3] !== p24) m24 = blocks[3];
        }

        // Final verification/Fix for overlapping assignments? 
        // The above sequential assignment with checks should prevent overlap.

        console.log(`[ExcelParser] Final Mapping Result:`, {
            p25: p25 ? `Found (R${p25.startRow})` : 'Missing',
            m25: m25 ? `Found (R${m25.startRow})` : 'Missing',
            p24: p24 ? `Found (R${p24.startRow})` : 'Missing',
            m24: m24 ? `Found (R${m24.startRow})` : 'Missing'
        });

        return {
            progressivo2025: extractData(p25),
            puntuale2025: extractData(m25),
            progressivo2024: extractData(p24),
            puntuale2024: extractData(m24)
        };
    }

    // 5. Detect Reference Month
    detectReferenceMonth(): number | null {
        // Strategy 1: Look in "1_CE dettaglio" headers for strings like "Al 31 Ottobre" or just month names in the header row
        // User explicitly requested to use this sheet for detection.
        const sheetName = "1_CE dettaglio";
        if (this.workbook.SheetNames.includes(sheetName)) {
            const sheet = this.workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Scan first 15 rows for specific "Al 31 Month" pattern or single month headers
            for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
                const row: any = jsonData[i];
                if (!row) continue;
                for (const cell of row) {
                    const s = String(cell).toLowerCase();

                    // Look for patterns like "al 31 ..." or just check for month presence if it seems like a header
                    // We map Italian months to numbers
                    const monthMap: Record<string, number> = {
                        "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6,
                        "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12
                    };

                    for (const [mName, mNum] of Object.entries(monthMap)) {
                        // Strict check: "Al 31 Ottobre" or "Consuntivo Ottobre" or just "Ottobre 2025"
                        // Avoid matching "Gennaio" inside a full year list if we want the CUTTOFF date.
                        // Usually the header says "Situazione al 31 Ottobre"
                        if (s.includes(` ${mName}`) || s.startsWith(mName)) {
                            // Verify context to avoid false positives? 
                            // For now, if we find a month in the first few rows of the Summary sheet, it's likely the period.
                            return mNum;
                        }
                    }
                }
            }
        }

        // Strategy 2: Fallback to "CE dettaglio mensile" BUT be smarter.
        // Don't just take the max month found (which is always Dec in a template).
        // Take the last month that has DATA in a specific row (e.g. Ricavi).
        const sheetNameMonthly = "CE dettaglio mensile";
        if (this.workbook.SheetNames.includes(sheetNameMonthly)) {
            const sheet = this.workbook.Sheets[sheetNameMonthly];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Find "Ricavi" row
            let ricaviRowIdx = -1;
            let ricaviRow: any[] = [];

            for (let i = 0; i < Math.min(jsonData.length, 30); i++) {
                const row: any = jsonData[i];
                if (row && String(row[0]).toUpperCase().includes("RICAVI")) {
                    ricaviRowIdx = i;
                    ricaviRow = row;
                    break;
                }
            }

            if (ricaviRowIdx !== -1) {
                // Now find header row (usually above) to map columns to months
                // ... This is complex. 
                // Alternative: If the user says "Always detect from CE dettaglio", we might just stop at Strategy 1?
                // But let's keep a weak fallback just in case.
            }
        }

        return null;
    }

    // 6. Detect & Parse Partitari (CSV or Sheet)
    detectPartitari(): boolean {
        // Check if we have a sheet that looks like Partitari
        // Strategy: Look for specific columns in the first sheet or a sheet named "Partitari"
        const sheetName = this.workbook.SheetNames[0]; // Usually CSVs only have 1 sheet
        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length < 1) return false;

        // Check header row (usually row 0)
        const headerRow = (jsonData[0] as any[]).map(c => String(c).trim());

        // Critical columns for Partitari
        const required = ["CodiceConto", "Descr_conto", "Data_registraz"];
        const matches = required.filter(r => headerRow.includes(r));

        return matches.length === required.length;
    }

    parsePartitari(): any {
        const sheetName = this.workbook.SheetNames[0];
        const sheet = this.workbook.Sheets[sheetName];
        // Read raw data
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!jsonData || jsonData.length === 0) return null;

        const headers = (jsonData[0] as any[]).map(h => String(h).trim());
        const dataRows = jsonData.slice(1);

        const parsedData = dataRows.map((row: any) => {
            const entry: Record<string, any> = {};
            headers.forEach((header, index) => {
                let value = row[index];
                // Clean numbers if needed? 
                // For Partitari, we might want to keep strings for layout or clean specific fields.
                // "Importo_dare", "Importo_avere" are strictly numbers.
                if (header.includes("Importo") || header.includes("Saldo") || header.includes("Progr")) {
                    value = cleanNumber(value);
                }
                entry[header] = value;
            });
            return entry;
        });

        return {
            headers: headers,
            data: parsedData
        };
    }
}
