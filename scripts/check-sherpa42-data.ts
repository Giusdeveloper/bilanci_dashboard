import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkData() {
  const SHERPA_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';
  console.log('🧐 Controllo profondo dati per Sherpa42...');

  try {
    // 1. Quanti record ci sono in totale?
    const { count, error: countError } = await supabase
      .from('financial_data')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Conteggio totale record financial_data:', count);

    // 2. Cerchiamo specificamente il tipo 'dashboard' per Sherpa
    const { data: dash, error: dashErr } = await supabase
      .from('financial_data')
      .select('id, data_type, data')
      .eq('company_id', SHERPA_ID)
      .eq('data_type', 'dashboard');
    
    console.log('✅ Record Dashboard trovati:', dash?.length || 0);
    if (dash && dash.length > 0) {
      console.log('   Keys nel campo data:', Object.keys(dash[0].data));
    }

    // 3. Cerchiamo specificamente il tipo 'ce-dettaglio-mensile'
    const { data: ce, error: ceErr } = await supabase
      .from('financial_data')
      .select('id, data_type, data')
      .eq('company_id', SHERPA_ID)
      .eq('data_type', 'ce-dettaglio-mensile');
    
    console.log('✅ Record CE Dettaglio trovati:', ce?.length || 0);
    if (ce && ce.length > 0) {
      console.log('   Contenuto data:', JSON.stringify(ce[0].data).substring(0, 200) + '...');
    }

  } catch (err) {
    console.error('❌ Errore:', err);
  }
}

checkData();
