import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdminFinal() {
  const email = 'amministrazione@imment.it'
  const password = 'admin123'
  
  console.log(`🚀 Tentativo finale creazione/configurazione admin per ${email}...`)

  try {
    // 1. Tenta Signup
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    let userId: string | null = null;

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('🔄 Utente già esistente in Supabase Auth.')
        // Proviamo a fare login per avere l'ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: 'Imment2025!' // Proviamo con l'altra password trovata negli script
        })
        
        if (signInError) {
          console.log('🔄 Login fallito con Imment2025!, provo admin123...')
          const { data: signInData2, error: signInError2 } = await supabase.auth.signInWithPassword({
            email,
            password: 'admin123'
          })
          
          if (signInError2) {
             console.error('❌ Impossibile ottenere l\'ID utente via login. Errore:', signInError2.message)
             return
          }
          userId = signInData2.user.id
        } else {
          userId = signInData.user.id
        }
      } else {
        console.error('❌ Errore durante il signup:', signUpError.message)
        return
      }
    } else if (signUpData.user) {
      userId = signUpData.user.id
      console.log('✅ Utente creato con successo!')
    }

    if (!userId) {
      console.error('❌ Nessun ID utente ottenuto.')
      return
    }

    console.log(`🆔 ID Utente: ${userId}`)

    // 2. Tenta Inserimento Profilo con bypass (se possibile tramite SQL RPC)
    // Se fallisce l'upsert diretto, forniamo l'SQL
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        role: 'admin',
        company_id: null
      })

    if (profileError) {
      console.error('❌ Errore aggiornamento profilo:', profileError.message)
      console.log('\n❗ AZIONE RICHIESTA ❗')
      console.log('Esegui questo comando SQL nel pannello SQL Editor di Supabase:')
      console.log(`
        INSERT INTO public.users (id, email, role, company_id)
        VALUES ('${userId}', '${email}', 'admin', null)
        ON CONFLICT (id) DO UPDATE SET role = 'admin';
      `)
    } else {
      console.log('✅ Accesso admin configurato con successo!')
    }

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

createAdminFinal()
