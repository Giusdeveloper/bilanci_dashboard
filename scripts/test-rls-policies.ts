import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRLSPolicies() {
  console.log('🧪 Test delle RLS policies...')

  try {
    // 1. Test connessione base
    console.log('1️⃣ Test connessione base...')
    
    // Prova a fare login con l'admin
    console.log('🔐 Tentativo di login con admin...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'amministrazione@imment.it',
      password: 'Imment2025!'
    })
    
    if (loginError) {
      console.error('❌ Errore login:', loginError.message)
      console.log('💡 Assicurati che l\'account admin esista e la password sia corretta')
      return
    }
    
    console.log('✅ Login riuscito per:', loginData.user?.email)

    // 2. Test accesso a companies
    console.log('2️⃣ Test accesso a companies...')
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
    
    if (companiesError) {
      console.error('❌ Errore accesso companies:', companiesError)
    } else {
      console.log('✅ Companies accessibili:', companies?.length || 0)
      companies?.forEach(company => {
        console.log(`   - ${company.name} (${company.id})`)
      })
    }

    // 3. Test accesso a users
    console.log('3️⃣ Test accesso a users...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
    
    if (usersError) {
      console.error('❌ Errore accesso users:', usersError)
    } else {
      console.log('✅ Users accessibili:', users?.length || 0)
      users?.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`)
      })
    }

    // 4. Test accesso a financial_data
    console.log('4️⃣ Test accesso a financial_data...')
    const { data: financialData, error: financialError } = await supabase
      .from('financial_data')
      .select('*')
    
    if (financialError) {
      console.error('❌ Errore accesso financial_data:', financialError)
    } else {
      console.log('✅ Financial data accessibili:', financialData?.length || 0)
      financialData?.forEach(data => {
        console.log(`   - ${data.data_type} per azienda ${data.company_id}`)
      })
    }

    // 5. Test inserimento dati (solo se admin)
    console.log('5️⃣ Test inserimento dati...')
    const { data: testData, error: insertError } = await supabase
      .from('financial_data')
      .insert({
        company_id: companies?.[0]?.id || 'test-company',
        data_type: 'test',
        data: { test: 'value' },
        year: 2025,
        month: 1
      })
      .select()
    
    if (insertError) {
      console.error('❌ Errore inserimento:', insertError)
    } else {
      console.log('✅ Inserimento riuscito:', testData?.[0]?.id)
      
      // Pulisci i dati di test
      await supabase
        .from('financial_data')
        .delete()
        .eq('data_type', 'test')
    }

    console.log('🎉 Test RLS completato!')

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

// Esegui il test
testRLSPolicies()
