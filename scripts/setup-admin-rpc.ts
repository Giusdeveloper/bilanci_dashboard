import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupAdmin() {
  const userId = 'fd759293-89d5-4fff-894c-94c3da771865'
  const email = 'amministrazione@imment.it'
  
  const sql = `
    INSERT INTO public.users (id, email, role, company_id)
    VALUES ('${userId}', '${email}', 'admin', null)
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  `

  console.log(`🚀 Esecuzione SQL RPC per configurare admin: ${email}...`)
  
  const { data, error } = await supabase.rpc('exec_sql', { sql })
  
  if (error) {
    console.error('❌ Errore RPC:', error.message)
    console.log('💡 Se l\'errore è \"function exec_sql does not exist\", è necessario eseguirlo manualmente nel SQL Editor di Supabase.')
  } else {
    console.log('✅ Account admin configurato con successo via RPC!')
  }
}

setupAdmin()
