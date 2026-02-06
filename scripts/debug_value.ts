
import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:\\Users\\b_epp\\OneDrive\\Desktop\\Lavoro\\Development\\bilanci_dashboard\\import_data\\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets['Source'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    console.log("Searching for 39215 or 39.215...");

    (data as any[]).forEach((row: any[], rIndex) => {
        if (!row) return;
        row.forEach((cell, cIndex) => {
            const val = String(cell);
            // Check for 39215 or close
            if (val.includes("39215") || val.includes("39.215") || val.includes("39,215")) {
                console.log(`Found value match at Row ${rIndex}, Col ${cIndex}: "${val}"`);
                console.log(`Row content:`, JSON.stringify(row));
            }
        });
    });

    console.log("--- Header Check ---");
    // Print first 20 rows to find YTD header
    for (let i = 0; i < 30; i++) {
        const row = data[i] as any[];
        if (row && row.join("").trim().length > 0) { // skip fully empty
            console.log(`Row ${i}:`, JSON.stringify(row));
        }
    }

} catch (err) {
    console.error(err);
}
