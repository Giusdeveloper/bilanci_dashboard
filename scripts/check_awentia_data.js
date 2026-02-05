var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db.ts
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountMappings: () => accountMappings,
  companies: () => companies,
  financialData: () => financialData,
  insertUserSchema: () => insertUserSchema,
  masterChartOfAccounts: () => masterChartOfAccounts,
  rawImports: () => rawImports,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
console.log("Loading shared/schema...");
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").default(sql`now()`)
});
var financialData = pgTable("financial_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  dataType: text("data_type").notNull(),
  // 'dashboard', 'ce-dettaglio', etc.
  year: text("year").notNull(),
  // Changed to text to match some potential usage, or integer? DB says integer usually. Let's check context. Context says integer.
  // Wait, ANALISI_SHERPA42 says year is integer. Let's use integer.
  // But Drizzle pg-core uses integer.
  month: text("month"),
  // integer | null. 
  data: text("data").notNull(),
  // JSONB is usually handled as jsonb in drizzle, but here maybe text? 
  // Let's use jsonb if possible, or custom type. 
  // Standard drizzle: jsonb("data")
  createdAt: text("created_at").default(sql`now()`)
});
var masterChartOfAccounts = pgTable("master_chart_of_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  // e.g. "A1", "RICAVI_TOTALI"
  label: text("label").notNull(),
  // e.g. "Ricavi delle vendite"
  type: text("type").notNull(),
  // 'economic', 'patrimonial'
  parentId: varchar("parent_id"),
  // Self reference for hierarchy
  createdAt: text("created_at").default(sql`now()`)
});
var accountMappings = pgTable("account_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  originalLabel: text("original_label").notNull(),
  // The exact string from the CSV
  masterAccountId: varchar("master_account_id").references(() => masterChartOfAccounts.id).notNull(),
  signMultiplier: text("sign_multiplier").default("1"),
  // "1" or "-1"
  createdAt: text("created_at").default(sql`now()`)
});
var rawImports = pgTable("raw_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  rawData: text("raw_data").notNull(),
  // The full JSON from Google Sheets
  status: text("status").default("pending").notNull(),
  // 'pending', 'processed', 'error'
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`now()`)
});

// server/db.ts
console.log("Initializing DB...");
try {
  dotenv.config({ path: "c:\\Users\\b_epp\\OneDrive\\Desktop\\Lavoro\\Development\\bilanci_dashboard\\.env" });
} catch (e) {
  console.error("Dotenv error:", e);
}
console.log("Dotenv configured");
console.log("Checking env var...");
console.log("DATABASE_URL present:", !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log("DB URL (masked):", process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@"));
}
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
console.log("Creating Pool...");
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});
var db;
try {
  console.log("Initializing Drizzle...");
  db = drizzle(pool, { schema: schema_exports });
  console.log("Drizzle initialized.");
  console.log("Schema keys:", Object.keys(schema_exports));
  console.log("db.query available:", !!db.query);
} catch (e) {
  console.error("Failed to initialize Drizzle:", e);
}

// scripts/check_awentia_data.ts
import { eq, count, sql as sql2 } from "drizzle-orm";
async function check() {
  try {
    console.log("Checking Awentia data...");
    const awentia = await db.query.companies.findFirst({
      where: eq(companies.slug, "awentia")
    });
    if (!awentia) {
      console.log("\u274C Azienda 'Awentia' NON trovata nel DB.");
    } else {
      console.log(`\u2705 Azienda trovata: ${awentia.name} (ID: ${awentia.id})`);
      const dataCount = await db.select({ count: count() }).from(financialData).where(eq(financialData.companyId, awentia.id));
      console.log(`\u{1F4CA} Record finanziari trovati: ${dataCount[0].count}`);
      const allData = await db.select().from(financialData).where(eq(financialData.companyId, awentia.id)).orderBy(sql2`CAST(${financialData.month} AS INTEGER) ASC`);
      console.log(`
\u{1F4CA} Found ${allData.length} records:`);
      for (const record of allData) {
        let keys = [];
        try {
          const data = typeof record.data === "string" ? JSON.parse(record.data) : record.data;
          keys = Object.keys(data);
        } catch (e) {
          keys = ["error"];
        }
        console.log(`  - Year: ${record.year}, Month: "${record.month}", Keys: ${keys.join(", ")}`);
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
