import { createClient } from '@supabase/supabase-js'

// Configurazione Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAdminAccess() {
  const email = 'amministrazione@imment.it'
  console.log(`🚀 Impostazione permessi admin per ${email}...`)

  try {
    // 1. Cerchiamo l'utente in auth per ottenere l'ID
    // Poiché non abbiamo la service role key qui, proviamo a fare login per ottenere l'ID
    // Se l'utente è appena stato creato dallo script precedente, dovremmo riuscire
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: 'admin123' // Password provvisoria usata dallo script precedente
    })

    if (signInError) {
      console.error('❌ Errore login:', signInError.message)
      return
    }

    const userId = signInData.user.id
    console.log(`✅ Utente autenticato. ID: ${userId}`)

    // 2. Inseriamo/Aggiorniamo il record nella tabella 'users'
    // Se c'è un errore di foreign key, potrebbe essere che la tabella 'users' 
    // ha un vincolo su auth.users che Supabase non sta risolvendo correttamente via API anonima.
    
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        role: 'admin',
        company_id: null
      })
      .select()

    if (profileError) {
      console.error('❌ Errore aggiornamento profilo:', profileError)
      
      if (profileError.code === '23503') {
        console.log('💡 Il database ha un vincolo di integrità. Assicurati che le tabelle siano sincronizzate.')
        console.log('Prova a eseguire questo SQL nel pannello Supabase:')
        console.log(`
          INSERT INTO public.users (id, email, role, company_id)
          VALUES ('${userId}', '${email}', 'admin', null)
          ON CONFLICT (id) DO UPDATE SET role = 'admin';
        `)
      }
    } else {
      console.log('✅ Accesso admin configurato con successo!')
      console.log('Dati profilo:', profile)
    }

  } catch (error) {
    console.error('❌ Errore generale:', error)
  }
}

fixAdminAccess()
