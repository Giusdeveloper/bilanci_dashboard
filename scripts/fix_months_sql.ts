import { db, pool } from '../server/db';
import { sql } from 'drizzle-orm';
import { financialData } from '../shared/schema';

async function fixMonthsSql() {
    try {
        console.log("🔧 Fixing month padding using SQL...");

        const records = await db.select().from(financialData);
        console.log(`Checking ${records.length} records...`);
        let count = 0;
        for (const r of records) {
            // console.log(`ID: ${r.id}, Month: "${r.month}" (Len: ${r.month?.length})`);
            if (r.month && r.month.trim().length === 1) {
                const newMonth = r.month.trim().padStart(2, '0');
                console.log(`Updating ${r.id}: ${r.month} -> ${newMonth}`);
                await db.update(financialData)
                    .set({ month: newMonth })
                    .where(sql`id = ${r.id}`);
                count++;
            }
        }
        console.log(`✅ Updated ${count} records manually.`);
        // console.log("Result:", result);

    } catch (e) {
        console.error("Error fixing months:", e);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

fixMonthsSql();
