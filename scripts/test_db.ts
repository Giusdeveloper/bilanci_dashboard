import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function testConnection() {
    try {
        console.log("Testing DB connection...");
        const result = await db.execute(sql`SELECT 1`);
        console.log("DB Connection successful:", result);
    } catch (err) {
        console.error("DB Connection failed:", err);
    }
}

testConnection();
