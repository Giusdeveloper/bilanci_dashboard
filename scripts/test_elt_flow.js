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

// scripts/test_elt_flow.ts
import { eq, and } from "drizzle-orm";
import { sql as sql2 } from "drizzle-orm";
console.log("Script start");
async function runTest() {
  console.log("\u{1F9EA} AVVIO TEST ELT FLOW...");
  try {
    const testCompanyName = "Test Company ELT";
    const testCompanySlug = "test-company-elt";
    console.log("\u{1F9F9} Pulizia dati test precedenti...");
    console.log("Executing db.execute...");
    await db.execute(sql2`SELECT 1`);
    console.log("db.execute success.");
    console.log("Executing db.select(companies)...");
    const existingCompanyResult = await db.select().from(companies).where(eq(companies.slug, testCompanySlug));
    console.log("db.select executed.");
    const existingCompany = existingCompanyResult[0];
    let companyId;
    if (existingCompany) {
      companyId = existingCompany.id;
      await db.delete(financialData).where(eq(financialData.companyId, companyId));
      await db.delete(rawImports).where(eq(rawImports.companyId, companyId));
      await db.delete(accountMappings).where(eq(accountMappings.companyId, companyId));
      await db.delete(companies).where(eq(companies.id, companyId));
      console.log("   Dati puliti.");
    }
    console.log("\u{1F3ED} Creazione Azienda Test...");
    const [company] = await db.insert(companies).values({
      name: testCompanyName,
      slug: testCompanySlug
    }).returning();
    companyId = company.id;
    console.log(`   Azienda creata: ${companyId}`);
    const masterAccounts = await db.select().from(masterChartOfAccounts);
    const ricaviMaster = masterAccounts.find((m) => m.code === "RICAVI");
    const ebitdaMaster = masterAccounts.find((m) => m.code === "EBITDA");
    if (!ricaviMaster || !ebitdaMaster) {
      throw new Error("\u274C Master Accounts non trovati! Esegui seed_master_accounts.sql prima.");
    }
    console.log("\u{1F5FA}\uFE0F  Creazione Mapping...");
    await db.insert(accountMappings).values([
      {
        companyId,
        originalLabel: "Fatturato Italia",
        masterAccountId: ricaviMaster.id,
        signMultiplier: "1"
      },
      {
        companyId,
        originalLabel: "Margine Operativo Lordo",
        masterAccountId: ebitdaMaster.id,
        signMultiplier: "1"
      }
    ]);
    console.log("\u{1F4E5} Inserimento Raw Import (Simulazione n8n)...");
    const rawJson = [
      { "Voce": "Fatturato Italia", "Valore": "100.000,00" },
      { "Voce": "Margine Operativo Lordo", "Valore": "20.000,00" },
      { "Voce": "Voce Ignorata", "Valore": "500" }
    ];
    await db.insert(rawImports).values({
      companyId,
      rawData: JSON.stringify(rawJson),
      status: "pending"
    });
    console.log("\u2699\uFE0F  Esecuzione Processamento...");
    await processRawImports();
    console.log("\u{1F50D} Verifica Risultati...");
    const results = await db.select().from(financialData).where(
      and(
        eq(financialData.companyId, companyId),
        eq(financialData.dataType, "dashboard")
      )
    );
    if (results.length === 0) {
      throw new Error("\u274C Nessun dato finanziario creato!");
    }
    const data = JSON.parse(results[0].data);
    console.log("   Dati trovati:", data);
    const ricavi = data.kpis.ricavi2025;
    const ebitda = data.kpis.ebitda2025;
    console.log(`   Ricavi attesi: 100000, Trovati: ${ricavi}`);
    console.log(`   EBITDA attesi: 20000, Trovati: ${ebitda}`);
    if (ricavi === 1e5 && ebitda === 2e4) {
      console.log("\u2705 TEST SUPERATO! Il flusso ELT funziona correttamente.");
    } else {
      console.error("\u274C TEST FALLITO: I valori non corrispondono.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\u274C ERRORE NEL TEST:", error);
    process.exit(1);
  }
}
console.log("Calling runTest...");
runTest().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
