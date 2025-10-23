-- RLS Policies per Isolamento Dati Multi-Aziendale
-- Eseguire queste query nel SQL Editor di Supabase

-- 1. Abilita RLS per tutte le tabelle
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;

-- 2. Policy per la tabella companies
-- Admin può vedere tutte le aziende
CREATE POLICY "Admin can view all companies" ON companies
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 3. Policy per la tabella users
-- Gli utenti possono vedere solo il proprio record
CREATE POLICY "Users can view own record" ON users
FOR SELECT USING (auth.uid() = id);

-- Admin può vedere tutti gli utenti
CREATE POLICY "Admin can view all users" ON users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 4. Policy per la tabella financial_data
-- Admin può vedere tutti i dati finanziari
CREATE POLICY "Admin can view all financial data" ON financial_data
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Client può vedere solo i dati della propria azienda
CREATE POLICY "Client can view own company data" ON financial_data
FOR SELECT USING (
  company_id IN (
    SELECT company_id FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'client'
    AND users.company_id IS NOT NULL
  )
);

-- 5. Policy per modifiche (solo admin)
CREATE POLICY "Only admin can modify financial data" ON financial_data
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 6. Policy per modifiche companies (solo admin)
CREATE POLICY "Only admin can modify companies" ON companies
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- 7. Policy per modifiche users (solo admin)
CREATE POLICY "Only admin can modify users" ON users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
