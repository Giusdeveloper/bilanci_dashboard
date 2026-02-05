import pg from 'pg';
import { sql } from 'drizzle-orm';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

console.log("Testing connection with pg Pool in bundled script...");
console.log("URL:", process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : "MISSING");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function test() {
    try {
        const client = await pool.connect();
        console.log("Connected successfully!");
        const res = await client.query('SELECT NOW()');
        console.log(res.rows[0]);
        client.release();
        await pool.end();
    } catch (err) {
        console.error("Connection error:", err);
    }
}

test();
