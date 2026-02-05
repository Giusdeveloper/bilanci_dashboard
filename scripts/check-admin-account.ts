import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAdminAccount() {
  console.log('🔍 Verifica account admin...')

  try {
    // 1. Controlla se ci sono utenti nel database
    console.log('1️⃣ Controllo utenti nel database...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
    
    if (usersError) {
      console.error('❌ Errore accesso users:', usersError)
      return
    }
    
    console.log('✅ Utenti trovati:', users?.length || 0)
    users?.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ID: ${user.id}`)
    })

    // 2. Controlla se ci sono aziende
    console.log('2️⃣ Controllo aziende nel database...')
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
    
    if (companiesError) {
      console.error('❌ Errore accesso companies:', companiesError)
    } else {
      console.log('✅ Aziende trovate:', companies?.length || 0)
      companies?.forEach(company => {
        console.log(`   - ${company.name} (${company.id})`)
      })
    }

    // 3. Controlla se ci sono dati finanziari
    console.log('3️⃣ Controllo dati finanziari...')
    const { data: financialData, error: financialError } = await supabase
      .from('financial_data')
      .select('*')
    
    if (financialError) {
      console.error('❌ Errore accesso financial_data:', financialError)
    } else {
      console.log('✅ Dati finanziari trovati:', financialData?.length || 0)
      financialData?.forEach(data => {
        console.log(`   - ${data.data_type} per azienda ${data.company_id}`)
      })
    }

    // 4. Se non ci sono utenti, crea l'admin
    if (!users || users.length === 0) {
      console.log('4️⃣ Creazione account admin...')
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'amministrazione@imment.it',
        password: 'admin123'
      })
      
      if (signUpError) {
        console.error('❌ Errore creazione admin:', signUpError)
      } else {
        console.log('✅ Account admin creato:', signUpData.user?.email)
        
        // Crea il record utente
        if (signUpData.user) {
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: signUpData.user.id,
              email: 'amministrazione@imment.it',
              role: 'admin',
              company_id: null
            })
          
          if (userError) {
            console.error('❌ Errore creazione record utente:', userError)
          } else {
            console.log('✅ Record utente creato')
          }
        }
      }
    }

    console.log('🎉 Verifica completata!')

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

// Esegui la verifica
checkAdminAccount()
