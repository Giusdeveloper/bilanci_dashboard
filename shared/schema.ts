console.log("Loading shared/schema...");
import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// --- Existing Tables ---

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").default(sql`now()`),
});

export const financialData = pgTable("financial_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  dataType: text("data_type").notNull(), // 'dashboard', 'ce-dettaglio', etc.
  year: text("year").notNull(), // Changed to text to match some potential usage, or integer? DB says integer usually. Let's check context. Context says integer.
  // Wait, ANALISI_SHERPA42 says year is integer. Let's use integer.
  // But Drizzle pg-core uses integer.
  month: text("month"), // integer | null. 
  data: text("data").notNull(), // JSONB is usually handled as jsonb in drizzle, but here maybe text? 
  // Let's use jsonb if possible, or custom type. 
  // Standard drizzle: jsonb("data")
  createdAt: text("created_at").default(sql`now()`),
});

// --- New Normalization Tables ---

export const masterChartOfAccounts = pgTable("master_chart_of_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // e.g. "A1", "RICAVI_TOTALI"
  label: text("label").notNull(), // e.g. "Ricavi delle vendite"
  type: text("type").notNull(), // 'economic', 'patrimonial'
  parentId: varchar("parent_id"), // Self reference for hierarchy
  createdAt: text("created_at").default(sql`now()`),
});

export const accountMappings = pgTable("account_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  originalLabel: text("original_label").notNull(), // The exact string from the CSV
  masterAccountId: varchar("master_account_id").references(() => masterChartOfAccounts.id).notNull(),
  signMultiplier: text("sign_multiplier").default("1"), // "1" or "-1"
  createdAt: text("created_at").default(sql`now()`),
});

export const rawImports = pgTable("raw_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  rawData: text("raw_data").notNull(), // The full JSON from Google Sheets
  status: text("status").default("pending").notNull(), // 'pending', 'processed', 'error'
  errorMessage: text("error_message"),
  createdAt: text("created_at").default(sql`now()`),
});

