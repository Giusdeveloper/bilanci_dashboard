import * as XLSX from 'xlsx';
// Logica di dominio estratta in moduli PURI condivisi (shared/domain).
// Manteniamo i nomi locali (`getKey`) per non toccare il resto della classe.
import { getCanonicalKey as getKey } from '../../../shared/domain/labelMapping';
import { cleanNumber, calculatePuntualFromProgressive } from '../../../shared/domain/periodMath';

export class ExcelParser {
    workbook: XLSX.WorkBook;

    static fromWorkbook(workbook: XLSX.WorkBook): ExcelParser {
        const parser = Object.create(ExcelParser.prototype) as ExcelParser;
        parser.workbook = workbook;
        return parser;
    }

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
        const hasSherpaSheets = this.workbook.SheetNames.some(s => s.toUpperCase().includes("SHERPA"));
        if (hasSherpaSheets) return true;
        const firstSheet = this.workbook.Sheets[this.workbook.SheetNames[0]];
        const csvContent = XLSX.utils.sheet_to_txt(firstSheet);
        return csvContent.toUpperCase().includes("SHERPA") || csvContent.toUpperCase().includes("PRIMO MARGINE");
    }

    detectCompanyName(): string | null {
        const sheetName = "1_CE dettaglio";
        if (!this.workbook.SheetNames.includes(sheetName)) return null;
        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
            const row: any = jsonData[i];
            if (!row) continue;
            for (let j = 0; j < Math.min(row.length, 3); j++) {
                const cell = String(row[j]).trim();
                if (cell && cell.length > 3 && !cell.toLowerCase().includes("pagina") && !cell.toLowerCase().includes("data") && !cell.toLowerCase().includes("bilancio")) {
                    if (cell.toLowerCase().startsWith("azienda:")) return cell.substring(8).trim();
                    if (cell.toLowerCase().startsWith("società:")) return cell.substring(8).trim();
                    if (!cell.match(/^\d+$/) && !cell.match(/^[0-9\/]+$/)) return cell;
                }
            }
        }
        return null;
    }

    parseCEDettaglio(): any {
        let sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase();
            return low.includes("1_ce dettaglio") || (low.includes("dettaglio") && low.includes("ce")) || low === "ce dettaglio" || low === "economico dettaglio";
        });
        if (!sheetName) return null;

        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        let col2025 = -1;
        let col2024 = -1;
        let detectedYears: { year: number, col: number }[] = [];

        for (let i = 0; i < Math.min(jsonData.length, 40); i++) {
            const row: any = jsonData[i];
            if (!row) continue;
            row.forEach((cell: any, idx: number) => {
                const s = String(cell).toUpperCase();
                const yearMatch = s.match(/\b(20\d{2})\b/);
                if (yearMatch) {
                    const year = parseInt(yearMatch[1]);
                    if (s.includes("BUDGET") || s.includes("PREVISIONE") || s.includes("TARGET")) return;
                    const existing = detectedYears.find(y => y.year === year);
                    if (!existing) detectedYears.push({ year, col: idx });
                    else if (s.includes("CONSUNTIVO") || s.includes("PROGRESSIVO") || s.includes("ACTUAL")) existing.col = idx;
                }
            });
        }

        detectedYears.sort((a, b) => b.year - a.year);
        
        if (detectedYears.length >= 1) col2025 = detectedYears[0].col;
        if (detectedYears.length >= 2) col2024 = detectedYears[1].col;

        if (col2025 === -1) col2025 = 2;
        if (col2024 === -1) col2024 = 5;

        console.log(`[ExcelParser] Years Detected:`, detectedYears);
        console.log(`[ExcelParser] Columns Mapping -> Current: Col ${col2025}, Prev: Col ${col2024}`);

        const dynamicRows: any[] = [];
        const dynamicRows2024: any[] = [];
        const result2025: Record<string, any> = { isDynamic: true, rows: dynamicRows };
        const result2024: Record<string, any> = { isDynamic: true, rows: dynamicRows2024 };

        for (let i = 0; i < jsonData.length; i++) {
            const row: any = jsonData[i];
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

            // Populate rows for the previous year record too (used during split save)
            dynamicRows2024.push({
                voce: cleanLabel,
                value2025: v24,
                value2024: 0, // We don't have T-2 in this file usually
                key: key,
                type: type
            });

            if (key && !isResultRow) {
                result2025[key] = (result2025[key] || 0) + v25;
                result2024[key] = (result2024[key] || 0) + v24;
            }

            if (isResultRow) break;
        }

        if (!result2025.totaleRicavi && result2025.ricaviCaratteristici) {
            result2025.totaleRicavi = (result2025.ricaviCaratteristici || 0) + (result2025.altriRicavi || 0);
            result2024.totaleRicavi = (result2024.ricaviCaratteristici || 0) + (result2024.altriRicavi || 0);
        }
        return { progressivo2025: result2025, progressivo2024: result2024 };
    }

    parseCEDettaglioMensile(): any {
        let sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase();
            return low.includes("dettaglio") && (low.includes("mensile") || low.includes("mese")) && (low.includes("ce") || low.includes("eco"));
        });
        if (!sheetName) return null;
        return this.parseMonthlyBlocks(sheetName);
    }

    parseCESintetico(): any {
        const sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase();
            return ((low.includes("ce") && low.includes("sintetico")) || (low.includes("ce") && low.includes("sintentico")) || (low.includes("economico") && low.includes("sintetico")) || (low.includes("sintetico") && !low.includes("mensile"))) && !low.includes("mensile");
        });
        if (sheetName) return this.parseSummaryLikeSheet(sheetName);
        const monthlyData = this.parseCESinteticoMensile();
        if (monthlyData && monthlyData.progressivo2025 && monthlyData.progressivo2025.isDynamic) {
            const rows = monthlyData.progressivo2025.rows.map((row: any) => ({
                voce: row.voce, value2025: row.valori[row.valori.length - 1], value2024: 0, key: row.key, type: row.type
            }));
            return { progressivo2025: { isDynamic: true, rows }, progressivo2024: {} };
        }
        return null;
    }

    parseCESinteticoMensile(): any {
        const sheetName = this.workbook.SheetNames.find(s => {
            const low = s.toLowerCase().replace(/[_\.]/g, ' ');
            return low.includes('sintetico') && low.includes('mensile');
        });
        if (!sheetName) {
            const backupSheetName = this.workbook.SheetNames.find(s => {
                const low = s.toLowerCase().replace(/[_\.]/g, ' ');
                return low.includes('dettaglio') && low.includes('mensile');
            }) || "CE dettaglio mensile";
            return this.parseMonthlyBlocks(backupSheetName);
        }
        return this.parseMonthlyBlocks(sheetName);
    }

    private parseSummaryLikeSheet(sheetName: string): any {
        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        let col2025 = -1, col2024 = -1;
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
            const cleanLabel = label.trim();
            const key = getKey(cleanLabel);
            const v25 = cleanNumber(row[col2025]);
            const v24 = cleanNumber(row[col2024]);
            let type: 'normal' | 'total' | 'subtotal' | 'result' | 'key-metric' = 'normal';
            const upperLabel = cleanLabel.toUpperCase();
            if (upperLabel.includes("TOTALE") || upperLabel.includes("TOTAL") || upperLabel.includes("COSTI") || upperLabel.includes("SPESE")) type = 'total';
            if (key === 'ebitda' || key === 'ebit' || key === 'grossProfit') type = 'key-metric';
            if (key === 'risultatoEsercizio' || upperLabel.includes("UTILE") || upperLabel.includes("PERDITA")) type = 'result';
            dynamicRows.push({ voce: cleanLabel, value2025: v25, value2024: v24, key: key, type: type, isBold: cleanLabel === cleanLabel.toUpperCase() });
            if (key) { result2025[key] = (result2025[key] || 0) + v25; result2024[key] = (result2024[key] || 0) + v24; }
        });
        return { progressivo2025: result2025, progressivo2024: result2024 };
    }

    private parseMonthlyBlocks(sheetName: string): any {
        const sheet = this.workbook.Sheets[sheetName];
        if (!sheet) return null;
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const blocks: { startCol: number, startRow: number, months: string[], type?: string, year?: number }[] = [];
        for (let i = 0; i < Math.min(jsonData.length, 1000); i++) {
            const row: any = jsonData[i];
            if (!row) continue;
            for (let j = 0; j < row.length; j++) {
                const cell = String(row[j]).trim();
                const cellUpper = cell.toUpperCase();
                const monthKeywords = ["GENNAIO", "GEN", "FEBBRAIO", "FEB", "MARZO", "MAR", "APRILE", "APR", "MAGGIO", "MAG", "GIUGNO", "GIU", "LUGLIO", "LUG", "AGOSTO", "AGO", "SETTEMBRE", "SET", "OTTOBRE", "OTT", "NOVEMBRE", "NOV", "DICEMBRE", "DIC", "PROGRESSIVO"];
                const isBlockStarter = monthKeywords.includes(cellUpper) || (cellUpper.startsWith("GEN") && (cellUpper.length <= 4 || cellUpper.includes("20")));
                if (isBlockStarter) {
                    const months: string[] = [];
                    let mCol = j, safety = 0;
                    while (mCol < row.length && safety < 50) {
                        const mName = String(row[mCol] || "").trim();
                        if (mName.toUpperCase().match(/^(TOTALE|%|TRASCODIFICA|RIF)/)) break;
                        if (!mName && months.length > 0 && !String(row[mCol + 1] || "").trim()) break;
                        if (mName) months.push(mName.substring(0, 3));
                        mCol++; safety++;
                    }
                    if (months.length >= 1) {
                        let detectedYear = 0, detectedType = "";
                        for (let up = 1; up <= 20; up++) {
                            if (i - up < 0) break;
                            const headerRow = jsonData[i - up] as any[];
                            if (!headerRow) continue;
                            for (let c = Math.max(0, j - 10); c < Math.min(headerRow.length, j + 20); c++) {
                                const cellVal = String(headerRow[c] || "").trim();
                                if (cellVal === "2025" || cellVal === "25") { detectedYear = 2025; break; }
                                if (cellVal === "2024" || cellVal === "24") { detectedYear = 2024; break; }
                                if (cellVal === "2023" || cellVal === "23") { detectedYear = 2023; break; }
                            }
                            const rowText = headerRow.map(c => String(c || "")).join(" ").toUpperCase();
                            if (rowText.includes("PROGRESSIVO") || rowText.includes("CUMULATO") || rowText.includes("CONSUNTIVO")) detectedType = "progressivo";
                            else if (rowText.includes("PUNTUALE") || rowText.includes("MENSILE") || rowText.includes("MESE")) detectedType = "puntuale";
                            if (detectedYear && detectedType) break;
                        }
                        if (!detectedYear && jsonData[1]) {
                            const r1 = jsonData[1] as any[];
                            if (j === 1 || j === 2) { if (String(r1[2]).includes("2025")) detectedYear = 2025; }
                            else if (j > 15) { if (String(r1[12]).includes("2025")) detectedYear = 2025; }
                        }
                        const exists = blocks.find(b => b.startRow === i && b.startCol === j);
                        if (!exists) blocks.push({ startCol: j, startRow: i, months, year: detectedYear, type: detectedType });
                        j = mCol - 1;
                    }
                }
            }
        }
        if (blocks.length === 0) return null;
        const extractData = (block: any) => {
            if (!block) return null;
            const rows: any[] = [];
            const result: Record<string, any> = { months: block.months, isDynamic: true, rows: rows };
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
                const isResultRow = upperLabel.includes("RISULTATO") && (upperLabel.includes("ESERCIZIO") || upperLabel.includes("PERDITA") || upperLabel.includes("UTILE"));
                const values = [];
                for (let k = 0; k < block.months.length; k++) values.push(cleanNumber(row[block.startCol + k]));
                let type: 'normal' | 'total' | 'subtotal' | 'result' | 'key-metric' = 'normal';
                if (upperLabel.includes("TOTALE") || upperLabel.includes("TOTAL") || upperLabel.includes("COSTI") || upperLabel.includes("SPESE")) type = 'total';
                if (key === 'ebitda' || key === 'ebit' || key === 'grossProfit') type = 'key-metric';
                if (isResultRow) { type = 'result'; if (!result.risultatoEsercizio) result.risultatoEsercizio = values; }
                rows.push({ voce: cleanLabel, valori: values, key: key, type: type, isBold: cleanLabel === cleanLabel.toUpperCase() });
                if (key) result[key] = values;
                if (isResultRow) break;
            }
            return result;
        };
        blocks.sort((a, b) => { if (Math.abs(a.startRow - b.startRow) > 5) return a.startRow - b.startRow; return a.startCol - b.startCol; });
        let p25_block = blocks.find(b => b.year === 2025 && (b.type === 'progressivo' || !b.type));
        let m25_block = blocks.find(b => b.year === 2025 && b.type === 'puntuale');
        let p24_block = blocks.find(b => b.year === 2024 && (b.type === 'progressivo' || !b.type));
        let m24_block = blocks.find(b => b.year === 2024 && b.type === 'puntuale');
        if (!p25_block && blocks.length >= 1) p25_block = blocks[0];
        if (!m25_block && blocks.length >= 2) m25_block = blocks[1];
        if (!p24_block && blocks.length >= 3) p24_block = blocks[2];
        if (!m24_block && blocks.length >= 4) m24_block = blocks[3];
        const p25_raw = extractData(p25_block), p24_raw = extractData(p24_block);
        let m25_raw = extractData(m25_block), m24_raw = extractData(m24_block);
        if (p25_raw && !m25_raw) m25_raw = calculatePuntualFromProgressive(p25_raw);
        if (p24_raw && !m24_raw) m24_raw = calculatePuntualFromProgressive(p24_raw);
        return { progressivo2025: p25_raw, puntuale2025: m25_raw, progressivo2024: p24_raw, puntuale2024: m24_raw };
    }

    detectReferenceMonth(): number | null {
        const sheetName = "1_CE dettaglio";
        if (this.workbook.SheetNames.includes(sheetName)) {
            const sheet = this.workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            for (let i = 0; i < Math.min(jsonData.length, 15); i++) {
                const row: any = jsonData[i];
                if (!row) continue;
                for (const cell of row) {
                    const s = String(cell).toLowerCase();
                    const monthMap: Record<string, number> = { "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6, "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12 };
                    for (const [mName, mNum] of Object.entries(monthMap)) { if (s.includes(` ${mName}`) || s.startsWith(mName)) return mNum; }
                }
            }
        }
        return null;
    }

    detectPartitari(): boolean {
        const sheetName = this.workbook.SheetNames[0];
        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (jsonData.length < 1) return false;
        const headerRow = (jsonData[0] as any[]).map(c => String(c).trim());
        const required = ["CodiceConto", "Descr_conto", "Data_registraz"];
        const matches = required.filter(r => headerRow.includes(r));
        return matches.length === required.length;
    }

    parsePartitari(): any {
        const sheetName = this.workbook.SheetNames[0];
        const sheet = this.workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!jsonData || jsonData.length === 0) return null;
        const allHeaders = (jsonData[0] as any[]).map(h => String(h).trim());
        const dataRows = jsonData.slice(1);
        const EXCLUDED_COLUMNS = ["Ditta", "DataStoDit", "DataStoAna", "CodAnacf", "Num_riga", "Cod_causale", "Attivita_ETS", "Codice_UnProd", "Descr_UnProD", "CodAnacfControp", "DescrAgg3"];
        const visibleHeaders = allHeaders.filter(h => !EXCLUDED_COLUMNS.includes(h));
        const visibleIndices = allHeaders.map((h, i) => EXCLUDED_COLUMNS.includes(h) ? -1 : i).filter(idx => idx !== -1);
        const parsedData = dataRows.map((row: any) => {
            const entry: Record<string, any> = {};
            visibleHeaders.forEach((header, index) => {
                const originalIndex = visibleIndices[index];
                let value = row[originalIndex];
                if (header.includes("Importo") || header.includes("Saldo") || header.includes("Progr")) value = cleanNumber(value);
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
        return { headers: visibleHeaders, data: parsedData };
    }

    parseSource(): any[] | null {
        const sheetName = this.workbook.SheetNames.find(s => s.trim().toLowerCase() === "source");
        if (!sheetName) return null;
        const sheet = this.workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        return data as any[];
    }

    parseSourceSummary(sourceData: any[]): { ricavi: number, costi: number, risultato: number } | null {
        if (!sourceData || sourceData.length < 5) return null;
        let ytdColIndex = -1;
        for (let r = 0; r < Math.min(sourceData.length, 30); r++) {
            const row = sourceData[r] as any[];
            if (!row) continue;
            for (let c = 0; c < row.length; c++) {
                const cell = String(row[c]).toLowerCase().trim();
                if (cell.includes("year to date") || cell === "ytd") { ytdColIndex = c; break; }
            }
            if (ytdColIndex !== -1) break;
        }
        let ricavi = 0, costi = 0, risultato = 0, foundBlock = false;
        const clean = (val: any) => { if (typeof val === 'number') return val; if (!val) return 0; const s = String(val).replace(/\./g, '').replace(',', '.').trim(); const n = parseFloat(s); return isNaN(n) ? 0 : n; };
        for (let i = sourceData.length - 1; i >= 0; i--) {
            const row = sourceData[i] as any[];
            if (!row) continue;
            const labelStr = row.slice(0, 6).map(c => String(c).toLowerCase().trim()).join(" ");
            let valIndex = ytdColIndex;
            if (valIndex === -1) { for (let c = row.length - 1; c >= 0; c--) { if (row[c] !== "" && row[c] !== null && row[c] !== undefined) { if (!isNaN(clean(row[c])) && clean(row[c]) !== 0) { valIndex = c; break; } } } }
            if (valIndex === -1) continue;
            const val = clean(row[valIndex]);
            if (labelStr.includes("differenza")) {
                if (risultato === 0) risultato = -val;
                const getValFromRow = (rIdx: number) => { if (rIdx < 0) return 0; const targetRow = sourceData[rIdx] as any[]; if (!targetRow || targetRow.length <= valIndex) return 0; return clean(targetRow[valIndex]); };
                if (ricavi === 0) ricavi = Math.abs(getValFromRow(i - 1));
                if (costi === 0) costi = getValFromRow(i - 2);
                foundBlock = true;
            } else if (ricavi === 0 && (labelStr.includes("totale ricavi") || String(row[0] || "").toLowerCase() === "ricavi" || String(row[3] || "").toLowerCase() === "ricavi")) { ricavi = Math.abs(val); }
            else if (costi === 0 && (labelStr.includes("totale costi") || String(row[0] || "").toLowerCase() === "costi" || String(row[3] || "").toLowerCase() === "costi")) { costi = val; }
            if (ricavi !== 0 && costi !== 0 && risultato !== 0) break;
        }
        if (foundBlock) return { ricavi, costi, risultato };
        return null;
    }
}
