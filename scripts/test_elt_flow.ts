import { db, pool } from "../server/db";
import { companies } from "../shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function runTest() {
    console.log("🧪 AVVIO TEST ELT FLOW...");
    try {

        // 1. Setup Dati Test
        const testCompanyName = "Test Company ELT";
        const testCompanySlug = "test-company-elt";

        // Pulisci dati precedenti se esistono
        console.log("🧹 Pulizia dati test precedenti...");
        // Nota: L'ordine di cancellazione è importante per le FK
        // Cancelliamo prima i dati dipendenti
        // Ma per semplicità, cerchiamo se l'azienda esiste e cancelliamo tutto ciò che la riguarda

        console.log("Executing db.execute...");
        await db.execute(sql`SELECT 1`);
        console.log("db.execute success.");

        console.log("Executing db.select(companies)...");
        const existingCompanyResult = await db.select().from(companies).where(eq(companies.slug, testCompanySlug));
        console.log("db.select executed.");
        const existingCompany = existingCompanyResult[0];

        let companyId: string;

        if (existingCompany) {
            companyId = existingCompany.id;
            await db.delete(financialData).where(eq(financialData.companyId, companyId));
            await db.delete(rawImports).where(eq(rawImports.companyId, companyId));
            await db.delete(accountMappings).where(eq(accountMappings.companyId, companyId));
            await db.delete(companies).where(eq(companies.id, companyId));
            console.log("   Dati puliti.");
        }

        // Crea Azienda
        console.log("🏭 Creazione Azienda Test...");
        const [company] = await db.insert(companies).values({
            name: testCompanyName,
            slug: testCompanySlug
        }).returning();
        companyId = company.id;
        console.log(`   Azienda creata: ${companyId}`);

        // Recupera Master Accounts (assumiamo che il seed sia stato fatto)
        const masterAccounts = await db.select().from(masterChartOfAccounts);
        const ricaviMaster = masterAccounts.find(m => m.code === 'RICAVI');
        const ebitdaMaster = masterAccounts.find(m => m.code === 'EBITDA');

        if (!ricaviMaster || !ebitdaMaster) {
            throw new Error("❌ Master Accounts non trovati! Esegui seed_master_accounts.sql prima.");
        }

        // Crea Mapping
        console.log("🗺️  Creazione Mapping...");
        await db.insert(accountMappings).values([
            {
                companyId,
                originalLabel: "Fatturato Italia",
                masterAccountId: ricaviMaster.id,
                signMultiplier: "1"
            },
            {
                companyId,
                originalLabel: "Margine Operativo Lordo",
                masterAccountId: ebitdaMaster.id,
                signMultiplier: "1"
            }
        ]);

        // Inserisci Raw Import (Simula n8n)
        console.log("📥 Inserimento Raw Import (Simulazione n8n)...");
        const rawJson = [
            { "Voce": "Fatturato Italia", "Valore": "100.000,00" },
            { "Voce": "Margine Operativo Lordo", "Valore": "20.000,00" },
            { "Voce": "Voce Ignorata", "Valore": "500" }
        ];

        await db.insert(rawImports).values({
            companyId,
            rawData: JSON.stringify(rawJson),
            status: 'pending'
        });

        // 2. Esegui Processamento
        console.log("⚙️  Esecuzione Processamento...");
        await processRawImports();

        // 3. Verifica Risultati
        console.log("🔍 Verifica Risultati...");
        const results = await db.select().from(financialData).where(
            and(
                eq(financialData.companyId, companyId),
                eq(financialData.dataType, 'dashboard')
            )
        );

        if (results.length === 0) {
            throw new Error("❌ Nessun dato finanziario creato!");
        }

        const data = JSON.parse(results[0].data);
        console.log("   Dati trovati:", data);

        const ricavi = data.kpis.ricavi2025;
        const ebitda = data.kpis.ebitda2025;

        console.log(`   Ricavi attesi: 100000, Trovati: ${ricavi}`);
        console.log(`   EBITDA attesi: 20000, Trovati: ${ebitda}`);

        if (ricavi === 100000 && ebitda === 20000) {
            console.log("✅ TEST SUPERATO! Il flusso ELT funziona correttamente.");
        } else {
            console.error("❌ TEST FALLITO: I valori non corrispondono.");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ ERRORE NEL TEST:", error);
        process.exit(1);
    }
}


console.log("Calling runTest...");
runTest()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
