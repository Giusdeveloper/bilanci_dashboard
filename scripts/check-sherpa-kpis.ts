import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkSherpaKPIs() {
  const SHERPA_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';
  console.log('🧐 Analisi KPI Dashboard per Sherpa42...');

  const { data, error } = await supabase
    .from('financial_data')
    .select('data')
    .eq('company_id', SHERPA_ID)
    .eq('data_type', 'dashboard')
    .limit(1);

  if (error) {
    console.error('Errore:', error);
    return;
  }

  if (data && data[0]) {
    console.log('Dati trovati:', JSON.stringify(data[0].data.kpis, null, 2));
  } else {
    console.log('❌ Nessun record dashboard trovato per Sherpa42 con ID 145c6ccb...');
    
    // Proviamo a cercare tutte le aziende per essere sicuri dell'ID
    const { data: companies } = await supabase.from('companies').select('id, name');
    console.log('Aziende disponibili nel DB:', companies);
  }
}

checkSherpaKPIs();
