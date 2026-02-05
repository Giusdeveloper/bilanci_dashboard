import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

console.log("Testing connection with pg...");
console.log("URL:", process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : "MISSING");

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function test() {
    try {
        await client.connect();
        console.log("Connected successfully!");
        const res = await client.query('SELECT NOW()');
        console.log(res.rows[0]);
        await client.end();
    } catch (err) {
        console.error("Connection error:", err);
    }
}

test();
