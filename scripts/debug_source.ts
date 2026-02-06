
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const filePath = 'c:\\Users\\b_epp\\OneDrive\\Desktop\\Lavoro\\Development\\bilanci_dashboard\\import_data\\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx';

try {
    console.log(`Reading file: ${filePath}`);
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames.find(s => s.trim().toLowerCase() === "source");
    if (!sheetName) {
        console.error("Sheet 'Source' not found!");
        process.exit(1);
    }

    console.log(`Found sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    console.log(`Total Rows: ${data.length}`);

    // Search for "Differenza" or "Costi"
    let diffIndex = -1;
    for (let i = data.length - 1; i >= 0; i--) {
        const row = data[i] as any[];
        if (!row) continue;
        const str = JSON.stringify(row).toLowerCase();
        if (str.includes("differenza")) {
            diffIndex = i;
            break;
        }
    }

    if (diffIndex !== -1) {
        console.log(`Found 'Differenza' at row ${diffIndex}`);
        const start = Math.max(0, diffIndex - 10);
        const end = Math.min(data.length, diffIndex + 5);
        for (let i = start; i < end; i++) {
            console.log(`Row ${i}:`, JSON.stringify(data[i]));
        }
    } else {
        console.log("Could not find row with 'Differenza'");
        // Fallback: print non-empty rows from bottom
        console.log("--- Last 10 Non-Empty Rows ---");
        let count = 0;
        for (let i = data.length - 1; i >= 0; i--) {
            const row = data[i] as any[];
            if (row && row.some(c => c && String(c).trim() !== "")) {
                console.log(`Row ${i}:`, JSON.stringify(row));
                count++;
                if (count >= 10) break;
            }
        }
    }

} catch (err) {
    console.error("Error reading file:", err);
}
