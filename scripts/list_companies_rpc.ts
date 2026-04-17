import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://caubhppwypkymsixsrco.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listCompanies() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: 'SELECT id, name, slug FROM companies;' 
  });

  if (error) {
    console.error('❌ Errore RPC:', error.message);
    // Fallback: proviamo a leggere senza RPC nel caso RLS fosse disattivato per test
    const { data: data2 } = await supabase.from('companies').select('*');
    console.log('--- FALLBACK LIST ---', data2);
  } else {
    console.log('--- AZIENDE TROVATE (via RPC) ---');
    console.log(JSON.stringify(data, null, 2));
  }
}

listCompanies();
