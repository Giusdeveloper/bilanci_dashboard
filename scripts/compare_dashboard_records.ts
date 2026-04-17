import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://caubhppwypkymsixsrco.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTIxOTA4NywiZXhwIjoyMDc2Nzk1MDg3fQ._N3ILjcWaX7hte-8bSnuck475UeY4oUh1fhFNU3U0Ng';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function compareDashboard() {
  const AWENTIA_ID = 'ffd64e5f-4692-4254-8ef4-f1611935f08e';
  const SHERPA_ID = '145c6ccb-c986-4b2b-b8e9-ed9d5fc50821';

  console.log('📊 CONFRONTO RECORD DASHBOARD DB\n');

  const { data: awentia } = await supabase.from('financial_data').select('*').eq('company_id', AWENTIA_ID).eq('data_type', 'dashboard').order('year', {descending:true}).order('month', {descending:true}).limit(1);
  const { data: sherpa } = await supabase.from('financial_data').select('*').eq('company_id', SHERPA_ID).eq('data_type', 'dashboard').order('year', {descending:true}).order('month', {descending:true}).limit(1);

  if (awentia && awentia[0]) {
    console.log('--- AWENTIA (Reference) ---');
    console.log('Chiavi nel campo data:', Object.keys(awentia[0].data));
    if (awentia[0].data.kpis) console.log('KPIs Awentia:', JSON.stringify(awentia[0].data.kpis, null, 2));
  }

  if (sherpa && sherpa[0]) {
    console.log('\n--- SHERPA42 (Current) ---');
    console.log('Chiavi nel campo data:', Object.keys(sherpa[0].data));
    if (sherpa[0].data.kpis) console.log('KPIs Sherpa:', JSON.stringify(sherpa[0].data.kpis, null, 2));
    if (sherpa[0].data.summary) {
      console.log('\nSummary Sherpa (Voci visualizzate in tabella):');
      sherpa[0].data.summary.filter((s:any) => s.type !== 'normal').forEach((s:any) => {
        console.log(`- [${s.type}] ${s.voce}: ${s.value2025} €`);
      });
    }
  }
}

compareDashboard();
