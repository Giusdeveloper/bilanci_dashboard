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

// scripts/import_awentia_files.ts
import { eq, sql as sql2 } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
console.log("Script loaded.");
var MAPPING = {
  "Ricavi caratteristici": "Ricavi",
  "Altri ricavi": "Altri Ricavi",
  "TOTALE RICAVI": "KPI_RICAVI",
  "Servizi diretti": "Costi per Servizi",
  "Cosulenze dirette": "Costi per Servizi",
  "Servizi informatici web": "Costi per Servizi",
  "Servizi cloud": "Costi per Servizi",
  "Altri servizi e prestazioni": "Costi per Servizi",
  "Autofatture": "Altri Ricavi",
  "Rimborsi spese": "Altri Ricavi",
  "Altri proventi": "Altri Ricavi",
  "Spese viaggio": "Costi per Servizi",
  "Pedaggi autostradali": "Costi per Servizi",
  "Pubblicit\xE0": "Costi per Servizi",
  "Materiale pubblicitario": "Costi per Servizi",
  "Omaggi": "Costi per Servizi",
  "Spese di rappresentanza": "Costi per Servizi",
  "Mostre e fiere": "Costi per Servizi",
  "Servizi commerciali": "Costi per Servizi",
  "Carburante": "Costi per Servizi",
  "Beni indeducibili": "Oneri Diversi",
  "Spese generali": "Oneri Diversi",
  "Materiale vario e di consumo": "Oneri Diversi",
  "Spese di pulizia": "Oneri Diversi",
  "Utenze": "Godimento Beni Terzi",
  "Assicurazioni": "Oneri Diversi",
  "Rimanenze": "Oneri Diversi",
  "Tasse e valori bollati": "Oneri Diversi",
  "Sanzioni e multe": "Oneri Diversi",
  "Compensi amministratore": "Personale",
  "Rimborsi amministratore": "Personale",
  "Personale": "Personale",
  "Servizi amministrativi contabilit\xE0": "Costi per Servizi",
  "Servizi amministrativi paghe": "Costi per Servizi",
  "Consulenze tecniche": "Costi per Servizi",
  "Consulenze legali": "Costi per Servizi",
  "Locazioni e noleggi": "Godimento Beni Terzi",
  "Servizi indeducibili": "Costi per Servizi",
  "Utili e perdite su cambi": "Oneri Finanziari",
  "Perdite su crediti": "Oneri Diversi",
  "Licenze d'uso": "Godimento Beni Terzi",
  "Utenze telefoniche e cellulari": "Godimento Beni Terzi",
  "Altri oneri": "Oneri Diversi",
  "Abbuoni e arrotondamenti": "Oneri Diversi",
  "EBITDA": "KPI_EBITDA",
  "Ammortamenti immateriali": "Ammortamenti",
  "Ammortamenti materiali": "Ammortamenti",
  "Svalutazioni e accantonamenti": "Ammortamenti",
  "EBIT": "EBIT",
  "Spese e commissioni bancarie": "Oneri Finanziari",
  "Interessi passivi su mutui": "Oneri Finanziari",
  "Altri interessi": "Oneri Finanziari",
  "EBT": "Risultato Ante Imposte",
  "Imposte dirette": "Imposte",
  "RISULTATO DELL'ESERCIZIO": "KPI_RISULTATO"
};
async function importFiles() {
  try {
    console.log("\u{1F680} Starting Awentia File Import...");
    const awentia = await db.query.companies.findFirst({
      where: eq(companies.slug, "awentia")
    });
    if (!awentia) {
      throw new Error("Awentia company not found!");
    }
    console.log(`\u2705 Company found: ${awentia.name}`);
    const filesToProcess = [
      {
        monthName: "Settembre",
        monthNum: 9,
        filename: "[2025] Analisi Bilanci al 30 settembre Awentia - 1_CE dettaglio.csv"
      },
      {
        monthName: "Ottobre",
        monthNum: 10,
        filename: "[2025] Analisi Bilanci al 31 ottobre Awentia - 1_CE dettaglio.csv"
      }
    ];
    const latestDataRecord = await db.select().from(financialData).where(sql2`${financialData.companyId} = ${awentia.id} AND ${financialData.dataType} = 'dashboard'`).orderBy(sql2`${financialData.year} DESC`, sql2`CAST(${financialData.month} AS INTEGER) DESC`).limit(1);
    let previousData = {
      kpis: { ricavi2025: 0, costi2025: 0, ebitda2025: 0, risultato2025: 0 },
      monthlyTrend: { labels: [], ricavi: [], ebitda: [] },
      summary: []
    };
    if (latestDataRecord.length > 0) {
      const augustData = await db.select().from(financialData).where(sql2`${financialData.companyId} = ${awentia.id} AND ${financialData.month} = '8' AND ${financialData.dataType} = 'dashboard'`).limit(1);
      if (augustData.length > 0) {
        try {
          let data = augustData[0].data;
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
          previousData = data;
          console.log("\u{1F4C5} Loaded base data from August (dashboard).");
        } catch (e) {
          console.error("\u26A0\uFE0F Error parsing August data:", e);
        }
      } else if (latestDataRecord[0].month !== "9" && latestDataRecord[0].month !== "10") {
        try {
          let data = latestDataRecord[0].data;
          if (typeof data === "string") {
            data = JSON.parse(data);
          }
          previousData = data;
          console.log(`\u{1F4C5} Loaded base data from ${latestDataRecord[0].month} (dashboard).`);
        } catch (e) {
          console.error(`\u26A0\uFE0F Error parsing ${latestDataRecord[0].month} data:`, e);
        }
      } else {
        console.log("\u26A0\uFE0F Could not find clean August data. Using empty base (or latest).");
      }
    }
    for (const fileInfo of filesToProcess) {
      console.log(`
\u{1F504} Processing ${fileInfo.monthName}...`);
      const filePath = path.join(process.cwd(), "import_data", fileInfo.filename);
      if (!fs.existsSync(filePath)) {
        console.error(`\u274C File not found: ${filePath}`);
        continue;
      }
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const records = parse(fileContent, {
        columns: false,
        // No headers, we use index
        relax_column_count: true,
        skip_empty_lines: true,
        from_line: 3
        // Skip first 2 header lines
      });
      const newData = JSON.parse(JSON.stringify(previousData));
      let kpiRicavi = 0;
      let kpiEbitda = 0;
      let kpiCosti = 0;
      let kpiRisultato = 0;
      const newSummary = [];
      console.log(`  Found ${records.length} records.`);
      let rowCount = 0;
      for (const row of records) {
        rowCount++;
        const voce = row[1];
        const valueStr = row[2];
        if (rowCount <= 20) {
          console.log(`  Row ${rowCount}: [0]="${row[0]}" [1]="${row[1]}" [2]="${row[2]}"`);
        }
        if (!voce && !valueStr) continue;
        const label = (voce || row[0] || "").trim();
        if (!label) continue;
        const cleanValueStr = valueStr.replace(/\./g, "").replace(",", ".");
        const value = parseFloat(cleanValueStr);
        if (isNaN(value)) continue;
        const mapping = MAPPING[label];
        if (mapping) {
          console.log(`  MATCH: "${label}" -> ${mapping} (Value: ${value})`);
          if (mapping === "KPI_RICAVI") kpiRicavi = value;
          else if (mapping === "KPI_COSTI") kpiCosti = value;
          else if (mapping === "KPI_EBITDA") kpiEbitda = value;
          else if (mapping === "KPI_RISULTATO") kpiRisultato = value;
          else {
            newSummary.push({
              voce: mapping,
              value2025: value,
              percentage: 0,
              // Will calc later
              value2024: 0
            });
          }
        }
      }
      newSummary.forEach((item) => {
        item.percentage = kpiRicavi ? item.value2025 / kpiRicavi * 100 : 0;
      });
      newData.kpis.ricavi2025 = kpiRicavi;
      newData.kpis.costi2025 = kpiCosti;
      newData.kpis.ebitda2025 = kpiEbitda;
      newData.kpis.risultato2025 = kpiRisultato;
      newData.summary = newSummary;
      const prevRicavi = previousData.kpis.ricavi2025 || 0;
      const prevEbitda = previousData.kpis.ebitda2025 || 0;
      const monthlyRicavi = kpiRicavi - prevRicavi;
      const monthlyEbitda = kpiEbitda - prevEbitda;
      const monthLabel = fileInfo.monthName.substring(0, 3);
      if (!newData.monthlyTrend) newData.monthlyTrend = { labels: [], ricavi: [], ebitda: [] };
      if (!newData.monthlyTrend.labels) newData.monthlyTrend.labels = [];
      if (!newData.monthlyTrend.ricavi) newData.monthlyTrend.ricavi = [];
      if (!newData.monthlyTrend.ebitda) newData.monthlyTrend.ebitda = [];
      const existingIndex = newData.monthlyTrend.labels.indexOf(monthLabel);
      if (existingIndex >= 0) {
        newData.monthlyTrend.ricavi[existingIndex] = monthlyRicavi;
        newData.monthlyTrend.ebitda[existingIndex] = monthlyEbitda;
      } else {
        newData.monthlyTrend.labels.push(monthLabel);
        newData.monthlyTrend.ricavi.push(monthlyRicavi);
        newData.monthlyTrend.ebitda.push(monthlyEbitda);
      }
      console.log(`  \u{1F4CA} KPIs: Ricavi=${kpiRicavi}, EBITDA=${kpiEbitda}`);
      console.log(`  \u{1F4C8} Monthly: Ricavi=${monthlyRicavi}, EBITDA=${monthlyEbitda}`);
      const existingRecord = await db.select().from(financialData).where(sql2`${financialData.companyId} = ${awentia.id} AND ${financialData.dataType} = 'dashboard' AND ${financialData.year} = '2025' AND ${financialData.month} = ${fileInfo.monthNum.toString().padStart(2, "0")}`).limit(1);
      if (existingRecord.length > 0) {
        console.log(`  \u{1F504} Updating existing record (ID: ${existingRecord[0].id})...`);
        await db.update(financialData).set({ data: JSON.stringify(newData) }).where(eq(financialData.id, existingRecord[0].id));
      } else {
        console.log(`  \u2795 Inserting new record...`);
        await db.insert(financialData).values({
          companyId: awentia.id,
          dataType: "dashboard",
          year: "2025",
          month: fileInfo.monthNum.toString().padStart(2, "0"),
          data: JSON.stringify(newData)
        });
      }
      console.log(`\u2705 Saved ${fileInfo.monthName}.`);
      previousData = newData;
    }
    console.log("\n\u{1F389} Import completed!");
  } catch (e) {
    console.error("\u274C Error:", e);
  } finally {
    await pool.end();
  }
}
importFiles().then(() => {
  console.log("Script finished.");
  process.exit(0);
}).catch((err) => {
  console.error("Top-level error:", err);
  process.exit(1);
});
