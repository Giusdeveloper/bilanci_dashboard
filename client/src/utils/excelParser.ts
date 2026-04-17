
import * as XLSX from 'xlsx';
import { EXCEL_ROW_MAP } from './excelMapper';

// Helper: Clean number string to float
const cleanNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    
    if (typeof val === 'string') {
        const s = val.trim().toUpperCase();
        if (s === '' || s === '-' || s === 'N/A' || s.includes('#REF') || s.includes('#VALUE') || s.includes('#ERROR') || s.includes('#DIV/0')) return 0;
        
        const clean = s.replace(/[^0-9,.-]/g, '')
                      .replace(/\./g, '')
                      .replace(',', '.');
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

    // 2b. Check map with uppercase label (handles "Gross Profit" -> "GROSS PROFIT")
    if (EXCEL_ROW_MAP[cleanLabel]) return EXCEL_ROW_MAP[cleanLabel];

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
    if (cleanLabel.includes("EBITDA") || cleanLabel.includes("MARGINEMOL")) return "ebitda";
    if (cleanLabel.includes("EBIT") && !cleanLabel.includes("EBITDA")) return "ebit";

    // Sherpa42 Specific Mappings (Monthly Sheet)
    if (labelLower.includes('ricavidaconsulenza') || labelLower.includes('ricavidaattivitàdiconsulenza')) return "ricaviCaratteristici";
    if (labelLower.includes('ricavilegateadobiettivi') || labelLower.includes('obiettivivariabiali')) return "ricaviCaratteristici";

    // Ammortamenti & Gestione Finanziaria
    if (labelLower.includes('ammortamentiimmateriali')) return "ammortamentiImmateriali";
    if (labelLower.includes('ammortamentimateriali')) return "ammortamentiMateriali";
    if (labelLower.includes('svalutazionieaccantonamenti')) return "svalutazioni";
    
    // Explicitly handle the compound label found in many reports
    if (cleanLabel.includes("AMMORTAMENTI") && (cleanLabel.includes("ACCANT") || cleanLabel.includes("SVALUT"))) return "totaleAmmortamenti";
    if (cleanLabel === "AMMORTAMENTI") return "totaleAmmortamenti";
    if (labelLower.includes("ammortamentiesvalutazioni")) return "totaleAmmortamenti";

    // Try simplified key matching for Totals
    if (cleanLabel.includes("TOTALE COSTI FISSI")) return "totaleGestioneStruttura";
    if (cleanLabel.includes("TOTALECOSTIFISSI")) return "totaleGestioneStruttura";

    // Key Financials
    if (cleanLabel.includes("GESTIONE FINANZIARIA")) return "gestioneFinanziaria";
    if (cleanLabel.includes("EBIT") && !cleanLabel.includes("EBITDA")) return "ebit";
    if (cleanLabel.includes("RISULTATO") || cleanLabel.includes("UTILE") || cleanLabel.includes("EBT")) return "risultatoEsercizio";

    return null;
};

// Helper: Calculate puntual (monthly) values from progressive (cumulative) values
const calculatePuntualFromProgressive = (data: Record<string, any[]> | null) => {
    if (!data) return null;
    const result: Record<string, any[]> = { months: data.months };
    
    Object.keys(data).forEach(key => {
        if (key === 'months') return;
        const progValues = data[key];
        const puntualValues = [];
        
        for (let i = 0; i < progValues.length; i++) {
            if (i === 0) {
                puntualValues.push(progValues[i]);
            } else {
                puntualValues.push(Number((progValues[i] - progValues[i-1]).toFixed(2)));
            }
        }
        result[key] = puntualValues;
    });
    
    return result;
};

export class ExcelParser {
    workbook: XLSX.WorkBook;

    constructor(fileData: ArrayBuffer | string | Buffer) {
        if (typeof fileData === 'string') {
            this.workbook = XLSX.read(fileData, { type: 'binary' });
        } else if (fileData instanceof ArrayBuffer) {
            this.workbook = XLSX.read(new Uint8Array(fileData), { type: 'array' });
        } else {
            this.workbook = XLSX.read(fileData, { type: 'buffer' });
        }
    }

    isSherpaStyle(): boolean {
        // Stricter check: Look for "SHERPA" in sheet names or company name
        const hasSherpaSheets = this.workbook.SheetNames.some(s => s.toUpperCase().includes("SHERPA"));
        if (hasSherpaSheets) return true;

        // Fallback: Check first sheet for Sherpa specific labels
        const firstSheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
        const csvContent = XLSX.utils.sheet_to_txt(firstSheet);
        return csvContent.toUpperCase().includes("SHERPA") || csvContent.toUpperCase().includes("PRIMO MARGINE");
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
        const isSherpa = this.isSherpaStyle();

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

        let col2025 = -1;
        let col2024 = -1;

        console.log(`[ExcelParser] Scanning ${sheetName} for headers...`);

        for (let i = 0; i < Math.min(jsonData.length, 40); i++) {
            const row: any = jsonData[i];
            if (!row) continue;

            row.forEach((cell: any, idx: number) => {
                const s = String(cell).toUpperCase();

                if (s.includes("2025")) {
                    if (col2025 === -1) col2025 = idx;
                    if (s.includes("CONSUNTIVO") || s.includes("PROGRESSIVO") || s.includes("ACTUAL")) col2025 = idx;
                    if (s.includes("BUDGET") && col2025 === idx) col2025 = -1;
                }

                if (s.includes("2024") || s.includes("2023")) {
                    if (col2024 === -1) col2024 = idx;
                }
                if (s.includes("BUDGET") || s.includes("PRECEDENTE")) {
                    if (col2024 === -1) col2024 = idx;
                }
            });
        }

        if (col2025 === -1) col2025 = 2;
        if (col2024 === -1) col2024 = 5;

        console.log(`[ExcelParser] Columns Identified -> 2025: ${col2025}, PREV: ${col2024}`);
        const dynamicRows: any[] = [];
        const result2025: Record<string, any> = { isDynamic: true, rows: dynamicRows };
        const result2024: Record<string, any> = {};

        for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            const label = row[0];
            if (!label || typeof label !== 'string' || label.trim() === '' || label.length < 2) continue;
            
            const cleanLabel = label.trim();
            const upperLabel = cleanLabel.toUpperCase().replace(/\s+/g, '');
            
            // FILTER: Skip headers and noise rows (strictly)
            const noise = ["CONTOECONOMICO", "DICEMBRE", "GENNAIO", "FEBBRAIO", "MARZO", "APRILE", "MAGGIO", "GIUGNO", "LUGLIO", "AGOSTO", "SETTEMBRE", "OTTOBRE", "NOVEMBRE"];
            const isYear = /^\d{2,4}$/.test(upperLabel);
            const isHeader = upperLabel.includes("CONTOECONOMICO") || noise.includes(upperLabel) || isYear;
            
            if (isHeader) continue;

            const key = getKey(cleanLabel);
            const v25 = cleanNumber(row[col2025]);
            const v24 = cleanNumber(row[col2024]);

            // STOP RULE: Stop parsing if we hit Result row
            const isResultRow = upperLabel.includes("RISULTATO") && (upperLabel.includes("ESERCIZIO") || upperLabel.includes("PERDITA") || upperLabel.includes("UTILE"));

            let type: 'normal' | 'total' | 'subtotal' | 'result' | 'key-metric' = 'normal';
            // BOLD RULE: Stampatello (all upper) = total
            const isStampatello = cleanLabel === cleanLabel.toUpperCase() && cleanLabel.length > 3 && !/[a-z]/.test(cleanLabel);

            if (upperLabel.includes("TOTALE") || upperLabel.includes("TOTAL") || upperLabel.includes("MARGINE") || isStampatello) type = 'total';
            if (key === 'ebitda' || key === 'ebit' || key === 'grossProfit') type = 'key-metric';
            
            if (isResultRow) {
                type = 'result';
                result2025.risultatoEsercizio = v25;
                result2024.risultatoEsercizio = v24;
            }

            dynamicRows.push({
                voce: cleanLabel,
                value2025: v25,
                value2024: v24,
                key: key,
                type: type
            });

            if (key && !isResultRow) {
                result2025[key] = (result2025[key] || 0) + v25;
                result2024[key] = (result2024[key] || 0) + v24;
            }

            if (isResultRow) break;
        }

        // Add totals logic (same as before)
        if (!result2025.totaleRicavi && result2025.ricaviCaratteristici) {
            result2025.totaleRicavi = (result2025.ricaviCaratteristici || 0) + (result2025.altriRicavi || 0);
            result2024.totaleRicavi = (result2024.ricaviCaratteristici || 0) + (result2024.altriRicavi || 0);
        }

        return { progressivo2025: result2025, progressivo2024: result2024 };
    }

    // 2. Parse "CE dettaglio mensile" (Matrix)
    parseCEDettaglioMensile(): any {
        let sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase();
            return low.includes("dettaglio") && (low.includes("mensile") || low.includes("mese")) && (low.includes("ce") || low.includes("eco"));
        });

        if (!sheetName) return null;
        return this.parseMonthlyBlocks(sheetName);
    }

    // 3. Parse "3_CE sintetico" (handles typo "sintentico")
    parseCESintetico(): any {
        const sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase();
            // Match "sintetico" and EXCLUDE "mensile"
            return ((low.includes("ce") && low.includes("sintetico")) || 
                   (low.includes("ce") && low.includes("sintentico")) ||
                   (low.includes("economico") && low.includes("sintetico")) ||
                   (low.includes("sintetico") && !low.includes("mensile"))) && !low.includes("mensile");
        });
        
        if (sheetName) return this.parseSummaryLikeSheet(sheetName);

        // Fallback: If no yearly synthetic, derive from monthly synthetic (last col of progressivo)
        const monthlyData = this.parseCESinteticoMensile();
        if (monthlyData && monthlyData.progressivo2025 && monthlyData.progressivo2025.isDynamic) {
            const rows = monthlyData.progressivo2025.rows.map((row: any) => ({
                voce: row.voce,
                value2025: row.valori[row.valori.length - 1],
                value2024: 0, // Fallback as we don't have historical matrix usually
                key: row.key,
                type: row.type
            }));
            return {
                progressivo2025: { isDynamic: true, rows },
                progressivo2024: {}
            };
        }
        return null;
    }

    // 4. Parse "4_CE sintetico mensile"
    parseCESinteticoMensile(): any {
        const sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase().replace(/[_\.]/g, ' ');
            return low.includes('sintetico') && low.includes('mensile');
        });

        if (!sheetName) {
            console.log("[ExcelParser] No Sintetico Mensile sheet found. Checking fallback...");
            const backupSheetName = this.workbook.SheetNames.find(s => {
                const low = s.toLowerCase().replace(/[_\.]/g, ' ');
                return low.includes('dettaglio') && low.includes('mensile');
            }) || "CE dettaglio mensile";
            return this.parseMonthlyBlocks(backupSheetName);
        }

        return this.parseMonthlyBlocks(sheetName);
    }

    // --- GENERIC PARSERS ---

    private parseSummaryLikeSheet(sheetName: string): any {
        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let col2025 = -1;
        let col2024 = -1;

        // Dynamic cols
        for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
            const row: any = jsonData[i];
            if (!row) continue;
            row.forEach((cell: any, idx: number) => {
                const s = String(cell);
                if (s.includes("2025") && col2025 === -1) col2025 = idx;
                if (s.includes("2024") && col2024 === -1) col2024 = idx;
            });
        }

        if (col2025 === -1) col2025 = 2;
        if (col2024 === -1) col2024 = 5;

        const dynamicRows: any[] = [];
        const result2025: Record<string, any> = { isDynamic: true, rows: dynamicRows };
        const result2024: Record<string, any> = {};

        jsonData.forEach((row: any, index: number) => {
            if (!row || row.length === 0) return;
            const label = row[0];
            if (!label || typeof label !== 'string' || label.trim() === '' || label.length < 2) return;
            if (index < 3 && label.toUpperCase().includes("DICEMBRE")) return;

            const cleanLabel = label.trim();
            const key = getKey(cleanLabel);
            const v25 = cleanNumber(row[col2025]);
            const v24 = cleanNumber(row[col2024]);

            let type: 'normal' | 'total' | 'subtotal' | 'result' | 'key-metric' = 'normal';
            const upperLabel = cleanLabel.toUpperCase();
            if (upperLabel.includes("TOTALE") || upperLabel.includes("TOTAL") || upperLabel.includes("COSTI") || upperLabel.includes("SPESE")) type = 'total';
            if (key === 'ebitda' || key === 'ebit' || key === 'grossProfit') type = 'key-metric';
            if (key === 'risultatoEsercizio' || upperLabel.includes("UTILE") || upperLabel.includes("PERDITA")) type = 'result';

            dynamicRows.push({
                voce: cleanLabel,
                value2025: v25,
                value2024: v24,
                key: key,
                type: type,
                isBold: cleanLabel === cleanLabel.toUpperCase()
            });

            if (key) {
                result2025[key] = (result2025[key] || 0) + v25;
                result2024[key] = (result2024[key] || 0) + v24;
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

                        // Scan UP for context
                        for (let up = 1; up <= 20; up++) {
                            if (i - up < 0) break;
                            const headerRow = jsonData[i - up] as any[];
                            if (!headerRow) continue;

                            // Check cells near the start column of the block (j)
                            for (let c = Math.max(0, j - 10); c < Math.min(headerRow.length, j + 20); c++) {
                                const rawVal = headerRow[c];
                                const cellVal = String(rawVal || "").trim();
                                if (cellVal === "2025" || cellVal === "25") { 
                                    detectedYear = 2025; break; 
                                }
                                if (cellVal === "2024" || cellVal === "24") { 
                                    detectedYear = 2024; break; 
                                }
                                if (cellVal === "2023" || cellVal === "23") { 
                                    detectedYear = 2023; break; 
                                }
                            }
                            
                            const rowText = headerRow.map(c => String(c || "")).join(" ").toUpperCase();
                            if (rowText.includes("PROGRESSIVO") || rowText.includes("CUMULATO") || rowText.includes("CONSUNTIVO")) detectedType = "progressivo";
                            else if (rowText.includes("PUNTUALE") || rowText.includes("MENSILE") || rowText.includes("MESE")) detectedType = "puntuale";

                            if (detectedYear && detectedType) break;
                        }

                        // 2F2T SPECIFIC: If still no year, check R1 cells C2, C5 etc.
                        if (!detectedYear && jsonData[1]) {
                            const r1 = jsonData[1] as any[];
                            if (j === 1 || j === 2) { // First blocks
                                if (String(r1[2]).includes("2025")) detectedYear = 2025;
                            } else if (j > 15) { // Later blocks
                                if (String(r1[12]).includes("2025")) detectedYear = 2025;
                            }
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
            const rows: any[] = [];
            const result: Record<string, any> = { 
                months: block.months,
                isDynamic: true,
                rows: rows
            };

            console.log(`[ExcelParser] Extracting data for block at R${block.startRow}, C${block.startCol}`);

            for (let r = block.startRow + 1; r < jsonData.length; r++) {
                const row: any = jsonData[r];
                if (!row) continue;

                const nextBlockBelow = blocks.find(b => b.startRow > block.startRow && Math.abs(b.startCol - block.startCol) < 5);
                if (nextBlockBelow && r >= nextBlockBelow.startRow) break;

                const label = row[0];
                if (!label || typeof label !== 'string' || label.trim() === '' || label.length < 2) continue;
                
                const cleanLabel = label.trim();
                const upperLabel = cleanLabel.toUpperCase();
                const key = getKey(cleanLabel);

                // STOP RULE: Stop parsing if we hit Result row
                const isResultRow = upperLabel.includes("RISULTATO") && (upperLabel.includes("ESERCIZIO") || upperLabel.includes("PERDITA") || upperLabel.includes("UTILE"));
                
                const values = [];
                for (let k = 0; k < block.months.length; k++) {
                    const rawVal = row[block.startCol + k];
                    const cleanVal = cleanNumber(rawVal);
                    values.push(cleanVal);
                }

                let type: 'normal' | 'total' | 'subtotal' | 'result' | 'key-metric' = 'normal';
                if (upperLabel.includes("TOTALE") || upperLabel.includes("TOTAL") || upperLabel.includes("COSTI") || upperLabel.includes("SPESE")) type = 'total';
                if (key === 'ebitda' || key === 'ebit' || key === 'grossProfit') type = 'key-metric';
                if (isResultRow) {
                    type = 'result';
                    // Force map results if not caught by key
                    if (!result.risultatoEsercizio) result.risultatoEsercizio = values;
                }

                rows.push({
                    voce: cleanLabel,
                    valori: values,
                    key: key,
                    type: type,
                    isBold: cleanLabel === cleanLabel.toUpperCase()
                });

                if (key) {
                    result[key] = values;
                }

                if (isResultRow) break;
            }
            return result;
        };

        // Smart Mapping with Positional Fallback and Auto-Derivation
        blocks.sort((a, b) => {
            if (Math.abs(a.startRow - b.startRow) > 5) return a.startRow - b.startRow;
            return a.startCol - b.startCol;
        });

        console.log(`[ExcelParser] Sorted Blocks for Mapping:`, blocks.map(b => `(R${b.startRow},C${b.startCol}) Y:${b.year} T:${b.type}`));

        // 1. Identify what we have
        let p25_block = blocks.find(b => b.year === 2025 && (b.type === 'progressivo' || !b.type));
        let m25_block = blocks.find(b => b.year === 2025 && b.type === 'puntuale');
        let p24_block = blocks.find(b => b.year === 2024 && (b.type === 'progressivo' || !b.type));
        let m24_block = blocks.find(b => b.year === 2024 && b.type === 'puntuale');

        // 2. Positional fallbacks for missing year/type info
        if (!p25_block && blocks.length >= 1 && (!blocks[0].year || blocks[0].year === 2025)) {
            p25_block = blocks[0];
        }
        if (!m25_block && blocks.length >= 2 && (!blocks[1].year || blocks[1].year === 2025) && blocks[1] !== p25_block) {
            m25_block = blocks[1];
        }
        if (!p24_block && blocks.length >= 3 && (!blocks[2].year || blocks[2].year === 2024) && blocks[2] !== p25_block && blocks[2] !== m25_block) {
            p24_block = blocks[2];
        }
        if (!m24_block && blocks.length >= 4 && (!blocks[3].year || blocks[3].year === 2024) && blocks[3] !== p25_block && blocks[3] !== m25_block && blocks[3] !== p24_block) {
            m24_block = blocks[3];
        }

        // 3. Extract raw data
        const p25_raw = extractData(p25_block);
        let m25_raw = extractData(m25_block);
        const p24_raw = extractData(p24_block);
        let m24_raw = extractData(m24_block);

        // 4. AUTO-DERIVE missing modes
        // If we have Progressivo but not Puntuale (common in cumulative reports)
        if (p25_raw && !m25_raw) {
            console.log("[ExcelParser] Auto-deriving Puntuale 2025 from Progressivo");
            m25_raw = calculatePuntualFromProgressive(p25_raw);
        }
        if (p24_raw && !m24_raw) {
            console.log("[ExcelParser] Auto-deriving Puntuale 2024 from Progressivo");
            m24_raw = calculatePuntualFromProgressive(p24_raw);
        }

        console.log(`[ExcelParser] Final Mapping Result:`, {
            p25: p25_raw ? 'Found' : 'Missing',
            m25: m25_raw ? 'Found' : 'Missing',
            p24: p24_raw ? 'Found' : 'Missing',
            m24: m24_raw ? 'Found' : 'Missing'
        });

        return {
            progressivo2025: p25_raw,
            puntuale2025: m25_raw,
            progressivo2024: p24_raw,
            puntuale2024: m24_raw
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

        const allHeaders = (jsonData[0] as any[]).map(h => String(h).trim());
        const dataRows = jsonData.slice(1);

        const EXCLUDED_COLUMNS = [
            "Ditta", "DataStoDit", "DataStoAna", "CodAnacf", "Num_riga", 
            "Cod_causale", "Attivita_ETS", "Codice_UnProd", "Descr_UnProD", 
            "CodAnacfControp", "DescrAgg3"
        ];

        // Filter headers
        const visibleHeaders = allHeaders.filter(h => !EXCLUDED_COLUMNS.includes(h));
        const visibleIndices = allHeaders.map((h, i) => EXCLUDED_COLUMNS.includes(h) ? -1 : i).filter(idx => idx !== -1);

        const parsedData = dataRows.map((row: any) => {
            const entry: Record<string, any> = {};
            visibleHeaders.forEach((header, index) => {
                const originalIndex = visibleIndices[index];
                let value = row[originalIndex];
                if (header.includes("Importo") || header.includes("Saldo") || header.includes("Progr")) {
                    value = cleanNumber(value);
                }
                entry[header] = value;
            });
            return entry;
        }).filter(entry => {
            const code = String(entry["CodiceConto"] || "");
            if (!code.includes("/")) return false;
            
            const prefix = code.split("/")[0];
            const prefixNum = parseInt(prefix);
            
            return !isNaN(prefixNum) && prefixNum >= 58 && prefixNum <= 88;
        });

        return {
            headers: visibleHeaders,
            data: parsedData
        };
    }
    // 7. Parse "Source" sheet
    parseSource(): any[] | null {
        // Robust matching including trimmed spaces
        const sheetName = this.workbook.SheetNames.find(s => s.trim().toLowerCase() === "source");
        if (!sheetName) return null;

        const sheet = this.workbook.Sheets[sheetName];
        // Parse as array of arrays (matrix) to preserve layout (including empty columns)
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        console.log(`[ExcelParser] Parsed Source sheet: ${data.length} rows found.`);
        return data as any[];
    }

    // 8. Extract specific KPI summary from Source if available (User requested: Ricavi, Costi, Differenza at bottom)
    parseSourceSummary(sourceData: any[]): { ricavi: number, costi: number, risultato: number } | null {
        if (!sourceData || sourceData.length < 5) return null;

        // 1. Identify "Year to Date" column
        let ytdColIndex = -1;

        // Scan top 20 rows for header
        for (let r = 0; r < Math.min(sourceData.length, 30); r++) {
            const row = sourceData[r] as any[];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
                const cell = String(row[c]).toLowerCase().trim();
                // Match "Year to Date" or "YTD" or just explicit structure if user confirmed
                if (cell.includes("year to date") || cell === "ytd") {
                    ytdColIndex = c;
                    console.log(`[ExcelParser] Found 'Year to Date' column at index ${c}`);
                    break;
                }
            }
            if (ytdColIndex !== -1) break;
        }

        // If not found, try to find where the values are by looking at the "Ricavi" row (if distinct)
        // scan from bottom up to find the summary block
        let ricavi = 0;
        let costi = 0;
        let risultato = 0;
        let foundBlock = false;

        const clean = (val: any) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            const s = String(val).replace(/\./g, '').replace(',', '.').trim();
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
        };

        // Scan from bottom up. looking for the *last* occurrences of these labels.
        // User said: "Costi, Ricavi, Differenza" are at the bottom.

        for (let i = sourceData.length - 1; i >= 0; i--) {
            const row = sourceData[i] as any[];
            if (!row) continue;

            // Start scanning for labels - Scan wider range (0-6) as labels are in Col D (idx 3)
            const labelStr = row.slice(0, 6).map(c => String(c).toLowerCase().trim()).join(" ");

            // Determine value column: if YTD found use it, else try last column with a number
            let valIndex = ytdColIndex;
            if (valIndex === -1) {
                // Heuristic: Last non-empty column?
                for (let c = row.length - 1; c >= 0; c--) {
                    if (row[c] !== "" && row[c] !== null && row[c] !== undefined) {
                        // Check if it looks like a number
                        if (!isNaN(clean(row[c])) && clean(row[c]) !== 0) {
                            valIndex = c;
                            break;
                        }
                    }
                }
            }

            if (valIndex === -1) continue;

            const val = clean(row[valIndex]);

            // ANCHOR STRATEGY: User confirmed "COSTI, RICAVI, DIFFERENZA" block at bottom
            if (labelStr.includes("differenza")) {
                console.log(`[ExcelParser] Found Anchor 'DIFFERENZA' at row ${i} with val ${val}`);
                if (risultato === 0) risultato = -val; // Invert sign logic: Source + is bad (Loss), Dashboard - is bad

                // Helper to extract from neighbor
                const getValFromRow = (rIdx: number) => {
                    if (rIdx < 0) return 0;
                    const targetRow = sourceData[rIdx] as any[];
                    if (!targetRow || targetRow.length <= valIndex) return 0;
                    return clean(targetRow[valIndex]);
                };

                // Check i-1 (Ricavi) - usually row above
                const rowPrev = sourceData[i - 1] as any[];
                if (rowPrev) {
                    // Looser deduction: just take the value if it exists, assuming strict block structure
                    if (ricavi === 0) ricavi = Math.abs(getValFromRow(i - 1));
                    console.log(`[ExcelParser] Anchor deduced Ricavi at row ${i - 1}: ${ricavi}`);
                }

                // Check i-2 (Costi) - usually 2 rows above
                const rowPrev2 = sourceData[i - 2] as any[];
                if (rowPrev2) {
                    if (costi === 0) costi = getValFromRow(i - 2);
                    console.log(`[ExcelParser] Anchor deduced Costi at row ${i - 2}: ${costi}`);
                }

                foundBlock = true;
            }
            // Keep independent checks only if anchor not hit yet (but we assume anchor is best)
            else if (ricavi === 0 && (labelStr.includes("totale ricavi") || String(row[0] || "").toLowerCase() === "ricavi" || String(row[3] || "").toLowerCase() === "ricavi")) {
                ricavi = Math.abs(val);
            }
            else if (costi === 0 && (labelStr.includes("totale costi") || String(row[0] || "").toLowerCase() === "costi" || String(row[3] || "").toLowerCase() === "costi")) {
                costi = val;
            }

            // Stop if we have all 3
            if (ricavi !== 0 && costi !== 0 && risultato !== 0) break;
        }

        if (foundBlock) {
            console.log(`[ExcelParser] Source Summary Extracted -> Ricavi: ${ricavi}, Costi: ${costi}, Risultato: ${risultato}`);
            return { ricavi, costi, risultato };
        }

        return null;
    }
}
