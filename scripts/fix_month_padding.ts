import { db, pool } from '../server/db';
import { financialData } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

async function fixMonths() {
    try {
        console.log("🔧 Fixing month padding...");

        // Fetch all records with single digit months
        const records = await db.select().from(financialData);

        let updatedCount = 0;

        for (const record of records) {
            // console.log(`ID: ${record.id}, Month: "${record.month}"`);
            if (record.month && record.month.trim().length === 1) {
                const newMonth = "0" + record.month.trim();
                console.log(`  Updating ID ${record.id}: ${record.month} -> ${newMonth}`);

                await db.update(financialData)
                    .set({ month: newMonth })
                    .where(eq(financialData.id, record.id));

                updatedCount++;
            }
        }

        console.log(`✅ Updated ${updatedCount} records.`);

    } catch (e) {
        console.error("Error fixing months:", e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

fixMonths();
