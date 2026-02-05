import { db, pool } from '../server/db';
import { companies, financialData } from '../shared/schema';
import { eq, count, sql } from 'drizzle-orm';

async function check() {
    try {
        console.log("Checking Awentia data...");
        const awentia = await db.query.companies.findFirst({
            where: eq(companies.slug, 'awentia')
        });

        if (!awentia) {
            console.log("❌ Azienda 'Awentia' NON trovata nel DB.");
        } else {
            console.log(`✅ Azienda trovata: ${awentia.name} (ID: ${awentia.id})`);

            const dataCount = await db.select({ count: count() })
                .from(financialData)
                .where(eq(financialData.companyId, awentia.id));

            console.log(`📊 Record finanziari trovati: ${dataCount[0].count}`);

            const allData = await db.select()
                .from(financialData)
                .where(eq(financialData.companyId, awentia.id))
                .orderBy(sql`CAST(${financialData.month} AS INTEGER) ASC`);

            console.log(`\n📊 Found ${allData.length} records:`);
            for (const record of allData) {
                let keys = [];
                try {
                    const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
                    keys = Object.keys(data);
                } catch (e) { keys = ['error']; }
                console.log(`  - Year: ${record.year}, Month: "${record.month}", Keys: ${keys.join(', ')}`);
            }
        }
    } catch (e) {
        console.error("Error checking data:", e);
    } finally {
        await pool.end();
        console.log("Check finished.");
        process.exit(0);
    }
}

check();
