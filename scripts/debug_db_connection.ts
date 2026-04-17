import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function debugDatabase() {
  console.log('🔍 Inizio Debug Database con Service Role Key...');

  try {
    // 1. Test connessione semplice
    console.log('1️⃣ Controllo tabella companies...');
    const { data: companies, error: compError } = await supabase
      .from('companies')
      .select('*');

    if (compError) {
      console.error('❌ Errore companies:', compError.message);
    } else {
      console.log('✅ Aziende trovate:', JSON.stringify(companies, null, 2));
    }

    // 2. Controllo tabella bilanci_users
    console.log('\n2️⃣ Controllo tabella bilanci_users...');
    const { data: users, error: userError } = await supabase
      .from('bilanci_users')
      .select('*');

    if (userError) {
      console.error('❌ Errore bilanci_users:', userError.message);
    } else {
      console.log('✅ Utenti trovati:', JSON.stringify(users, null, 2));
    }

    // 3. Controllo schemi disponibili via RPC
    console.log('\n3️⃣ Controllo tabelle pubbliche via SQL...');
    const { data: tables, error: sqlError } = await supabase.rpc('exec_sql', {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
    });

    if (sqlError) {
      console.error('❌ Errore SQL RPC:', sqlError.message);
    } else {
      console.log('✅ Tabelle nel database:', JSON.stringify(tables, null, 2));
    }

  } catch (err) {
    console.error('❌ Errore imprevisto:', err);
  }
}

debugDatabase();
