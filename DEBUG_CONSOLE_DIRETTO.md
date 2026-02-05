# Debug Console Diretto - Copia e Incolla nella Console

Esegui questo comando completo nella console del browser (copialo tutto e incollalo):

```javascript
(async () => {
  console.log('\n🔍 ========== DEBUG COMPLETO FLUSSO DASHBOARD ==========\n');
  
  const SHERPA42_ID = '0fb5063a-4b54-4ab1-ae2b-afd04865a1a1';
  const SUPABASE_URL = 'https://caubhppwypkymsixsrco.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI';
  
  // STEP 1: Verifica azienda
  console.log('📋 STEP 1: Verifica azienda in Supabase');
  const companyRes = await fetch(`${SUPABASE_URL}/rest/v1/companies?id=eq.${SHERPA42_ID}&select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const company = await companyRes.json();
  if (company && company[0]) {
    console.log(`✅ Azienda trovata: ${company[0].name}\n`);
  } else {
    console.error('❌ Azienda non trovata\n');
    return;
  }
  
  // STEP 2: Query getDashboardData (simula esattamente quello che fa il context)
  console.log('📊 STEP 2: Simula getDashboardData()');
  
  // Tentativo 1: month=8
  let res1 = await fetch(`${SUPABASE_URL}/rest/v1/financial_data?company_id=eq.${SHERPA42_ID}&data_type=eq.dashboard&year=eq.2025&month=eq.8&select=*&order=created_at.desc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  let data = await res1.json();
  console.log(`   Tentativo 1 (month=8): ${data?.length || 0} record`);
  
  // Tentativo 2: month=9
  if (!data || data.length === 0) {
    const res2 = await fetch(`${SUPABASE_URL}/rest/v1/financial_data?company_id=eq.${SHERPA42_ID}&data_type=eq.dashboard&year=eq.2025&month=eq.9&select=*&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    data = await res2.json();
    console.log(`   Tentativo 2 (month=9): ${data?.length || 0} record ✅`);
  }
  
  if (!data || data.length === 0) {
    console.error('❌ Nessun dato trovato\n');
    return;
  }
  
  console.log(`✅ Dati trovati: ${data.length} record\n`);
  
  // STEP 3: Verifica struttura dati
  console.log('📦 STEP 3: Verifica struttura dati');
  const dbData = data[0].data;
  console.log('   Chiavi:', Object.keys(dbData));
  console.log('   Ha kpis?', !!dbData.kpis);
  console.log('   Ha trends?', !!dbData.trends);
  console.log('   Ha table?', !!dbData.table);
  console.log('   Ha monthlyTrend?', !!dbData.monthlyTrend);
  console.log('   Ha summary?', !!dbData.summary);
  console.log('');
  
  // STEP 4: Simula conversione KPIs
  console.log('🔄 STEP 4: Simula conversione KPIs');
  if (dbData.kpis) {
    const kpis = dbData.kpis;
    console.log('   Struttura KPIs:', Object.keys(kpis));
    
    if (kpis.ricavi2025 !== undefined) {
      console.log('   ✅ KPIs già in formato standard');
    } else {
      console.log('   ⚠️  KPIs in formato Sherpa42, converto...');
      const ricavi2025 = kpis.ricavi?.value || 0;
      const ebitda2025 = kpis.ebitda?.value || 0;
      const margine2025 = kpis.margine?.value || 0;
      
      console.log(`   Ricavi 2025: ${ricavi2025}`);
      console.log(`   EBITDA 2025: ${ebitda2025}`);
      console.log(`   Margine 2025: ${margine2025}`);
      
      const convertedKpis = {
        ricavi2025,
        ricavi2024: 0,
        costi2025: ricavi2025 - ebitda2025,
        costi2024: 0,
        ebitda2025,
        ebitda2024: 0,
        risultato2025: ebitda2025,
        risultato2024: 0,
        margineEbitda2025: margine2025 * 100,
        margineEbitda2024: 0
      };
      
      console.log('   ✅ KPIs convertiti:', convertedKpis);
    }
  }
  console.log('');
  
  // STEP 5: Simula conversione trends
  console.log('📈 STEP 5: Simula conversione trends');
  if (dbData.trends) {
    const trends = dbData.trends;
    console.log('   Struttura trends:', Object.keys(trends));
    
    if (trends.ricavi && Array.isArray(trends.ricavi)) {
      const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set'];
      const labels = months.slice(0, trends.ricavi.length);
      const monthlyTrend = {
        labels,
        ricavi: trends.ricavi,
        ebitda: []
      };
      console.log('   ✅ Trends convertito:', {
        labels: monthlyTrend.labels.length,
        ricavi: monthlyTrend.ricavi.length,
        ebitda: monthlyTrend.ebitda.length
      });
    }
  }
  console.log('');
  
  // STEP 6: Simula conversione table
  console.log('📋 STEP 6: Simula conversione table');
  if (Array.isArray(dbData.table)) {
    console.log(`   Table lunghezza: ${dbData.table.length}`);
    if (dbData.table.length > 0) {
      console.log('   Primo elemento:', dbData.table[0]);
      const summary = dbData.table.map((row) => ({
        voce: row.voce || '',
        value2025: row.valore || 0,
        percentage: row.percentuale || 0,
        value2024: 0
      }));
      console.log(`   ✅ Summary convertito: ${summary.length} elementi`);
    }
  }
  console.log('');
  
  console.log('✅ ========== DEBUG COMPLETATO ==========\n');
  console.log('💡 Se tutti gli step sono ✅, il problema è nel rendering React');
  console.log('💡 Controlla se setDashboardData viene chiamato con i dati convertiti\n');
})();
```

