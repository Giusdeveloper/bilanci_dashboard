
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const importDir = path.join(process.cwd(), 'import_data');

function findExcelFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir);
    return files.filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'));
}

const excelFiles = findExcelFiles(importDir);
const filename = excelFiles.find(f => f.includes("Analisi Bilanci Awentia"));

if (!filename) {
    console.log("File not found");
    process.exit(1);
}

const filepath = path.join(importDir, filename);
console.log(`Analyzing file: ${filename}`);

try {
    const workbook = XLSX.readFile(filepath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    console.log(`Sheet: ${sheetName}`);

    // --- COPY OF FRONTEND LOGIC ---

    // Step 1: Identifica le colonne
    let colIndex2025 = -1;
    let colIndex2024 = -1;

    // Cerchiamo nelle prime 20 righe (increased a bit for safety)
    for (let i = 0; i < Math.min(jsonData.length, 20); i++) {
        const row = jsonData[i];
        row.forEach((cell, idx) => {
            const cellStr = cell?.toString() || "";
            if (cellStr.includes("2025")) {
                console.log(`Found '2025' at row ${i}, col ${idx}`);
                colIndex2025 = idx;
            }
            if (cellStr.includes("2024")) {
                console.log(`Found '2024' at row ${i}, col ${idx}`);
                colIndex2024 = idx;
            }
        });
        if (colIndex2025 !== -1) break;
    }

    // Fallback logic
    if (colIndex2025 === -1) {
        colIndex2025 = 2;
        console.log("Fallback 2025 -> Col 2");
    }
    if (colIndex2024 === -1) {
        colIndex2024 = 5;
        console.log("Fallback 2024 -> Col 5");
    }

    console.log(`Columns used -> 2025: ${colIndex2025}, 2024: ${colIndex2024}`);

    let foundRicavi = "";
    let foundCosti = "";
    let foundEbitda = "";
    let foundRisultato = "";

    // Helper per pulire i valori
    const cleanNumber = (val: any) => {
        if (val === undefined || val === null) return 0;
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
            // Formato Italiano: 1.000,00 -> 1000.00
            // Rimuovi punti (migliaia) e sostituisci virgola con punto
            const clean = val.replace(/\./g, '').replace(',', '.').trim();
            const num = parseFloat(clean);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    };

    jsonData.forEach((row: any[], index) => {
        if (!row || row.length === 0) return;
        const label = row[0]?.toString().toLowerCase() || "";
        const val2025 = cleanNumber(row[colIndex2025]);

        // Debug key rows
        if (label.includes("valore della produzione") || label.includes("ricavi") || label.includes("margine") || label.includes("utile")) {
            console.log(`[Row ${index}] Label: "${label}" -> Raw Value: "${row[colIndex2025]}" -> Clean Value: ${val2025}`);
        }

        // Ricerca Euristica
        if (label.includes("ricavi delle vendite") || label.includes("valore della produzione") || label === "ricavi") {
            // Priority to Totale
            if (!foundRicavi || label.includes("totale") || label.startsWith("totale")) {
                if (val2025 !== 0) { // Avoid picking up header rows with 0
                    foundRicavi = val2025.toString();
                    console.log(`-> MATCH RICAVI: ${foundRicavi}`);
                }
            }
        }

        if (label.includes("margine operativo lordo") || label.includes("ebitda")) {
            foundEbitda = val2025.toString();
            console.log(`-> MATCH EBITDA: ${foundEbitda}`);
        }

        if (label.includes("costi della produzione") || label.includes("totale costi")) {
            // Priority to Totale
            if (!foundCosti || label.includes("totale")) {
                if (val2025 !== 0) {
                    foundCosti = val2025.toString();
                    console.log(`-> MATCH COSTI: ${foundCosti}`);
                }
            }
        }

        // Risultato
        if (label.includes("utile (perdita) dell'esercizio") || label.includes("risultato d'esercizio") || label === "utile/perdita") {
            foundRisultato = val2025.toString();
            console.log(`-> MATCH RISULTATO: ${foundRisultato}`);
        }
    });

    if ((!foundCosti || foundCosti === "0") && foundRicavi && foundEbitda) {
        foundCosti = (parseFloat(foundRicavi) - parseFloat(foundEbitda)).toString();
        console.log(`-> CALC COSTI (Ricavi - Ebitda): ${foundCosti}`);
    }

    console.log("\n--- FINAL EXTRACTED VALUES ---");
    console.log({
        ricavi: foundRicavi,
        costi: foundCosti,
        ebitda: foundEbitda,
        risultato: foundRisultato
    });

} catch (err) {
    console.error("Error reading excel:", err);
}
