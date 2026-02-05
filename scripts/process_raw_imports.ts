console.log("Loading process_raw_imports...");
import { db } from "../server/db";
import { rawImports, accountMappings, financialData, masterChartOfAccounts } from "../shared/schema";
import { eq, and } from "drizzle-orm";

export async function processRawImports() {
    console.log("🔄 Avvio processamento importazioni...");

    // 1. Recupera record in stato 'pending'
    const pendingImports = await db.query.rawImports.findMany({
        where: eq(rawImports.status, "pending"),
        limit: 10 // Processiamo a batch per sicurezza
    });

    if (pendingImports.length === 0) {
        console.log("✅ Nessuna importazione in attesa.");
        return;
    }

    console.log(`📋 Trovati ${pendingImports.length} record da processare.`);

    for (const importRecord of pendingImports) {
        try {
            console.log(`\n⚙️  Processamento record ID: ${importRecord.id} (Company: ${importRecord.companyId})`);

            // 2. Recupera i mapping per questa azienda
            const mappings = await db.query.accountMappings.findMany({
                where: eq(accountMappings.companyId, importRecord.companyId),
                with: {
                    masterAccount: true // Assumendo che ci sia la relazione definita in schema (dobbiamo verificarlo/aggiungerlo)
                }
            });

            // Mappa veloce: Original Label -> { MasterCode, SignMultiplier }
            const mappingMap = new Map();
            mappings.forEach(m => {
                // Nota: Se non abbiamo la relazione definita in Drizzle, dobbiamo fare una query separata o join.
                // Per ora assumiamo di avere masterAccountId e recuperiamo i codici master separatamente o usiamo l'ID.
                // Usiamo l'ID del master account per l'aggregazione.
                mappingMap.set(m.originalLabel.trim().toLowerCase(), {
                    masterId: m.masterAccountId,
                    multiplier: parseFloat(m.signMultiplier || "1")
                });
            });

            // 3. Parse dei dati grezzi
            let rawData: any[] = [];
            try {
                rawData = JSON.parse(importRecord.rawData);
            } catch (e) {
                throw new Error("Formato JSON non valido in raw_data");
            }

            if (!Array.isArray(rawData)) {
                throw new Error("raw_data deve essere un array JSON");
            }

            // 4. Aggregazione
            const aggregatedValues = new Map<string, number>(); // MasterID -> Totale
            const unmappedItems: string[] = [];

            for (const row of rawData) {
                // Assumiamo che n8n ci mandi oggetti con chiavi standard o configurabili.
                // Per ora cerchiamo 'voce' e 'valore' (case insensitive)
                const voceKey = Object.keys(row).find(k => k.toLowerCase().includes('voce') || k.toLowerCase().includes('conto') || k.toLowerCase().includes('descrizione'));
                const valoreKey = Object.keys(row).find(k => k.toLowerCase().includes('valore') || k.toLowerCase().includes('importo') || k.toLowerCase().includes('saldo'));

                if (!voceKey || !valoreKey) {
                    console.warn(`⚠️  Riga ignorata (colonne non trovate):`, row);
                    continue;
                }

                const voce = String(row[voceKey]).trim();
                const valore = parseFloat(String(row[valoreKey]).replace(',', '.').replace(/[^0-9.-]/g, '')); // Pulizia base

                if (isNaN(valore)) continue;

                const mapping = mappingMap.get(voce.toLowerCase());

                if (mapping) {
                    const currentTotal = aggregatedValues.get(mapping.masterId) || 0;
                    aggregatedValues.set(mapping.masterId, currentTotal + (valore * mapping.multiplier));
                } else {
                    unmappedItems.push(voce);
                }
            }

            // 5. Costruzione Oggetto Dashboard Standard
            // Recuperiamo i codici dei master account per costruire il JSON finale leggibile
            const masterAccounts = await db.select().from(masterChartOfAccounts);
            const masterCodeMap = new Map(masterAccounts.map(ma => [ma.id, ma.code]));

            const finalData: any = {
                kpis: {},
                normalized_at: new Date().toISOString()
            };

            aggregatedValues.forEach((val, masterId) => {
                const code = masterCodeMap.get(masterId);
                if (code) {
                    // Mappiamo i codici standard (RICAVI, EBITDA, ecc.) nelle proprietà specifiche del JSON dashboard
                    // Questo è un mapping "Master -> Dashboard JSON Schema"
                    if (code === 'RICAVI') finalData.kpis.ricavi2025 = val;
                    else if (code === 'EBITDA') finalData.kpis.ebitda2025 = val;
                    else if (code === 'COSTI') finalData.kpis.costi2025 = val;
                    else if (code === 'RISULTATO') finalData.kpis.risultato2025 = val;
                    // Altri codici possono finire in un array generico 'details'
                }
            });

            // Calcoli derivati se mancano (es. Margine)
            if (finalData.kpis.ricavi2025 && finalData.kpis.ebitda2025) {
                finalData.kpis.margineEbitda2025 = (finalData.kpis.ebitda2025 / finalData.kpis.ricavi2025) * 100;
            }

            console.log("📊 Dati aggregati:", finalData);
            if (unmappedItems.length > 0) {
                console.warn(`⚠️  ${unmappedItems.length} voci non mappate:`, unmappedItems.slice(0, 5));
            }

            // 6. Inserimento in financial_data
            // Determiniamo anno/mese dal rawData se possibile, altrimenti usiamo data corrente o parametri
            // Per ora hardcodiamo 2025/10 come esempio, ma idealmente n8n dovrebbe passarci anche i metadati
            // O dovremmo trovarli nel JSON.
            // Assumiamo che n8n passi un campo 'meta' o simile, o usiamo la data corrente.
            const year = 2025;
            const month = 10; // TODO: Estrarre dinamicamente

            await db.insert(financialData).values({
                companyId: importRecord.companyId,
                dataType: 'dashboard',
                year: year.toString(), // Schema usa text
                month: month.toString(),
                data: JSON.stringify(finalData)
            });

            // 7. Aggiorna stato
            await db.update(rawImports)
                .set({ status: 'processed', errorMessage: null })
                .where(eq(rawImports.id, importRecord.id));

            console.log("✅ Importazione completata con successo.");

        } catch (err: any) {
            console.error(`❌ Errore processamento import ${importRecord.id}:`, err);
            await db.update(rawImports)
                .set({ status: 'error', errorMessage: err.message })
                .where(eq(rawImports.id, importRecord.id));
        }
    }
}

// Esegui solo se il file è eseguito direttamente
import { fileURLToPath } from 'url';
// if (process.argv[1] === fileURLToPath(import.meta.url)) {
//     processRawImports()
//         .then(() => process.exit(0))
//         .catch((err) => {
//             console.error(err);
//             process.exit(1);
//         });
// }
