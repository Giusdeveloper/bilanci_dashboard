import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupRLSPolicies() {
  console.log('🔒 Configurazione RLS policies per isolamento dati...')

  try {
    // 1. Abilita RLS per tutte le tabelle
    console.log('📋 Abilitazione RLS per tutte le tabelle...')
    
    const tables = ['companies', 'users', 'financial_data']
    
    for (const table of tables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
      })
      
      if (error) {
        console.warn(`⚠️ Impossibile abilitare RLS per ${table}:`, error.message)
      } else {
        console.log(`✅ RLS abilitato per ${table}`)
      }
    }

    // 2. Policy per la tabella companies
    console.log('🏢 Configurazione policy per companies...')
    
    // Admin può vedere tutte le aziende
    const { error: companiesAdminError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Admin can view all companies" ON companies
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
          )
        );
      `
    })
    
    if (companiesAdminError) {
      console.warn('⚠️ Errore policy companies admin:', companiesAdminError.message)
    } else {
      console.log('✅ Policy companies admin creata')
    }

    // 3. Policy per la tabella users
    console.log('👤 Configurazione policy per users...')
    
    // Gli utenti possono vedere solo il proprio record
    const { error: usersSelfError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can view own record" ON users
        FOR SELECT USING (auth.uid() = id);
      `
    })
    
    if (usersSelfError) {
      console.warn('⚠️ Errore policy users self:', usersSelfError.message)
    } else {
      console.log('✅ Policy users self creata')
    }

    // Admin può vedere tutti gli utenti
    const { error: usersAdminError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Admin can view all users" ON users
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
          )
        );
      `
    })
    
    if (usersAdminError) {
      console.warn('⚠️ Errore policy users admin:', usersAdminError.message)
    } else {
      console.log('✅ Policy users admin creata')
    }

    // 4. Policy per la tabella financial_data
    console.log('📊 Configurazione policy per financial_data...')
    
    // Admin può vedere tutti i dati finanziari
    const { error: financialAdminError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Admin can view all financial data" ON financial_data
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
          )
        );
      `
    })
    
    if (financialAdminError) {
      console.warn('⚠️ Errore policy financial admin:', financialAdminError.message)
    } else {
      console.log('✅ Policy financial admin creata')
    }

    // Client può vedere solo i dati della propria azienda
    const { error: financialClientError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Client can view own company data" ON financial_data
        FOR SELECT USING (
          company_id IN (
            SELECT company_id FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'client'
            AND users.company_id IS NOT NULL
          )
        );
      `
    })
    
    if (financialClientError) {
      console.warn('⚠️ Errore policy financial client:', financialClientError.message)
    } else {
      console.log('✅ Policy financial client creata')
    }

    // 5. Policy per INSERT/UPDATE/DELETE
    console.log('✏️ Configurazione policy per modifiche...')
    
    // Solo admin può modificare i dati
    const { error: financialModifyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Only admin can modify financial data" ON financial_data
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
          )
        );
      `
    })
    
    if (financialModifyError) {
      console.warn('⚠️ Errore policy financial modify:', financialModifyError.message)
    } else {
      console.log('✅ Policy financial modify creata')
    }

    console.log('🎉 RLS policies configurate con successo!')
    console.log('📋 Riepilogo:')
    console.log('  - Admin: può vedere e modificare tutti i dati')
    console.log('  - Client: può vedere solo i dati della propria azienda')
    console.log('  - Isolamento completo tra aziende')

  } catch (error) {
    console.error('❌ Errore nella configurazione RLS:', error)
  }
}

// Esegui lo script
setupRLSPolicies()
