import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function disableRLSTemporarily() {
  console.log('🔓 Disabilitazione temporanea RLS per debug...')

  try {
    // Disabilita RLS per users
    console.log('👤 Disabilitazione RLS per users...')
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE users DISABLE ROW LEVEL SECURITY;'
    })
    
    if (usersError) {
      console.warn('⚠️ Impossibile disabilitare RLS per users:', usersError.message)
      console.log('💡 Disabilita manualmente RLS nel dashboard Supabase:')
      console.log('   1. Vai su Authentication > Policies')
      console.log('   2. Trova la tabella "users"')
      console.log('   3. Disabilita RLS temporaneamente')
    } else {
      console.log('✅ RLS disabilitato per users')
    }

    // Disabilita RLS per companies
    console.log('🏢 Disabilitazione RLS per companies...')
    const { error: companiesError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE companies DISABLE ROW LEVEL SECURITY;'
    })
    
    if (companiesError) {
      console.warn('⚠️ Impossibile disabilitare RLS per companies:', companiesError.message)
    } else {
      console.log('✅ RLS disabilitato per companies')
    }

    // Disabilita RLS per financial_data
    console.log('📊 Disabilitazione RLS per financial_data...')
    const { error: financialError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE financial_data DISABLE ROW LEVEL SECURITY;'
    })
    
    if (financialError) {
      console.warn('⚠️ Impossibile disabilitare RLS per financial_data:', financialError.message)
    } else {
      console.log('✅ RLS disabilitato per financial_data')
    }

    console.log('🎉 RLS disabilitato temporaneamente!')
    console.log('💡 Ora puoi testare l\'applicazione senza problemi di RLS')
    console.log('⚠️ Ricorda di riabilitare RLS quando hai finito i test!')

  } catch (error) {
    console.error('❌ Errore nella disabilitazione RLS:', error)
  }
}

// Esegui la disabilitazione
disableRLSTemporarily()
