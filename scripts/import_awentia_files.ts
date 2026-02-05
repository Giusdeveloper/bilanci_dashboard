console.log("Script loaded.");
import { db, pool } from '../server/db';
import { companies, financialData } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// MAPPING CONFIGURATION
const MAPPING: Record<string, string> = {
    "Ricavi caratteristici": "Ricavi",
    "Altri ricavi": "Altri Ricavi",
    "TOTALE RICAVI": "KPI_RICAVI",
    "Servizi diretti": "Costi per Servizi",
    "Cosulenze dirette": "Costi per Servizi",
    "Servizi informatici web": "Costi per Servizi",
    "Servizi cloud": "Costi per Servizi",
    "Altri servizi e prestazioni": "Costi per Servizi",
    "Autofatture": "Altri Ricavi",
    "Rimborsi spese": "Altri Ricavi",
    "Altri proventi": "Altri Ricavi",
    "Spese viaggio": "Costi per Servizi",
    "Pedaggi autostradali": "Costi per Servizi",
    "Pubblicità": "Costi per Servizi",
    "Materiale pubblicitario": "Costi per Servizi",
    "Omaggi": "Costi per Servizi",
    "Spese di rappresentanza": "Costi per Servizi",
    "Mostre e fiere": "Costi per Servizi",
    "Servizi commerciali": "Costi per Servizi",
    "Carburante": "Costi per Servizi",
    "Beni indeducibili": "Oneri Diversi",
    "Spese generali": "Oneri Diversi",
    "Materiale vario e di consumo": "Oneri Diversi",
    "Spese di pulizia": "Oneri Diversi",
    "Utenze": "Godimento Beni Terzi",
    "Assicurazioni": "Oneri Diversi",
    "Rimanenze": "Oneri Diversi",
    "Tasse e valori bollati": "Oneri Diversi",
    "Sanzioni e multe": "Oneri Diversi",
    "Compensi amministratore": "Personale",
    "Rimborsi amministratore": "Personale",
    "Personale": "Personale",
    "Servizi amministrativi contabilità": "Costi per Servizi",
    "Servizi amministrativi paghe": "Costi per Servizi",
    "Consulenze tecniche": "Costi per Servizi",
    "Consulenze legali": "Costi per Servizi",
    "Locazioni e noleggi": "Godimento Beni Terzi",
    "Servizi indeducibili": "Costi per Servizi",
    "Utili e perdite su cambi": "Oneri Finanziari",
    "Perdite su crediti": "Oneri Diversi",
    "Licenze d'uso": "Godimento Beni Terzi",
    "Utenze telefoniche e cellulari": "Godimento Beni Terzi",
    "Altri oneri": "Oneri Diversi",
    "Abbuoni e arrotondamenti": "Oneri Diversi",
    "EBITDA": "KPI_EBITDA",
    "Ammortamenti immateriali": "Ammortamenti",
    "Ammortamenti materiali": "Ammortamenti",
    "Svalutazioni e accantonamenti": "Ammortamenti",
    "EBIT": "EBIT",
    "Spese e commissioni bancarie": "Oneri Finanziari",
    "Interessi passivi su mutui": "Oneri Finanziari",
    "Altri interessi": "Oneri Finanziari",
    "EBT": "Risultato Ante Imposte",
    "Imposte dirette": "Imposte",
    "RISULTATO DELL'ESERCIZIO": "KPI_RISULTATO"
};

async function importFiles() {
    try {
        console.log("🚀 Starting Awentia File Import...");

        // 1. Get Awentia Company
        const awentia = await db.query.companies.findFirst({
            where: eq(companies.slug, 'awentia')
        });

        if (!awentia) {
            throw new Error("Awentia company not found!");
        }
        console.log(`✅ Company found: ${awentia.name}`);

        // 2. Define Files to Process
        const filesToProcess = [
            {
                monthName: 'Settembre',
                monthNum: 9,
                filename: '[2025] Analisi Bilanci al 30 settembre Awentia - 1_CE dettaglio.csv'
            },
            {
                monthName: 'Ottobre',
                monthNum: 10,
                filename: '[2025] Analisi Bilanci al 31 ottobre Awentia - 1_CE dettaglio.csv'
            }
        ];

        // 3. Get Latest Data (August) - Filter by dataType='dashboard'
        const latestDataRecord = await db.select()
            .from(financialData)
            .where(sql`${financialData.companyId} = ${awentia.id} AND ${financialData.dataType} = 'dashboard'`)
            .orderBy(sql`${financialData.year} DESC`, sql`CAST(${financialData.month} AS INTEGER) DESC`)
            .limit(1);

        let previousData: any = {
            kpis: { ricavi2025: 0, costi2025: 0, ebitda2025: 0, risultato2025: 0 },
            monthlyTrend: { labels: [], ricavi: [], ebitda: [] },
            summary: []
        };

        if (latestDataRecord.length > 0) {
            // Try to find specifically Month 8 for dashboard
            const augustData = await db.select()
                .from(financialData)
                .where(sql`${financialData.companyId} = ${awentia.id} AND ${financialData.month} = '8' AND ${financialData.dataType} = 'dashboard'`)
                .limit(1);

            if (augustData.length > 0) {
                try {
                    let data = augustData[0].data;
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    previousData = data;
                    console.log("📅 Loaded base data from August (dashboard).");
                } catch (e) {
                    console.error("⚠️ Error parsing August data:", e);
                }
            } else if (latestDataRecord[0].month !== '9' && latestDataRecord[0].month !== '10') {
                try {
                    let data = latestDataRecord[0].data;
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    previousData = data;
                    console.log(`📅 Loaded base data from ${latestDataRecord[0].month} (dashboard).`);
                } catch (e) {
                    console.error(`⚠️ Error parsing ${latestDataRecord[0].month} data:`, e);
                }
            } else {
                console.log("⚠️ Could not find clean August data. Using empty base (or latest).");
            }
        }

        // 4. Process Each File
        for (const fileInfo of filesToProcess) {
            console.log(`\n🔄 Processing ${fileInfo.monthName}...`);
            const filePath = path.join(process.cwd(), 'import_data', fileInfo.filename);

            if (!fs.existsSync(filePath)) {
                console.error(`❌ File not found: ${filePath}`);
                continue;
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const records = parse(fileContent, {
                columns: false, // No headers, we use index
                relax_column_count: true,
                skip_empty_lines: true,
                from_line: 3 // Skip first 2 header lines
            });

            // Clone previous data
            const newData = JSON.parse(JSON.stringify(previousData));

            let kpiRicavi = 0;
            let kpiEbitda = 0;
            let kpiCosti = 0;
            let kpiRisultato = 0;
            const newSummary = [];

            console.log(`  Found ${records.length} records.`);

            let rowCount = 0;
            for (const row of records) {
                rowCount++;
                const voce = row[1]; // Column B (Label)
                const valueStr = row[2]; // Column C (2025 YTD)

                if (rowCount <= 20) {
                    console.log(`  Row ${rowCount}: [0]="${row[0]}" [1]="${row[1]}" [2]="${row[2]}"`);
                }

                if (!voce && !valueStr) continue;

                // Try to find label in col 0 or 1
                const label = (voce || row[0] || "").trim();
                if (!label) continue;

                const cleanValueStr = valueStr.replace(/\./g, '').replace(',', '.');
                const value = parseFloat(cleanValueStr);

                if (isNaN(value)) continue;

                const mapping = MAPPING[label];

                if (mapping) {
                    console.log(`  MATCH: "${label}" -> ${mapping} (Value: ${value})`);
                    if (mapping === 'KPI_RICAVI') kpiRicavi = value;
                    else if (mapping === 'KPI_COSTI') kpiCosti = value;
                    else if (mapping === 'KPI_EBITDA') kpiEbitda = value;
                    else if (mapping === 'KPI_RISULTATO') kpiRisultato = value;
                    else {
                        newSummary.push({
                            voce: mapping,
                            value2025: value,
                            percentage: 0, // Will calc later
                            value2024: 0
                        });
                    }
                }
            }

            // Calc percentages
            newSummary.forEach(item => {
                item.percentage = kpiRicavi ? (item.value2025 / kpiRicavi) * 100 : 0;
            });

            // Update KPIs
            newData.kpis.ricavi2025 = kpiRicavi;
            newData.kpis.costi2025 = kpiCosti;
            newData.kpis.ebitda2025 = kpiEbitda;
            newData.kpis.risultato2025 = kpiRisultato;
            newData.summary = newSummary;

            // Update Trend
            const prevRicavi = previousData.kpis.ricavi2025 || 0;
            const prevEbitda = previousData.kpis.ebitda2025 || 0;

            const monthlyRicavi = kpiRicavi - prevRicavi;
            const monthlyEbitda = kpiEbitda - prevEbitda;

            const monthLabel = fileInfo.monthName.substring(0, 3); // Set, Ott

            if (!newData.monthlyTrend) newData.monthlyTrend = { labels: [], ricavi: [], ebitda: [] };
            if (!newData.monthlyTrend.labels) newData.monthlyTrend.labels = [];
            if (!newData.monthlyTrend.ricavi) newData.monthlyTrend.ricavi = [];
            if (!newData.monthlyTrend.ebitda) newData.monthlyTrend.ebitda = [];

            const existingIndex = newData.monthlyTrend.labels.indexOf(monthLabel);

            if (existingIndex >= 0) {
                newData.monthlyTrend.ricavi[existingIndex] = monthlyRicavi;
                newData.monthlyTrend.ebitda[existingIndex] = monthlyEbitda;
            } else {
                newData.monthlyTrend.labels.push(monthLabel);
                newData.monthlyTrend.ricavi.push(monthlyRicavi);
                newData.monthlyTrend.ebitda.push(monthlyEbitda);
            }

            console.log(`  📊 KPIs: Ricavi=${kpiRicavi}, EBITDA=${kpiEbitda}`);
            console.log(`  📈 Monthly: Ricavi=${monthlyRicavi}, EBITDA=${monthlyEbitda}`);

            // Save
            // Check if record exists
            const existingRecord = await db.select()
                .from(financialData)
                .where(sql`${financialData.companyId} = ${awentia.id} AND ${financialData.dataType} = 'dashboard' AND ${financialData.year} = '2025' AND ${financialData.month} = ${fileInfo.monthNum.toString().padStart(2, '0')}`)
                .limit(1);

            if (existingRecord.length > 0) {
                console.log(`  🔄 Updating existing record (ID: ${existingRecord[0].id})...`);
                await db.update(financialData)
                    .set({ data: JSON.stringify(newData) })
                    .where(eq(financialData.id, existingRecord[0].id));
            } else {
                console.log(`  ➕ Inserting new record...`);
                await db.insert(financialData).values({
                    companyId: awentia.id,
                    dataType: 'dashboard',
                    year: '2025',
                    month: fileInfo.monthNum.toString().padStart(2, '0'),
                    data: JSON.stringify(newData)
                });
            }

            console.log(`✅ Saved ${fileInfo.monthName}.`);

            previousData = newData;
        }

        console.log("\n🎉 Import completed!");

    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await pool.end();
    }
}

importFiles()
    .then(() => {
        console.log("Script finished.");
        process.exit(0);
    })
    .catch(err => {
        console.error("Top-level error:", err);
        process.exit(1);
    });
