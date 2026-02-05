# Confronto Awentia vs Sherpa42

## Test da Eseguire nella Console

Esegui questo comando per confrontare le due aziende:

```javascript
(async () => {
  console.log('\n🔍 ========== CONFRONTO AWENTIA vs SHERPA42 ==========\n');
  
  const AWENTIA_ID = 'ffd64e5f-4692-4254-8ef4-f1611935f08e';
  const SHERPA42_ID = '0fb5063a-4b54-4ab1-ae2b-afd04865a1a1';
  const SUPABASE_URL = 'https://caubhppwypkymsixsrco.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhdWJocHB3eXBreW1zaXhzcmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTkwODcsImV4cCI6MjA3Njc5NTA4N30.OqfYc2Xj4YULWrINf_eS6Hhj-SJf_iO8Ejp6KHDlBxI';
  
  // AWENTIA
  console.log('📊 AWENTIA:');
  const awentiaRes = await fetch(`${SUPABASE_URL}/rest/v1/financial_data?company_id=eq.${AWENTIA_ID}&data_type=eq.dashboard&year=eq.2025&month=eq.8&select=*&limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const awentiaData = await awentiaRes.json();
  
  if (awentiaData && awentiaData[0]) {
    console.log('   ✅ Dati trovati');
    console.log('   📦 Struttura:', Object.keys(awentiaData[0].data));
    console.log('   📈 KPIs tipo:', typeof awentiaData[0].data.kpis);
    console.log('   📊 monthlyTrend:', !!awentiaData[0].data.monthlyTrend);
    console.log('   📋 summary:', Array.isArray(awentiaData[0].data.summary));
    console.log('   📊 trends:', !!awentiaData[0].data.trends);
    console.log('   📋 table:', !!awentiaData[0].data.table);
    
    if (awentiaData[0].data.kpis) {
      console.log('   📈 KPIs keys:', Object.keys(awentiaData[0].data.kpis));
      console.log('   📈 Ricavi 2025:', awentiaData[0].data.kpis.ricavi2025);
    }
  } else {
    console.log('   ❌ Nessun dato trovato');
  }
  
  console.log('\n📊 SHERPA42:');
  const sherpaRes = await fetch(`${SUPABASE_URL}/rest/v1/financial_data?company_id=eq.${SHERPA42_ID}&data_type=eq.dashboard&year=eq.2025&month=eq.9&select=*&limit=1`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const sherpaData = await sherpaRes.json();
  
  if (sherpaData && sherpaData[0]) {
    console.log('   ✅ Dati trovati');
    console.log('   📦 Struttura:', Object.keys(sherpaData[0].data));
    console.log('   📈 KPIs tipo:', typeof sherpaData[0].data.kpis);
    console.log('   📊 monthlyTrend:', !!sherpaData[0].data.monthlyTrend);
    console.log('   📋 summary:', Array.isArray(sherpaData[0].data.summary));
    console.log('   📊 trends:', !!sherpaData[0].data.trends);
    console.log('   📋 table:', !!sherpaData[0].data.table);
    
    if (sherpaData[0].data.kpis) {
      console.log('   📈 KPIs keys:', Object.keys(sherpaData[0].data.kpis));
      if (sherpaData[0].data.kpis.ricavi) {
        console.log('   📈 Ricavi (Sherpa42):', sherpaData[0].data.kpis.ricavi);
      }
    }
  } else {
    console.log('   ❌ Nessun dato trovato');
  }
  
  console.log('\n✅ ========== CONFRONTO COMPLETATO ==========\n');
})();
```

