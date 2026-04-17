import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function verifyMonths() {
  const SHERPA_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';
  console.log('🗓️ Verifica periodi temporali per Sherpa42...');

  const { data, error } = await supabase
    .from('financial_data')
    .select('id, data_type, month, year')
    .eq('company_id', SHERPA_ID);

  if (error) {
    console.error('Errore:', error);
    return;
  }

  console.log('Record trovati nel DB:', JSON.stringify(data, null, 2));
}

verifyMonths();
