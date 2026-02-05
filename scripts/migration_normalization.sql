-- 1. Tabella Master (Il Dizionario Standard)
CREATE TABLE IF NOT EXISTS master_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- Es. "A1", "RICAVI_TOTALI"
  label TEXT NOT NULL,       -- Es. "Ricavi delle vendite"
  type TEXT NOT NULL,        -- Es. "economic", "patrimonial"
  parent_id UUID REFERENCES master_chart_of_accounts(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabella Mapping (Il Traduttore)
CREATE TABLE IF NOT EXISTS account_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  original_label TEXT NOT NULL, -- La voce esatta nel CSV (es. "Ricavi vendite Italia")
  master_account_id UUID NOT NULL REFERENCES master_chart_of_accounts(id),
  sign_multiplier TEXT DEFAULT '1', -- "1" o "-1" per invertire il segno se necessario
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabella Staging (Il Buffer per n8n)
CREATE TABLE IF NOT EXISTS raw_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  raw_data JSONB NOT NULL, -- Il JSON grezzo ricevuto da n8n
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'error'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_account_mappings_company ON account_mappings(company_id);
CREATE INDEX IF NOT EXISTS idx_raw_imports_status ON raw_imports(status);
