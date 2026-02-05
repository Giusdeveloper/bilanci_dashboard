console.log("Initializing DB...");
import path from 'path';
import dotenv from 'dotenv';
try {
    dotenv.config({ path: 'c:\\Users\\b_epp\\OneDrive\\Desktop\\Lavoro\\Development\\bilanci_dashboard\\.env' });
} catch (e) {
    console.error("Dotenv error:", e);
}
console.log("Dotenv configured");
console.log("Checking env var...");
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    console.log("DB URL (masked):", process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@'));
}

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from "../shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

console.log("Creating Pool...");
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export let db: any;
try {
    console.log("Initializing Drizzle...");
    db = drizzle(pool, { schema });
    console.log("Drizzle initialized.");
    console.log("Schema keys:", Object.keys(schema));
    console.log("db.query available:", !!db.query);
} catch (e) {
    console.error("Failed to initialize Drizzle:", e);
}
