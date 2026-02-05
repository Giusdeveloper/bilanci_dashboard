import { db, pool } from './server/db';
import { sql } from 'drizzle-orm';

console.log("Starting minimal db test...");

async function run() {
    try {
        console.log("Executing query...");
        const res = await db.execute(sql`SELECT 1`);
        console.log("Query success:", res);
    } catch (e) {
        console.error("Query failed:", e);
    } finally {
        await pool.end();
    }
}

run();
