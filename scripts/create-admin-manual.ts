import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdminManual() {
  console.log('👤 Creazione manuale account admin...')

  try {
    // 1. Prova a fare signup con password diversa
    console.log('1️⃣ Tentativo signup con password diversa...')
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: 'amministrazione@imment.it',
        password: 'Imment2025!'
      })
    
    if (signUpError) {
      console.error('❌ Errore signup:', signUpError.message)
      
      // Se l'utente esiste già, prova a fare login
      if (signUpError.message.includes('already registered')) {
        console.log('🔄 Utente già esistente, tentativo login...')
        
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: 'amministrazione@imment.it',
            password: 'Imment2025!'
          })
        
        if (loginError) {
          console.error('❌ Errore login:', loginError.message)
          
          // Prova con password originale
          console.log('🔄 Tentativo con password originale...')
          const { data: loginData2, error: loginError2 } = await supabase.auth.signInWithPassword({
            email: 'amministrazione@imment.it',
            password: 'Imment2025!'
          })
          
          if (loginError2) {
            console.error('❌ Errore login con password originale:', loginError2.message)
          } else {
            console.log('✅ Login riuscito con password originale!')
            console.log('👤 Utente:', loginData2.user?.email)
            console.log('🔑 ID:', loginData2.user?.id)
          }
        } else {
          console.log('✅ Login riuscito!')
          console.log('👤 Utente:', loginData.user?.email)
          console.log('🔑 ID:', loginData.user?.id)
        }
      }
    } else {
      console.log('✅ Signup riuscito!')
      console.log('👤 Utente:', signUpData.user?.email)
      console.log('🔑 ID:', signUpData.user?.id)
      
      // Crea il record utente nel database
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
          console.log('✅ Record utente creato nel database')
        }
      }
    }

    // 2. Test accesso ai dati
    console.log('2️⃣ Test accesso ai dati...')
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
    
    if (companiesError) {
      console.error('❌ Errore accesso companies:', companiesError)
    } else {
      console.log('✅ Companies accessibili:', companies?.length || 0)
    }

    const { data: financialData, error: financialError } = await supabase
      .from('financial_data')
      .select('*')
    
    if (financialError) {
      console.error('❌ Errore accesso financial_data:', financialError)
    } else {
      console.log('✅ Financial data accessibili:', financialData?.length || 0)
    }

    console.log('🎉 Test completato!')

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

// Esegui la creazione
createAdminManual()
