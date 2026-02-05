import 'dotenv/config';
import pg from 'pg';
console.log("Minimal test start");
const { Pool } = pg;
console.log("Pool imported");
const pool = new Pool();
console.log("Pool created");
