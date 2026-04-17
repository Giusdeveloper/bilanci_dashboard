import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupAdminAuto() {
  const email = 'amministrazione@imment.it'
  const password = 'Imment2025!'
  
  console.log(`🚀 Tentativo di configurazione admin automatica per ${email}...`)

  try {
    // 1. LOGIN per ottenere l'ID reale da Auth
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('❌ Errore login Auth:', signInError.message)
      return
    }

    const userId = signInData.user.id
    console.log(`✅ Login effettuato. ID reale: ${userId}`)

    // 2. INSERIMENTO in bilanci_users (Proviamo via RPC exec_sql se esiste, o direttamente)
    const { error: profileError } = await supabase
      .from('bilanci_users')
      .upsert({
        id: userId,
        email: email,
        role: 'admin',
        company_id: null
      })

    if (profileError) {
      console.error('❌ Errore upsert profilo:', profileError.message)
      console.log('💡 Provo metodo SQL diretto...')
      
      const sql = `INSERT INTO public.bilanci_users (id, email, role, company_id) VALUES ('${userId}', '${email}', 'admin', null) ON CONFLICT (id) DO UPDATE SET role = 'admin';`
      const { error: rpcError } = await supabase.rpc('exec_sql', { sql })
      
      if (rpcError) {
        console.error('❌ Anche RPC fallito:', rpcError.message)
        console.log('\n❗ AZIONE MANUALE NECESSARIA ❗')
        console.log('Copia e incolla questo nell\'Editor SQL di Supabase:')
        console.log(sql)
      } else {
        console.log('✅ Account admin configurato via RPC SQL!')
      }
    } else {
      console.log('✅ Account admin configurato con successo in bilanci_users!')
    }

  } catch (error) {
    console.error('❌ Errore imprevisto:', error)
  }
}

setupAdminAuto()
