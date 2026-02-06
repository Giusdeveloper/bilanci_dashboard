
import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'c:\\Users\\b_epp\\OneDrive\\Desktop\\Lavoro\\Development\\bilanci_dashboard\\import_data\\[2025] Analisi Bilanci al 31 dicembre Awentia.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets['Source'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    console.log("Simulating Matcher...");

    // Simulate finding YTD index (we know it's ~17)
    let ytdColIndex = 17; // From previous manual inspection

    for (let i = data.length - 1; i >= 0; i--) {
        const row = data[i] as any[];
        if (!row) continue;

        const labelStr = row.slice(0, 6).map(c => String(c).toLowerCase().trim()).join(" ");
        const cell3 = String(row[3] || "").trim().toLowerCase();
        const cell0 = String(row[0] || "").trim().toLowerCase();

        let matchType = null;
        if (cell3 === "costi" || cell0 === "costi" || labelStr.includes("totale costi") || labelStr.includes("costi della produzione")) {
            matchType = "COSTI";
        } else if (labelStr.includes("differenza")) {
            matchType = "DIFFERENZA";
        } else if (cell3 === "ricavi" || cell0 === "ricavi" || labelStr.includes("totale ricavi")) {
            matchType = "RICAVI";
        }

        if (matchType) {
            const val = row[ytdColIndex];
            console.log(`[${matchType}] Matched Row ${i}: Value=${val}`);
            console.log(`Content:`, JSON.stringify(row));
        }
    }

} catch (err) {
    console.error(err);
}
